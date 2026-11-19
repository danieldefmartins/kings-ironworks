import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ worker: vi.fn(), approve: vi.fn(), ask: vi.fn(), newDay: vi.fn(), select: vi.fn(), update: vi.fn(), endJob: vi.fn(), endWindow: vi.fn() }));
vi.mock("@/lib/shop/session", () => ({ getSessionWorker: m.worker, touchSession: vi.fn() }));
vi.mock("@/lib/shop/stale-alert", () => ({ alertStaleShifts: vi.fn() }));
vi.mock("@/lib/shop/job-timer-db", () => ({ alertForgottenJobTimers: vi.fn(), endJobTimeOnClockOut: m.endJob }));
vi.mock("@/lib/shop/db", () => ({ ORG_ID: "org", sbSelect: m.select, sbUpdate: m.update, audit: vi.fn(), getOpenShift: vi.fn(), getWorkerShift: vi.fn() }));
vi.mock("@/lib/shop/work-hours-db", () => ({ applyEndWindow: m.endWindow, pinOwnerTimes: vi.fn(), actualStartOf: vi.fn(), answerWindow: vi.fn(), applyStartWindow: vi.fn(), reviewWindow: vi.fn() }));
vi.mock("@/lib/shop/ponto-db", () => ({ approveWeek: m.approve, askWorker: m.ask }));
vi.mock("@/lib/shop/time-fix-db", async (orig) => ({ ...(await orig<typeof import("@/lib/shop/time-fix-db")>()), submitNewDayRequest: m.newDay }));
import { POST } from "./route";

const ID = "11111111-1111-4111-8111-111111111111";
const req = (body: unknown) => new NextRequest("http://localhost/shop/api/action", { method: "POST", body: JSON.stringify(body) });
const GIULIA = { id: "g", name: "Giulia Furtado", role: "Office / admin", is_admin: false, can_see_prices: false, lang: "pt" };
const KAIO = { id: "kaio", name: "Kaio Prates", role: "Fabricator", lang: "pt" };
const OWNER = { id: "d", name: "Daniel", role: "Owner", is_admin: true, can_see_prices: true, lang: "en" };
beforeEach(() => { vi.resetAllMocks(); m.update.mockResolvedValue([]); });

it("Aprovar semana: the office admin and the owners, never the crew", async () => {
  m.approve.mockResolvedValue({ ok: true, approved: 4, held: 1 });
  m.worker.mockResolvedValue(GIULIA);
  const r = await POST(req({ type: "week_approve", workerId: ID, week: "2026-11-16" }));
  expect(await r.json()).toMatchObject({ ok: true, approved: 4, held: 1 });
  expect(m.approve).toHaveBeenCalledWith(GIULIA, ID, "2026-11-16");
  m.worker.mockResolvedValue(KAIO);
  expect((await POST(req({ type: "week_approve", workerId: ID, week: "2026-11-16" }))).status).toBe(403);
  m.worker.mockResolvedValue(OWNER);
  expect((await POST(req({ type: "week_approve", workerId: "nope", week: "2026-11-16" }))).status).toBe(400);
  expect(m.approve).toHaveBeenCalledTimes(1);
});

it("Perguntar ao funcionário: office only; a repeat within the hour says when it was asked", async () => {
  m.worker.mockResolvedValue(KAIO);
  expect((await POST(req({ type: "shift_ask_worker", shiftId: ID }))).status).toBe(403);
  m.worker.mockResolvedValue(GIULIA);
  m.ask.mockResolvedValue({ ok: false, status: 409, error: "already_asked", at: "2026-11-19T15:00:00.000Z" });
  const r = await POST(req({ type: "shift_ask_worker", shiftId: ID }));
  expect(r.status).toBe(409);
  expect(await r.json()).toMatchObject({ error: "already_asked", at: "2026-11-19T15:00:00.000Z" });
});

it("Corrigir: the office admin can close someone else's forgotten clock-out, never her own", async () => {
  m.worker.mockResolvedValue(GIULIA);
  m.select.mockResolvedValue([{ started_at: "2026-11-18T12:30:00Z", worker_id: "kaio" }]);
  const ok = await POST(req({ type: "shift_force_stop", shiftId: ID, endedAt: "2026-11-18T22:00:00Z" }));
  expect(ok.status).toBe(200);
  expect(m.update).toHaveBeenCalledWith("kiw_shop_shifts", expect.stringContaining(ID), expect.objectContaining({ ended_at: "2026-11-18T22:00:00.000Z", status: "submitted" }));
  m.update.mockClear();
  m.select.mockResolvedValue([{ started_at: "2026-11-18T12:30:00Z", worker_id: "g" }]);
  expect((await POST(req({ type: "shift_force_stop", shiftId: ID, endedAt: "2026-11-18T22:00:00Z" }))).status).toBe(403);
  expect(m.update).not.toHaveBeenCalled();
  m.worker.mockResolvedValue(KAIO);
  expect((await POST(req({ type: "shift_force_stop", shiftId: ID, endedAt: "2026-11-18T22:00:00Z" }))).status).toBe(403);
});

it("a day with no record: worker only, errors in their language", async () => {
  m.worker.mockResolvedValue(KAIO);
  m.newDay.mockResolvedValue({ error: "future" });
  const bad = await POST(req({ type: "time_fix_new_day", startedAt: "2026-11-19T12:30:00Z", endedAt: "2026-11-19T22:00:00Z", reason: "Esqueci a entrada" }));
  expect(bad.status).toBe(400);
  expect((await bad.json()).error).toBe("Esse horário ainda não chegou.");
  m.newDay.mockResolvedValue({ id: "fix", shiftId: "shift", created: true, notified: true });
  const ok = await POST(req({ type: "time_fix_new_day", startedAt: "2026-11-17T12:30:00Z", endedAt: "2026-11-17T22:00:00Z", reason: "Esqueci a entrada" }));
  expect(await ok.json()).toMatchObject({ ok: true, correctionId: "fix", shiftId: "shift" });
  m.worker.mockResolvedValue(OWNER);
  expect((await POST(req({ type: "time_fix_new_day", startedAt: "2026-11-17T12:30:00Z", endedAt: "2026-11-17T22:00:00Z", reason: "x x x" }))).status).toBe(403);
});
