import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { sampleApplication } from "@/lib/shop/worker-application.fixture";
const m = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/shop/db", () => ({ ORG_ID: "org", sbRpc: m.rpc }));
import { POST } from "./route";
const input = { requestId: "10000000-0000-4000-8000-000000000001", application: sampleApplication };
const request = (body: unknown, origin = "http://localhost") => new NextRequest("http://localhost/api/worker-applications", { method: "POST", headers: { "content-type": "application/json", origin, "x-real-ip": "127.0.0.1" }, body: JSON.stringify(body) });
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("SHOP_SESSION_SECRET", "test-only-secret"); m.rpc.mockResolvedValue(input.requestId); });
afterEach(() => vi.unstubAllEnvs());
it("saves an application without creating a worker or exposing applicant details", async () => {
 const res = await POST(request(input)); expect(res.status).toBe(200); expect(await res.json()).toEqual({ ok: true });
 expect(m.rpc).toHaveBeenCalledWith("kiw_submit_worker_application", expect.objectContaining({ p_org: "org", p_id: input.requestId, p_data: sampleApplication, p_source: expect.stringMatching(/^[a-f0-9]{64}$/) }));
});
it("rejects missing data and cross-origin posts before storage", async () => {
 expect((await POST(request({}))).status).toBe(400); expect((await POST(request(input, "https://untrusted.test"))).status).toBe(403); expect(m.rpc).not.toHaveBeenCalled();
});
it("does not store honeypot submissions", async () => { expect((await POST(request({ ...input, website: "spam" }))).status).toBe(200); expect(m.rpc).not.toHaveBeenCalled(); });
it("reports rate limits and storage failures without claiming success", async () => {
 m.rpc.mockResolvedValue(null); expect((await POST(request(input))).status).toBe(429);
 m.rpc.mockRejectedValue(new Error("private database details")); const res = await POST(request(input)); expect(res.status).toBe(503); expect(JSON.stringify(await res.json())).not.toContain("private database");
});
