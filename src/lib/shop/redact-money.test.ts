import { describe, expect, it } from "vitest";
import { redactJobMoney, scrubMoneyText } from "./shared";

const job = {
  contract_amount: 67310, deposit_amount: 40000, deposit_note: "check", deposit_received_on: "2026-09-01",
  subcontractor_amount_paid: 100, subcontractor_split_pct: 50, subcontractor_paid_on: "2026-09-01", subcontractor_notes: "x",
  notes: "PAYMENTS: $67,310 contract. Price is FIRM at $14,500. Stop and re-quote in writing.",
  scope: "HOUSE #1 — 2x small front staircase @ $3,000 ($6,000); 2x long exterior stairs.\nComplete scope, fully installed. Original $15,680, less negotiated discount $3,900.\nGalvanized, black powder coat.",
};

describe("crew never receive prices", () => {
  it("strips money fields, drops notes, and cleans the scope", () => {
    const r = redactJobMoney(job, false);
    expect(r.contract_amount).toBeNull();
    expect(r.deposit_amount).toBeNull();
    expect(r.notes).toBeNull();
    expect(r.scope).not.toMatch(/\$|\d{1,3},\d{3}|discount/);
    expect(r.scope).toContain("2x small front staircase");
    expect(r.scope).toContain("2x long exterior stairs");
    expect(r.scope).toContain("Galvanized, black powder coat.");
  });
  it("leaves everything for Daniel and Kayky", () => {
    expect(redactJobMoney(job, true)).toEqual(job);
  });
  it("keeps plain work descriptions untouched", () => {
    expect(scrubMoneyText("Two 42 in. railings, 4 posts, DTM paint.")).toBe("Two 42 in. railings, 4 posts, DTM paint.");
    expect(scrubMoneyText("Balance $2,500 due on completion. Install Tuesday.")).toBe("Install Tuesday.");
  });
});
