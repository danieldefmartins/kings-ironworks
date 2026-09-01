"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { BriefcaseBusiness, Clock3, House, PackageSearch, Ruler, X } from "lucide-react";
import type { TimeBreak, TimeShift } from "@/lib/shop/shared";
import { shiftHours } from "@/lib/shop/shared";
import { t } from "@/lib/shop/i18n";

type JobOption = { id: string; label: string };

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
  children, workerName, lang, shift, breaks, currentJobId, jobs, hourlyRate, weekHoursBeforeShift,
}: {
  children: React.ReactNode;
  workerName: string | null;
  lang: string;
  shift: TimeShift | null;
  breaks: TimeBreak[];
  currentJobId: string | null;
  jobs: JobOption[];
  hourlyRate: number | null;
  weekHoursBeforeShift: number;
}) {
  const path = usePathname();
  const router = useRouter();
  const [, transition] = useTransition();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [jobId, setJobId] = useState(currentJobId || jobs[0]?.id || "");
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState("");
  const onBreak = breaks.some((b) => !b.ended_at);

  useEffect(() => {
    if (!shift) return;
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [shift]);

  async function act(type: string, withGps = false) {
    if ((type === "time_start" || type === "time_transfer" || type === "time_break_end") && !jobId) {
      setError(t(lang, "clockChooseFirst"));
      return;
    }
    setBusy(true); setError("");
    try {
      const loc = withGps ? await gps() : {};
      const res = await fetch("/shop/api/action", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, jobId, ...loc }),
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
    <div className="min-h-screen pb-[calc(82px+env(safe-area-inset-bottom))]">
      {children}

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-neutral-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl">
        <div className="mx-auto grid h-[72px] max-w-2xl grid-cols-5">
          {tabs.map((tab) => {
            const { label, icon: Icon } = tab;
            if ("clock" in tab) return (
              <button key="clock" onClick={() => setOpen(true)} className="relative flex flex-col items-center justify-end gap-0.5 pb-1.5 text-[10px] font-semibold text-neutral-200">
                <span className={`absolute -top-5 grid h-14 w-14 place-items-center rounded-full border-4 border-neutral-950 shadow-xl ${shift ? "bg-emerald-500 text-black" : "bg-amber-500 text-black"}`}>
                  <Clock3 className="h-6 w-6" strokeWidth={2.4} />
                </span>
                <span>{label}</span>
                {shift && <span className="max-w-[74px] truncate text-[9px] font-normal text-emerald-400">{hours.toFixed(1)}h{earnings == null ? "" : ` · $${earnings.toFixed(0)}`}</span>}
              </button>
            );
            const { href, exact } = tab;
            const active = exact ? path === href : path.startsWith(href);
            return <button type="button" key={label} onClick={() => router.push(href)} className={`relative z-10 flex h-full touch-manipulation flex-col items-center justify-center gap-1 text-[11px] ${active ? "text-amber-400" : "text-neutral-500"}`}>
              <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.4 : 1.8} />
              <span className={active ? "font-semibold" : ""}>{label}</span>
            </button>;
          })}
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/65 sm:items-center sm:justify-center" onClick={() => setOpen(false)}>
          <section className="w-full rounded-t-[28px] border border-white/10 bg-neutral-900 p-5 pb-[max(24px,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <div><div className="text-xl font-semibold">{t(lang, "timeClock")}</div><div className="text-sm text-neutral-500">{workerName}</div></div>
              <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-neutral-800"><X className="h-5 w-5" /></button>
            </div>
            {shift && <div className="mb-5 grid grid-cols-2 gap-3 text-center"><div className="rounded-2xl bg-neutral-800 p-4"><div className="text-3xl font-semibold tabular-nums">{hours.toFixed(2)}</div><div className="mt-1 text-xs text-neutral-500">{t(lang, "clockPaidHours")}</div></div><div className="rounded-2xl bg-emerald-950/50 p-4"><div className="text-3xl font-semibold tabular-nums text-emerald-300">{earnings == null ? "—" : `$${earnings.toFixed(2)}`}</div><div className="mt-1 text-xs text-neutral-500">{t(lang, "clockGrossEarnings")}</div></div></div>}
            {shift && hours >= 12 && <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">{t(lang, "clockLongShift")}</p>}
            <label className="mb-2 block text-sm text-neutral-400">{t(lang, "jobLabel")}</label>
            <select value={jobId} onChange={(e) => setJobId(e.target.value)} className="mb-4 min-h-14 w-full rounded-2xl border border-white/10 bg-neutral-800 px-4 text-base outline-none focus:border-amber-500">
              <option value="">{t(lang, "clockChooseJob")}</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.label}</option>)}
            </select>
            {error && <p className="mb-3 rounded-xl bg-red-950/60 p-3 text-sm text-red-300">{error}</p>}
            {!shift ? (
              <button disabled={busy} onClick={() => act("time_start", true)} className="min-h-16 w-full rounded-2xl bg-emerald-500 text-lg font-bold text-black disabled:opacity-50">{busy ? t(lang, "clockGettingLocation") : t(lang, "clockInLabel")}</button>
            ) : onBreak ? (
              <button disabled={busy} onClick={() => act("time_break_end")} className="min-h-16 w-full rounded-2xl bg-amber-500 text-lg font-bold text-black disabled:opacity-50">{t(lang, "clockEndBreak")}</button>
            ) : (
              <div className="space-y-2">
                {jobId && jobId !== currentJobId && <button disabled={busy} onClick={() => act("time_transfer", true)} className="min-h-14 w-full rounded-2xl bg-amber-500 font-bold text-black">{t(lang, "clockSwitchJob")}</button>}
                <button disabled={busy} onClick={() => act("time_break_start")} className="min-h-14 w-full rounded-2xl bg-neutral-800 font-semibold">{t(lang, "clockStartBreak")}</button>
                <button disabled={busy} onClick={() => act("time_stop", true)} className="min-h-14 w-full rounded-2xl border border-red-500/40 bg-red-950/40 font-semibold text-red-300">{t(lang, "clockOutLabel")}</button>
              </div>
            )}
            <p className="mt-4 text-center text-xs leading-relaxed text-neutral-600">{t(lang, "clockLocationNote")}</p>
          </section>
        </div>
      )}
    </div>
  );
}
