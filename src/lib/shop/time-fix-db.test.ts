// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  select: vi.fn(), insert: vi.fn(), update: vi.fn(), audit: vi.fn(), settings: vi.fn(),
  group: vi.fn(), endWindow: vi.fn(), pin: vi.fn(), endJob: vi.fn(),
}));
vi.mock("./db", () => ({ ORG_ID: "org", sbSelect: m.select, sbInsert: m.insert, sbUpdate: m.update, audit: m.audit, getOrgSettings: m.settings }));
vi.mock("./sms", async (orig) => ({ ...(await orig<typeof import("./sms")>()), sendSmsGroup: m.group }));
vi.mock("./stale-alert", () => ({ shopLink: () => "https://kiw.test/shop" }));
vi.mock("./work-hours-db", () => ({ applyEndWindow: m.endWindow, pinOwnerTimes: m.pin }));
vi.mock("./job-timer-db", () => ({ endJobTimeOnClockOut: m.endJob }));
import { alertWaitingFixes, fixMissedOut, reviewFix, submitFixRequest } from "./time-fix-db";

const GIULIA = { id: "g", name: "Giulia Furtado da Silva", role: "Office / admin", phone: "(857) 555-0101", lang: "en", active: true, is_admin: false, can_see_prices: false };
const KAIO = { id: "kaio", name: "Kaio Prates" };
const SHIFT = "11111111-1111-4111-8111-111111111111";

type Row = Record<string, unknown>;
let tables: Record<string, Row[]>;
const writes = () => m.update.mock.calls.map(([table, q, patch]) => ({ table, q, patch }));

beforeEach(() => {
  vi.resetAllMocks();
  tables = {
    kiw_shop_workers: [GIULIA, { id: "kaio", name: "Kaio Prates" }],
    kiw_shop_shifts: [{ id: SHIFT, worker_id: "kaio", started_at: "2026-11-05T12:31:00Z", ended_at: null, status: "open" }],
    kiw_shop_time_corrections: [],
    kiw_shop_audit: [],
  };
  m.settings.mockResolvedValue({ workHours: undefined, branding: { name: "King Iron Works" } });
  m.group.mockResolvedValue({ sent: 1, failed: 0, telegram: true });
  m.endWindow.mockResolvedValue(false);
  m.select.mockImplementation(async (table: string, q: string) => {
    let rows = tables[table] ?? [];
    if (table === "kiw_shop_time_corrections") {
      if (q.includes("status=eq.pending")) rows = rows.filter((r) => r.status === "pending");
      const id = /&id=eq\.([^&]+)/.exec(q)?.[1];
      if (id) rows = rows.filter((r) => r.id === id);
      const cut = /created_at=lt\.([^&]+)/.exec(q)?.[1];
      if (cut) rows = rows.filter((r) => String(r.created_at) < decodeURIComponent(cut));
    }
    if (table === "kiw_shop_audit") {
      const action = /action=eq\.([a-z_]+)/.exec(q)?.[1];
      rows = rows.filter((r) => r.action === action);
    }
    return rows;
  });
  m.insert.mockImplementation(async (table: string, row: Row) => {
    const saved = { id: "c-new", created_at: "2026-11-19T12:00:00Z", ...row };
    (tables[table] ||= []).push(saved);
    return [saved];
  });
  m.update.mockImplementation(async (table: string, q: string, patch: Row) => {
    const id = /&id=eq\.([^&]+)/.exec(q)?.[1];
    const rows = (tables[table] ?? []).filter((r) => !id || r.id === id).filter((r) => !q.includes("status=eq.pending") || r.status === "pending");
    rows.forEach((r) => Object.assign(r, patch));
    return rows;
  });
  m.audit.mockImplementation(async (action: string, o: { entityId?: string }) => { tables.kiw_shop_audit.push({ action, entity_id: o?.entityId }); });
});

describe("a worker sends a time fix", () => {
  it("saves it and texts Giulia once, in her language, with the change", async () => {
    const r = await submitFixRequest(KAIO, { shiftId: SHIFT, startedAt: null, endedAt: "2026-11-06T00:14:00.000Z", reason: "Esqueci de bater a saída" });
    expect(r).toMatchObject({ created: true, notified: true });
    expect(m.group).toHaveBeenCalledTimes(1);
    const [recipients, build] = m.group.mock.calls[0];
    expect(recipients).toEqual([{ phone: "+18575550101", lang: "en" }]);
    expect(build("en")).toContain("KIW: Kaio asked to fix their time for Thu 11/5 — Clock-out: no clock-out → 7:14 PM.");
    expect(build("en")).toContain("https://kiw.test/shop/time-fixes");
    expect(build("pt")).toContain("Saída: sem saída → 19:14");
    expect(tables.kiw_shop_audit.map((a) => a.action)).toEqual(["time_correction_requested", "time_correction_notify"]);
  });
  it("the same fix sent again is not a second request and nobody is texted again", async () => {
    const input = { shiftId: SHIFT, startedAt: null, endedAt: "2026-11-06T00:14:00.000Z", reason: "Esqueci" };
    await submitFixRequest(KAIO, input);
    const again = await submitFixRequest(KAIO, { ...input, reason: "Esqueci de bater a saída" });
    expect(again).toMatchObject({ created: false, notified: false });
    expect(m.insert).toHaveBeenCalledTimes(1);
    expect(m.group).toHaveBeenCalledTimes(1);
    expect(tables.kiw_shop_time_corrections[0].reason).toBe("Esqueci de bater a saída");
  });
  it("refuses a request for someone else's shift or with the clock-out before the clock-in", async () => {
    tables.kiw_shop_shifts = [];
    expect(await submitFixRequest(KAIO, { shiftId: SHIFT, startedAt: null, endedAt: null, reason: "x x x" })).toEqual({ error: "not_found" });
    tables.kiw_shop_shifts = [{ id: SHIFT, worker_id: "kaio", started_at: "2026-11-05T12:31:00Z", ended_at: null }];
    expect(await submitFixRequest(KAIO, { shiftId: SHIFT, startedAt: null, endedAt: "2026-11-05T10:00:00Z", reason: "x x x" })).toEqual({ error: "bad_times" });
    expect(m.insert).not.toHaveBeenCalled();
  });
});

describe("Giulia reviews", () => {
  const pending = (patch: Row = {}) => ({ id: "c1", shift_id: SHIFT, worker_id: "kaio", requested_started_at: null, requested_ended_at: "2026-11-06T00:14:00Z", reason: "Esqueci", status: "pending", created_at: "2026-11-06T13:00:00Z", reviewed_by: null, ...patch });
  const reviewer = { id: "g", name: "Giulia Furtado da Silva" };
  const never = () => false;

  it("approve applies the requested times to the payroll shift only, records who and when, and answers duplicates", async () => {
    tables.kiw_shop_time_corrections = [pending(), pending({ id: "c0", created_at: "2026-11-06T12:00:00Z" })];
    const r = await reviewFix(reviewer, { id: "c1", decision: "approved" }, never);
    expect(r).toMatchObject({ ok: true, end: "2026-11-06T00:14:00Z", superseded: 1 });
    const shiftWrite = writes().find((w) => w.table === "kiw_shop_shifts")!;
    expect(shiftWrite.patch).toMatchObject({ started_at: "2026-11-05T12:31:00Z", ended_at: "2026-11-06T00:14:00Z", status: "submitted" });
    expect(writes().some((w) => w.table === "kiw_shop_time_entries")).toBe(false); // two clocks: job time untouched
    expect(tables.kiw_shop_time_corrections[0]).toMatchObject({ status: "approved", reviewed_by: "g" });
    expect(tables.kiw_shop_time_corrections[0].reviewed_at).toBeTruthy();
    expect(tables.kiw_shop_time_corrections[1]).toMatchObject({ status: "rejected", review_note: "Replaced by the approved request for this shift" });
    expect(tables.kiw_shop_audit.map((a) => a.action)).toContain("time_correction_review");
    expect(m.pin).toHaveBeenCalledWith("g", SHIFT, "2026-11-05T12:31:00Z", "2026-11-06T00:14:00Z");
  });
  it("change applies her times instead of the request", async () => {
    tables.kiw_shop_time_corrections = [pending()];
    const r = await reviewFix(reviewer, { id: "c1", decision: "approved", startedAt: "2026-11-05T12:34:00.000Z", endedAt: "2026-11-05T22:00:00.000Z" }, never);
    expect(r).toMatchObject({ ok: true, start: "2026-11-05T12:34:00.000Z", end: "2026-11-05T22:00:00.000Z" });
    expect(writes().find((w) => w.table === "kiw_shop_shifts")!.patch).toMatchObject({ started_at: "2026-11-05T12:34:00.000Z", ended_at: "2026-11-05T22:00:00.000Z" });
    expect(String(tables.kiw_shop_time_corrections[0].review_note)).toContain("Changed by Giulia");
  });
  it("refuse leaves the shift alone", async () => {
    tables.kiw_shop_time_corrections = [pending()];
    expect(await reviewFix(reviewer, { id: "c1", decision: "rejected" }, never)).toMatchObject({ ok: true });
    expect(writes().some((w) => w.table === "kiw_shop_shifts")).toBe(false);
    expect(tables.kiw_shop_time_corrections[0]).toMatchObject({ status: "rejected", reviewed_by: "g" });
  });
  it("never her own request, never clock-out before clock-in, and a very long result is asked first", async () => {
    tables.kiw_shop_time_corrections = [pending({ worker_id: "g" })];
    expect(await reviewFix(reviewer, { id: "c1", decision: "approved" }, never)).toMatchObject({ ok: false, status: 403, code: "own" });
    tables.kiw_shop_time_corrections = [pending({ requested_started_at: "2026-09-28T11:36:00Z", requested_ended_at: "2026-09-28T09:15:00Z" })];
    expect(await reviewFix(reviewer, { id: "c1", decision: "approved" }, never)).toMatchObject({ ok: false, code: "order" });
    tables.kiw_shop_time_corrections = [pending({ requested_ended_at: "2026-11-06T14:13:00Z" })];
    expect(await reviewFix(reviewer, { id: "c1", decision: "approved" }, () => true)).toMatchObject({ ok: false, code: "long" });
    expect(writes().some((w) => w.table === "kiw_shop_shifts")).toBe(false);
  });
});

describe("forgotten clock-out answer", () => {
  const friday = Date.parse("2026-11-06T12:20:00Z");
  it("ends Thursday's shift at the worker's answer, submitted, audited with the answer", async () => {
    const r = await fixMissedOut({ id: "kaio" }, { shiftId: SHIFT, endedAt: "2026-11-06T00:14:00.000Z" }, friday);
    expect(r).toMatchObject({ ok: true, endedAt: "2026-11-06T00:14:00.000Z" });
    expect(writes().find((w) => w.table === "kiw_shop_shifts")).toMatchObject({ q: expect.stringContaining("ended_at=is.null"), patch: { ended_at: "2026-11-06T00:14:00.000Z", status: "submitted" } });
    expect(tables.kiw_shop_audit.find((a) => a.action === "shift_missed_out_fixed")).toMatchObject({ entity_id: SHIFT });
    expect(m.audit.mock.calls.find(([a]) => a === "shift_missed_out_fixed")![1].detail).toMatchObject({ answer: "2026-11-06T00:14:00.000Z", mode: "open", previousEnd: null });
    expect(m.endJob).toHaveBeenCalledWith("kaio", "2026-11-06T00:14:00.000Z");
    expect(m.endWindow).toHaveBeenCalledWith("kaio", SHIFT, "2026-11-06T00:14:00.000Z");
  });
  it("refuses a time before the clock-in, the next day, or a shift that is not forgotten", async () => {
    expect(await fixMissedOut({ id: "kaio" }, { shiftId: SHIFT, endedAt: "2026-11-05T12:00:00Z" }, friday)).toMatchObject({ ok: false, error: "before" });
    expect(await fixMissedOut({ id: "kaio" }, { shiftId: SHIFT, endedAt: "2026-11-06T06:00:00Z" }, friday)).toMatchObject({ ok: false, error: "after" });
    expect(await fixMissedOut({ id: "kaio" }, { shiftId: SHIFT, endedAt: "2026-11-05T22:00:00Z" }, Date.parse("2026-11-05T23:00:00Z"))).toMatchObject({ ok: false, error: "not_missed" });
    expect(writes().some((w) => w.table === "kiw_shop_shifts")).toBe(false);
  });
});

describe("daily note to Kayky and Daniel", () => {
  const old = (id: string, created_at: string) => ({ id, shift_id: SHIFT, worker_id: "kaio", status: "pending", created_at });
  it("sends one short note a day when something has waited more than 24 h — Kayky pt, Daniel en", async () => {
    tables.kiw_shop_time_corrections = [old("a", "2026-11-17T22:48:17Z"), old("b", "2026-11-18T09:00:00Z"), old("new", "2026-11-19T13:00:00Z")];
    const at = Date.parse("2026-11-19T14:30:00Z"); // 9:30 AM EST
    expect(await alertWaitingFixes(at)).toEqual({ sent: true, count: 2 });
    const [recipients, build] = m.group.mock.calls[0];
    expect(recipients).toEqual([{ phone: "+18578881468", lang: "pt" }, { phone: "+18572369442", lang: "en" }]);
    expect(build("en")).toBe("KIW: 2 time fixes waiting for Giulia since Tue. https://kiw.test/shop/time-fixes");
    expect(build("pt")).toBe("KIW: 2 correções de ponto esperando a Giulia desde ter. https://kiw.test/shop/time-fixes");
    expect(await alertWaitingFixes(at + 3600_000)).toMatchObject({ sent: false });
    expect(m.group).toHaveBeenCalledTimes(1);
  });
  it("stays quiet at night and when nothing has waited 24 h", async () => {
    tables.kiw_shop_time_corrections = [old("a", "2026-11-17T22:48:17Z")];
    expect(await alertWaitingFixes(Date.parse("2026-11-19T10:00:00Z"))).toMatchObject({ sent: false }); // 5 AM
    tables.kiw_shop_time_corrections = [old("new", "2026-11-19T13:00:00Z")];
    expect(await alertWaitingFixes(Date.parse("2026-11-19T15:00:00Z"))).toMatchObject({ sent: false, count: 0 });
    expect(m.group).not.toHaveBeenCalled();
  });
});
