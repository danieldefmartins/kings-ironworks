import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { PayrollRow } from "@/lib/shop/payroll";
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
import PayrollClient from "./PayrollClient";
vi.stubGlobal("React", React);
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const worker: PayrollRow = { id: "w", name: "Tiago", active: true, hours: 10, regular: 10, overtime: 0, basePay: 250, approvedHours: 10, pendingHours: 0, rejectedHours: 0, openHours: 0, openShifts: 0, missingRateHours: 0, shifts: 2 };
const props = {
  rows: [worker, { ...worker, id: "w2", name: "Kayky", hours: 5, basePay: 125 }],
  days: [{ date: "2026-09-07", rows: [{ ...worker, hours: 6, basePay: 150 }] }, { date: "2026-09-08", rows: [{ ...worker, hours: 4, basePay: 100 }] }],
  weeks: ["2026-09-07", "2026-08-31"], selected: "2026-09-07", sunday: "2026-09-13", lang: "en",
};
describe("payroll interaction", () => {
  it("shows the full worker total and opens individual daily wages", () => {
    render(<PayrollClient {...props} />);
    expect(screen.getByText("$375.00")).toBeDefined();
    const summary = screen.getByText("Tiago").closest("summary")!;
    const details = summary.closest("details")!;
    expect(details.open).toBe(false);
    fireEvent.click(summary);
    expect(details.open).toBe(true);
    expect(within(details).getByText("Mon, Sep 7")).toBeDefined();
    expect(within(details).getByText("$150.00")).toBeDefined();
    expect(within(details).getByText("Tue, Sep 8")).toBeDefined();
    expect(within(details).getByText("$100.00")).toBeDefined();
    fireEvent.click(summary);
    expect(details.open).toBe(false);
  });
  it("labels complete week ranges and navigates to a selected historical week", () => {
    render(<PayrollClient {...props} />);
    const select = screen.getByRole("combobox", { name: "Payroll week" });
    expect(within(select).getByRole("option", { name: "Aug 31, 2026 – Sep 6, 2026" })).toBeDefined();
    fireEvent.change(select, { target: { value: "2026-08-31" } });
    expect(router.push).toHaveBeenCalledWith("/shop/admin/payroll?week=2026-08-31");
  });
});
