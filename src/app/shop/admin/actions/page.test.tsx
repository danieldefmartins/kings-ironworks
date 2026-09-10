import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ session: vi.fn(), load: vi.fn() }));
vi.mock("@/lib/shop/session", () => ({ getSessionWorker: mocks.session }));
vi.mock("@/lib/shop/actions-db", () => ({ loadBusinessActions: mocks.load }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock("../../ShopTopBar", () => ({ default: () => null }));
import Page from "./page";
vi.stubGlobal("React", React);
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);
it.each([null, { is_admin: true, can_see_prices: false }, { is_admin: false, can_see_prices: true }, { is_admin: false, can_see_prices: false }])("blocks unauthorized dashboard reads: %j", async worker => {
  mocks.session.mockResolvedValue(worker);
  await expect(Page()).rejects.toThrow(worker ? "redirect:/shop" : "redirect:/shop/login");
  expect(mocks.load).not.toHaveBeenCalled();
});
it("does not display zero counts when data retrieval fails", async () => {
  mocks.session.mockResolvedValue({ name: "Owner", is_admin: true, can_see_prices: true, lang: "en" });
  mocks.load.mockRejectedValue(new Error("unavailable"));
  render(await Page());
  expect(screen.getByRole("alert").textContent).toContain("Counts are unavailable");
  expect(screen.queryByRole("navigation")).toBeNull();
});
