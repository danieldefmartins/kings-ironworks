import { expect, it } from "vitest";
import { projectMoney, type MoneyJob } from "./project-money";
const job = (id: string, extra: Partial<MoneyJob> = {}): MoneyJob => ({ id, job_number: id, customer_name: id, current_stage: "Awarded", archived: false, contract_amount: 100, deposit_amount: 50, ...extra });
it("includes completed balances in all current jobs but keeps archived and lead records separate", () => {
  const jobs = [job("active"), job("done", { current_stage: "Done", contract_amount: 25000, deposit_amount: 22000 }), job("archived", { archived: true }), job("quote", { current_stage: "Lead" })];
  expect(projectMoney(jobs, "current")).toMatchObject({ total: 25100, received: 22050, balance: 3050 });
  expect(projectMoney(jobs, "active").rows).toHaveLength(1);
  expect(projectMoney(jobs, "archived").rows.map(r => r.id)).toEqual(["archived"]);
});
it("does not let an overpayment hide another customer's balance", () => {
  expect(projectMoney([job("credit", { deposit_amount: 150 }), job("due")], "current")).toMatchObject({ total: 200, received: 200, balance: 50, credit: 50 });
});
it("keeps unknown payments and prices distinct from confirmed zero", () => {
  const data = projectMoney([job("unknown-price", { contract_amount: null, deposit_amount: 1000 }), job("unknown-paid", { deposit_amount: null }), job("unpaid", { deposit_amount: 0 })], "current");
  expect(data).toMatchObject({ total: 200, received: 1000, balance: 100, missingTotals: 1, missingPayments: 1 });
  expect(data.rows[0].balance).toBeNull();
  expect(data.rows[1].received).toBeNull();
});
it("sums cents exactly", () => {
  expect(projectMoney([job("one", { contract_amount: "0.10", deposit_amount: "0.03" }), job("two", { contract_amount: "0.20", deposit_amount: "0.07" })], "current")).toMatchObject({ total: 0.3, received: 0.1, balance: 0.2 });
});
it("flags unreviewed estimates instead of silently presenting reconciled totals", () => {
  expect(projectMoney([job("ARCO", { contract_amount: 50710, deposit_amount: 0, estimatesToReview: 1 })], "current")).toMatchObject({ total: 50710, balance: 50710, estimatesToReview: 1 });
});
