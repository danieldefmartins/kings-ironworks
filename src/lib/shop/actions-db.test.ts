import { beforeEach, expect, it, vi } from "vitest";
const select = vi.hoisted(() => vi.fn());
vi.mock("./db", () => ({ ORG_ID: "test-org", sbSelect: select }));
import { loadBusinessActions } from "./actions-db";
beforeEach(() => vi.clearAllMocks());
it("pages all jobs and scopes every source to the organization", async () => {
  select.mockImplementation(async (table: string, query: string) => {
    if (table !== "kiw_shop_jobs") return [];
    const offset = query.includes("offset=500") ? 500 : 0;
    return Array.from({ length: offset ? 1 : 500 }, (_, i) => ({ id: String(offset + i), job_number: String(offset + i), customer_name: "Customer", current_stage: "Awarded", due_date: null, deposit_amount: 100, archived: false }));
  });
  const data = await loadBusinessActions();
  expect(data.groups.undated).toHaveLength(501);
  for (const [, query] of select.mock.calls) expect(query).toContain("org_id=eq.test-org");
  expect(select.mock.calls.some(([, query]) => query.includes("status=eq.pending"))).toBe(true);
});
it("rejects incomplete data instead of reporting false zero counts", async () => {
  select.mockRejectedValue(new Error("database unavailable"));
  await expect(loadBusinessActions()).rejects.toThrow("database unavailable");
});
