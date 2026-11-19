import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ worker: vi.fn(), open: vi.fn(), get: vi.fn(), start: vi.fn(), review: vi.fn(), fix: vi.fn(), submit: vi.fn() }));
vi.mock("@/lib/shop/session", () => ({ getSessionWorker: m.worker, touchSession: vi.fn() }));
vi.mock("@/lib/shop/stale-alert", () => ({ alertStaleShifts: vi.fn() }));
vi.mock("@/lib/shop/job-timer-db", () => ({ alertForgottenJobTimers: vi.fn(), endJobTimeOnClockOut: vi.fn() }));
vi.mock("@/lib/shop/db", () => ({ ORG_ID: "org", getOpenShift: m.open, getWorkerShift: m.get, clockIn: m.start, audit: vi.fn() }));
vi.mock("@/lib/shop/time-fix-db", async (orig) => ({ ...(await orig<typeof import("@/lib/shop/time-fix-db")>()), reviewFix: m.review, fixMissedOut: m.fix, submitFixRequest: m.submit }));
import { POST } from "./route";

const ID = "11111111-1111-4111-8111-111111111111";
const req = (body: unknown) => new NextRequest("http://localhost/shop/api/action", { method: "POST", body: JSON.stringify(body) });
const GIULIA = { id: "g", name: "Giulia Furtado da Silva", role: "Office / admin", is_admin: false, can_see_prices: false, lang: "en" };
const KAIO = { id: "kaio", name: "Kaio Prates", role: "Fabricator", lang: "pt" };
beforeEach(() => { vi.resetAllMocks(); });

it("a clock-in never folds into a shift left open from an earlier day — the phone asks what time they left", async () => {
  m.worker.mockResolvedValue(KAIO);
  m.open.mockResolvedValue({ id: ID, worker_id: "kaio", started_at: new Date(Date.now() - 24 * 3600_000).toISOString(), ended_at: null });
  const r = await POST(req({ type: "shift_start", workerId: "kaio", punchId: "p1", lat: 42.4, lng: -71.05 }));
  expect(r.status).toBe(409);
  const j = await r.json();
  expect(j).toMatchObject({ missedOut: true, shiftId: ID });
  expect(j.final).toBeUndefined(); // the queued tap is kept on the phone
  expect(j.error).toMatch(/^Você não marcou a saída de /);
  expect(m.start).not.toHaveBeenCalled();
});

it("the office admin may review time fixes; crew may not", async () => {
  m.worker.mockResolvedValue(GIULIA);
  m.review.mockResolvedValue({ ok: true, superseded: 0 });
  const ok = await POST(req({ type: "correction_review", id: ID, status: "approved", startedAt: "2026-11-05T12:34:00Z", endedAt: "2026-11-05T22:00:00Z" }));
  expect(ok.status).toBe(200);
  expect(m.review).toHaveBeenCalledWith(GIULIA, expect.objectContaining({ id: ID, decision: "approved", startedAt: "2026-11-05T12:34:00.000Z", endedAt: "2026-11-05T22:00:00.000Z" }), expect.any(Function));
  m.worker.mockResolvedValue(KAIO);
  expect((await POST(req({ type: "correction_review", id: ID, status: "approved" }))).status).toBe(403);
  expect(m.review).toHaveBeenCalledTimes(1);
});

it("a very long approved result asks first (wrong date)", async () => {
  m.worker.mockResolvedValue(GIULIA);
  m.review.mockResolvedValue({ ok: false, status: 409, error: "long", code: "long", start: "2026-11-05T12:31:00Z", end: "2026-11-06T14:13:00Z" });
  const r = await POST(req({ type: "correction_review", id: ID, status: "approved" }));
  expect(r.status).toBe(409);
  expect(await r.json()).toMatchObject({ confirmLong: true });
});

it("the forgotten clock-out answer goes through for the worker's own shift", async () => {
  m.worker.mockResolvedValue(KAIO);
  m.fix.mockResolvedValue({ ok: true, endedAt: "2026-11-06T00:14:00.000Z", ask: true });
  const r = await POST(req({ type: "shift_missed_out_fix", shiftId: ID, endedAt: "2026-11-06T00:14:00Z" }));
  expect(await r.json()).toMatchObject({ ok: true, at: "2026-11-06T00:14:00.000Z", ask: true });
  expect(m.fix).toHaveBeenCalledWith(KAIO, { shiftId: ID, endedAt: "2026-11-06T00:14:00Z" });
});

it("owners are not on payroll: no forgotten-clock-out answers for them", async () => {
  m.worker.mockResolvedValue({ id: "k", role: "Owner", is_admin: true, can_see_prices: true });
  expect((await POST(req({ type: "shift_missed_out_fix", shiftId: ID, endedAt: "2026-11-06T00:14:00Z" }))).status).toBe(403);
  expect(m.fix).not.toHaveBeenCalled();
});

it("a worker's request reports whether it was new", async () => {
  m.worker.mockResolvedValue(KAIO);
  m.submit.mockResolvedValue({ id: "c1", created: true, notified: true });
  const r = await POST(req({ type: "time_correction_request", shiftId: ID, endedAt: "2026-11-06T00:14:00Z", reason: "Esqueci de bater a saída" }));
  expect(await r.json()).toMatchObject({ ok: true, correctionId: "c1", created: true });
  expect(m.submit).toHaveBeenCalledWith(KAIO, { shiftId: ID, startedAt: null, endedAt: "2026-11-06T00:14:00.000Z", reason: "Esqueci de bater a saída" });
});
