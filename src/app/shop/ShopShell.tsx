"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { BriefcaseBusiness, Clock3, House, PackageSearch, Ruler, X } from "lucide-react";
import type { TimeBreak, TimeShift } from "@/lib/shop/shared";
import { fmtTime, shiftHours } from "@/lib/shop/shared";
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

  if (!workerName || path === "/shop/login") return <>{children}</>;

  const tabs = [
    { href: "/shop", label: t(lang, "navToday"), icon: House, exact: true },
    { href: "/shop/jobs", label: t(lang, "jobs"), icon: BriefcaseBusiness },
    { clock: true, label: shift ? (onBreak ? t(lang, "clockBreak") : t(lang, "clockWorking")) : t(lang, "clockInLabel"), icon: Clock3 },
    { href: "/shop/leads", label: t(lang, "navMeasure"), icon: Ruler },
    { href: "/shop/inventory", label: t(lang, "tileInventory"), icon: PackageSearch },
  ];
  const hours = shift ? shiftHours(shift, breaks, now) : 0;
  const regularHours = Math.min(hours, Math.max(0, 40 - weekHoursBeforeShift));
  const overtimeHours = Math.max(0, hours - regularHours);
  const earnings = hourlyRate == null ? null : regularHours * hourlyRate + overtimeHours * hourlyRate * 1.5;

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden pb-[calc(82px+env(safe-area-inset-bottom))]">
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
            {shift && <div className="mb-5 grid grid-cols-2 gap-3 text-center"><div className="rounded-2xl bg-neutral-800 p-4"><div className="text-3xl font-semibold tabular-nums">{hours.toFixed(2)}</div><div className="mt-1 text-xs text-neutral-500">{t(lang, "clockPaidHours")}</div></div><div className="rounded-2xl bg-emerald-950/50 p-4"><div className="text-3xl font-semibold tabular-nums text-emerald-300">{earnings == null ? "—" : `$${earnings.toFixed(2)}`}</div><div className="mt-1 text-xs text-neutral-500">{t(lang, "clockGrossEarnings")}</div></div></div>}
            {shift && hours >= 12 && <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">{t(lang, "clockLongShift")}</p>}
            <p className="mb-4 rounded-2xl bg-neutral-800/70 p-3 text-sm leading-relaxed text-neutral-400">{t(lang, "payrollClockHint")}</p>
            {error && <p className="mb-3 rounded-xl bg-red-950/60 p-3 text-sm text-red-300">{error}</p>}
            {!shift ? (
              <button disabled={busy} onClick={() => act("shift_start", true)} className="min-h-16 w-full rounded-2xl bg-emerald-500 text-lg font-bold text-black disabled:opacity-50">{busy ? t(lang, "clockGettingLocation") : t(lang, "clockInLabel")}</button>
            ) : onBreak ? (
              <button disabled={busy} onClick={() => act("time_break_end")} className="min-h-16 w-full rounded-2xl bg-amber-500 text-lg font-bold text-black disabled:opacity-50">{t(lang, "clockEndBreak")}</button>
            ) : (
              <div className="space-y-2">
                <button disabled={busy} onClick={() => act("time_break_start")} className="min-h-14 w-full rounded-2xl bg-neutral-800 font-semibold">{t(lang, "clockStartBreak")}</button>
                <button disabled={busy} onClick={() => act("shift_stop", true)} className="min-h-14 w-full rounded-2xl border border-red-500/40 bg-red-950/40 font-semibold text-red-300">{t(lang, "clockOutLabel")}</button>
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
