import { describe, expect, it } from "vitest";
import {
  budgetUsedPct,
  clockOutEndFor,
  dueTimerAlerts,
  entryRate,
  jobGateState,
  jobLaborRollup,
  toE164,
  visibleJobsFor,
  weeklyUtilization,
  workdayEndAfter,
  type TimerAlertCandidate,
} from "./job-timer";

const crew = { is_admin: false };
const admin = { is_admin: true };
const H = 3600000;

describe("job gate", () => {
  it("locks a job for crew until that job's time runs", () => {
    expect(jobGateState(crew, null, "a")).toEqual({ locked: true, runningJobId: null });
    expect(jobGateState(crew, { job_id: "a" }, "a")).toEqual({ locked: false, runningJobId: null });
    expect(jobGateState(crew, { job_id: "b" }, "a")).toEqual({ locked: true, runningJobId: "b" });
  });
  it("exempts owners and admins", () => {
    expect(jobGateState(admin, null, "a").locked).toBe(false);
    expect(jobGateState({ is_admin: true }, { job_id: "b" }, "a").locked).toBe(false);
  });
  it("shows crew only the running job, except while switching", () => {
    const jobs = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(visibleJobsFor(jobs, crew, { job_id: "b" })).toEqual([{ id: "b" }]);
    expect(visibleJobsFor(jobs, crew, { job_id: "b" }, true)).toHaveLength(3);
    expect(visibleJobsFor(jobs, crew, null)).toHaveLength(3);
    expect(visibleJobsFor(jobs, admin, { job_id: "b" })).toHaveLength(3);
  });
});

describe("clock-out ends job time", () => {
  it("closes a running entry at the clock-out instant", () => {
    expect(clockOutEndFor({ started_at: "2026-10-10T12:00:00Z", ended_at: null }, "2026-10-10T21:00:00.000Z")).toBe("2026-10-10T21:00:00.000Z");
  });
  it("leaves an entry started after the (late-arriving) clock-out tap alone", () => {
    expect(clockOutEndFor({ started_at: "2026-10-11T11:00:00Z", ended_at: null }, "2026-10-10T21:00:00Z")).toBeNull();
  });
  it("never reopens or moves a closed entry", () => {
    expect(clockOutEndFor({ started_at: "2026-10-10T12:00:00Z", ended_at: "2026-10-10T13:00:00Z" }, "2026-10-10T21:00:00Z")).toBeNull();
  });
});

describe("work-day end in shop time", () => {
  it("is 17:00 New York on the start day (EDT = 21:00Z)", () => {
    expect(new Date(workdayEndAfter("2026-10-09T12:00:00Z")).toISOString()).toBe("2026-10-09T21:00:00.000Z");
  });
  it("rolls to the next day when started after 17:00, across DST (EST = 22:00Z)", () => {
    expect(new Date(workdayEndAfter("2026-10-31T22:30:00Z")).toISOString()).toBe("2026-11-01T22:00:00.000Z");
  });
});

describe("forgotten-timer alerts", () => {
  const start = Date.parse("2026-10-09T13:00:00Z"); // 9:00 AM EDT
  const cand = (over: Partial<TimerAlertCandidate> = {}): TimerAlertCandidate => ({
    entry: { id: "e1", worker_id: "w1", job_id: "j1", started_at: new Date(start).toISOString() },
    lastActivityMs: null, payrollOpen: true, payrollEnrolled: true, ...over,
  });

  it("is quiet for a normal working morning", () => {
    expect(dueTimerAlerts([cand({ lastActivityMs: start + 2 * H })], new Set(), start + 3 * H)).toEqual([]);
  });
  it("fires after 4h with no activity on the job", () => {
    const due = dueTimerAlerts([cand({ lastActivityMs: start + 30 * 60000 })], new Set(), start + 4.6 * H);
    expect(due).toHaveLength(1);
    expect(due[0].kinds).toEqual(["idle"]);
  });
  it("does not count activity before the entry started", () => {
    expect(dueTimerAlerts([cand({ lastActivityMs: start - 5 * H })], new Set(), start + 3.9 * H)).toEqual([]);
  });
  it("fires 15 minutes after the 5 PM work-day end, not before", () => {
    const end = Date.parse("2026-10-09T21:00:00Z");
    expect(dueTimerAlerts([cand({ lastActivityMs: end - H })], new Set(), end + 10 * 60000)).toEqual([]);
    expect(dueTimerAlerts([cand({ lastActivityMs: end - H })], new Set(), end + 16 * 60000)[0].kinds).toEqual(["after_hours"]);
  });
  it("fires when the pay clock is off, after a grace period, only for payroll workers", () => {
    expect(dueTimerAlerts([cand({ payrollOpen: false, lastActivityMs: start })], new Set(), start + 10 * 60000)).toEqual([]);
    expect(dueTimerAlerts([cand({ payrollOpen: false, lastActivityMs: start })], new Set(), start + 20 * 60000)[0].kinds).toEqual(["payroll_off"]);
    expect(dueTimerAlerts([cand({ payrollOpen: false, payrollEnrolled: false, lastActivityMs: start })], new Set(), start + 20 * 60000)).toEqual([]);
  });
  it("is deduped per entry and rule, and merges rules due together", () => {
    const now = Date.parse("2026-10-09T21:20:00Z");
    const first = dueTimerAlerts([cand({ payrollOpen: false })], new Set(), now);
    expect(first[0].kinds).toEqual(["idle", "after_hours", "payroll_off"]);
    const sent = new Set(first[0].kinds.map((k) => `e1:${k}`));
    expect(dueTimerAlerts([cand({ payrollOpen: false })], sent, now + H)).toEqual([]);
  });
  it("leaves entries past the 12h cap to the auto-close", () => {
    expect(dueTimerAlerts([cand()], new Set(), start + 12.5 * H)).toEqual([]);
  });
});

describe("phone numbers", () => {
  it("normalizes US numbers to E.164", () => {
    expect(toE164("(617) 555-0142")).toBe("+16175550142");
    expect(toE164("1-617-555-0142")).toBe("+16175550142");
    expect(toE164("+55 11 91234-5678")).toBe("+5511912345678");
    expect(toE164("555-0142")).toBeNull();
    expect(toE164(null)).toBeNull();
  });
});

describe("labor cost", () => {
  const entries = [
    { job_id: "j1", worker_id: "w1", shift_id: "s1", started_at: "2026-10-09T13:00:00Z", ended_at: "2026-10-09T17:00:00Z" },
    { job_id: "j1", worker_id: "w2", shift_id: null, started_at: "2026-10-09T13:00:00Z", ended_at: "2026-10-09T15:30:00Z" },
    { job_id: "j1", worker_id: "w3", shift_id: null, started_at: "2026-10-09T13:00:00Z", ended_at: "2026-10-09T14:00:00Z" },
    { job_id: "j2", worker_id: "w1", shift_id: "s1", started_at: "2026-10-09T17:00:00Z", ended_at: "2026-10-09T18:00:00Z" },
  ];
  const shiftRates = new Map<string, number | string | null>([["s1", "30"]]);
  const workerRates = new Map<string, number | null>([["w1", 40], ["w2", 25], ["w3", null]]);

  it("prices hours at the rate in force on the shift, falling back to the worker's rate", () => {
    expect(entryRate({ worker_id: "w1", shift_id: "s1" }, shiftRates, workerRates)).toBe(30);
    expect(entryRate({ worker_id: "w2", shift_id: null }, shiftRates, workerRates)).toBe(25);
    expect(entryRate({ worker_id: "w3", shift_id: null }, shiftRates, workerRates)).toBeNull();
  });
  it("rolls up hours × rate per job and per worker, flagging unrated hours", () => {
    const j1 = jobLaborRollup(entries, shiftRates, workerRates).get("j1")!;
    expect(j1.hours).toBeCloseTo(7.5);
    expect(j1.cost).toBe(4 * 30 + 2.5 * 25);
    expect(j1.unratedHours).toBeCloseTo(1);
    expect(j1.byWorker.map((w) => [w.workerId, w.hours, w.cost])).toEqual([["w1", 4, 120], ["w2", 2.5, 62.5], ["w3", 1, null]]);
  });
  it("caps a running entry at 12h like entryHours", () => {
    const now = Date.parse("2026-10-10T13:00:00Z");
    const r = jobLaborRollup([{ job_id: "j", worker_id: "w2", shift_id: null, started_at: "2026-10-09T13:00:00Z", ended_at: null }], new Map(), workerRates, now);
    expect(r.get("j")!.hours).toBe(12);
  });
  it("reports % of labor budget used", () => {
    expect(budgetUsedPct(30, 40)).toBe(75);
    expect(budgetUsedPct(45, "40")).toBe(113);
    expect(budgetUsedPct(10, null)).toBeNull();
    expect(budgetUsedPct(10, 0)).toBeNull();
  });
});

describe("utilization", () => {
  const week = { start: "2026-10-05T04:00:00.000Z", end: "2026-10-12T04:00:00.000Z" };
  it("splits paid time into job time and unassigned shop time, minus unpaid breaks", () => {
    const shifts = [{ id: "s1", worker_id: "w1", started_at: "2026-10-09T11:00:00Z", ended_at: "2026-10-09T21:00:00Z", status: "submitted" as const }];
    const breaks = [{ shift_id: "s1", started_at: "2026-10-09T16:00:00Z", ended_at: "2026-10-09T16:30:00Z", paid: false }];
    const entries = [
      { worker_id: "w1", started_at: "2026-10-09T12:00:00Z", ended_at: "2026-10-09T18:00:00Z" },
      { worker_id: "w1", started_at: "2026-10-09T20:30:00Z", ended_at: "2026-10-09T22:00:00Z" },
    ];
    const [u] = weeklyUtilization(entries, shifts, breaks, week, Date.parse("2026-10-11T12:00:00Z"));
    expect(u.payrollHours).toBeCloseTo(9.5);
    expect(u.jobHours).toBeCloseTo(6); // 5.5 + 0.5 inside paid time
    expect(u.unassignedHours).toBeCloseTo(3.5);
    expect(u.offPayrollJobHours).toBeCloseTo(1.5); // 0.5 on break + 1h after clock-out
    expect(u.utilizationPct).toBe(63);
  });
  it("ignores rejected shifts, as payroll does", () => {
    const shifts = [{ id: "s1", worker_id: "w1", started_at: "2026-10-09T11:00:00Z", ended_at: "2026-10-09T21:00:00Z", status: "rejected" as const }];
    expect(weeklyUtilization([], shifts, [], week, Date.parse("2026-10-11T12:00:00Z"))).toEqual([]);
  });
});
