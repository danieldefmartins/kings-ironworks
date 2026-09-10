import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ session: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/shop/session", () => ({ getSessionWorker: m.session }));
vi.mock("@/lib/shop/db", () => ({ sbRpc: m.rpc, ORG_ID: "tenant" }));
import { POST } from "./route";
const payload = { jobId: "00000000-0000-4000-8000-000000000001", change: { action: "add", id: "00000000-0000-4000-8000-000000000002", kind: "payment", amount: 1325, date: null, description: "Derek deposit" } };
function req(body: unknown, origin?: string) { return new NextRequest("https://example.com/shop/api/job-money", { method: "POST", body: JSON.stringify(body), headers: origin ? { origin } : {} }); }
beforeEach(() => { vi.clearAllMocks(); m.session.mockResolvedValue({ id: "owner", is_admin: true, can_see_prices: true }); m.rpc.mockResolvedValue({ ok: true }); });
it.each([null, {is_admin:false,can_see_prices:false}, {is_admin:true,can_see_prices:false}, {is_admin:false,can_see_prices:true}])("rejects unauthorized financial writes before database access", async worker => {
  m.session.mockResolvedValue(worker);
  expect((await POST(req(payload))).status).toBe(worker ? 403 : 401);
  expect(m.rpc).not.toHaveBeenCalled();
});
it("uses session owner and tenant and retains the request UUID for safe retries", async () => {
  expect((await POST(req(payload))).status).toBe(200);
  expect(m.rpc).toHaveBeenCalledWith("kiw_shop_money_change", { p_org: "tenant", p_worker: "owner", p_job: payload.jobId, p_action: "add", p_data: payload.change });
});
it.each([{amount:1.001},{amount:"1325"},{date:"2026-02-30"},{description:""},{kind:"payroll"}])("rejects malformed money entries", async change => {
  expect((await POST(req({...payload,change:{...payload.change,...change}}))).status).toBe(400);
  expect(m.rpc).not.toHaveBeenCalled();
});
it("rejects cross-origin writes", async () => {
  expect((await POST(req(payload, "https://unrelated.test"))).status).toBe(403);
  expect(m.rpc).not.toHaveBeenCalled();
});
it("accepts the public shop origin behind the hosting proxy", async () => {
  const request = new NextRequest("http://localhost:8080/shop/api/job-money", { method:"POST", body:JSON.stringify(payload), headers:{ origin:"https://kingsironworks.com", "x-forwarded-host":"kingsironworks.com" } });
  expect((await POST(request)).status).toBe(200);
});
