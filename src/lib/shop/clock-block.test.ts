// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ select: vi.fn(), audit: vi.fn(), settings: vi.fn(), group: vi.fn() }));
vi.mock("./db", () => ({ ORG_ID: "org", sbSelect: m.select, audit: m.audit, getOrgSettings: m.settings }));
vi.mock("./sms", () => ({ sendSmsGroup: m.group }));
import { blockedMessage, reportClockInBlocked } from "./clock-block";

const andre = { id: "w-andre", name: "André" };
let notifies: { at: number }[];
beforeEach(() => {
  vi.resetAllMocks();
  notifies = [];
  m.settings.mockResolvedValue({ branding: { name: "KING IRON WORKS" }, workHours: undefined });
  m.group.mockResolvedValue({ sent: 2, failed: 0, telegram: true });
  m.audit.mockImplementation(async (action: string) => { if (action === "clock_in_blocked_notify") notifies.push({ at: Date.now() }); });
  m.select.mockImplementation(async () => (notifies.length ? [{ id: "n" }] : []));
});

it("audits every blocked attempt but texts the owners once per 30 minutes", async () => {
  const input = { reason: "denied" as const, tapAt: "2026-10-12T11:28:00Z", userAgent: "iPhone" };
  expect(await reportClockInBlocked(andre, input)).toEqual({ notified: true });
  expect(await reportClockInBlocked(andre, input)).toEqual({ notified: false });
  expect(await reportClockInBlocked(andre, input)).toEqual({ notified: false });
  expect(m.group).toHaveBeenCalledTimes(1);
  expect(m.audit.mock.calls.filter(([a]) => a === "clock_in_blocked")).toHaveLength(3);
  // The dedupe window is 30 minutes, per worker.
  expect(m.select.mock.calls[0][1]).toMatch(/action=eq\.clock_in_blocked_notify&worker_id=eq\.w-andre&at=gte\./);
});

it("texts each approval contact in their own language", async () => {
  await reportClockInBlocked(andre, { reason: "denied", tapAt: "2026-10-12T11:28:00Z", userAgent: "x" });
  const [recipients, build] = m.group.mock.calls[0];
  expect(recipients).toEqual([{ phone: "+18578881468", lang: "pt" }, { phone: "+18572369442", lang: "en" }]);
  expect(build("en")).toBe("KIW: André tried to clock in at 7:28 AM but location was blocked on the phone — not clocked in.");
  expect(build("pt")).toBe("KIW: André tentou bater o ponto às 7:28, mas a localização estava bloqueada no celular — ponto não registrado.");
});

it("words a phone that could not find a location differently from a blocked one", () => {
  expect(blockedMessage("en", "KIW", "Kaio", "2026-10-12T11:28:00Z", "timeout", "America/New_York")).toContain("couldn't get a location");
  expect(blockedMessage("es", "KIW", "Jairo", "2026-10-12T11:28:00Z", "denied", "America/New_York")).toMatch(/^KIW: Jairo intentó marcar entrada a las 7:28.*bloqueada/);
});
