import React from "react";
import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ worker: vi.fn(), money: vi.fn(), jobs: vi.fn() }));
vi.mock("@/lib/shop/session", () => ({ getSessionWorker: m.worker, randomSeed: () => 1 }));
vi.mock("@/lib/shop/project-money-db", () => ({ loadProjectMoney: m.money }));
vi.mock("@/lib/shop/db", () => ({ listJobs: m.jobs, getRunningEntries: async () => [], listAllJobPieces: async () => [], listWorkers: async () => [] }));
vi.mock("next/navigation", () => ({ redirect: () => { throw new Error("redirect"); } }));
vi.mock("../ShopTopBar", () => ({ default: () => null }));
vi.mock("../MotivationBanner", () => ({ default: () => null }));
vi.mock("./JobsList", () => ({ default: () => null }));
vi.mock("./JobsBoardMap", () => ({ default: () => null }));
vi.mock("./ProjectMoney", () => ({ default: () => null }));
import Page from "./page";
vi.stubGlobal("React", React);
beforeEach(() => { vi.clearAllMocks(); m.jobs.mockResolvedValue([]); });
it.each([{is_admin:false,can_see_prices:false},{is_admin:true,can_see_prices:false},{is_admin:false,can_see_prices:true}])("never loads the financial ledger for a nonowner", async flags => {
  m.worker.mockResolvedValue({name:"Crew",lang:"en",...flags});
  await Page();
  expect(m.money).not.toHaveBeenCalled();
});
it("loads the independent financial ledger for an owner", async () => {
  m.worker.mockResolvedValue({name:"Owner",lang:"en",is_admin:true,can_see_prices:true});
  m.money.mockResolvedValue([]);
  await Page();
  expect(m.money).toHaveBeenCalledOnce();
});
