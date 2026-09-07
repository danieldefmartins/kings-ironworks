import { beforeEach, describe, expect, it, vi } from "vitest";
const { select } = vi.hoisted(() => ({ select: vi.fn() }));
vi.mock("./db", () => ({ ORG_ID: "test-org", sbSelect: select }));
import { loadPayrollWeek } from "./payroll-db";
import { payrollWeek } from "./payroll";
beforeEach(() => { select.mockReset(); });
describe("payroll data access", () => {
  it("scopes all reads, includes inactive workers and overlapping shifts/breaks", async () => {
    select.mockResolvedValue([]);
    await loadPayrollWeek(payrollWeek("2026-09-07"));
    expect(select).toHaveBeenCalledTimes(3);
    for (const [table, query] of select.mock.calls) {
      expect(query).toContain("org_id=eq.test-org");
      if (table === "kiw_shop_workers") expect(query).not.toContain("active=eq.true");
      else { expect(query).toContain("or=(ended_at.is.null,ended_at.gt."); expect(query).toContain("started_at=lt."); }
    }
  });
  it("pages beyond REST limits without losing workers or shifts", async () => {
    select.mockImplementation(async (_table: string, query: string) => query.includes("offset=0") ? Array.from({ length: 500 }, (_, id) => ({ id })) : [{ id: 500 }]);
    const result = await loadPayrollWeek(payrollWeek("2026-09-07"));
    expect(result.workers).toHaveLength(501); expect(result.shifts).toHaveLength(501); expect(result.breaks).toHaveLength(501);
  });
});
