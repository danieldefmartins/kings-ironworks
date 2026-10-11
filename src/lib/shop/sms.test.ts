import { afterEach, describe, expect, it, vi } from "vitest";
import { sendSms, sendSmsGroup, smsDryRun, smsLang } from "./sms";
import { requestedMessage } from "./work-hours-db";

vi.mock("./db", () => ({ ORG_ID: "test", audit: vi.fn(), getOrgSettings: vi.fn(), sbInsert: vi.fn(), sbSelect: vi.fn(), sbUpdate: vi.fn() }));

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("sms", () => {
  it("is always a dry run under tests, even with a token and production env", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("GHL_PIT_TOKEN", "x");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(smsDryRun()).toBe(true);
    expect(await sendSms("+18578881468", "hello")).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(log.mock.calls[0][0]).toContain("DRY RUN → +18578881468: hello");
  });

  it("SMS_DRY_RUN=1 forces a dry run", () => {
    vi.stubEnv("SMS_DRY_RUN", "1");
    expect(smsDryRun()).toBe(true);
  });

  it("never throws and refuses bad input", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await sendSms("8578881468", "hi")).toBe(false);
    expect(await sendSms("+18578881468", "  ")).toBe(false);
  });

  it("group: one text per number, each in its own language; Telegram copy in English", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const r = await sendSmsGroup(
      [{ phone: "+18578881468", lang: "pt" }, { phone: "+18572369442", lang: "en" }, { phone: "+16175550100", lang: "es" }, { phone: "+16175550101" }, { phone: "+18578881468", lang: "pt" }],
      (lang) => `msg-${lang}`,
    );
    expect(r).toEqual({ sent: 4, failed: 0, telegram: true });
    const lines = log.mock.calls.map((c) => String(c[0]));
    expect(lines).toContain("[sms] DRY RUN → +18578881468: msg-pt");
    expect(lines).toContain("[sms] DRY RUN → +18572369442: msg-en");
    expect(lines).toContain("[sms] DRY RUN → +16175550100: msg-es");
    expect(lines).toContain("[sms] DRY RUN → +16175550101: msg-pt");
    expect(lines).toContain("[sms] DRY RUN telegram backup: msg-en");
  });

  it("unknown language defaults to Portuguese", () => {
    expect(smsLang(undefined)).toBe("pt");
    expect(smsLang("fr")).toBe("pt");
    expect(smsLang("es")).toBe("es");
  });

  it("the extra-time message reads naturally in each language", () => {
    const args = ["KIW", "Tiago", "start", "2026-10-13T10:52:00Z", "2026-10-13T11:30:00Z", "America/New_York"] as const;
    expect(requestedMessage(...args, "en")).toBe("KIW: Tiago clocked in at 6:52 AM (before 7:30 AM) and says the team leader asked. Check it in Shop › Time.");
    expect(requestedMessage(...args, "pt")).toBe("KIW: Tiago bateu o ponto às 6:52 (antes das 7:30) e disse que o líder pediu. Confira em Shop › Time.");
    expect(requestedMessage(...args, "es")).toMatch(/^KIW: Tiago marcó entrada a las 6:52.*antes de las 7:30.*Revísalo en Shop › Time\.$/);
    expect(requestedMessage("KIW", "Tiago", "end", "2026-10-13T22:10:00Z", "2026-10-13T21:00:00Z", "America/New_York", "en")).toBe("KIW: Tiago clocked out at 6:10 PM (after 5:00 PM) and says the team leader asked. Check it in Shop › Time.");
  });
});
