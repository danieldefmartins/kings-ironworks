import { expect, it, vi } from "vitest";
const select = vi.hoisted(() => vi.fn());
vi.mock("./db", () => ({ sbSelect: select, ORG_ID: "test-org" }));
import { loadProjectMoney } from "./project-money-db";
it("loads every page and includes completed and archived rows for scoped review", async () => {
  select.mockResolvedValueOnce(Array.from({ length: 500 }, (_, i) => ({ id: String(i) }))).mockResolvedValueOnce([{ id: "last" }]);
  expect(await loadProjectMoney()).toHaveLength(501);
  for (const [, query] of select.mock.calls) {
    expect(query).toContain("org_id=eq.test-org");
    expect(query).not.toContain("archived=eq.false");
    expect(query).not.toContain("neq.Done");
    expect(query).not.toContain("deposit_note");
  }
  expect(select.mock.calls[1][1]).toContain("offset=500");
});
