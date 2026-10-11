// Owner job-cost board: hours by worker × rate per job, labor budget use, and
// paid time not on any job. Owner only — callers check canViewOwnerFinancials.
import { ORG_ID, sbSelect, type Job, type Worker } from "./db";
import { canViewOwnerFinancials } from "./shared";
import { budgetUsedPct, jobLaborRollup, weeklyUtilization } from "./job-timer";
import { getLaborBudgets, listAllTimeEntries, payrollWindow, shiftRatesFor } from "./job-timer-db";
import { addPayrollDays, payrollWeek } from "./payroll";

export interface LaborBoardJob {
  jobId: string;
  label: string;
  stage: string | null;
  archived: boolean;
  hours: number;
  cost: number;
  unratedHours: number;
  workingNow: number;
  budgetHours: number | null;
  usedPct: number | null;
  byWorker: { name: string; hours: number; cost: number | null }[];
}
export interface LaborBoardUtilization {
  name: string;
  payrollHours: number;
  jobHours: number;
  unassignedHours: number;
  offPayrollJobHours: number;
  utilizationPct: number | null;
}
export interface LaborBoard {
  jobs: LaborBoardJob[];
  /** False until the labor-budget migration is applied. */
  budgetsReady: boolean;
  weeks: { key: string; label: "utThisWeek" | "utLastWeek"; rows: LaborBoardUtilization[] }[];
}

export async function loadLaborBoard(opts: { jobId?: string; withUtilization?: boolean; now?: number } = {}): Promise<LaborBoard> {
  const now = opts.now ?? Date.now();
  const onlyJob = opts.jobId ? `&job_id=eq.${opts.jobId}` : "";
  const [entries, workers, jobs, budgets] = await Promise.all([
    listAllTimeEntries(onlyJob),
    sbSelect<Pick<Worker, "id" | "name" | "hourly_rate" | "is_admin" | "can_see_prices">[]>("kiw_shop_workers", `select=id,name,hourly_rate,is_admin,can_see_prices&org_id=eq.${ORG_ID}`),
    sbSelect<Pick<Job, "id" | "job_number" | "customer_name" | "current_stage" | "archived">[]>("kiw_shop_jobs", `select=id,job_number,customer_name,current_stage,archived&org_id=eq.${ORG_ID}${opts.jobId ? `&id=eq.${opts.jobId}` : ""}`),
    getLaborBudgets(opts.jobId),
  ]);
  const shiftRates = await shiftRatesFor(entries);
  const workerRates = new Map(workers.map((w) => [w.id, w.hourly_rate ?? null]));
  const names = new Map(workers.map((w) => [w.id, w.name]));
  const rollup = jobLaborRollup(entries, shiftRates, workerRates, now);
  const running = new Map<string, number>();
  for (const e of entries) if (!e.ended_at) running.set(e.job_id, (running.get(e.job_id) || 0) + 1);
  const jobById = new Map(jobs.map((j) => [j.id, j]));
  const ids = new Set([...rollup.keys(), ...(budgets ? budgets.keys() : [])]);
  if (opts.jobId) ids.add(opts.jobId);

  const rows: LaborBoardJob[] = [...ids].filter((id) => jobById.has(id)).map((id) => {
    const j = jobById.get(id)!;
    const r = rollup.get(id);
    const budget = budgets?.get(id) ?? null;
    const hours = r?.hours ?? 0;
    return {
      jobId: id,
      label: `${j.job_number} — ${j.customer_name}`,
      stage: j.current_stage ?? null,
      archived: !!j.archived,
      hours,
      cost: r?.cost ?? 0,
      unratedHours: r?.unratedHours ?? 0,
      workingNow: running.get(id) || 0,
      budgetHours: budget,
      usedPct: budgetUsedPct(hours, budget),
      byWorker: (r?.byWorker || []).map((w) => ({ name: names.get(w.workerId) || "Unknown", hours: w.hours, cost: w.cost })),
    };
  }).sort((a, b) => b.workingNow - a.workingNow || Number(a.archived) - Number(b.archived) || b.hours - a.hours);

  const weeks: LaborBoard["weeks"] = [];
  if (opts.withUtilization) {
    const thisWeek = payrollWeek(undefined, now);
    const lastWeek = payrollWeek(addPayrollDays(thisWeek.key, -7), now);
    const { shifts, breaks } = await payrollWindow(lastWeek.start);
    // Owners are not on employee payroll; their job time is cost, not utilization.
    const owners = new Set(workers.filter(canViewOwnerFinancials).map((w) => w.id));
    const since = Date.parse(lastWeek.start);
    const recent = entries.filter((e) => !owners.has(e.worker_id) && (!e.ended_at || Date.parse(e.ended_at) > since));
    const crewShifts = shifts.filter((s) => !owners.has(s.worker_id));
    for (const [week, label] of [[thisWeek, "utThisWeek"], [lastWeek, "utLastWeek"]] as const) {
      weeks.push({
        key: week.key,
        label,
        rows: weeklyUtilization(recent, crewShifts, breaks, week, now)
          .map((u) => ({ name: names.get(u.workerId) || "Unknown", payrollHours: u.payrollHours, jobHours: u.jobHours, unassignedHours: u.unassignedHours, offPayrollJobHours: u.offPayrollJobHours, utilizationPct: u.utilizationPct }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      });
    }
  }
  return { jobs: rows, budgetsReady: budgets !== null, weeks };
}
