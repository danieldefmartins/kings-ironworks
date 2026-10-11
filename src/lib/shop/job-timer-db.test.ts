// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  select: vi.fn(), update: vi.fn(), audit: vi.fn(), closeStale: vi.fn(),
  sms: vi.fn(), telegram: vi.fn(),
}));
vi.mock("./db", () => ({
  ORG_ID: "org", sbSelect: m.select, sbUpdate: m.update, audit: m.audit,
  closeStaleProjectEntries: m.closeStale, getJob: vi.fn(), getRunningEntry: vi.fn(),
}));
vi.mock("./sms", () => ({ sendSms: m.sms }));
vi.mock("./notify", () => ({ sendTelegram: m.telegram, tgEscape: (s: string) => s }));

import { alertForgottenJobTimers, endJobTimeOnClockOut, resetJobTimerAlertThrottle, smsLang } from "./job-timer-db";

beforeEach(() => {
  vi.clearAllMocks();
  resetJobTimerAlertThrottle();
  m.update.mockResolvedValue([]);
  m.sms.mockResolvedValue(false);
  m.telegram.mockResolvedValue(true);
});

it("closes the worker's running job time at the clock-out time, conditionally", async () => {
  m.select.mockResolvedValueOnce([
    { id: "e1", started_at: "2026-10-10T12:00:00Z", ended_at: null },
    { id: "e2", started_at: "2026-10-10T23:00:00Z", ended_at: null }, // started after the tap
  ]);
  expect(await endJobTimeOnClockOut("w1", "2026-10-10T21:00:00.000Z")).toBe(1);
  expect(m.update).toHaveBeenCalledTimes(1);
  const [table, query, patch] = m.update.mock.calls[0];
  expect(table).toBe("kiw_shop_time_entries");
  expect(query).toContain("id=eq.e1&ended_at=is.null");
  expect(patch).toEqual({ ended_at: "2026-10-10T21:00:00.000Z", note: "closed: clocked out" });
});

it("never lets a job-time failure break the clock-out", async () => {
  m.select.mockRejectedValueOnce(new Error("offline"));
  await expect(endJobTimeOnClockOut("w1", "2026-10-10T21:00:00Z")).resolves.toBe(0);
});

const now = Date.parse("2026-10-09T21:20:00Z"); // 5:20 PM EDT
function sweepData(sent: { entity_id: string; detail: unknown }[] = []) {
  m.select.mockImplementation(async (table: string, query: string) => {
    if (table === "kiw_shop_time_entries") return [{ id: "e1", worker_id: "w1", job_id: "j1", started_at: "2026-10-09T13:00:00Z", ended_at: null, shift_id: null }];
    if (table === "kiw_shop_workers") return [{ id: "w1", name: "Jairo", phone: "(617) 555-0142", lang: null, is_admin: false, can_see_prices: false, payroll_excluded: false }];
    if (table === "kiw_shop_shifts") return [{ worker_id: "w1" }];
    if (table === "kiw_shop_audit" && query.includes("action=eq.job_timer_alert")) return sent;
    if (table === "kiw_shop_audit") return [{ worker_id: "w1", at: "2026-10-09T19:00:00Z" }];
    if (table === "kiw_shop_jobs") return [{ id: "j1", customer_name: "Smith Railing", job_number: "KIW-1" }];
    return [];
  });
}

it("texts the worker in their language (Portuguese by default), tells ops, and records the dedupe row", async () => {
  sweepData();
  const due = await alertForgottenJobTimers(now);
  expect(m.closeStale).toHaveBeenCalledWith();
  expect(due).toHaveLength(1);
  expect(due[0].kinds).toEqual(["after_hours"]);
  expect(m.sms).toHaveBeenCalledTimes(1);
  const [to, text] = m.sms.mock.calls[0];
  expect(to).toBe("+16175550142");
  expect(text).toContain("Smith Railing");
  expect(text).toContain("ainda está correndo");
  expect(m.telegram.mock.calls[0][0]).toContain("past 5:00 PM");
  expect(m.audit).toHaveBeenCalledWith("job_timer_alert", expect.objectContaining({ entity: "time_entry", entityId: "e1", detail: expect.objectContaining({ kinds: ["after_hours"], sms: false }) }));
});

it("does not alert twice for the same entry and rule", async () => {
  sweepData([{ entity_id: "e1", detail: { kinds: ["after_hours"] } }]);
  expect(await alertForgottenJobTimers(now)).toEqual([]);
  expect(m.sms).not.toHaveBeenCalled();
  expect(m.telegram).not.toHaveBeenCalled();
});

it("is throttled between sweeps", async () => {
  sweepData();
  await alertForgottenJobTimers(now);
  m.select.mockClear();
  await alertForgottenJobTimers(now + 60000);
  expect(m.select).not.toHaveBeenCalled();
});

it("uses the worker's own language when set", () => {
  expect(smsLang("es")).toBe("es");
  expect(smsLang("en")).toBe("en");
  expect(smsLang(null)).toBe("pt");
  expect(smsLang("fr")).toBe("pt");
});
