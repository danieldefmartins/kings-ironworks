import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import JobEstimateDetails from "./JobEstimateDetails";
vi.stubGlobal("React", React);
afterEach(cleanup);
const estimates = [{ id: "e", number: "26-462", title: "Interior railing", issuedOn: "2026-04-23", original: false, total: 2650, items: [{ description: "Solid wood posts and top rail with horizontal pickets", quantity: 1, unitPrice: 2650, amount: 2650 }] }];
const job = { scope: "Custom interior stair railing", contract_amount: 2650, deposit_amount: 1325, deposit_note: "Private payment note" };
it("shows descriptions without any financial information even if private props are accidentally supplied", () => {
  const { container } = render(<JobEstimateDetails estimates={estimates} job={job} owner={false} lang="en" />);
  expect(screen.getByText("Solid wood posts and top rail with horizontal pickets")).toBeTruthy();
  expect(container.textContent).not.toMatch(/2,650|1,325|Private payment|Project money|Estimate amount/);
});
it("shows job money and the itemized estimate to owners", () => {
  render(<JobEstimateDetails estimates={estimates} job={job} owner lang="en" />);
  expect(screen.getByText("Project money · Daniel & Kayky")).toBeTruthy();
  expect(screen.getAllByText("$2,650.00")).toHaveLength(3);
  expect(screen.getByText("Private payment note")).toBeTruthy();
});
it("makes failed estimate loading visible instead of reporting no items", () => {
  render(<JobEstimateDetails estimates={null} job={job} owner={false} lang="en" />);
  expect(screen.getByRole("alert")).toBeTruthy();
});
