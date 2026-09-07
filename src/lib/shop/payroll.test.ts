import { describe, it, expect } from "vitest";
import { calculatePayroll, payrollWeek, payrollMidnight } from "./payroll";
import type { TimeShift, TimeBreak } from "./shared";
const workers = [{ id: "w", name: "Worker", active: true }, { id: "old", name: "Former", active: false }];
const shift = (patch: Partial<TimeShift> = {}) => ({ id: "s", worker_id: "w", started_at: "2026-09-07T12:00:00Z", ended_at: "2026-09-07T20:00:00Z", status: "approved", pay_rate: 25, ...patch }) as TimeShift;
const br = (patch: Partial<TimeBreak> = {}) => ({ id: "b", shift_id: "s", started_at: "2026-09-07T16:00:00Z", ended_at: "2026-09-07T16:30:00Z", paid: false, ...patch });
const now = Date.parse("2026-09-14T04:00:00Z");
const week = payrollWeek("2026-09-07", now);
const calc = (shifts: TimeShift[], breaks: TimeBreak[] = [], clock = now) => calculatePayroll(workers, shifts, breaks, week, clock).find(r => r.id === "w")!;
describe("weekly payroll", () => {
  it("uses Eastern Monday boundaries and accepts Sunday dates", () => {
    expect(payrollWeek("2026-09-13", now)).toEqual(week);
    expect(week.start).toBe("2026-09-07T04:00:00.000Z");
    expect(payrollWeek(undefined, Date.parse("2026-09-07T03:59:00Z")).key).toBe("2026-08-31");
    expect(payrollWeek("2026-02-30", now).key).toBe("2026-09-14");
  });
  it("handles both DST transitions and daily midnights", () => {
    const spring = payrollWeek("2026-03-02"), fall = payrollWeek("2026-10-26");
    expect((Date.parse(spring.end) - Date.parse(spring.start)) / 3600000).toBe(167);
    expect((Date.parse(fall.end) - Date.parse(fall.start)) / 3600000).toBe(169);
    expect(payrollMidnight("2026-03-08")).toBe("2026-03-08T05:00:00.000Z");
    expect(payrollMidnight("2026-03-09")).toBe("2026-03-09T04:00:00.000Z");
  });
  it("splits crossing shifts and breaks at week boundaries", () => {
    const row = calc([shift({ started_at: "2026-09-07T02:00:00Z", ended_at: "2026-09-07T06:00:00Z" })], [br({ started_at: "2026-09-07T03:30:00Z", ended_at: "2026-09-07T04:30:00Z" })]);
    expect(row.hours).toBe(1.5); expect(row.basePay).toBe(37.5);
  });
  it("merges overlapping unpaid breaks and retains paid breaks", () => {
    const row = calc([shift()], [br(), br({ started_at: "2026-09-07T16:15:00Z", ended_at: "2026-09-07T17:00:00Z" }), br({ paid: true, started_at: "2026-09-07T18:00:00Z", ended_at: "2026-09-07T19:00:00Z" })]);
    expect(row.hours).toBe(7); expect(row.basePay).toBe(175);
  });
  it("estimates ongoing work through now and pauses unpaid breaks", () => {
    const row = calc([shift({ ended_at: null, status: "open" })], [br({ ended_at: null })], Date.parse("2026-09-07T18:00:00Z"));
    expect(row.hours).toBe(4); expect(row.openHours).toBe(4); expect(row.pendingHours).toBe(4);
  });
  it("keeps rejected time visible but excluded from wages and weekly thresholds", () => {
    const row = calc([shift({ status: "rejected" })]);
    expect(row.rejectedHours).toBe(8); expect(row.hours).toBe(0); expect(row.basePay).toBe(0);
  });
  it("preserves saved rates and signals missing historical rates", () => {
    const row = calc([shift(), shift({ id: "s2", pay_rate: 30 }), shift({ id: "s3", pay_rate: null })]);
    expect(row.basePay).toBe(440); expect(row.missingRateHours).toBe(8);
  });
  it("shows all workers including inactive and zero-hour workers", () => {
    const rows = calculatePayroll(workers, [shift({ worker_id: "old" })], [], week, now);
    expect(rows).toHaveLength(2); expect(rows.find(r => r.id === "old")?.basePay).toBe(200); expect(rows.find(r => r.id === "w")?.hours).toBe(0);
  });
  it("flags hours over 40 without inventing an overtime premium", () => {
    const row = calc(Array.from({ length: 6 }, (_, i) => shift({ id: String(i), started_at: `2026-09-${String(7 + i).padStart(2, "0")}T12:00:00Z`, ended_at: `2026-09-${String(7 + i).padStart(2, "0")}T20:00:00Z` })));
    expect(row.hours).toBe(48); expect(row.regular).toBe(40); expect(row.overtime).toBe(8); expect(row.basePay).toBe(1200);
  });
});
