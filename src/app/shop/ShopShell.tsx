"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { BriefcaseBusiness, Banknote, Clock3, House, PackageSearch, Ruler, LayoutGrid, X } from "lucide-react";
import type { TimeBreak, TimeShift } from "@/lib/shop/shared";
import { fmtTime, hoursToHm, shiftHours, shopDateKey } from "@/lib/shop/shared";
import { ShopAccess, isMeasuringPath, isSheetEditorPath } from "./ShopAccess";
import { calculatePayroll, payrollWeek, needsClockReview } from "@/lib/shop/payroll";
import { t } from "@/lib/shop/i18n";
import { useShopAppearance } from "./ShopAppearance";
import "./shop-ui.css";
import WorkHoursQuestion from "./WorkHoursQuestion";
import LocationHelp, { AllowLocationCard, LocatingOverlay, LocationRequiredLine } from "./LocationHelp";
import { locate, locationPermission } from "@/lib/shop/geo";
import type { WindowQuestion } from "@/lib/shop/work-hours";

function gps(): Promise<{ lat?: number; lng?: number; accuracy?: number; locationStatus: string }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({ locationStatus: "unavailable" });
    const timer = window.setTimeout(() => resolve({ locationStatus: "unavailable" }), 7000);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        clearTimeout(timer);
        resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, locationStatus: "unknown" });
      },
      () => { clearTimeout(timer); resolve({ locationStatus: "unavailable" }); },
      { enableHighAccuracy: true, timeout: 6500, maximumAge: 30000 }
    );
  });
}


import { readOutbox, removeFromOutbox, flagPunch, pendingPunches, sendPunch, queueTap, queueBlockedReport, flushBlockedReports } from "@/lib/shop/punch-outbox";

export default function ShopShell({
  children, isOwner = false, workerId, workerName, lang, shift: initialShift, breaks: initialBreaks, hourlyRate: initialRate, weekHoursBeforeShift: initialWeekHours, weekEarningsBeforeShift: initialWeekEarnings, clockReady, windowQuestions: initialQuestions = [],
}: {
  children: React.ReactNode;
  isOwner?: boolean;
  workerId: string | null;
  clockReady: boolean;
  workerName: string | null;
  lang: string;
  shift: TimeShift | null;
  breaks: TimeBreak[];
  hourlyRate: number | null;
  weekHoursBeforeShift: number;
  weekEarningsBeforeShift: number | null;
  windowQuestions?: WindowQuestion[];
}) {
  const path = usePathname();
  const appearance = useShopAppearance();
  const router = useRouter();
  const [, transition] = useTransition();
  const [clock, setClock] = useState({ shift: initialShift, breaks: initialBreaks, hourlyRate: initialRate, weekHoursBeforeShift: initialWeekHours, weekEarningsBeforeShift: initialWeekEarnings, windowQuestions: initialQuestions });
  const { shift, breaks, hourlyRate, weekHoursBeforeShift } = clock;
  const windowQuestions = clock.windowQuestions ?? [];
  const [ready, setReady] = useState(clockReady);
  const [review, setReview] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const clockVersion = useRef(0);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState("");
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [lastPing, setLastPing] = useState<number | null>(null);
  const [queued, setQueued] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const flushing = useRef(false);
  const flushAgain = useRef(false);
  // Location sheets: a clock-in refused for no location (denied / not found),
  // or a saved clock-out that went without one.
  const [locHelp, setLocHelp] = useState<{ mode: "in-denied" | "in-unavailable"; notified?: boolean } | { mode: "out"; shiftId: string } | null>(null);
  const [locating, setLocating] = useState(false);
  const locatingRef = useRef(false);
  // "Allow location so you can clock in" — shown once a day while permission
  // is not granted (and once on first open where the browser cannot tell).
  const [allowCard, setAllowCard] = useState(false);
  const markLocationOk = useCallback(() => {
    setAllowCard(false);
    try { window.localStorage.setItem("kiw-location-ok", "1"); } catch { /* private mode */ }
  }, []);
  useEffect(() => {
    if (isOwner || !workerId) return;
    let cancelled = false;
    void locationPermission().then((state) => {
      if (cancelled || state === "granted") return;
      let seen: string | null = null, ok: string | null = null;
      try { seen = window.localStorage.getItem("kiw-location-card"); ok = window.localStorage.getItem("kiw-location-ok"); } catch { /* ignore */ }
      if (state === "unknown" && ok) return;
      if (seen === shopDateKey(Date.now())) return;
      setAllowCard(true);
    });
    return () => { cancelled = true; };
  }, [isOwner, workerId]);
  const dismissAllowCard = () => {
    setAllowCard(false);
    try { window.localStorage.setItem("kiw-location-card", shopDateKey(Date.now())); } catch { /* ignore */ }
  };
  async function allowLocation() {
    // Must run from the tap itself: iOS only shows the prompt for a gesture.
    setLocating(true);
    const found = await locate();
    setLocating(false);
    if (found.ok) markLocationOk();
    else { dismissAllowCard(); setLocHelp({ mode: found.reason === "denied" ? "in-denied" : "in-unavailable" }); }
  }
  const flushRef = useRef<(() => Promise<void>) | null>(null);
  const [pendingType, setPendingType] = useState<"shift_start" | "shift_stop" | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const unconfirmedTimer = useRef<number | undefined>(undefined);
  const onBreak = breaks.some((b) => !b.ended_at);

  useEffect(() => {
    if (!shift) return;
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [shift]);

  // Keep a lightweight breadcrumb trail during an open payroll shift. The
  // page layout persists across shop navigation, so this continues while the
  // worker uses jobs, inventory, or measuring screens. Unpaid breaks are marked
  // separately and no location is collected until the break ends.
  //
  // Keyed on the shift ID, not the shift object: the server hands down a fresh
  // object on every router.refresh() (a clock action, a language change), and
  // depending on the object would restart the interval and fire an extra ping
  // each time — a trail far denser than the five minutes it advertises.
  //
  // The interval only runs while the app is in the foreground; a phone in a
  // pocket records nothing. The trail is corroboration, never proof of absence.
  const shiftId = shift?.id ?? null;
  useEffect(() => {
    if (!shiftId || onBreak) return;
    let cancelled = false;
    const ping = async () => {
      const loc = await gps();
      if (cancelled || loc.locationStatus === "unavailable") return;
      await fetch("/shop/api/action", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "shift_location", workState: "working", ...loc }),
      }).catch(() => undefined);
      if (!cancelled) setLastPing(Date.now());
    };
    void ping();
    const id = window.setInterval(() => void ping(), 5 * 60 * 1000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [shiftId, onBreak]);

  useEffect(() => {
    ["/shop", "/shop/jobs", "/shop/leads", "/shop/inventory"].forEach((href) => router.prefetch(href));
  }, [router]);

  async function act(type: string, withGps = false) {
    setBusy(true); setError("");
    try {
      const loc = withGps ? await gps() : {};
      const res = await fetch("/shop/api/action", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, ...loc }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not update the clock");
      await reloadClock();
      setOpen(false);
      transition(() => router.refresh());
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update the clock"); }
    finally { setBusy(false); }
  }

  // Neither side of the payroll punch may wait on GPS: gps() can take up to
  // 7s, and a tablet that locks or backgrounds mid-request drops the fetch
  // entirely. That fix (9/17) was not enough on its own: on 9/23 and 9/24 the
  // server log shows Kaio's phone loading shop pages at clock-out time and no
  // punch ever arriving — the request was lost between the tap and the
  // network, and the worker walked off believing he was clocked out.
  //
  // So a punch is now durable on the phone:
  //   1. It is written to localStorage BEFORE the request is sent.
  //   2. It is sent with keepalive (survives the tab being frozen) and
  //      retried a few times on network failure.
  //   3. If it still cannot leave, it stays queued and is re-sent on the next
  //      open / when the connection returns / every 20s, carrying the ORIGINAL
  //      tap time so pay is right even when it lands the next morning.
  //   4. Nothing is shown as done until the server confirms; then a green
  //      "Clocked out at 6:45 PM" toast says exactly what was recorded.
  // Location is still attached afterward, best-effort, never blocking.
  // Reads GPS and attaches it to THAT punch (by shift id). True when a point
  // reached the server.
  async function sendLocation(type: "shift_start" | "shift_stop", shiftId: string): Promise<boolean> {
    const followUpType = type === "shift_start" ? "shift_start_location" : "shift_end_location";
    try {
      const loc = await gps();
      if (loc.locationStatus === "unavailable" || loc.lat == null || loc.lng == null) return false;
      const res = await fetch("/shop/api/action", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: followUpType, shiftId, lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy }),
      });
      return res.ok;
    } catch { return false; }
  }

  // The punch is already saved. If the phone gives no location, explain how
  // to turn it on — every punch, until it works (Tiago and Kaio had none on
  // any punch since 9/20, so the owner could not see where anyone clocked).
  // (A clock-in always carries its location now; this is the clock-out path,
  // which is never blocked.)
  function attachLocation(type: "shift_start" | "shift_stop", shiftId: string) {
    void sendLocation(type, shiftId).then((ok) => { if (!ok && type === "shift_stop") setLocHelp({ mode: "out", shiftId }); });
  }

  function confirmPunch(type: "shift_start" | "shift_stop", at: string | null, late: boolean) {
    const text = type === "shift_start"
      ? t(lang, "punchConfirmedIn", { time: at ? fmtTime(at, lang) : "" })
      : at ? t(lang, "punchConfirmedOut", { time: fmtTime(at, lang) }) : t(lang, "punchConfirmedOutNone");
    setToast(late ? `${text} · ${t(lang, "punchLate")}` : text);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 6000);
  }

  const reloadClock = useCallback(async () => {
    const version = ++clockVersion.current;
    try {
      const response = await fetch("/shop/api/clock", { cache: "no-store", signal: AbortSignal.timeout(12000) });
      if (response.status === 401) { setNeedsLogin(true); return; }
      if (!response.ok) return;
      const data = await response.json();
      if (version !== clockVersion.current || data.workerId !== workerId) return;
      setClock({ ...data, windowQuestions: Array.isArray(data.windowQuestions) ? data.windowQuestions : [] }); setReady(true); setNeedsLogin(false); setNow(Date.now());
    } catch { /* Keep the last confirmed clock; the queue remains visible. */ }
  }, [workerId]);

  // A single ordered sender handles taps and background retries. Never skip an
  // in-flight start to send its stop, or discard an authentication failure.
  const flushOutbox = useCallback(async () => {
    if (isOwner || !workerId || path === "/shop/login") return;
    // A sync is already running (open/visibility/20s timer, or a reloadClock
    // that can take 12s on weak signal). Do not drop the request: ask the
    // running one to go round again once it is done, so a tap that lands
    // mid-sync is sent right after it.
    if (flushing.current) { flushAgain.current = true; return; }
    flushing.current = true;
    flushAgain.current = false;
    clockVersion.current++;
    if (pendingPunches(workerId).length) setBusy(true);
    try {
      for (const p of pendingPunches(workerId)) {
        try {
          const result = await sendPunch(p);
          if (!result.ok) {
            if (result.locationRequired) {
              // A clock-in without a location (an older queued tap) is not a
              // punch: drop it and show how to allow location.
              removeFromOutbox(p.punchId); setLocHelp({ mode: "in-denied" }); continue;
            }
            setError(result.error); setOpen(true); setNeedsLogin(result.signIn);
            if (result.final) flagPunch(p.punchId, result.error);
            break;
          }
          setReady(false);
          removeFromOutbox(p.punchId);
          setError("");
          confirmPunch(p.type, result.at, result.late);
          if (result.shiftId && (p.type === "shift_stop" || p.lat == null)) attachLocation(p.type, result.shiftId);
          transition(() => router.refresh());
        } catch {
          setError(t(lang, "punchQueued"));
          break;
        }
      }
      await reloadClock();
    } finally {
      flushing.current = false;
      setBusy(false);
      setQueued(pendingPunches(workerId).length);
      setPendingType(pendingPunches(workerId).at(-1)?.type ?? null);
      if (!pendingPunches(workerId).length) { setUnconfirmed(false); window.clearTimeout(unconfirmedTimer.current); }
      setReview(readOutbox().some(p => !p.workerId || (p.workerId === workerId && !!p.review)));
      if (flushAgain.current) {
        flushAgain.current = false;
        window.setTimeout(() => void flushRef.current?.(), 0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, workerId, path, lang, router, reloadClock]);

  useEffect(() => {
    if (!workerId || path === "/shop/login") return;
    const initialSync = window.setTimeout(() => { void flushOutbox(); void flushBlockedReports(workerId); }, 0);
    const onVisible = () => { if (document.visibilityState === "visible") void flushOutbox(); };
    const onOnline = () => void flushOutbox();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("pageshow", onOnline);
    const id = window.setInterval(() => { if (document.visibilityState === "visible") void flushOutbox(); }, 20000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pageshow", onOnline);
      window.clearInterval(id);
      window.clearTimeout(initialSync);
    };
  }, [workerId, path, flushOutbox]);

  useEffect(() => { flushRef.current = flushOutbox; }, [flushOutbox]);

  async function punchNow(type: "shift_start" | "shift_stop", tapAt: Date = new Date()): Promise<boolean> {
    if (!workerId) return false;
    setError("");
    // Clock-IN needs a location (owner rule). The tap time is taken at the
    // tap; the punch carries that time, not the moment GPS answered. No
    // location → no clock-in, and the worker is told exactly how to allow it.
    // Clock-OUT never waits: a blocked clock-out is a shift running overnight.
    let loc: { lat: number; lng: number; accuracy: number | null } | null = null;
    if (type === "shift_start" && !pendingPunches(workerId).some((p) => p.type === "shift_start")) {
      if (locatingRef.current) return false;
      locatingRef.current = true;
      setLocating(true);
      const found = await locate();
      locatingRef.current = false; setLocating(false);
      if (!found.ok) {
        // No location, no clock-in — and the office is told (owner rule).
        queueBlockedReport({ workerId, reason: found.reason, tapAt: tapAt.toISOString(), userAgent: navigator.userAgent });
        void flushBlockedReports(workerId);
        setLocHelp({ mode: found.reason === "denied" ? "in-denied" : "in-unavailable", notified: true });
        return false;
      }
      loc = { lat: found.lat, lng: found.lng, accuracy: found.accuracy };
      setLocHelp(null);
      markLocationOk();
    }
    // Written to the device FIRST, always — even while a sync is running. A
    // repeated tap of the same kind reuses the unsent punch (queueTap).
    const queuedTap = queueTap(workerId, type, shift?.id, tapAt, loc);
    if (!queuedTap) {
      // Without durable storage, do not claim an offline punch has been saved.
      setError(lang === "pt" ? "Não foi possível salvar o ponto neste aparelho. Ative o armazenamento e tente novamente." : lang === "es" ? "No se pudo guardar el registro en este dispositivo. Habilita el almacenamiento e inténtalo de nuevo." : "Could not save the punch on this device. Enable browser storage and try again.");
      return false;
    }
    // "Saving…" shows at once; it turns amber if the server has not confirmed
    // within 5s. The clock itself only changes when the server confirms.
    setPendingType(type);
    setUnconfirmed(false);
    window.clearTimeout(unconfirmedTimer.current);
    unconfirmedTimer.current = window.setTimeout(() => {
      if (pendingPunches(workerId).some((p) => p.punchId === queuedTap.punch.punchId)) setUnconfirmed(true);
    }, 5000);
    setQueued(pendingPunches(workerId).length);
    await flushOutbox();
    return true;
  }
  const clockIn = () => punchNow("shift_start");
  const clockOut = () => punchNow("shift_stop");
  // A punch button is never dead: while its tap is waiting on the server it
  // shows a spinner and "Sending…", and tapping again just re-sends it.
  const punchLabel = (type: "shift_start" | "shift_stop", label: string) =>
    pendingType === type
      ? <span className="inline-flex items-center justify-center gap-2"><span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />{t(lang, "punchSending")}</span>
      : label;

  if (!workerName || path === "/shop/login") return <>{children}</>;

  const measuring = isMeasuringPath(path);
  // Inside one sheet the editor is the whole screen; its own bar is the way out.
  const focus = isSheetEditorPath(path);
  const tabs = [
    { href: "/shop", label: t(lang, "navToday"), icon: House, exact: true },
    { href: "/shop/jobs", label: t(lang, "jobs"), icon: BriefcaseBusiness },
    isOwner ? { href: "/shop/admin/payroll", label: lang === "pt" ? "Pagamentos" : lang === "es" ? "Nómina" : "Payroll", icon: Banknote } : { clock: true, label: pendingType ? t(lang, "punchSending") : shift ? (onBreak ? t(lang, "clockBreak") : t(lang, "clockWorking")) : t(lang, "clockInLabel"), icon: Clock3 },
    { href: "/shop/leads", label: t(lang, "navMeasure"), icon: Ruler },
    measuring ? { href: "/shop/inventory", label: t(lang, "tileInventory"), icon: PackageSearch } : { href: "/shop/more", label: lang === "pt" ? "Mais" : lang === "es" ? "Más" : "More", icon: LayoutGrid },
  ];
  const hours = shift ? shiftHours(shift, breaks, now) : 0;
  // The crew are contractors, so pay is straight time at their own rate — no
  // 40-hour split, no multiplier.
  const clockNeedsReview = !!shift && needsClockReview(shift, now);
  const earnings = hourlyRate == null || clockNeedsReview ? null : hours * hourlyRate;
  // Week-to-date, ticking: everything already closed this week plus whatever
  // the open shift has accrued as of this render. Shown clocked in or out,
  // because "what have I earned this week" is asked most often on the way home.
  const currentWeek = calculatePayroll([], shift ? [shift] : [], breaks, payrollWeek(undefined, now), now)[0];
  const weekHours = weekHoursBeforeShift + (currentWeek?.hours ?? 0);
  const weekEarnings = clock.weekEarningsBeforeShift == null || currentWeek?.missingRateHours
    ? null : clock.weekEarningsBeforeShift + (currentWeek?.basePay ?? 0);

  return (
    <ShopAccess.Provider value={isOwner}><div data-shop-theme={appearance} className={`shop-ui shop-app ${measuring ? "shop-measuring" : ""} min-h-screen max-w-full overflow-x-clip ${focus ? "pb-[env(safe-area-inset-bottom)]" : "pb-[calc(82px+env(safe-area-inset-bottom))]"}`}>
      {queued > 0 && (
        <div className="fixed inset-x-0 top-0 z-[70] bg-amber-400 px-4 py-2 pt-[max(8px,env(safe-area-inset-top))] text-center text-sm font-semibold text-black">
          {t(lang, "punchQueuedBanner", { n: String(queued) })}
        </div>
      )}
      {toast && (
        <div role="status" className="fixed inset-x-4 top-[max(12px,env(safe-area-inset-top))] z-[70] rounded-2xl bg-emerald-500 px-4 py-3 text-center text-base font-bold text-black shadow-2xl">
          ✓ {toast}
        </div>
      )}
      {(review || needsLogin || !ready) && <div role="alert" className="mx-4 my-3 rounded-xl border border-amber-500/40 bg-amber-950 p-3 text-sm text-amber-200">
        {needsLogin ? <Link className="underline" href="/shop/login">{lang === "pt" ? "Entre novamente para sincronizar seu ponto salvo." : lang === "es" ? "Inicia sesión para sincronizar tu registro guardado." : "Sign in again to sync your saved punch."}</Link> : !ready ? (lang === "pt" ? "Carregando o ponto. Aguarde antes de registrar." : lang === "es" ? "Cargando el reloj. Espera antes de registrar." : "Clock status unavailable. Waiting to reconnect.") : <Link className="underline" href="/shop/time">{lang === "pt" ? "Um ponto salvo precisa de revisão. Peça ajuda ao escritório; o registro foi preservado neste aparelho." : lang === "es" ? "Un registro guardado necesita revisión. Pide ayuda a la oficina; se conservó en este dispositivo." : "A saved punch needs review. Ask the office for help; the record is preserved on this device."}</Link>}
      </div>}
      {!isOwner && allowCard && !shift && (
        <AllowLocationCard lang={lang} busy={locating} onAllow={() => void allowLocation()} onLater={dismissAllowCard} />
      )}
      {children}

      {!isOwner && locating && <LocatingOverlay lang={lang} />}
      {!isOwner && locHelp && (
        <LocationHelp
          key={locHelp.mode === "out" ? `out:${locHelp.shiftId}` : locHelp.mode}
          mode={locHelp.mode}
          notified={locHelp.mode !== "out" && !!locHelp.notified}
          lang={lang}
          onRetry={() => locHelp.mode === "out" ? sendLocation("shift_stop", locHelp.shiftId) : punchNow("shift_start")}
          onClose={() => setLocHelp(null)}
        />
      )}
      {!isOwner && windowQuestions.length > 0 && (
        <WorkHoursQuestion
          key={`${windowQuestions[0].shiftId}:${windowQuestions[0].edge}`}
          question={windowQuestions[0]}
          lang={lang}
          onDone={(q, requested) => {
            setClock((c) => ({ ...c, windowQuestions: (c.windowQuestions ?? []).filter((x) => !(x.shiftId === q.shiftId && x.edge === q.edge)) }));
            if (requested) {
              setToast(t(lang, "windowThanks"));
              window.clearTimeout(toastTimer.current);
              toastTimer.current = window.setTimeout(() => setToast(null), 5000);
            }
            void reloadClock();
            transition(() => router.refresh());
          }}
        />
      )}

      {!focus && <nav aria-label={lang === "pt" ? "Navegação principal" : lang === "es" ? "Navegación principal" : "Main navigation"} className={measuring ? "shop-tabbar fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-neutral-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl" : "shop-tabbar fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#111215]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.15)] backdrop-blur-2xl"}>
        <div className="mx-auto grid h-[76px] max-w-2xl grid-cols-5">
          {tabs.map((tab) => {
            const { label, icon: Icon } = tab;
            if ("clock" in tab) return (
              <button key="clock" onClick={() => setOpen(true)} className="relative z-20 flex h-full touch-manipulation flex-col items-center justify-end pb-2 text-[11px] font-bold text-neutral-100">
                {/* The crew's main control: big, centred, and its colour is the state —
                    green while on the clock, amber on break, grey when stopped. Inline
                    colours so the light theme's utility remapping can't wash them out. */}
                <span
                  data-clock-state={shift ? (onBreak ? "break" : "working") : "stopped"}
                  style={{ background: shift ? (onBreak ? "#f59e0b" : "#22c55e") : "#9ca3af", color: "#fff", borderColor: "var(--shop-card, #fff)" }}
                  className="absolute -top-8 grid h-[78px] w-[78px] place-items-center rounded-full border-[5px] shadow-xl shadow-black/30 transition-colors"
                >
                  <Clock3 className="h-10 w-10" strokeWidth={2.5} />
                </span>
                <span>{label}</span>
              </button>
            );
            const { href, exact } = tab;
            const shownPath = pendingPath || path;
            const active = exact ? shownPath === href : shownPath.startsWith(href);
            return <Link prefetch href={href} key={label} aria-current={active ? "page" : undefined} onPointerDown={() => setPendingPath(href)} onClick={() => window.setTimeout(() => setPendingPath(null), 800)} className={`relative z-10 flex h-full touch-manipulation flex-col items-center justify-center gap-0.5 text-[11px] ${active ? "text-amber-300" : "text-neutral-500"}`}>
              <span className={`grid h-10 w-12 place-items-center rounded-2xl ${active ? "bg-amber-400/15" : ""}`}><Icon className="h-[27px] w-[27px]" strokeWidth={active ? 2.4 : 1.9} /></span>
              <span className={active ? "font-semibold" : ""}>{label}</span>
            </Link>;
          })}
        </div>
      </nav>}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/65 sm:items-center sm:justify-center" onClick={() => setOpen(false)}>
          <section className="w-full rounded-t-[28px] border border-white/10 bg-neutral-900 p-5 pb-[max(24px,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <div><div className="text-xl font-semibold">{t(lang, "payrollClock")}</div><div className="text-sm text-neutral-500">{workerName}</div></div>
              <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-neutral-800"><X className="h-5 w-5" /></button>
            </div>
            {shift && <div className="mb-3 grid grid-cols-2 gap-3 text-center"><div className="rounded-2xl bg-neutral-800 p-4"><div className="text-3xl font-semibold tabular-nums">{hoursToHm(hours)}</div><div className="mt-1 text-xs text-neutral-500">{clockNeedsReview ? (lang === "pt" ? "Tempo decorrido · revisar" : lang === "es" ? "Tiempo transcurrido · revisar" : "Elapsed time · needs review") : t(lang, "clockPaidHours")}</div></div><div className="rounded-2xl bg-emerald-950/50 p-4"><div className="text-3xl font-semibold tabular-nums text-emerald-300">{earnings == null ? "—" : `$${earnings.toFixed(2)}`}</div><div className="mt-1 text-xs text-neutral-500">{t(lang, "clockGrossEarnings")}</div></div></div>}
            <div className="mb-5 rounded-2xl border border-white/10 bg-neutral-800/50 p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">{t(lang, "weekToDate")}</span>
                <span className="text-xs text-neutral-600">{t(lang, "sinceMonday")}</span>
              </div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div>
                  <div className="text-2xl font-semibold tabular-nums">{hoursToHm(weekHours)}</div>
                  <div className="text-xs text-neutral-500">{t(lang, "clockPaidHours")}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-semibold tabular-nums text-emerald-300">{weekEarnings == null ? "—" : `$${weekEarnings.toFixed(2)}`}</div>
                  <div className="text-xs text-neutral-500">{hourlyRate == null ? t(lang, "noRateSet") : t(lang, "atRate", { rate: `$${hourlyRate.toFixed(2)}` })}</div>
                </div>
              </div>
            </div>
            {clockNeedsReview && <p role="alert" className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">{lang === "pt" ? "Ponto aberto há mais de 24 horas. Excluído da estimativa de pagamento até confirmar a saída real com o escritório." : lang === "es" ? "Turno abierto por más de 24 horas. Excluido de la estimación de pago hasta confirmar la salida real con la oficina." : "This punch has been open for over 24 hours. It is excluded from estimated pay until the office confirms the actual clock-out."}</p>}
            {shift && !clockNeedsReview && hours >= 12 && <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">{t(lang, "clockLongShift")}</p>}
            <p className="mb-4 rounded-2xl bg-neutral-800/70 p-3 text-sm leading-relaxed text-neutral-400">{t(lang, "payrollClockHint")}</p>
            {unconfirmed && pendingType && <p role="status" className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-center text-base font-semibold text-amber-200">{t(lang, "punchNotConfirmed")}</p>}
            {error && <p className={`mb-3 rounded-xl p-3 text-sm ${error === t(lang, "punchQueued") ? "border border-amber-500/40 bg-amber-500/10 text-amber-200" : "bg-red-950/60 text-red-300"}`}>{error}</p>}
            {!shift ? (
              <div className="space-y-3"><button onClick={clockIn} className="min-h-16 w-full rounded-2xl bg-emerald-500 text-lg font-bold text-black disabled:opacity-50">{punchLabel("shift_start", t(lang, "clockInLabel"))}</button><LocationRequiredLine lang={lang} className="justify-center text-center" /></div>
            ) : onBreak ? (
              <div className="space-y-2"><button disabled={busy || !ready || needsLogin} onClick={() => act("time_break_end")} className="min-h-16 w-full rounded-2xl bg-amber-500 text-lg font-bold text-black disabled:opacity-50">{t(lang, "clockEndBreak")}</button><button onClick={clockOut} className="min-h-14 w-full rounded-2xl border border-red-500/40 bg-red-950/40 font-semibold text-red-300 disabled:opacity-50">{punchLabel("shift_stop", t(lang, "clockOutLabel"))}</button></div>
            ) : (
              <div className="space-y-2">
                <button disabled={busy || !ready || needsLogin} onClick={() => act("time_break_start")} className="min-h-14 w-full rounded-2xl bg-neutral-800 font-semibold">{t(lang, "clockStartBreak")}</button>
                <button onClick={clockOut} className="min-h-14 w-full rounded-2xl border border-red-500/40 bg-red-950/40 font-semibold text-red-300 disabled:opacity-50">{punchLabel("shift_stop", t(lang, "clockOutLabel"))}</button>
              </div>
            )}
            {shift && (
              <p className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-neutral-400">
                <span className={`h-2 w-2 rounded-full ${onBreak || lastPing == null ? "bg-neutral-600" : "bg-emerald-400"}`} />
                {onBreak
                  ? t(lang, "clockLocationPausedBadge")
                  : lastPing == null
                    ? t(lang, "clockLocationWaitingBadge")
                    : t(lang, "clockLocationOnBadge", {
                        time: fmtTime(lastPing, lang),
                      })}
              </p>
            )}
            <p className="mt-3 text-center text-xs leading-relaxed text-neutral-600">{t(lang, "clockLocationNote")}</p>
          </section>
        </div>
      )}
    </div></ShopAccess.Provider>
  );
}
