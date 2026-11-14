// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { resetFormCache, SMS_NOTICE_TEXT } from "@/lib/crm360";

const fetchMock = vi.fn();
const base = { name: "Alex de Silva", preferredContact: "email", email: "alex@example.com", serviceType: "Railings", projectDescription: "Replace porch railing" };
const request = (body: unknown, headers: Record<string, string> = {}) => new NextRequest("http://localhost/api/contact", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json", ...headers } });
const b64 = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url");
const token = (claims: object = {}) => `${b64({ ws: "8e40794c-055a-49a8-a190-7baea0587ba3", kind: "form", issuedAt: Date.now() - 10_000, exp: Date.now() + 3_600_000, ...claims })}.sig`;
const submits = () => fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/direct-submit"));
const payload = () => JSON.parse(submits()[0][1].body);
const formReply = (t = token(), config: object = {}) => Response.json({ token: t, config: { requireCaptcha: false, ...config } });
const noticeForm = { consentMode: "notice", consentText: SMS_NOTICE_TEXT };

beforeEach(() => {
  resetFormCache();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset().mockImplementation(async (url: string) =>
    url.includes("/forms/") ? formReply() : Response.json({ thankYou: "Thank you." }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("quote submission to 360", () => {
  it("saves an email-only lead with its full name, project details and preference", async () => {
    const res = await POST(request(base));
    expect(await res.json()).toEqual({ success: true });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.get360crm.com/public/website/forms/kiw-website-quote");
    expect(payload().answers).toEqual({ first_name: "Alex", last_name: "de Silva", email: base.email, preferred: "Email", service: "Railings", details: base.projectDescription });
    expect(payload()).toMatchObject({ smsConsent: false, website: "", turnstileToken: "" });
    expect(payload().key).toMatch(/^[0-9a-f-]{36}$/);
  });
  it("accepts a single name and a US phone", async () => {
    const res = await POST(request({ ...base, name: "Alex", preferredContact: "phone", email: "", phone: "617-555-0100" }));
    expect(res.status).toBe(200);
    expect(payload().answers).toMatchObject({ first_name: "Alex", phone: "+16175550100", preferred: "Phone call" });
    expect(payload().answers).not.toHaveProperty("last_name");
  });
  it("tells 360 the notice was shown for a phone lead, with the page, once the 360 form holds the notice", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("/forms/") ? formReply(token(), noticeForm) : Response.json({ thankYou: "ok" }));
    await POST(request({ ...base, preferredContact: "phone", email: "", phone: "6175550100" }, { referer: "https://kingsironworks.com/contact?utm_source=x" }));
    expect(payload()).toMatchObject({ consent: true, smsConsent: false, attribution: { landing_page: "https://kingsironworks.com/contact" } });
    fetchMock.mockClear();
    // No phone number, no text permission.
    await POST(request(base));
    expect(payload().consent).toBe(false);
  });
  it("gives no text permission while the 360 form still holds other wording", async () => {
    await POST(request({ ...base, preferredContact: "phone", email: "", phone: "6175550100", consent: true }));
    expect(payload()).toMatchObject({ consent: false, smsConsent: false });
    resetFormCache();
    fetchMock.mockClear();
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("/forms/") ? formReply(token(), { consentMode: "notice", consentText: "Other words about text messages" }) : Response.json({ thankYou: "ok" }));
    await POST(request({ ...base, preferredContact: "phone", email: "", phone: "6175550100" }));
    expect(payload().consent).toBe(false);
  });
  it("sends address, timeline and source when given", async () => {
    await POST(request({ ...base, projectAddress: "1 Main St, Everett, MA", timeline: "ASAP", source: "Google" }));
    expect(payload().answers).toMatchObject({ address: "1 Main St, Everett, MA", timeline: "ASAP", source: "Google" });
  });
  it("reuses the signed form token between quotes", async () => {
    await POST(request(base));
    await POST(request(base));
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("/forms/"))).toHaveLength(1);
    expect(submits()).toHaveLength(2);
  });
  it("waits out the 2 second rule on a fresh token", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("/forms/") ? formReply(token({ issuedAt: Date.now() })) : Response.json({ thankYou: "ok" }));
    const started = Date.now();
    await POST(request(base));
    expect(Date.now() - started).toBeGreaterThanOrEqual(2000);
  });
  it("refuses a token for another business", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("/forms/") ? formReply(token({ ws: "00000000-0000-4000-8000-000000000000" })) : Response.json({}));
    expect((await POST(request(base))).status).toBe(502);
    expect(submits()).toHaveLength(0);
  });
  it.each([
    { ...base, email: "invalid" }, { ...base, name: " " },
    { ...base, preferredContact: "phone", phone: "abc1234567" },
    { ...base, preferredContact: "phone", phone: "" },
    { ...base, preferredContact: "email", email: "" },
    { ...base, projectDescription: " " }, { ...base, serviceType: "invalid" },
  ])("rejects invalid input before contacting the CRM", async body => {
    expect((await POST(request(body))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("accepts old open forms and keeps both contact details", async () => {
    const res = await POST(request({ firstName: "Alex", lastName: "Smith", phone: "6175550100", email: "alex@example.com", serviceType: "Railings", projectDescription: "Repair railing", locationId: "untrusted" }));
    expect(res.status).toBe(200);
    expect(payload().answers).toMatchObject({ first_name: "Alex", last_name: "Smith", phone: "+16175550100", email: "alex@example.com" });
  });
  it("does not report success when the CRM rejects a submission", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("/forms/") ? formReply() : Response.json({ error: { message: "private provider error" } }, { status: 400 }));
    const res = await POST(request(base));
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain("private provider error");
  });
  it("handles a network failure", async () => {
    fetchMock.mockRejectedValue(new Error("timeout"));
    expect((await POST(request(base))).status).toBe(502);
  });
  it("keeps the notice the visitor sees", () => {
    expect(SMS_NOTICE_TEXT).toBe("By submitting this form, you agree to receive text messages from King Iron Works about your request (quotes, scheduling, project updates). Message frequency varies. Msg & data rates may apply. Reply STOP to opt out. We will never sell or share your information.");
  });
});
