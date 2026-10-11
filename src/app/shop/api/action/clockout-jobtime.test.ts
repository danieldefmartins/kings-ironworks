// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ endJob: vi.fn(), clockOut: vi.fn(), getOpenShift: vi.fn(), startProjectEntry: vi.fn() }));
vi.mock("@/lib/shop/session", () => ({ getSessionWorker: async () => ({ id: "w1", name: "Crew", is_admin: false, can_see_prices: false }), touchSession: async () => {} }));
vi.mock("@/lib/shop/stale-alert", () => ({ alertStaleShifts: async () => {} }));
vi.mock("@/lib/shop/job-timer-db", () => ({ endJobTimeOnClockOut: m.endJob, alertForgottenJobTimers: async () => [] }));
vi.mock("@/lib/shop/db", () => ({
  ORG_ID: "org", STAGES: [], audit: vi.fn(), sbSelect: vi.fn(), sbUpdate: vi.fn(), sbInsert: vi.fn(), sbDelete: vi.fn(),
  clockIn: vi.fn(), clockOut: m.clockOut, recordShiftEndLocation: vi.fn(), recordShiftStartLocation: vi.fn(), recordShiftLocation: vi.fn(),
  startBreak: vi.fn(), endBreak: vi.fn(), startProjectEntry: m.startProjectEntry, closeStaleProjectEntries: vi.fn(), stopTimeEntry: vi.fn(),
  deletePhotoObject: vi.fn(), saveOrgSettings: vi.fn(), getOrgSettings: vi.fn(), setJobArchived: vi.fn(),
  getOpenShift: m.getOpenShift, getWorkerShift: vi.fn(), appendShiftEmployeeNote: vi.fn(),
}));

import { POST } from "./route";

const req = (body: unknown) => new Request("http://x/shop/api/action", { method: "POST", body: JSON.stringify(body) }) as never;

beforeEach(() => vi.clearAllMocks());

it("ends running job time at the real clock-out tap", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-10T21:00:00.000Z"));
  m.getOpenShift.mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111", started_at: "2026-10-10T12:00:00Z", ended_at: null });
  m.clockOut.mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111", ended_at: "2026-10-10T21:00:00.000Z" });
  const res = await POST(req({ type: "shift_stop", workerId: "w1" }));
  expect(res.status).toBe(200);
  expect(m.endJob).toHaveBeenCalledWith("w1", "2026-10-10T21:00:00.000Z");
  vi.useRealTimers();
});

it("does nothing to job time when there was no shift to close", async () => {
  m.getOpenShift.mockResolvedValue(null);
  await POST(req({ type: "shift_stop", workerId: "w1" }));
  expect(m.endJob).not.toHaveBeenCalled();
});

it("starting job time never clocks the worker in", async () => {
  await POST(req({ type: "time_start", jobId: "j1" }));
  expect(m.startProjectEntry).toHaveBeenCalled();
  const { clockIn } = await import("@/lib/shop/db");
  expect(clockIn).not.toHaveBeenCalled();
});
