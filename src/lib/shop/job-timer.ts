// Job time — the project clock — as rules, with no I/O.
//
// Daniel: "anyone that wants to check the details of a project needs to start
// the clock ... He can't see other projects while he's on one. A clock out
// cancels any job working time. My goal is to find out how many hours they
// work on each project so we can accurately calculate the cost."
//
// Everything here is pure so the server (gate, alerts, costs) and the tests
// share one definition. Client components may import it: no env, no fetch.
import { MAX_PROJECT_ENTRY_HOURS, fromShopInput, shopDateKey, type TimeBreak, type TimeEntry, type TimeShift } from "./shared";

type GateWorker = { is_admin?: boolean | null };
type Running = Pick<TimeEntry, "job_id"> | null | undefined;

// ---- The gate ---------------------------------------------------------------

/** Owners and admins look at jobs to run the company, not to work them. */
export function isJobGateExempt(worker: GateWorker): boolean {
  return !!worker.is_admin;
}

export interface JobGateState {
  /** True when the job's details must not be shown yet. */
  locked: boolean;
  /** The job whose time is running now, when it is a different job. */
  runningJobId: string | null;
}

export function jobGateState(worker: GateWorker, running: Running, jobId: string): JobGateState {
  if (isJobGateExempt(worker)) return { locked: false, runningJobId: null };
  if (running?.job_id === jobId) return { locked: false, runningJobId: null };
  return { locked: true, runningJobId: running?.job_id ?? null };
}

/**
 * The jobs a crew member may see in a list. While his time runs on a job he
 * sees that job only; "Switch job" (switching=true) shows the full list again
 * so he can pick the next one — which still opens behind the gate.
 */
export function visibleJobsFor<T extends { id: string }>(jobs: T[], worker: GateWorker, running: Running, switching = false): T[] {
  if (isJobGateExempt(worker) || !running || switching) return jobs;
  return jobs.filter((j) => j.id === running.job_id);
}

// ---- Clock-out ends job time --------------------------------------------------

/**
 * Where a running job entry ends when its worker clocks out at `at`.
 * One-directional: payroll closes job time, job time never touches payroll.
 *
 * An entry that STARTED after the clock-out tap is not part of that shift — a
 * queued clock-out that lands the next morning must not kill today's timer —
 * so it is left alone (null).
 */
export function clockOutEndFor(entry: Pick<TimeEntry, "started_at" | "ended_at">, at: string): string | null {
  if (entry.ended_at) return null;
  const end = Date.parse(at);
  if (!Number.isFinite(end)) return null;
  if (Date.parse(entry.started_at) >= end) return null;
  return new Date(end).toISOString();
}

// ---- Forgotten-timer alerts ---------------------------------------------------

/** No activity on a running job for this long reads as walked away. */
export const JOB_IDLE_ALERT_HOURS = 4;
/** The shop's work day ends here, shop time. */
export const WORKDAY_END = "17:00";
/** Grace after the work day ends before we ask. */
export const AFTER_HOURS_GRACE_MIN = 15;
/** Grace for "job time running, pay clock off" — time to tap Clock in. */
export const PAYROLL_OFF_GRACE_MIN = 15;

export type TimerAlertKind = "idle" | "after_hours" | "payroll_off";
export const TIMER_ALERT_ACTION = "job_timer_alert";

function addDays(key: string, days: number): string {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The first work-day end (17:00 shop time) at or after `start`. DST-safe. */
export function workdayEndAfter(start: string | number | Date, end = WORKDAY_END): number {
  const ms = new Date(start).getTime();
  const key = shopDateKey(ms);
  const today = Date.parse(fromShopInput(`${key}T${end}`));
  return ms < today ? today : Date.parse(fromShopInput(`${addDays(key, 1)}T${end}`));
}

export interface TimerAlertCandidate {
  entry: Pick<TimeEntry, "id" | "worker_id" | "job_id" | "started_at">;
  /** Latest thing this worker did in the app since the entry started (ms). */
  lastActivityMs: number | null;
  /** A payroll shift is open for this worker right now. */
  payrollOpen: boolean;
  /** The worker is on employee payroll at all (owners/excluded are not). */
  payrollEnrolled: boolean;
}

export interface TimerAlert {
  entryId: string;
  workerId: string;
  jobId: string;
  /** Every rule due now that has not been alerted for this entry before. */
  kinds: TimerAlertKind[];
  elapsedHours: number;
}

/**
 * Which running entries need a nudge now. `sent` holds "entryId:kind" for
 * alerts already recorded in the audit trail, so each rule fires at most once
 * per entry however often this runs; rules due together go out as one message.
 */
export function dueTimerAlerts(candidates: TimerAlertCandidate[], sent: Set<string>, now = Date.now()): TimerAlert[] {
  const out: TimerAlert[] = [];
  for (const c of candidates) {
    const start = Date.parse(c.entry.started_at);
    if (!Number.isFinite(start) || now <= start) continue;
    // Past the hard cap the entry is auto-closed instead of nagged about.
    if (now - start >= MAX_PROJECT_ENTRY_HOURS * 3600000) continue;
    const kinds: TimerAlertKind[] = [];
    const active = Math.max(start, c.lastActivityMs ?? start);
    if (now - active >= JOB_IDLE_ALERT_HOURS * 3600000) kinds.push("idle");
    if (now >= workdayEndAfter(start) + AFTER_HOURS_GRACE_MIN * 60000) kinds.push("after_hours");
    if (c.payrollEnrolled && !c.payrollOpen && now - start >= PAYROLL_OFF_GRACE_MIN * 60000) kinds.push("payroll_off");
    const fresh = kinds.filter((k) => !sent.has(`${c.entry.id}:${k}`));
    if (fresh.length) out.push({ entryId: c.entry.id, workerId: c.entry.worker_id, jobId: c.entry.job_id, kinds: fresh, elapsedHours: (now - start) / 3600000 });
  }
  return out;
}

/** "(617) 555-0142" → "+16175550142". Null when it cannot be a US/intl number. */
export function toE164(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

// ---- Cost math ------------------------------------------------------------------

function num(v: unknown): number | null {
  if (v == null || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Hours an entry counts for, running entries capped (see entryHours). */
function hoursOf(e: Pick<TimeEntry, "started_at" | "ended_at">, now: number): number {
  const start = Date.parse(e.started_at);
  const end = e.ended_at ? Date.parse(e.ended_at) : Math.min(now, start + MAX_PROJECT_ENTRY_HOURS * 3600000);
  return Math.max(0, (end - start) / 3600000);
}

/**
 * The rate an hour of job time costs. The shift's pay_rate is the rate that
 * was actually in force when the work happened; the worker's current rate is
 * the fallback for job time logged off the pay clock (or before shifts
 * stamped a rate). A raise next month must not re-price last month's jobs.
 */
export function entryRate(
  e: Pick<TimeEntry, "worker_id" | "shift_id">,
  shiftRates: Map<string, number | string | null>,
  workerRates: Map<string, number | string | null | undefined>,
): number | null {
  const fromShift = e.shift_id ? num(shiftRates.get(e.shift_id)) : null;
  return fromShift ?? num(workerRates.get(e.worker_id));
}

export interface WorkerLabor { workerId: string; hours: number; cost: number | null }
export interface JobLabor {
  jobId: string;
  hours: number;
  /** Cost of the hours that have a rate. */
  cost: number;
  /** Hours with no rate anywhere — the cost is understated by these. */
  unratedHours: number;
  byWorker: WorkerLabor[];
}

export function jobLaborRollup(
  entries: Pick<TimeEntry, "job_id" | "worker_id" | "shift_id" | "started_at" | "ended_at">[],
  shiftRates: Map<string, number | string | null>,
  workerRates: Map<string, number | string | null | undefined>,
  now = Date.now(),
): Map<string, JobLabor> {
  const jobs = new Map<string, JobLabor>();
  const workers = new Map<string, Map<string, WorkerLabor>>();
  for (const e of entries) {
    const h = hoursOf(e, now);
    const rate = entryRate(e, shiftRates, workerRates);
    let job = jobs.get(e.job_id);
    if (!job) { job = { jobId: e.job_id, hours: 0, cost: 0, unratedHours: 0, byWorker: [] }; jobs.set(e.job_id, job); workers.set(e.job_id, new Map()); }
    const byW = workers.get(e.job_id)!;
    let w = byW.get(e.worker_id);
    if (!w) { w = { workerId: e.worker_id, hours: 0, cost: 0 }; byW.set(e.worker_id, w); }
    job.hours += h; w.hours += h;
    if (rate == null) { job.unratedHours += h; w.cost = null; }
    else { job.cost += h * rate; if (w.cost != null) w.cost += h * rate; }
  }
  for (const [id, job] of jobs) {
    job.cost = Math.round(job.cost * 100) / 100;
    job.byWorker = [...workers.get(id)!.values()]
      .map((w) => ({ ...w, cost: w.cost == null ? null : Math.round(w.cost * 100) / 100 }))
      .sort((a, b) => b.hours - a.hours);
  }
  return jobs;
}

/** Percent of the labor budget used, or null when there is no budget. */
export function budgetUsedPct(hours: number, budgetHours: number | string | null | undefined): number | null {
  const b = num(budgetHours);
  if (b == null || b === 0) return null;
  return Math.round((hours / b) * 100);
}

// ---- Utilization ------------------------------------------------------------------

type Interval = [number, number];

function merge(intervals: Interval[]): Interval[] {
  const sorted = intervals.filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
  const out: Interval[] = [];
  for (const [a, b] of sorted) {
    const last = out[out.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}

function subtract(base: Interval[], cut: Interval[]): Interval[] {
  let out = base;
  for (const [ca, cb] of merge(cut)) {
    out = out.flatMap(([a, b]): Interval[] => {
      if (cb <= a || ca >= b) return [[a, b]];
      return ([[a, ca], [cb, b]] as Interval[]).filter(([x, y]) => y > x);
    });
  }
  return out;
}

function overlap(a: Interval[], b: Interval[]): number {
  let total = 0;
  for (const [a1, a2] of a) for (const [b1, b2] of b) total += Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
  return total;
}

const len = (xs: Interval[]) => xs.reduce((s, [a, b]) => s + (b - a), 0);

export interface WorkerUtilization {
  workerId: string;
  /** Paid time on the payroll clock this week (unpaid breaks excluded). */
  payrollHours: number;
  /** Paid time that was also on a job clock. */
  jobHours: number;
  /** Paid time on no job — shop time, cleanup, errands, forgotten timers. */
  unassignedHours: number;
  /** Job time logged while off the pay clock. */
  offPayrollJobHours: number;
  /** jobHours / payrollHours, rounded percent; null with no paid time. */
  utilizationPct: number | null;
}

/**
 * Per worker for one week: how much paid time landed on a job. Rejected
 * shifts never count, matching payroll. Running entries are capped exactly as
 * job cost caps them.
 */
export function weeklyUtilization(
  entries: Pick<TimeEntry, "worker_id" | "started_at" | "ended_at">[],
  shifts: Pick<TimeShift, "id" | "worker_id" | "started_at" | "ended_at" | "status">[],
  breaks: Pick<TimeBreak, "shift_id" | "started_at" | "ended_at" | "paid">[],
  week: { start: string; end: string },
  now = Date.now(),
): WorkerUtilization[] {
  const ws = Date.parse(week.start), we = Math.min(Date.parse(week.end), now);
  const clip = ([a, b]: Interval): Interval => [Math.max(a, ws), Math.min(b, we)];
  const paid = new Map<string, Interval[]>();
  const breaksByShift = new Map<string, Interval[]>();
  for (const b of breaks) {
    if (b.paid) continue;
    const list = breaksByShift.get(b.shift_id) || [];
    list.push([Date.parse(b.started_at), b.ended_at ? Date.parse(b.ended_at) : now]);
    breaksByShift.set(b.shift_id, list);
  }
  for (const s of shifts) {
    if (s.status === "rejected") continue;
    const iv = clip([Date.parse(s.started_at), s.ended_at ? Date.parse(s.ended_at) : now]);
    const list = paid.get(s.worker_id) || [];
    list.push(...subtract([iv], breaksByShift.get(s.id) || []));
    paid.set(s.worker_id, list);
  }
  const job = new Map<string, Interval[]>();
  for (const e of entries) {
    const start = Date.parse(e.started_at);
    const end = e.ended_at ? Date.parse(e.ended_at) : Math.min(now, start + MAX_PROJECT_ENTRY_HOURS * 3600000);
    const list = job.get(e.worker_id) || [];
    list.push(clip([start, end]));
    job.set(e.worker_id, list);
  }
  const ids = new Set([...paid.keys(), ...job.keys()]);
  const H = 3600000;
  return [...ids].map((workerId) => {
    const p = merge(paid.get(workerId) || []);
    const j = merge(job.get(workerId) || []);
    const payrollMs = len(p), jobMs = len(j), covered = overlap(p, j);
    return {
      workerId,
      payrollHours: payrollMs / H,
      jobHours: covered / H,
      unassignedHours: Math.max(0, payrollMs - covered) / H,
      offPayrollJobHours: Math.max(0, jobMs - covered) / H,
      utilizationPct: payrollMs > 0 ? Math.round((covered / payrollMs) * 100) : null,
    };
  }).filter((r) => r.payrollHours > 0 || r.offPayrollJobHours > 0);
}
