import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ worker: vi.fn(), get: vi.fn(), open: vi.fn(), start: vi.fn(), stop: vi.fn(), audit: vi.fn() }));
vi.mock("@/lib/shop/session", () => ({ getSessionWorker: m.worker, touchSession: vi.fn() }));
vi.mock("@/lib/shop/stale-alert", () => ({ alertStaleShifts: vi.fn() }));
vi.mock("@/lib/shop/db", () => ({ ORG_ID: "org", getWorkerShift: m.get, getOpenShift: m.open, clockIn: m.start, clockOut: m.stop, audit: m.audit, appendShiftEmployeeNote: vi.fn() }));
import { POST } from "./route";
const id = "11111111-1111-4111-8111-111111111111";
const request = (body: unknown) => new NextRequest("http://localhost/shop/api/action", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => { vi.resetAllMocks(); m.worker.mockResolvedValue({ id: "worker" }); });
it("refuses another worker's queued punch before reading or writing shifts", async () => {
  const response = await POST(request({ type: "shift_start", workerId: "other" }));
  expect(response.status).toBe(409); expect(await response.json()).toMatchObject({ retry: true });
  expect(m.start).not.toHaveBeenCalled(); expect(m.get).not.toHaveBeenCalled();
});
it("does not turn an expired clock-out into a clock-out at the current time", async () => {
  m.get.mockResolvedValue({ id, started_at: "2026-01-01T12:00:00Z", ended_at: null });
  const response = await POST(request({ type: "shift_stop", workerId: "worker", shiftId: id, clientAt: "2026-01-01T20:00:00Z" }));
  expect(response.status).toBe(409); expect(await response.json()).toMatchObject({ final: true });
  expect(m.stop).not.toHaveBeenCalled();
});
it("replays the original start receipt even after it is too old to create a shift", async () => {
  m.get.mockResolvedValue({ id, started_at: "2026-01-01T12:00:00Z", ended_at: "2026-01-01T20:00:00Z" });
  const response = await POST(request({ type: "shift_start", workerId: "worker", punchId: "stable-punch", clientAt: "2026-01-01T12:00:00Z" }));
  expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ at: "2026-01-01T12:00:00Z" });
  expect(m.start).not.toHaveBeenCalled();
});
it("replays the original stop receipt without closing a different current shift", async () => {
  m.get.mockResolvedValue({ id, started_at: "2026-01-01T12:00:00Z", ended_at: "2026-01-01T20:00:00Z" });
  const response = await POST(request({ type: "shift_stop", workerId: "worker", shiftId: id, clientAt: "2026-01-01T20:00:00Z" }));
  expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ at: "2026-01-01T20:00:00Z" });
  expect(m.stop).not.toHaveBeenCalled(); expect(m.open).not.toHaveBeenCalled();
});

it("does not attribute an unowned legacy queue entry to the currently signed-in worker", async () => {
  const response = await POST(request({ type: "shift_start", punchId: "old-browser-queue" }));
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ refreshRequired: true });
  expect(m.start).not.toHaveBeenCalled(); expect(m.get).not.toHaveBeenCalled();
});
