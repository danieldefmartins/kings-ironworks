// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ select: vi.fn(), audit: vi.fn(), settings: vi.fn(), telegram: vi.fn(), sms: vi.fn() }));
vi.mock("./db", () => ({ ORG_ID: "org", sbSelect: m.select, audit: m.audit, getOrgSettings: m.settings }));
vi.mock("./notify", () => ({ sendTelegram: m.telegram, tgEscape: (s: string) => s }));
vi.mock("./sms", async (orig) => ({ ...(await orig<typeof import("./sms")>()), sendSms: m.sms }));
import { resetClockCheckThrottle, runClockChecks, stillClockedInMessage } from "./stale-alert";

// André, Sat 10/10: in 7:35 AM EDT (11:35Z), clock-out never arrived.
const andre = { id: "s-andre", worker_id: "w-andre", started_at: "2026-10-10T11:35:00Z" };
let shifts: unknown[];
let alerted: { action: string; entity_id: string }[];
let workers: unknown[];

beforeEach(() => {
  vi.resetAllMocks();
  resetClockCheckThrottle();
  shifts = [andre];
  alerted = [];
  workers = [{ id: "w-andre", name: "André Souza", phone: "(617) 555-0100", lang: "pt" }];
  m.settings.mockResolvedValue({ workHours: undefined });
  m.telegram.mockResolvedValue(true);
  m.sms.mockResolvedValue(true);
  m.audit.mockImplementation(async (action: string, o: { entityId: string }) => { alerted.push({ action, entity_id: o.entityId }); });
  m.select.mockImplementation(async (table: string, q: string) => {
    if (table === "kiw_shop_shifts") return shifts;
    if (table === "kiw_shop_workers") return workers;
    if (table === "kiw_shop_audit") {
      const action = /action=eq\.([a-z_]+)/.exec(q)![1];
      return alerted.filter((a) => a.action === action);
    }
    return [];
  });
});

it("texts the worker in their language 30 min after the work day ends — once", async () => {
  const at = Date.parse("2026-10-10T21:31:00Z"); // 5:31 PM EDT
  expect(await runClockChecks(at, { force: true })).toMatchObject({ stillIn: 1, stale: 0 });
  expect(m.sms).toHaveBeenCalledWith("+16175550100", expect.stringContaining("Oi André, seu ponto ainda está aberto desde as 7:35"));
  expect(m.sms.mock.calls[0][1]).toContain("/shop");
  expect(m.telegram).toHaveBeenCalledWith(expect.stringContaining("still clocked in"));
  await runClockChecks(at + 10 * 60_000, { force: true });
  expect(m.sms).toHaveBeenCalledTimes(1);
});

it("does not text before the grace period, for evening work, or days later", async () => {
  expect((await runClockChecks(Date.parse("2026-10-10T21:20:00Z"), { force: true })).stillIn).toBe(0);
  shifts = [{ ...andre, started_at: "2026-10-10T22:30:00Z" }]; // started 6:30 PM
  expect((await runClockChecks(Date.parse("2026-10-10T23:30:00Z"), { force: true })).stillIn).toBe(0);
  shifts = [andre];
  expect((await runClockChecks(Date.parse("2026-10-11T12:34:00Z"), { force: true })).stillIn).toBe(0);
  expect(m.sms).not.toHaveBeenCalled();
});

it("still flags a forgotten clock-out to the office at 15 h, without crew traffic", async () => {
  const r = await runClockChecks(Date.parse("2026-10-11T03:00:00Z"), { force: true });
  expect(r.stale).toBe(1);
  expect(m.telegram).toHaveBeenCalledWith(expect.stringContaining("missed clock-out"));
});

it("is throttled for opportunistic callers but not for the cron", async () => {
  const at = Date.parse("2026-10-10T21:31:00Z");
  expect((await runClockChecks(at)).ran).toBe(true);
  expect((await runClockChecks(at + 1000)).ran).toBe(false);
  expect((await runClockChecks(at + 1000, { force: true })).ran).toBe(true);
});

it("never throws when the database is down", async () => {
  m.select.mockRejectedValue(new Error("down"));
  vi.spyOn(console, "error").mockImplementation(() => {});
  await expect(runClockChecks(Date.now(), { force: true })).resolves.toMatchObject({ ran: true });
});

it("reminder wording in each language", () => {
  const since = "2026-10-10T11:35:00Z";
  expect(stillClockedInMessage("en", "André Souza", since, "https://x/shop")).toBe("KIW: Hi André, you're still clocked in since 7:35 AM. Open the app and clock out: https://x/shop");
  expect(stillClockedInMessage("es", "Jairo", since, "https://x/shop")).toMatch(/^KIW: Hola Jairo, sigues marcado desde las 7:35.*Abre la app y marca tu salida: https:\/\/x\/shop$/);
});
