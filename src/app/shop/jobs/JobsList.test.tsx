import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { Job } from "@/lib/shop/shared";
import JobsList from "./JobsList";
vi.stubGlobal("React", React);
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(cleanup);
const jobs = [
  { id: "internal", customer_name: "KIW customer", current_stage: "Awarded", is_subcontractor: false },
  { id: "external", customer_name: "Outside customer", current_stage: "Awarded", is_subcontractor: true },
] as Job[];
function board(owner = true) {
  render(<JobsList jobs={jobs} lang="en" canSeeMoney={owner} canManageQueue={owner} crew={[]} workingCount={{}} progress={{}} />);
}
it("switches teams and keeps outside jobs out of the fabrication queue", () => {
  board();
  expect(screen.getByRole("link", { name: /KIW customer/ })).toBeTruthy();
  expect(screen.queryByText("Outside customer")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Fabrication queue/ }));
  expect(screen.queryByText("Outside customer")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Subcontractors/ }));
  expect(screen.getByRole("link", { name: /Outside customer/ })).toBeTruthy();
  expect(screen.queryByText("KIW customer")).toBeNull();
  expect(screen.queryByRole("button", { name: /Fabrication queue/ })).toBeNull();
});
it("keeps owner controls and subcontractor jobs hidden from crew", () => {
  board(false);
  expect(screen.queryByRole("group")).toBeNull();
  expect(screen.queryByRole("button", { name: /Fabrication queue/ })).toBeNull();
  expect(screen.queryByText("Outside customer")).toBeNull();
});
