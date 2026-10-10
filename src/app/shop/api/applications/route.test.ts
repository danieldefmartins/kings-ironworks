import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ session: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/shop/session", () => ({ getSessionWorker: m.session }));
vi.mock("@/lib/shop/db", () => ({ ORG_ID: "org", sbRpc: m.rpc }));
import { POST } from "./route";
const body = { id: "10000000-0000-4000-8000-000000000001", decision: "approved", role: "Welder", hourlyRate: 25, pin: "012345" };
const request = (data: unknown = body) => new NextRequest("http://localhost/shop/api/applications", { method: "POST", body: JSON.stringify(data) });
beforeEach(() => { vi.resetAllMocks(); m.session.mockResolvedValue({ id: "owner", is_admin: true, can_see_prices: true }); m.rpc.mockResolvedValue({ status: "approved", workerId: "new-worker" }); });
it("requires an owner for every approval", async () => {
 m.session.mockResolvedValue(null); expect((await POST(request())).status).toBe(401);
 m.session.mockResolvedValue({ id: "crew", is_admin: true, can_see_prices: false }); expect((await POST(request())).status).toBe(403); expect(m.rpc).not.toHaveBeenCalled();
});
it("uses the session actor and tenant and never returns the PIN", async () => {
 const res = await POST(request({ ...body, actor: "intruder", org: "other", is_admin: true }));
 expect(res.status).toBe(200); expect(await res.json()).toEqual({ ok: true, status: "approved", workerId: "new-worker" });
 expect(m.rpc).toHaveBeenCalledWith("kiw_review_worker_application", expect.objectContaining({ p_actor: "owner", p_org: "org", p_pin: "012345", p_rate: 25 }));
});
it("rejects incomplete approvals and reports duplicate workers without leaking DB internals", async () => {
 expect((await POST(request({ id: body.id, decision: "approved" }))).status).toBe(400); expect(m.rpc).not.toHaveBeenCalled();
 m.rpc.mockRejectedValue(new Error("Supabase Worker already exists private details")); const res = await POST(request()); expect(res.status).toBe(409); expect(JSON.stringify(await res.json())).not.toContain("private details");
});
