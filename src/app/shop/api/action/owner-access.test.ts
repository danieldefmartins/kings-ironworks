import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ session: vi.fn(), update: vi.fn(), select: vi.fn(), remove: vi.fn(), audit: vi.fn() }));
vi.mock("@/lib/shop/session", () => ({ getSessionWorker: mocks.session, touchSession: vi.fn() }));
vi.mock("@/lib/shop/db", () => ({
  sbUpdate: mocks.update, sbSelect: mocks.select, sbDelete: mocks.remove, audit: mocks.audit,
  ORG_ID: "test-org",
}));
import { POST } from "./route";
const request = (type: string) => new NextRequest("http://localhost/shop/api/action", {
  method: "POST", body: JSON.stringify({ type, workerId: "worker", rate: 25 }),
});
beforeEach(() => vi.clearAllMocks());

describe("owner-only business actions", () => {
  it.each(["rate_set", "shift_review", "correction_review", "entry_stop", "entry_delete", "org_settings_set", "shift_force_stop", "shift_edit"])("blocks %s for crew and operational admins before database access", async type => {
    for (const flags of [{ is_admin: false, can_see_prices: false }, { is_admin: true, can_see_prices: false }, { is_admin: false, can_see_prices: true }]) {
      mocks.session.mockResolvedValue({ id: "worker", ...flags });
      expect((await POST(request(type))).status).toBe(403);
    }
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });
  it("allows an owner to update a worker rate", async () => {
    mocks.session.mockResolvedValue({ id: "owner", is_admin: true, can_see_prices: true });
    expect((await POST(request("rate_set"))).status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith("kiw_shop_workers", "org_id=eq.test-org&id=eq.worker", { hourly_rate: 25 });
  });
  it("requires a session", async () => {
    mocks.session.mockResolvedValue(null);
    expect((await POST(request("rate_set"))).status).toBe(401);
  });
});
