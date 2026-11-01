// Regression: replay Worker A's real Oct 19–24 taps through the whole payroll
// path (work-hours window → stored shift → weekly/daily payroll) and require
// the owner-confirmed third-party totals: 57:37 and $1,267.56.
import { describe, expect, it } from "vitest";
import { addPayrollDays, calculatePayroll, payrollMidnight, payrollWeek } from "./payroll";
import { DEFAULT_WORK_HOURS, endDecision, payrollTimes, type WindowRecord } from "./work-hours";
import { isMissedClockOut } from "./clock-rules";
import type { TimeShift } from "./shared";
import {
  WORKER_A_EXPECTED_DAILY_PAY, WORKER_A_EXPECTED_MINUTES, WORKER_A_EXPECTED_TOTAL_MINUTES,
  WORKER_A_EXPECTED_TOTAL_PAY, WORKER_A_RATE, WORKER_A_TAPS,
} from "./fixtures/worker-a-oct-19-24";

const workers = [{ id: "worker-a", name: "Worker A", active: true }];
const now = Date.parse("2026-11-01T12:00:00Z");
const week = payrollWeek("2026-10-19", now);

/** What applyEndWindow + the owner's actions leave on each shift row. */
function storedShifts(opts: { correctionsApproved: boolean }): { shifts: TimeShift[]; pending: Set<string> } {
  const pending = new Set<string>();
  const shifts = WORKER_A_TAPS.map((tap) => {
    const records: WindowRecord[] = [];
    // Same rule as work-hours-db.applyEndWindow: no window question for a
    // missed clock-out; otherwise an end after 5 PM is recorded and answered.
    const missed = isMissedClockOut(Date.parse(tap.in), Date.parse(tap.out), now);
    const d = endDecision(tap.in, tap.out, DEFAULT_WORK_HOURS);
    if (!missed && d.ask) {
      const base = { shiftId: tap.id, workerId: "worker-a", edge: "end" as const, punchedAt: tap.out, edgeAt: d.edgeAt, ask: true };
      records.push({ ...base, answer: "pending", at: tap.out });
      if (tap.endAnswer) records.push({ ...base, answer: tap.endAnswer, at: new Date(Date.parse(tap.out) + 5000).toISOString() });
    }
    let row = payrollTimes({ started_at: tap.in, ended_at: tap.out }, records);
    if (tap.correctedOut) {
      if (opts.correctionsApproved) row = { started_at: tap.in, ended_at: tap.correctedOut };
      else pending.add(tap.id);
    }
    return { id: tap.id, worker_id: "worker-a", pay_rate: WORKER_A_RATE, status: "submitted", ...row } as TimeShift;
  });
  return { shifts, pending };
}

function dailyPay(shifts: TimeShift[], pending: Set<string>) {
  return Object.fromEntries(Array.from({ length: 7 }, (_, i) => {
    const date = addPayrollDays(week.key, i);
    const row = calculatePayroll(workers, shifts, [], { ...week, start: payrollMidnight(date), end: payrollMidnight(addPayrollDays(date, 1)) }, now, pending)[0];
    return [date, { minutes: Math.round(row.hours * 60), pay: row.basePay }];
  }));
}

describe("Worker A, Oct 19–24 2026 replay", () => {
  it("matches the third-party sheet to the minute and the cent once the forgotten clock-out is corrected", () => {
    const { shifts, pending } = storedShifts({ correctionsApproved: true });
    const weekly = calculatePayroll(workers, shifts, [], week, now, pending)[0];
    expect(Math.round(weekly.hours * 60)).toBe(WORKER_A_EXPECTED_TOTAL_MINUTES);
    expect(weekly.reviewShifts ?? 0).toBe(0);
    expect(weekly.overtime).toBeGreaterThan(0); // the 40-h split exists in data…
    expect(weekly.basePay).toBeCloseTo(WORKER_A_RATE * WORKER_A_EXPECTED_TOTAL_MINUTES / 60, 2); // …but pay is straight time
    const days = dailyPay(shifts, pending);
    for (const [day, minutes] of Object.entries(WORKER_A_EXPECTED_MINUTES)) {
      expect({ day, minutes: days[day].minutes, pay: days[day].pay }).toEqual({ day, minutes, pay: WORKER_A_EXPECTED_DAILY_PAY[day] });
    }
    // The payroll page sums the daily (cent-rounded) wages.
    const total = Math.round(Object.values(days).reduce((s, d) => s + d.pay, 0) * 100) / 100;
    expect(total).toBe(WORKER_A_EXPECTED_TOTAL_PAY);
  });

  it("before the correction: the forgotten clock-out is held for review — never paid as 23.9 h, never as zero", () => {
    const { shifts, pending } = storedShifts({ correctionsApproved: false });
    const weekly = calculatePayroll(workers, shifts, [], week, now, pending)[0];
    expect(weekly.reviewShifts).toBe(1);
    const held = weekly.punches!.find((p) => p.id === "a-1021")!;
    expect(held.hold).toBe("correction_pending");
    expect(held.hours).toBeGreaterThan(23.8); // the raw elapsed time stays visible to the owner
    expect(Math.round(weekly.hours * 60)).toBe(WORKER_A_EXPECTED_TOTAL_MINUTES - 611);
  });

  it("without any correction request the 23.9-h shift is still held (missed clock-out)", () => {
    const { shifts } = storedShifts({ correctionsApproved: false });
    const weekly = calculatePayroll(workers, shifts, [], week, now, new Set())[0];
    expect(weekly.punches!.find((p) => p.id === "a-1021")!.hold).toBe("missed_clock_out");
    expect(weekly.reviewShifts).toBe(1);
  });

  it("the 7:09–8:23 PM call-back pays 1:14 even though the owner pressed deny", () => {
    const { shifts } = storedShifts({ correctionsApproved: true });
    const evening = shifts.find((s) => s.id === "a-1023b")!;
    expect(evening.ended_at).toBe("2026-10-24T00:23:13.674Z");
  });
});
