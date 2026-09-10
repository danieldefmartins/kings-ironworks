import type { Job } from "./shared";
export type MoneyJob = Pick<Job, "id" | "job_number" | "customer_name" | "current_stage" | "archived" | "contract_amount" | "deposit_amount">;
export type MoneyScope = "current" | "active" | "archived";
const cents = (value: number | string | null): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};
export function projectMoney(jobs: MoneyJob[], scope: MoneyScope) {
  const included = jobs.filter(j => j.current_stage !== "Lead" && (scope === "archived" ? j.archived : !j.archived && (scope === "current" || j.current_stage !== "Done")));
  let total = 0, received = 0, balance = 0, credit = 0, missingTotals = 0, missingPayments = 0;
  const rows = included.map(job => {
    const price = cents(job.contract_amount), paid = cents(job.deposit_amount);
    if (price === null) missingTotals++; else total += price;
    if (paid === null) missingPayments++; else received += paid;
    const due = price === null || paid === null ? null : Math.max(0, price - paid);
    const overpaid = price === null || paid === null ? null : Math.max(0, paid - price);
    balance += due ?? 0;
    credit += overpaid ?? 0;
    return { id: job.id, number: job.job_number, customer: job.customer_name, total: price === null ? null : price / 100, received: paid === null ? null : paid / 100, balance: due === null ? null : due / 100 };
  });
  return { total: total / 100, received: received / 100, balance: balance / 100, credit: credit / 100, missingTotals, missingPayments, rows };
}
