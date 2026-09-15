import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ worker: vi.fn(), money: vi.fn(), jobs: vi.fn(), shifts: vi.fn() }));
vi.mock("@/lib/shop/session", () => ({ getSessionWorker: m.worker }));
vi.mock("@/lib/shop/project-money-db", () => ({ loadProjectMoney: m.money }));
vi.mock("@/lib/shop/db", () => ({ listJobs: m.jobs, getRunningEntry: async () => null, listOpenShifts: m.shifts, listWorkers: async () => [], listRunningEntries: async () => [] }));
vi.mock("next/navigation", () => ({ redirect: () => { throw new Error("redirect"); } }));
vi.mock("./ShopTopBar", () => ({ default: () => null }));
vi.mock("./OnTheClock", () => ({ default: () => <div>Crew activity</div> }));
import Page from "./page";
vi.stubGlobal("React", React);
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  m.jobs.mockResolvedValue([{ id: "a", customer_name: "Shop job", current_stage: "Cut", due_date: null, assigned_worker_id: "crew" }, { id: "b", customer_name: "Subcontractor job", current_stage: "Cut", is_subcontractor: true }]);
  m.money.mockResolvedValue([]); m.shifts.mockResolvedValue([]);
});
it.each([{is_admin:false,can_see_prices:false},{is_admin:true,can_see_prices:false},{is_admin:false,can_see_prices:true}])("does not load or render company money or team activity for nonowners", async flags => {
  m.worker.mockResolvedValue({id:"crew",name:"Crew",lang:"en",...flags});
  render(await Page());
  expect(m.money).not.toHaveBeenCalled(); expect(m.shifts).not.toHaveBeenCalled();
  expect(screen.queryByRole("region", {name:"Project money"})).toBeNull();
  expect(screen.queryByText("Crew activity")).toBeNull();
  expect(screen.getByRole("heading", { name: /Assigned to you/ })).toBeTruthy();
  expect(screen.queryByText("Subcontractor job")).toBeNull();
});
it.each(["Daniel Martins", "Kayky"])("puts Project Money first on Today for %s", async name => {
  m.worker.mockResolvedValue({id:"owner",name,lang:"en",is_admin:true,can_see_prices:true});
  render(await Page());
  expect(m.money).toHaveBeenCalledOnce();
  expect(screen.getByRole("main").firstElementChild).toBe(screen.getByRole("region",{name:"Project money"}));
  expect(screen.getByText("Crew activity")).toBeTruthy();
});
it("shows a load error instead of false zero balances", async () => {
  m.worker.mockResolvedValue({id:"owner",name:"Daniel",is_admin:true,can_see_prices:true});
  m.money.mockRejectedValue(new Error("offline"));
  render(await Page());
  expect(screen.getByRole("alert").textContent).toContain("Could not load");
});
