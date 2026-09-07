import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), load: vi.fn(), earliest: vi.fn() }));
vi.mock("@/lib/shop/session", () => ({ getSessionWorker: mocks.session }));
vi.mock("@/lib/shop/payroll-db", () => ({ loadPayrollWeek: mocks.load, earliestPayrollDate: mocks.earliest }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock("../../ShopTopBar", () => ({ default: () => null }));
vi.mock("./PayrollClient", () => ({ default: () => null }));
import Page from "./page";
import PayrollClient from "./PayrollClient";
vi.stubGlobal("React", React);
beforeEach(() => vi.clearAllMocks());
describe("payroll authorization", () => {
  it("requires a session before retrieving any wages", async () => {
    mocks.session.mockResolvedValue(null);
    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect:/shop/login");
    expect(mocks.load).not.toHaveBeenCalled();
  });
  it("requires both owner financial flags", async () => {
    mocks.session.mockResolvedValue({ is_admin: true, can_see_prices: false });
    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect:/shop");
    expect(mocks.load).not.toHaveBeenCalled();
  });
});


it("reconciles rounded daily cents to weekly wages and preserves all historical weeks", async () => {
  mocks.session.mockResolvedValue({ name: "Owner", is_admin: true, can_see_prices: true });
  mocks.earliest.mockResolvedValue("2020-01-06T12:00:00Z");
  mocks.load.mockResolvedValue({ workers: [{ id: "w", name: "Tiago", active: true }], breaks: [], shifts: [
    { id: "a", worker_id: "w", started_at: "2020-01-06T12:00:00Z", ended_at: "2020-01-06T12:01:00Z", pay_rate: 10, status: "approved" },
    { id: "b", worker_id: "w", started_at: "2020-01-07T12:00:00Z", ended_at: "2020-01-07T12:01:00Z", pay_rate: 10, status: "approved" },
  ] });
  const tree = await Page({ searchParams: Promise.resolve({ week: "2020-01-06" }) });
  const main = React.Children.toArray(tree.props.children).find(child => React.isValidElement(child) && child.type === "main") as React.ReactElement<{ children: React.ReactNode }>;
  const client = React.Children.toArray(main.props.children).find(child => React.isValidElement(child) && child.type === PayrollClient) as React.ReactElement<React.ComponentProps<typeof PayrollClient>>;
  expect(client.props.days[0].rows[0].basePay).toBe(0.17);
  expect(client.props.days[1].rows[0].basePay).toBe(0.17);
  expect(client.props.rows[0].basePay).toBe(0.34);
  expect(client.props.weeks).toContain("2020-01-06");
  expect(client.props.weeks.length).toBeGreaterThan(300);
});
