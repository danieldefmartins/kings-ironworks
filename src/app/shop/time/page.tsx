import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionWorker } from "@/lib/shop/session";
import { listWorkerBreaks, listWorkerShifts, shiftHours } from "@/lib/shop/db";
import { approverFirstName, listWorkerFixes } from "@/lib/shop/time-fix-db";
import ShopTopBar from "../ShopTopBar";
import TimesheetClient from "./TimesheetClient";
import { canViewOwnerFinancials, fmtTime, fromShopInput, shopDateKey } from "@/lib/shop/shared";
import { addPayrollDays, calculatePayroll, payrollMidnight, payrollWeek } from "@/lib/shop/payroll";
import { hm, pf } from "@/lib/shop/ponto";
import { shortDay } from "@/lib/shop/time-fix";
import { getWorkHours } from "@/lib/shop/work-hours-db";
import FixRequestButton from "../FixRequest";
import { ChevronDown } from "lucide-react";

export const dynamic = "force-dynamic";

// "Minha semana": a plain list of days with hours and the total — no tables.
// Everything the old timesheet had (every record, map pins, status, CSV-ready
// rows, the free-form correction with a note, my requests) is unchanged under
// "Todos os meus pontos".
export default async function MyTimePage({ searchParams }: { searchParams: Promise<{ week?: string | string[]; fix?: string | string[]; all?: string | string[] }> }) {
  const worker = await getSessionWorker(); if (!worker) redirect("/shop/login");
  if (canViewOwnerFinancials(worker)) redirect("/shop/admin/payroll");
  const lang = worker.lang || "en";
  const q = await searchParams;
  // Scoped in the query, not filtered afterwards: this screen is one person's
  // hours and one person's pay, so nobody else's shifts should be in the
  // process to begin with.
  const [mineShifts, breaks, myFixes, approver, work] = await Promise.all([
    listWorkerShifts(worker.id), listWorkerBreaks(worker.id), listWorkerFixes(worker.id).catch(() => []), approverFirstName(), getWorkHours().catch(() => null),
  ]);
  const shifts = mineShifts.map(s => ({ id: s.id, worker: worker.name, startedAt: s.started_at, endedAt: s.ended_at, hours: shiftHours(s, breaks.filter(b => b.shift_id === s.id)), regular: shiftHours(s, breaks.filter(b => b.shift_id === s.id)), overtime: 0, status: s.status, startLat: s.start_lat, startLng: s.start_lng, endLat: s.end_lat, endLng: s.end_lng }));
  const approverName = approver === worker.name.split(" ")[0] ? "" : approver;

  // eslint-disable-next-line react-hooks/purity -- dynamic server request: one timestamp for this response
  const now = Date.now();
  const thisWeek = payrollWeek(undefined, now);
  const lastKey = addPayrollDays(thisWeek.key, -7);
  const week = payrollWeek(q.week === lastKey ? lastKey : undefined, now);
  const today = shopDateKey(now);
  const days = Array.from({ length: 7 }, (_, i) => addPayrollDays(week.key, i)).filter((d) => d <= today).reverse();
  const rows = days.map((day) => {
    const win = { ...week, start: payrollMidnight(day), end: payrollMidnight(addPayrollDays(day, 1)) };
    const r = calculatePayroll([], mineShifts, breaks, win, now).find((x) => x.id === worker.id);
    const list = mineShifts.filter((s) => shopDateKey(s.started_at) === day).sort((a, b) => a.started_at.localeCompare(b.started_at));
    return { day, hours: r?.hours ?? 0, held: (r?.reviewShifts ?? 0) > 0, open: (r?.openShifts ?? 0) > 0, list };
  });
  const total = calculatePayroll([], mineShifts, breaks, week, now).find((x) => x.id === worker.id)?.hours ?? 0;
  const workTimes = { start: work?.start || "07:30", end: work?.end || "17:00" };
  const fixShifts = mineShifts.filter((s) => Date.parse(s.started_at) >= now - 8 * 86400_000).map((s) => ({ id: s.id, startedAt: s.started_at, endedAt: s.ended_at, status: s.status }));

  return <div>
    <ShopTopBar workerName={worker.name} title={pf(lang, "weekTitle")} back="/shop" lang={lang} />
    <main className="mx-auto max-w-2xl space-y-5 px-4 pb-28 pt-5">
      <div className="grid grid-cols-2 gap-2" role="tablist">
        {[{ key: thisWeek.key, label: "thisWeek", href: "/shop/time" }, { key: lastKey, label: "lastWeek", href: `/shop/time?week=${lastKey}` }].map((w) =>
          <Link key={w.key} role="tab" aria-selected={w.key === week.key} href={w.href} replace className={`flex min-h-14 items-center justify-center rounded-2xl text-[17px] font-semibold ${w.key === week.key ? "bg-neutral-100 text-black" : "border border-white/10 bg-neutral-900/60 text-neutral-300"}`}>{pf(lang, w.label)}</Link>)}
      </div>

      <section className="rounded-[22px] border border-emerald-500/25 bg-emerald-500/[0.07] px-5 py-4" data-testid="week-total">
        <div className="text-[15px] text-emerald-200">{pf(lang, "weekTotal")}</div>
        <div className="mt-0.5 text-[40px] font-bold tabular-nums leading-tight">{hm(total)}</div>
      </section>

      <ul className="overflow-hidden rounded-[22px] border border-white/10 bg-neutral-900/60" data-testid="week-days">
        {rows.map((r) => <li key={r.day} className="flex min-h-[68px] items-center gap-3 border-b border-white/5 px-4 py-3 last:border-0">
          <span className="min-w-0 flex-1">
            <span className="block text-[18px] font-semibold">{r.day === today ? pf(lang, "today") : shortDay(fromShopInput(`${r.day}T12:00`), lang)}</span>
            <span className="block text-[14px] tabular-nums text-neutral-400">
              {r.list.length ? r.list.map((s) => `${fmtTime(s.started_at, lang)} → ${s.ended_at ? fmtTime(s.ended_at, lang) : pf(lang, "running")}`).join(" · ") : pf(lang, "noShiftDay")}
            </span>
          </span>
          {r.held && <span className="shrink-0 rounded-full bg-amber-400/15 px-2.5 py-1 text-[13px] font-semibold text-amber-300">{pf(lang, "held")}</span>}
          <span className="w-20 shrink-0 text-right text-[22px] font-semibold tabular-nums">{r.hours > 0 ? hm(r.hours) : pf(lang, "noHours")}</span>
        </li>)}
      </ul>

      <FixRequestButton shifts={fixShifts} lang={lang} approver={approverName} work={workTimes} startOpen={q.fix === "1"}
        className="flex min-h-16 w-full items-center justify-center gap-2.5 rounded-[22px] bg-amber-500 text-[19px] font-bold text-black" />

      <details className="group rounded-[22px] border border-white/10 bg-neutral-900/40" open={q.all === "1"}>
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 text-[16px] font-semibold text-neutral-300">
          {pf(lang, "allShifts")}<ChevronDown aria-hidden className="h-5 w-5 transition group-open:rotate-180" />
        </summary>
        <div className="px-3 pb-4"><TimesheetClient shifts={shifts} myFixes={myFixes} approverName={approverName} lang={lang} /></div>
      </details>
    </main>
  </div>;
}
