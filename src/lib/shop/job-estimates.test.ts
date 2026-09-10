import { expect, it } from "vitest";
import { estimateForViewer, type JobEstimate } from "./job-estimates";
const estimate: JobEstimate = { id: "e", estimate_number: "26-452", title: "Dock framing", issued_on: "2026-03-19", is_original: true, total_amount: "94120", items: [{ description: "Fabricate two dock openings", quantity: 2, unit_price: 4250 }] };
it("includes item descriptions and quantities but no money fields for crew", () => {
  const view = estimateForViewer(estimate, false);
  expect(view.items).toEqual([{ description: "Fabricate two dock openings", quantity: 2 }]);
  expect(view).not.toHaveProperty("total");
  expect(JSON.stringify(view)).not.toMatch(/94120|4250|8500|unit_price|amount/);
});
it("shows the original estimate amount and line prices to owners without aggregating unrelated job values", () => {
  const view = estimateForViewer(estimate, true);
  expect(view.total).toBe(94120);
  expect(view.items[0]).toMatchObject({ unitPrice: 4250, amount: 8500 });
});
