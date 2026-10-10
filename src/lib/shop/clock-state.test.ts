import { beforeEach, expect, it, vi } from "vitest";
import type { TimeShift } from "./shared";
const m = vi.hoisted(() => ({ open: vi.fn(), rate: vi.fn(), shifts: vi.fn(), breaks: vi.fn(), openBreaks: vi.fn() }));
vi.mock("./db", () => ({ getOpenShift: m.open, getWorkerRate: m.rate, listWorkerShifts: m.shifts, listWorkerBreaks: m.breaks, getShiftBreaks: m.openBreaks }));
import { loadClockState } from "./clock-state";
const now = Date.parse("2026-10-10T14:00:00Z");
const shift = (patch: Partial<TimeShift> = {}) => ({ id: "s", worker_id: "worker", started_at: "2026-10-06T12:00:00Z", ended_at: "2026-10-06T20:00:00Z", status: "submitted", pay_rate: 25, ...patch }) as TimeShift;
beforeEach(() => { vi.clearAllMocks(); m.open.mockResolvedValue(null); m.rate.mockResolvedValue(50); m.shifts.mockResolvedValue([]); m.breaks.mockResolvedValue([]); m.openBreaks.mockResolvedValue([]); });
it("excludes Daniel's rejected multi-day record from personal earnings without removing history", async () => {
  m.shifts.mockResolvedValue([shift({ started_at: "2026-10-02T14:56:54Z", ended_at: "2026-10-10T13:12:37Z", status: "rejected", pay_rate: 50 })]);
  expect(await loadClockState({ id: "worker" }, now)).toMatchObject({ shift: null, weekHoursBeforeShift: 0, weekEarningsBeforeShift: 0 });
});
it("uses the saved pay rate and excludes unpaid breaks", async () => {
  m.shifts.mockResolvedValue([shift()]);
  m.breaks.mockResolvedValue([{ shift_id: "s", started_at: "2026-10-06T16:00:00Z", ended_at: "2026-10-06T16:30:00Z", paid: false }]);
  expect(await loadClockState({ id: "worker" }, now)).toMatchObject({ hourlyRate: 50, weekHoursBeforeShift: 7.5, weekEarningsBeforeShift: 187.5 });
});
it("includes only the current week's part of an overlapping shift", async () => {
  m.shifts.mockResolvedValue([shift({ started_at: "2026-10-05T02:00:00Z", ended_at: "2026-10-05T06:00:00Z" })]);
  expect(await loadClockState({ id: "worker" }, now)).toMatchObject({ weekHoursBeforeShift: 2, weekEarningsBeforeShift: 50 });
  expect(m.shifts).toHaveBeenCalledWith("worker", "2026-10-05T04:00:00.000Z");
});
it("keeps an open shift separate for live ticking and scopes reads to the signed-in worker", async () => {
  const open = shift({ ended_at: null }); m.open.mockResolvedValue(open); m.shifts.mockResolvedValue([open]);
  expect(await loadClockState({ id: "worker" }, now)).toMatchObject({ shift: open, weekHoursBeforeShift: 0, weekEarningsBeforeShift: 0 });
  expect(m.open).toHaveBeenCalledWith("worker"); expect(m.rate).toHaveBeenCalledWith("worker");
  expect(m.breaks).toHaveBeenCalledWith("worker", "2026-10-05T04:00:00.000Z");
});
it("does not guess wages when the shift's saved rate is missing", async () => {
  m.shifts.mockResolvedValue([shift({ pay_rate: null })]);
  expect(await loadClockState({ id: "worker" }, now)).toMatchObject({ weekHoursBeforeShift: 8, weekEarningsBeforeShift: null });
});
it("does not load personal payroll for owners", async () => {
  expect(await loadClockState({ id: "owner", is_admin: true, can_see_prices: true }, now)).toMatchObject({ shift: null, hourlyRate: null, weekHoursBeforeShift: 0, weekEarningsBeforeShift: 0 });
  expect(m.open).not.toHaveBeenCalled(); expect(m.shifts).not.toHaveBeenCalled();
});
