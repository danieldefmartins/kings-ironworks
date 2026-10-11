// Job time — server side: the gate's data, clock-out closing job time,
// forgotten-timer alerts, and the owner's labor-cost loaders.
import {
  ORG_ID,
  audit,
  closeStaleProjectEntries,
  getJob,
  getRunningEntry,
  sbSelect,
  sbUpdate,
  type Job,
  type TimeBreak,
  type TimeEntry,
  type TimeShift,
  type Worker,
} from "./db";
import { canViewOwnerFinancials, hoursToHm } from "./shared";
import {
  TIMER_ALERT_ACTION,
  clockOutEndFor,
  dueTimerAlerts,
  isJobGateExempt,
  jobGateState,
  toE164,
  type TimerAlert,
  type TimerAlertKind,
} from "./job-timer";
import { jt } from "./job-timer-i18n";
import { sendSms } from "./sms";
import { sendTelegram, tgEscape } from "./notify";

// ---- Running job + gate -------------------------------------------------------

export interface RunningJob {
  entryId: string;
  jobId: string;
  label: string;
  startedAt: string;
}

function jobLabel(job: Pick<Job, "customer_name" | "job_number"> | null | undefined): string {
  return job?.customer_name || job?.job_number || "Job";
}

export async function getRunningJob(workerId: string): Promise<RunningJob | null> {
  const entry = await getRunningEntry(workerId);
  if (!entry) return null;
  const job = await getJob(entry.job_id).catch(() => null);
  return { entryId: entry.id, jobId: entry.job_id, label: jobLabel(job), startedAt: entry.started_at };
}

export interface LoadedGate {
  locked: boolean;
  /** Set when a different job's time is running — starting this one stops it. */
  runningElsewhere: { jobId: string; label: string } | null;
}

/** Server-side gate for a job's detail screens (job, measure list, sheets). */
export async function loadJobGate(worker: Pick<Worker, "id" | "is_admin">, jobId: string): Promise<LoadedGate> {
  if (isJobGateExempt(worker)) return { locked: false, runningElsewhere: null };
  const running = await getRunningEntry(worker.id);
  const gate = jobGateState(worker, running, jobId);
  if (!gate.locked) return { locked: false, runningElsewhere: null };
  if (!gate.runningJobId) return { locked: true, runningElsewhere: null };
  const other = await getJob(gate.runningJobId).catch(() => null);
  return { locked: true, runningElsewhere: { jobId: gate.runningJobId, label: jobLabel(other) } };
}

// ---- Clock-out ends job time ------------------------------------------------------

/**
 * Payroll clock-out closes the worker's running job time at the clock-out
 * instant. Never throws: a clock-out must not fail because of job time.
 * Returns how many entries were closed.
 */
export async function endJobTimeOnClockOut(workerId: string, at: string): Promise<number> {
  try {
    const open = await sbSelect<Pick<TimeEntry, "id" | "started_at" | "ended_at">[]>(
      "kiw_shop_time_entries",
      `select=id,started_at,ended_at&org_id=eq.${ORG_ID}&worker_id=eq.${workerId}&ended_at=is.null`
    );
    let closed = 0;
    for (const e of open) {
      const end = clockOutEndFor(e, at);
      if (!end) continue;
      // Conditional on still being open, so a concurrent stop wins cleanly.
      await sbUpdate("kiw_shop_time_entries", `org_id=eq.${ORG_ID}&id=eq.${e.id}&ended_at=is.null`, {
        ended_at: end,
        note: "closed: clocked out",
      });
      await audit("project_clock_stop", { workerId, entity: "time_entry", entityId: e.id, detail: { via: "clock_out", at: end } });
      closed++;
    }
    return closed;
  } catch (err) {
    console.error("[job-timer] close on clock-out failed:", err);
    return 0;
  }
}

/** Stop whatever job time this worker has running, now. */
export async function stopRunningJobTime(workerId: string, loc?: { lat: number; lng: number } | null): Promise<number> {
  const rows = await sbUpdate<TimeEntry[]>(
    "kiw_shop_time_entries",
    `org_id=eq.${ORG_ID}&worker_id=eq.${workerId}&ended_at=is.null`,
    { ended_at: new Date().toISOString(), end_lat: loc?.lat ?? null, end_lng: loc?.lng ?? null }
  );
  return rows?.length ?? 0;
}

// ---- Forgotten-timer alerts -----------------------------------------------------

const THROTTLE_MS = 5 * 60 * 1000;
let lastRun = 0;

/** Test hook: let the next call run regardless of the throttle. */
export function resetJobTimerAlertThrottle() {
  lastRun = 0;
}

type AlertWorker = Pick<Worker, "id" | "name" | "phone" | "lang" | "is_admin" | "can_see_prices" | "payroll_excluded">;

// Owner rule: every SMS goes out in the recipient's own language — the
// worker's existing kiw_shop_workers.lang — and Portuguese when none is set.
export function smsLang(lang: string | null | undefined): "en" | "pt" | "es" {
  return lang === "en" || lang === "es" || lang === "pt" ? lang : "pt";
}

const inList = (ids: string[]) => `(${[...new Set(ids)].join(",")})`;

/**
 * Runs opportunistically on shop traffic (like stale-alert.ts), throttled per
 * process and deduplicated through the immutable audit trail, so a restart or
 * a second instance cannot re-send. Also applies the 12h hard cap.
 */
export async function alertForgottenJobTimers(now = Date.now()): Promise<TimerAlert[]> {
  if (now - lastRun < THROTTLE_MS) return [];
  lastRun = now;
  try {
    await closeStaleProjectEntries();
    const running = await sbSelect<TimeEntry[]>(
      "kiw_shop_time_entries",
      `select=id,worker_id,job_id,started_at,ended_at,shift_id&org_id=eq.${ORG_ID}&ended_at=is.null`
    );
    if (!running.length) return [];
    const workerIds = running.map((e) => e.worker_id);
    const earliest = new Date(Math.min(...running.map((e) => Date.parse(e.started_at)))).toISOString();
    const [workers, shifts, sentRows, activity, jobs] = await Promise.all([
      sbSelect<AlertWorker[]>("kiw_shop_workers", `select=id,name,phone,lang,is_admin,can_see_prices,payroll_excluded&org_id=eq.${ORG_ID}&id=in.${inList(workerIds)}`),
      sbSelect<Pick<TimeShift, "worker_id">[]>("kiw_shop_shifts", `select=worker_id&org_id=eq.${ORG_ID}&ended_at=is.null&worker_id=in.${inList(workerIds)}`),
      sbSelect<{ entity_id: string; detail: { kinds?: TimerAlertKind[] } | null }[]>("kiw_shop_audit", `select=entity_id,detail&org_id=eq.${ORG_ID}&action=eq.${TIMER_ALERT_ACTION}&entity_id=in.${inList(running.map((e) => e.id))}`),
      sbSelect<{ worker_id: string; at: string }[]>("kiw_shop_audit", `select=worker_id,at&org_id=eq.${ORG_ID}&worker_id=in.${inList(workerIds)}&at=gte.${encodeURIComponent(earliest)}&action=neq.${TIMER_ALERT_ACTION}&order=at.desc&limit=2000`),
      sbSelect<Pick<Job, "id" | "customer_name" | "job_number">[]>("kiw_shop_jobs", `select=id,customer_name,job_number&org_id=eq.${ORG_ID}&id=in.${inList(running.map((e) => e.job_id))}`),
    ]);
    const byWorker = new Map(workers.map((w) => [w.id, w]));
    const onPayroll = new Set(shifts.map((s) => s.worker_id));
    const sent = new Set<string>();
    for (const r of sentRows) for (const k of r.detail?.kinds || []) sent.add(`${r.entity_id}:${k}`);
    const lastAt = new Map<string, number>();
    for (const a of activity) {
      const t = Date.parse(a.at);
      if (t > (lastAt.get(a.worker_id) ?? 0)) lastAt.set(a.worker_id, t);
    }
    const labels = new Map(jobs.map((j) => [j.id, jobLabel(j)]));

    const due = dueTimerAlerts(
      running.map((e) => {
        const w = byWorker.get(e.worker_id);
        return {
          entry: e,
          lastActivityMs: lastAt.get(e.worker_id) ?? null,
          payrollOpen: onPayroll.has(e.worker_id),
          payrollEnrolled: !!w && !canViewOwnerFinancials(w) && !w.payroll_excluded,
        };
      }),
      sent,
      now
    );

    for (const a of due) {
      const w = byWorker.get(a.workerId);
      const job = labels.get(a.jobId) || "Job";
      const elapsed = hoursToHm(a.elapsedHours);
      const phone = toE164(w?.phone);
      const text = jt(smsLang(w?.lang), a.kinds.includes("payroll_off") && a.kinds.length === 1 ? "smsPayroll" : "smsCheck", { job, elapsed });
      let sms = false;
      if (phone) {
        try { sms = await sendSms(phone, text); } catch (err) { console.error("[job-timer] sms failed:", err); }
      }
      const reasons = a.kinds.map((k) => ({ idle: "no activity 4h+", after_hours: "past 5:00 PM", payroll_off: "not clocked in for pay" })[k]).join(", ");
      const telegram = await sendTelegram(
        `⏱ <b>KIW job time</b>: ${tgEscape(w?.name || "A worker")} — ${tgEscape(job)}, running <b>${elapsed}</b> (${reasons}). ` +
        `SMS to worker: ${sms ? "sent" : phone ? "not sent" : "no phone on file"}.`
      );
      // The audit row is the dedupe key; record the attempt either way so a
      // failing provider cannot become a message every five minutes.
      await audit(TIMER_ALERT_ACTION, { workerId: a.workerId, entity: "time_entry", entityId: a.entryId, detail: { kinds: a.kinds, jobId: a.jobId, hours: Number(a.elapsedHours.toFixed(2)), sms, telegram } });
    }
    return due;
  } catch (err) {
    console.error("[job-timer] alert sweep failed:", err);
    return [];
  }
}

// ---- Owner: labor cost ----------------------------------------------------------------

/** Every job entry, paged — the old 500-row read silently truncated job costs. */
export async function listAllTimeEntries(filter = ""): Promise<TimeEntry[]> {
  const out: TimeEntry[] = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await sbSelect<TimeEntry[]>(
      "kiw_shop_time_entries",
      `select=*&org_id=eq.${ORG_ID}${filter}&order=started_at.desc,id.desc&limit=1000&offset=${offset}`
    );
    out.push(...page);
    if (page.length < 1000) return out;
  }
}

/** pay_rate of the shifts these entries were stamped with. */
export async function shiftRatesFor(entries: Pick<TimeEntry, "shift_id">[]): Promise<Map<string, number | string | null>> {
  const ids = [...new Set(entries.map((e) => e.shift_id).filter((x): x is string => !!x))];
  const out = new Map<string, number | string | null>();
  for (let i = 0; i < ids.length; i += 150) {
    const rows = await sbSelect<Pick<TimeShift, "id" | "pay_rate">[]>(
      "kiw_shop_shifts",
      `select=id,pay_rate&org_id=eq.${ORG_ID}&id=in.${inList(ids.slice(i, i + 150))}`
    );
    for (const r of rows) out.set(r.id, r.pay_rate ?? null);
  }
  return out;
}

/**
 * Labor budget hours per job. Null map when the column does not exist yet
 * (migration 20261011000001 not applied) so the page still renders.
 */
export async function getLaborBudgets(jobId?: string): Promise<Map<string, number> | null> {
  try {
    const rows = await sbSelect<{ id: string; labor_budget_hours: number | string | null }[]>(
      "kiw_shop_jobs",
      `select=id,labor_budget_hours&org_id=eq.${ORG_ID}${jobId ? `&id=eq.${jobId}` : "&labor_budget_hours=not.is.null"}`
    );
    return new Map(rows.filter((r) => r.labor_budget_hours != null).map((r) => [r.id, Number(r.labor_budget_hours)]));
  } catch {
    return null;
  }
}

export async function setLaborBudget(jobId: string, hours: number | null): Promise<void> {
  await sbUpdate("kiw_shop_jobs", `org_id=eq.${ORG_ID}&id=eq.${jobId}`, { labor_budget_hours: hours });
}

/** Shifts and breaks overlapping a window, for utilization. */
export async function payrollWindow(since: string): Promise<{ shifts: TimeShift[]; breaks: TimeBreak[] }> {
  const shifts = await sbSelect<TimeShift[]>(
    "kiw_shop_shifts",
    `select=id,worker_id,started_at,ended_at,status,pay_rate&org_id=eq.${ORG_ID}&or=(ended_at.is.null,ended_at.gt.${encodeURIComponent(since)})&order=started_at.asc&limit=5000`
  );
  const ids = shifts.map((s) => s.id);
  const breaks: TimeBreak[] = [];
  for (let i = 0; i < ids.length; i += 150) {
    breaks.push(...await sbSelect<TimeBreak[]>(
      "kiw_shop_breaks",
      `select=id,shift_id,started_at,ended_at,paid&org_id=eq.${ORG_ID}&shift_id=in.${inList(ids.slice(i, i + 150))}`
    ));
  }
  return { shifts, breaks };
}
