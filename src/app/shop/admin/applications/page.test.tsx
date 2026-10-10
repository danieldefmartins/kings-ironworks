import React from "react";
import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), select: vi.fn() }));
vi.mock("@/lib/shop/session", () => ({ getSessionWorker: m.session }));
vi.mock("@/lib/shop/db", () => ({ ORG_ID: "org", sbSelect: m.select }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw Error(`redirect:${path}`); } }));
import Page from "./page";
vi.stubGlobal("React", React);
beforeEach(() => { vi.clearAllMocks(); m.select.mockResolvedValue([]); });
it("never reads applicant data for guests or non-owner workers", async () => {
 m.session.mockResolvedValue(null); await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect:/shop/login");
 m.session.mockResolvedValue({ id: "crew", is_admin: true, can_see_prices: false }); await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect:/shop");
 expect(m.select).not.toHaveBeenCalled();
});
it("scopes owner application reads and paginates history", async () => {
 m.session.mockResolvedValue({ id: "owner", name: "Owner", is_admin: true, can_see_prices: true });
 await Page({ searchParams: Promise.resolve({ status: "approved", page: "2" }) });
 expect(m.select).toHaveBeenCalledWith("kiw_shop_worker_applications", expect.stringContaining("org_id=eq.org&status=eq.approved"));
 expect(m.select.mock.calls[0][1]).toContain("limit=51&offset=50");
});
