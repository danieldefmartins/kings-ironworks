import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import ProjectMoney from "./ProjectMoney";
vi.stubGlobal("React", React);
afterEach(cleanup);
const jobs = [{ id: "a", job_number: "A", customer_name: "Current", current_stage: "Awarded", archived: false, contract_amount: 100, deposit_amount: 50 }, { id: "b", job_number: "B", customer_name: "Historical", current_stage: "Done", archived: true, contract_amount: null, deposit_amount: 1000 }];
it("defaults to all current jobs and exposes an archive review with missing-data warning", () => {
  render(<ProjectMoney jobs={jobs} lang="en" />);
  expect(screen.getByRole("combobox").getAttribute("aria-label")).toBe("Money summary scope");
  expect(screen.getAllByText("$100.00")).toHaveLength(2);
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "archived" } });
  expect(screen.getByRole("status").textContent).toContain("Incomplete records");
  expect(screen.getByText(/Historical records for review/)).toBeTruthy();
});
it("does not render numeric cards after a failed load", () => {
  render(<ProjectMoney jobs={null} lang="en" />);
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(screen.queryByText("$0.00")).toBeNull();
});
