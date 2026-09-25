"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { BriefcaseBusiness, Clock3, House, PackageSearch, Ruler, X } from "lucide-react";
import type { TimeBreak, TimeShift } from "@/lib/shop/shared";
import { fmtTime, hoursToHm, shiftHours } from "@/lib/shop/shared";
import { t } from "@/lib/shop/i18n";

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


// ---- durable punch outbox (see punchNow) -----------------------------------
type QueuedPunch = { punchId: string; type: "shift_start" | "shift_stop"; clientAt: string };
type PunchResult =
  | { ok: true; shiftId: string | null; at: string | null; late: boolean }
  | { ok: false; error: string };
const OUTBOX_KEY = "kiw-punch-outbox";
// A punch older than this is refused by the server anyway (punch.ts); drop it
// rather than retry forever.
const OUTBOX_MAX_AGE_MS = 36 * 3600 * 1000;
const inFlight = new Set<string>();

function readOutbox(): QueuedPunch[] {
  try {
    const raw = window.localStorage.getItem(OUTBOX_KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((p) => p && typeof p.punchId === "string" && typeof p.clientAt === "string" && (p.type === "shift_start" || p.type === "shift_stop")) : [];
  } catch { return []; }
}
function writeOutbox(items: QueuedPunch[]) {
  try {
    if (items.length) window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
    else window.localStorage.removeItem(OUTBOX_KEY);
  } catch { /* private mode / storage blocked: the punch still goes out once */ }
}
function removeFromOutbox(punchId: string) { writeOutbox(readOutbox().filter((p) => p.punchId !== punchId)); }
function newPunchId(): string {
  try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
}

// One attempt. Resolves with the server's answer (ok or a final 4xx); throws
// on a network failure, timeout or 5xx so the caller can retry or keep it
// queued. keepalive lets the request finish even if the tab is frozen the
// instant after the tap — the pocket-the-phone case.
async function sendPunch(p: QueuedPunch): Promise<PunchResult> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch("/shop/api/action", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: p.type, clientAt: p.clientAt, punchId: p.punchId }),
      keepalive: true, signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, shiftId: typeof data.shiftId === "string" ? data.shiftId : null, at: typeof data.at === "string" ? data.at : null, late: !!data.late };
    if (res.status >= 500) throw new Error(data.error || `HTTP ${res.status}`);
    return { ok: false, error: data.error || "Could not update the clock" };
  } finally { clearTimeout(timer); }
}

export default function ShopShell({
  children, workerName, lang, shift, breaks, hourlyRate, weekHoursBeforeShift,
}: {
  children: React.ReactNode;
  workerName: string | null;
  lang: string;
  shift: TimeShift | null;
  breaks: TimeBreak[];
  hourlyRate: number | null;
  weekHoursBeforeShift: number;
}) {
  const path = usePathname();
  const router = useRouter();
  const [, transition] = useTransition();
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
  function attachLocation(type: "shift_start" | "shift_stop", shiftId: string) {
    const followUpType = type === "shift_start" ? "shift_start_location" : "shift_end_location";
    void gps().then((loc) => {
      if (loc.locationStatus === "unavailable" || loc.lat == null || loc.lng == null) return;
      return fetch("/shop/api/action", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: followUpType, shiftId, lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy }),
      });
    }).catch(() => undefined);
  }

  function confirmPunch(type: "shift_start" | "shift_stop", at: string | null, late: boolean) {
    const text = type === "shift_start"
      ? t(lang, "punchConfirmedIn", { time: at ? fmtTime(at, lang) : "" })
      : at ? t(lang, "punchConfirmedOut", { time: fmtTime(at, lang) }) : t(lang, "punchConfirmedOutNone");
    setToast(late ? `${text} · ${t(lang, "punchLate")}` : text);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 6000);
  }

  // Sends every queued punch, oldest first, stopping at the first network
  // failure (the rest would fail the same way). Safe to call often.
  const flushOutbox = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    try {
      for (const p of readOutbox()) {
        if (inFlight.has(p.punchId)) continue;
        if (Date.now() - Date.parse(p.clientAt) > OUTBOX_MAX_AGE_MS) { removeFromOutbox(p.punchId); continue; }
        inFlight.add(p.punchId);
        try {
          const r = await sendPunch(p);
          removeFromOutbox(p.punchId);
          if (r.ok) {
            confirmPunch(p.type, r.at, r.late);
            if (r.shiftId) attachLocation(p.type, r.shiftId);
            transition(() => router.refresh());
          }
        } catch {
          break;
        } finally {
          inFlight.delete(p.punchId);
        }
      }
    } finally {
      flushing.current = false;
      setQueued(readOutbox().length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, router]);

  useEffect(() => {
    // flushOutbox() ends by publishing the queue length, so no setState here.
    void flushOutbox();
    const onVisible = () => { if (document.visibilityState === "visible") void flushOutbox(); };
    const onOnline = () => void flushOutbox();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    const id = window.setInterval(() => void flushOutbox(), 20000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.clearInterval(id);
    };
  }, [flushOutbox]);

  async function punchNow(type: "shift_start" | "shift_stop", failMessage: string) {
    const p: QueuedPunch = { punchId: newPunchId(), type, clientAt: new Date().toISOString() };
    setBusy(true); setError("");
    writeOutbox([...readOutbox(), p]);
    setQueued(readOutbox().length);
    inFlight.add(p.punchId);
    try {
      let result: PunchResult | null = null;
      for (let attempt = 0; attempt < 3 && !result; attempt++) {
        try { result = await sendPunch(p); }
        catch { await new Promise((r) => window.setTimeout(r, 1500 * (attempt + 1))); }
      }
      if (!result) {
        // Still on the phone. Say so, loudly, and keep the sheet open.
        setError(t(lang, "punchQueued"));
        return;
      }
      removeFromOutbox(p.punchId);
      if (!result.ok) { setError(result.error || failMessage); return; }
      confirmPunch(type, result.at, result.late);
      setOpen(false);
      transition(() => router.refresh());
      if (result.shiftId) attachLocation(type, result.shiftId);
    } finally {
      inFlight.delete(p.punchId);
      setQueued(readOutbox().length);
      setBusy(false);
    }
  }
  const clockIn = () => punchNow("shift_start", "Could not clock in");
  const clockOut = () => punchNow("shift_stop", "Could not clock out");

  if (!workerName || path === "/shop/login") return <>{children}</>;

  const tabs = [
    { href: "/shop", label: t(lang, "navToday"), icon: House, exact: true },
    { href: "/shop/jobs", label: t(lang, "jobs"), icon: BriefcaseBusiness },
    { clock: true, label: shift ? (onBreak ? t(lang, "clockBreak") : t(lang, "clockWorking")) : t(lang, "clockInLabel"), icon: Clock3 },
    { href: "/shop/leads", label: t(lang, "navMeasure"), icon: Ruler },
    { href: "/shop/inventory", label: t(lang, "tileInventory"), icon: PackageSearch },
  ];
  const hours = shift ? shiftHours(shift, breaks, now) : 0;
  // The crew are contractors, so pay is straight time at their own rate — no
  // 40-hour split, no multiplier.
  const earnings = hourlyRate == null ? null : hours * hourlyRate;
  // Week-to-date, ticking: everything already closed this week plus whatever
  // the open shift has accrued as of this render. Shown clocked in or out,
  // because "what have I earned this week" is asked most often on the way home.
  const weekHours = weekHoursBeforeShift + hours;
  const weekEarnings = hourlyRate == null ? null : weekHours * hourlyRate;

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden pb-[calc(82px+env(safe-area-inset-bottom))]">
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
      {children}

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-neutral-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl">
        <div className="mx-auto grid h-[76px] max-w-2xl grid-cols-5">
          {tabs.map((tab) => {
            const { label, icon: Icon } = tab;
            if ("clock" in tab) return (
              <button key="clock" onClick={() => setOpen(true)} className="relative z-20 flex h-full touch-manipulation flex-col items-center justify-end pb-2 text-[11px] font-bold text-neutral-100">
                <span className={`absolute -top-2.5 grid h-[62px] w-[62px] place-items-center rounded-full border-4 border-neutral-950 shadow-xl shadow-black/50 ${shift ? "bg-emerald-400 text-black" : "bg-amber-400 text-black"}`}>
                  <Clock3 className="h-8 w-8" strokeWidth={2.5} />
                </span>
                <span>{label}</span>
              </button>
            );
            const { href, exact } = tab;
            const shownPath = pendingPath || path;
            const active = exact ? shownPath === href : shownPath.startsWith(href);
            return <Link prefetch href={href} key={label} onPointerDown={() => setPendingPath(href)} onClick={() => window.setTimeout(() => setPendingPath(null), 800)} className={`relative z-10 flex h-full touch-manipulation flex-col items-center justify-center gap-0.5 text-[11px] ${active ? "text-amber-300" : "text-neutral-500"}`}>
              <span className={`grid h-10 w-12 place-items-center rounded-2xl ${active ? "bg-amber-400/15" : ""}`}><Icon className="h-[27px] w-[27px]" strokeWidth={active ? 2.4 : 1.9} /></span>
              <span className={active ? "font-semibold" : ""}>{label}</span>
            </Link>;
          })}
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/65 sm:items-center sm:justify-center" onClick={() => setOpen(false)}>
          <section className="w-full rounded-t-[28px] border border-white/10 bg-neutral-900 p-5 pb-[max(24px,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <div><div className="text-xl font-semibold">{t(lang, "payrollClock")}</div><div className="text-sm text-neutral-500">{workerName}</div></div>
              <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-neutral-800"><X className="h-5 w-5" /></button>
            </div>
            {shift && <div className="mb-3 grid grid-cols-2 gap-3 text-center"><div className="rounded-2xl bg-neutral-800 p-4"><div className="text-3xl font-semibold tabular-nums">{hoursToHm(hours)}</div><div className="mt-1 text-xs text-neutral-500">{t(lang, "clockPaidHours")}</div></div><div className="rounded-2xl bg-emerald-950/50 p-4"><div className="text-3xl font-semibold tabular-nums text-emerald-300">{earnings == null ? "—" : `$${earnings.toFixed(2)}`}</div><div className="mt-1 text-xs text-neutral-500">{t(lang, "clockGrossEarnings")}</div></div></div>}
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
            {shift && hours >= 12 && <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">{t(lang, "clockLongShift")}</p>}
            <p className="mb-4 rounded-2xl bg-neutral-800/70 p-3 text-sm leading-relaxed text-neutral-400">{t(lang, "payrollClockHint")}</p>
            {error && <p className={`mb-3 rounded-xl p-3 text-sm ${error === t(lang, "punchQueued") ? "border border-amber-500/40 bg-amber-500/10 text-amber-200" : "bg-red-950/60 text-red-300"}`}>{error}</p>}
            {!shift ? (
              <button disabled={busy} onClick={clockIn} className="min-h-16 w-full rounded-2xl bg-emerald-500 text-lg font-bold text-black disabled:opacity-50">{busy ? t(lang, "punchSending") : t(lang, "clockInLabel")}</button>
            ) : onBreak ? (
              <button disabled={busy} onClick={() => act("time_break_end")} className="min-h-16 w-full rounded-2xl bg-amber-500 text-lg font-bold text-black disabled:opacity-50">{t(lang, "clockEndBreak")}</button>
            ) : (
              <div className="space-y-2">
                <button disabled={busy} onClick={() => act("time_break_start")} className="min-h-14 w-full rounded-2xl bg-neutral-800 font-semibold">{t(lang, "clockStartBreak")}</button>
                <button disabled={busy} onClick={clockOut} className="min-h-14 w-full rounded-2xl border border-red-500/40 bg-red-950/40 font-semibold text-red-300 disabled:opacity-50">{busy ? t(lang, "punchSending") : t(lang, "clockOutLabel")}</button>
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
    </div>
  );
}
