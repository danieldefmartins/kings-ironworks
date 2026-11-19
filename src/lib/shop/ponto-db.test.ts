// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ select: vi.fn(), insert: vi.fn(), update: vi.fn(), audit: vi.fn(), settings: vi.fn(), sms: vi.fn(), telegram: vi.fn(), group: vi.fn(), windows: vi.fn() }));
vi.mock("./db", () => ({ ORG_ID: "org", sbSelect: m.select, sbInsert: m.insert, sbUpdate: m.update, audit: m.audit, getOrgSettings: m.settings }));
vi.mock("./sms", async (orig) => ({ ...(await orig<typeof import("./sms")>()), sendSms: m.sms, sendSmsGroup: m.group }));
vi.mock("./notify", () => ({ sendTelegram: m.telegram, tgEscape: (s: string) => s }));
vi.mock("./stale-alert", () => ({ shopLink: () => "https://kiw.test/shop" }));
vi.mock("./work-hours-db", () => ({ listWindowRecords: m.windows, applyEndWindow: vi.fn(), pinOwnerTimes: vi.fn() }));
vi.mock("./job-timer-db", () => ({ endJobTimeOnClockOut: vi.fn() }));
import { approveWeek, askWorker, loadPonto } from "./ponto-db";
import { submitNewDayRequest } from "./time-fix-db";
import { NEW_DAY_NOTE } from "./time-fix";

const NOW = Date.parse("2026-11-19T15:00:00Z"); // Thu 10 AM EST; week = Mon 11/16
const GIULIA = { id: "g", name: "Giulia Furtado", role: "Office / admin", lang: "en", phone: "8575550101", active: true, is_admin: false, can_see_prices: false, payroll_excluded: false };
const KAIO = { id: "kaio", name: "Kaio Prates", role: "Fabricator", lang: "pt", phone: "(617) 555-0100", active: true, is_admin: false, can_see_prices: false, payroll_excluded: false };
const OWNER = { id: "d", name: "Daniel Martins", role: "Owner", lang: "en", phone: null, active: true, is_admin: true, can_see_prices: true, payroll_excluded: false };
type Row = Record<string, unknown>;
let tables: Record<string, Row[]>;

beforeEach(() => {
  vi.resetAllMocks();
  tables = {
    kiw_shop_workers: [GIULIA, KAIO, OWNER],
    kiw_shop_shifts: [
      { id: "mon", worker_id: "kaio", started_at: "2026-11-16T12:30:00Z", ended_at: "2026-11-16T22:00:00Z", status: "submitted" },
      { id: "tue", worker_id: "kaio", started_at: "2026-11-17T12:30:00Z", ended_at: "2026-11-17T22:00:00Z", status: "submitted" },
      { id: "wed", worker_id: "kaio", started_at: "2026-11-18T12:30:00Z", ended_at: null, status: "open" },
    ],
    kiw_shop_time_corrections: [{ shift_id: "tue", status: "pending" }],
    kiw_shop_breaks: [], kiw_shop_audit: [],
  };
  m.settings.mockResolvedValue({ workHours: undefined, branding: { name: "King Iron Works" } });
  m.windows.mockResolvedValue([]);
  m.sms.mockResolvedValue(true);
  m.telegram.mockResolvedValue(true);
  m.group.mockResolvedValue({ sent: 1, failed: 0, telegram: true });
  m.select.mockImplementation(async (table: string, q: string) => {
    let rows = tables[table] ?? [];
    if (q.includes("offset=") && !q.endsWith("offset=0")) return [];
    if (table === "kiw_shop_shifts") {
      const w = /worker_id=eq\.([^&]+)/.exec(q)?.[1]; if (w) rows = rows.filter((r) => r.worker_id === w);
      const id = /&id=eq\.([^&]+)/.exec(q)?.[1]; if (id) rows = rows.filter((r) => r.id === id);
      if (q.includes("ended_at=is.null&started_at=lt")) rows = [];
    }
    if (table === "kiw_shop_workers") { const id = /&id=eq\.([^&]+)/.exec(q)?.[1]; if (id) rows = rows.filter((r) => r.id === id); }
    if (table === "kiw_shop_time_corrections" && q.includes("status=eq.pending")) rows = rows.filter((r) => r.status === "pending");
    if (table === "kiw_shop_audit") { const a = /action=eq\.([a-z_]+)/.exec(q)?.[1]; rows = rows.filter((r) => r.action === a); }
    return rows;
  });
  m.update.mockImplementation(async (_t: string, q: string) => [{ id: /id=eq\.([^&]+)/.exec(q)?.[1] }]);
  m.insert.mockImplementation(async (table: string, row: Row) => [{ id: table === "kiw_shop_shifts" ? "new-shift" : "new-fix", ...row }]);
});

describe("approve the week", () => {
  it("approves closed, unheld shifts only — conditional on still submitted — and records it", async () => {
    const r = await approveWeek(GIULIA, "kaio", "2026-11-16", NOW);
    expect(r).toEqual({ ok: true, approved: 1, held: 2 });
    expect(m.update).toHaveBeenCalledTimes(1);
    const [table, q, patch] = m.update.mock.calls[0];
    expect(table).toBe("kiw_shop_shifts");
    expect(q).toContain("id=eq.mon");
    expect(q).toContain("status=eq.submitted");
    expect(q).toContain("ended_at=not.is.null");
    expect(patch).toMatchObject({ status: "approved", approved_by: "g" });
    expect(patch).not.toHaveProperty("started_at");
    expect(m.audit).toHaveBeenCalledWith("week_approve", expect.objectContaining({ entityId: "kaio", detail: expect.objectContaining({ approved: ["mon"], held: [{ id: "tue", reason: "request" }, { id: "wed", reason: "open" }] }) }));
  });
  it("never your own week, never an owner, only this week or last", async () => {
    expect(await approveWeek(GIULIA, "g", "2026-11-16", NOW)).toMatchObject({ ok: false, status: 403 });
    expect(await approveWeek(GIULIA, "d", "2026-11-16", NOW)).toMatchObject({ ok: false, status: 404 });
    expect(await approveWeek(GIULIA, "kaio", "2026-11-02", NOW)).toMatchObject({ ok: false, status: 400 });
    expect(m.update).not.toHaveBeenCalled();
  });
  it("holds a shift with an unanswered extra-time question", async () => {
    m.windows.mockResolvedValue([{ shiftId: "mon", workerId: "kaio", edge: "end", punchedAt: "2026-11-16T23:00:00Z", edgeAt: "2026-11-16T22:00:00Z", answer: "pending", ask: true, at: "x" }]);
    expect(await approveWeek(GIULIA, "kaio", "2026-11-16", NOW)).toEqual({ ok: true, approved: 0, held: 3 });
  });
});

describe("the office screen", () => {
  it("flags yesterday's open shift at the top, never shows money to the office admin", async () => {
    const d = await loadPonto(GIULIA, undefined, NOW);
    expect(d.missed.map((x) => x.shiftId)).toEqual(["wed"]);
    expect(d.working).toEqual([]);
    expect(d.money).toBe(false);
    expect(d.week.find((w) => w.workerId === "kaio")).toMatchObject({ approve: 1, pay: null });
    expect(d.week.some((w) => w.workerId === "d")).toBe(false);
    expect((await loadPonto(OWNER, undefined, NOW)).money).toBe(true);
  });
});

describe("ask the worker", () => {
  it("texts the worker once, in their language, with the Marcar saída link", async () => {
    const r = await askWorker(GIULIA, "wed", NOW);
    expect(r).toMatchObject({ ok: true, sent: true });
    expect(m.sms).toHaveBeenCalledWith("+16175550100", "KIW: Oi Kaio, você não marcou a saída de quarta, 18/11. Abra o app e diga que horas saiu: https://kiw.test/shop?saida=1");
    tables.kiw_shop_audit.push({ action: "shift_ask_worker", entity_id: "wed", at: new Date(NOW - 10 * 60_000).toISOString() });
    expect(await askWorker(GIULIA, "wed", NOW)).toMatchObject({ ok: false, status: 409, error: "already_asked" });
    expect(m.sms).toHaveBeenCalledTimes(1);
  });
  it("not your own clock; not without a phone", async () => {
    tables.kiw_shop_shifts.push({ id: "mine", worker_id: "g", started_at: "2026-11-18T12:30:00Z", ended_at: null, status: "open" });
    expect(await askWorker(GIULIA, "mine", NOW)).toMatchObject({ ok: false, status: 403 });
    tables.kiw_shop_workers[1] = { ...KAIO, phone: null };
    expect(await askWorker(GIULIA, "wed", NOW)).toMatchObject({ ok: false, status: 400 });
    expect(m.sms).not.toHaveBeenCalled();
  });
});

describe("a day with no record", () => {
  it("is saved unpaid (rejected) with a pending request for the office", async () => {
    tables.kiw_shop_shifts = [];
    const r = await submitNewDayRequest(KAIO, { startedAt: "2026-11-15T12:30:00Z", endedAt: "2026-11-15T22:00:00Z", reason: "Esqueci a entrada" }, NOW);
    expect(r).toMatchObject({ created: true, shiftId: "new-shift", id: "new-fix" });
    expect(m.insert).toHaveBeenCalledWith("kiw_shop_shifts", expect.objectContaining({ worker_id: "kaio", status: "rejected", manager_note: NEW_DAY_NOTE, started_at: "2026-11-15T12:30:00.000Z", ended_at: "2026-11-15T22:00:00.000Z" }));
    expect(m.insert).toHaveBeenCalledWith("kiw_shop_time_corrections", expect.objectContaining({ shift_id: "new-shift", status: "pending", requested_started_at: "2026-11-15T12:30:00.000Z", requested_ended_at: "2026-11-15T22:00:00.000Z" }));
  });
  it("refuses overlaps, the future, old days and impossible lengths", async () => {
    expect(await submitNewDayRequest(KAIO, { startedAt: "2026-11-16T13:00:00Z", endedAt: "2026-11-16T20:00:00Z", reason: "x x" }, NOW)).toEqual({ error: "overlap" });
    expect(await submitNewDayRequest(KAIO, { startedAt: "2026-11-19T12:30:00Z", endedAt: "2026-11-19T22:00:00Z", reason: "x x" }, NOW)).toEqual({ error: "future" });
    expect(await submitNewDayRequest(KAIO, { startedAt: "2026-11-01T12:30:00Z", endedAt: "2026-11-01T22:00:00Z", reason: "x x" }, NOW)).toEqual({ error: "too_old" });
    expect(await submitNewDayRequest(KAIO, { startedAt: "2026-11-14T02:00:00Z", endedAt: "2026-11-14T22:00:00Z", reason: "x x" }, NOW)).toEqual({ error: "too_long" });
    expect(m.insert).not.toHaveBeenCalled();
  });
});
