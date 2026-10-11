import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({
  worker: vi.fn(), get: vi.fn(), open: vi.fn(), start: vi.fn(), stop: vi.fn(), audit: vi.fn(),
  applyStart: vi.fn(), applyEnd: vi.fn(), actualStart: vi.fn(), answer: vi.fn(), review: vi.fn(),
}));
vi.mock("@/lib/shop/session", () => ({ getSessionWorker: m.worker, touchSession: vi.fn() }));
vi.mock("@/lib/shop/stale-alert", () => ({ alertStaleShifts: vi.fn() }));
vi.mock("@/lib/shop/db", () => ({ ORG_ID: "org", getWorkerShift: m.get, getOpenShift: m.open, clockIn: m.start, clockOut: m.stop, audit: m.audit, appendShiftEmployeeNote: vi.fn() }));
vi.mock("@/lib/shop/work-hours-db", () => ({ applyStartWindow: m.applyStart, applyEndWindow: m.applyEnd, actualStartOf: m.actualStart, answerWindow: m.answer, reviewWindow: m.review }));
import { POST } from "./route";

const id = "11111111-1111-4111-8111-111111111111";
const request = (body: unknown) => new NextRequest("http://localhost/shop/api/action", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => { vi.resetAllMocks(); m.worker.mockResolvedValue({ id: "worker", name: "Tiago" }); vi.spyOn(console, "error").mockImplementation(() => {}); });

it("clock-in: the punch is saved first and survives a failing window step", async () => {
  const tap = new Date(Date.now() - 60_000).toISOString();
  m.get.mockResolvedValue(null);
  m.start.mockResolvedValue({ id, started_at: tap.replace("Z", "+00:00"), ended_at: null });
  m.applyStart.mockRejectedValue(new Error("db down"));
  const res = await POST(request({ type: "shift_start", workerId: "worker", punchId: "p1", clientAt: tap, lat: 42.4, lng: -71.06 }));
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ ok: true, shiftId: id, at: tap, ask: false });
  expect(m.start).toHaveBeenCalledOnce();
  expect(m.applyStart).toHaveBeenCalledWith("worker", expect.objectContaining({ id }), tap);
});

it("clock-in without a location is refused before any shift is written", async () => {
  m.get.mockResolvedValue(null);
  const res = await POST(request({ type: "shift_start", workerId: "worker", punchId: "p1", clientAt: new Date().toISOString() }));
  expect(res.status).toBe(400);
  expect(await res.json()).toMatchObject({ locationRequired: true });
  expect(m.start).not.toHaveBeenCalled();
});

it("a re-sent clock-in that was already saved is replayed even without a location", async () => {
  m.get.mockResolvedValue({ id, started_at: "2026-10-11T11:00:00Z", ended_at: null });
  const res = await POST(request({ type: "shift_start", workerId: "worker", punchId: "p1" }));
  expect(res.status).toBe(200);
});

it("clock-out without a location is accepted", async () => {
  const start = new Date(Date.now() - 3600_000).toISOString();
  m.get.mockResolvedValue({ id, started_at: start, ended_at: null });
  m.actualStart.mockResolvedValue(start);
  m.stop.mockResolvedValue({ id, started_at: start, ended_at: new Date().toISOString() });
  const res = await POST(request({ type: "shift_stop", workerId: "worker", shiftId: id, clientAt: new Date().toISOString() }));
  expect(res.status).toBe(200);
  expect(m.stop).toHaveBeenCalledWith("worker", null, expect.any(String), id);
});

it("clock-in: reports that a question is waiting", async () => {
  const tap = new Date(Date.now() - 60_000).toISOString();
  m.get.mockResolvedValue(null);
  m.start.mockResolvedValue({ id, started_at: tap, ended_at: null });
  m.applyStart.mockResolvedValue(true);
  expect(await (await POST(request({ type: "shift_start", workerId: "worker", punchId: "p1", clientAt: tap, lat: 42.4, lng: -71.06 }))).json()).toMatchObject({ ask: true });
});

it("clock-out between the actual and the rounded start is accepted, not refused as stale", async () => {
  const actual = new Date(Date.now() - 40 * 60_000).toISOString();
  const rounded = new Date(Date.now() - 5 * 60_000).toISOString();
  const tap = new Date(Date.now() - 20 * 60_000).toISOString();
  m.get.mockResolvedValue({ id, started_at: rounded, ended_at: null });
  m.actualStart.mockResolvedValue(actual);
  m.stop.mockResolvedValue({ id, started_at: rounded, ended_at: rounded });
  m.applyEnd.mockResolvedValue(false);
  const res = await POST(request({ type: "shift_stop", workerId: "worker", shiftId: id, clientAt: tap }));
  expect(res.status).toBe(200);
  expect(m.stop).toHaveBeenCalledWith("worker", null, rounded, id); // zero paid time, never negative
  expect(m.applyEnd).toHaveBeenCalledWith("worker", id, tap); // the real tap is kept
});

it("late outbox clock-out keeps its tap time and still runs the window", async () => {
  const start = new Date(Date.now() - 20 * 3600_000).toISOString();
  const tap = new Date(Date.now() - 10 * 3600_000).toISOString();
  m.get.mockResolvedValue({ id, started_at: start, ended_at: null });
  m.actualStart.mockResolvedValue(start);
  m.stop.mockResolvedValue({ id, started_at: start, ended_at: tap });
  m.applyEnd.mockResolvedValue(true);
  const body = await (await POST(request({ type: "shift_stop", workerId: "worker", shiftId: id, clientAt: tap }))).json();
  expect(body).toMatchObject({ ok: true, at: tap, late: true, ask: true });
  expect(m.applyEnd).toHaveBeenCalledWith("worker", id, tap);
});

it("answer validates input and reports unknown questions", async () => {
  expect((await POST(request({ type: "shift_window_answer", shiftId: "nope", edge: "start", requested: true }))).status).toBe(400);
  m.answer.mockResolvedValue({ ok: false });
  expect((await POST(request({ type: "shift_window_answer", shiftId: id, edge: "start", requested: true }))).status).toBe(404);
  m.answer.mockResolvedValue({ ok: true, notified: 2 });
  const res = await POST(request({ type: "shift_window_answer", shiftId: id, edge: "end", requested: true }));
  expect(await res.json()).toMatchObject({ ok: true, notified: 2 });
  expect(m.answer).toHaveBeenLastCalledWith(expect.objectContaining({ id: "worker" }), id, "end", true);
});
