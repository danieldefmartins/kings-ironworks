// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const fetchMock = vi.fn();
const base = { name: "Alex de Silva", preferredContact: "email", email: "alex@example.com", serviceType: "Railings", projectDescription: "Replace porch railing" };
const request = (body: unknown) => new NextRequest("http://localhost/api/contact", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
const payload = () => JSON.parse(fetchMock.mock.calls[0][1].body);

beforeEach(() => {
  vi.stubEnv("GHL_PIT_TOKEN", "test-token");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset().mockResolvedValue(Response.json({ contact: { id: "test-id" } }, { status: 201 }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("quote submission", () => {
  it("saves an email-only lead with its full name, project details and preference", async () => {
    const res = await POST(request(base));
    expect(await res.json()).toEqual({ success: true });
    expect(payload()).toMatchObject({ firstName: "Alex", lastName: "de Silva", email: base.email });
    expect(payload()).not.toHaveProperty("phone");
    expect(payload().customFields).toContainEqual(expect.objectContaining({ fieldValue: expect.stringContaining("Preferred contact: Email") }));
    expect(payload().customFields).toContainEqual(expect.objectContaining({ fieldValue: expect.stringContaining(base.projectDescription) }));
    expect(payload().dndSettings.SMS.status).toBe("active");
  });
  it("accepts a single name and phone call without SMS permission", async () => {
    const res = await POST(request({ ...base, name: "Alex", preferredContact: "phone", email: "", phone: "617-555-0100" }));
    expect(res.status).toBe(200);
    expect(payload()).not.toHaveProperty("lastName");
    expect(payload().dndSettings.SMS.status).toBe("active");
  });
  it("records explicit SMS permission without resetting existing opt-outs", async () => {
    await POST(request({ ...base, preferredContact: "phone", email: "", phone: "6175550100", consent: true }));
    expect(payload()).not.toHaveProperty("dndSettings");
    expect(payload().customFields).toContainEqual(expect.objectContaining({ fieldValue: expect.stringContaining("SMS consent: Yes") }));
  });
  it.each([
    { ...base, email: "invalid" }, { ...base, name: " " },
    { ...base, preferredContact: "phone", phone: "abc1234567" },
    { ...base, preferredContact: "phone", phone: "" },
    { ...base, projectDescription: " " }, { ...base, serviceType: "invalid" },
  ])("rejects invalid input before contacting the CRM", async body => {
    expect((await POST(request(body))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("accepts old open forms while preserving both contact details and server routing", async () => {
    const res = await POST(request({ firstName: "Alex", lastName: "Smith", phone: "6175550100", email: "alex@example.com", serviceType: "Railings", projectDescription: "Repair railing", locationId: "untrusted" }));
    expect(res.status).toBe(200);
    expect(payload()).toMatchObject({ firstName: "Alex", lastName: "Smith", phone: "6175550100", email: "alex@example.com", locationId: "rJsKSnzzxWdCgDCq21rI" });
  });
  it("does not report success when the CRM rejects a submission", async () => {
    fetchMock.mockResolvedValue(Response.json({ message: "private provider error" }, { status: 400 }));
    const res = await POST(request(base));
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain("private provider error");
  });
  it("handles a network failure", async () => {
    fetchMock.mockRejectedValue(new Error("timeout"));
    expect((await POST(request(base))).status).toBe(502);
  });
  it("reports missing configuration without making a CRM call", async () => {
    vi.stubEnv("GHL_PIT_TOKEN", "");
    expect((await POST(request(base))).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
