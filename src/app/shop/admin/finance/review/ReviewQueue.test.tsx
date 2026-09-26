import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ReviewQueue, { type ReviewItem } from "./ReviewQueue";
vi.stubGlobal("React", React);
afterEach(cleanup);

const item = (id: string, description: string, amount: number): ReviewItem => ({ id, description, amount, category: "Meals", vendor: id, grp: "review", owner: null, account: "1752", posted_on: "2026-08-01" });

describe("ReviewQueue totals", () => {
  it("shows a count and dollar total on each filter and for the current filter", () => {
    render(<ReviewQueue lang="en" items={[item("a", "TST* VILLAGE BAR & GRIL", -100), item("b", "STARBUCKS 800", -25.5), item("c", "Zelle payment to Pablito JPM99", -300)]} />);
    expect(screen.getByRole("button", { name: /Restaurants\s*2 · \$126/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Zelle & checks\s*1 · \$300/ })).toBeTruthy();
    expect(screen.getByText("$425.50")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Restaurants/ }));
    expect(screen.getByText("$125.50")).toBeTruthy();
  });
});
