import { beforeEach, expect, it, vi } from "vitest";
const select = vi.hoisted(() => vi.fn());
vi.mock("./db", () => ({ sbSelect: select, ORG_ID: "test-org" }));
import { getJobEstimates } from "./job-estimates-db";
beforeEach(() => vi.clearAllMocks());
it("scopes lookup to the requested job and strips prices before returning crew data", async () => {
  select.mockResolvedValue([{ id: "e", estimate_number: "26-452", title: "Dock openings", issued_on: null, is_original: true, total_amount: "94120", items: [{ description: "Fabricate steel framing", quantity: 1, unit_price: 8500 }] }]);
  const rows = await getJobEstimates("job-one", false);
  expect(select.mock.calls[0][1]).toContain("org_id=eq.test-org&job_id=eq.job-one");
  expect(JSON.stringify(rows)).not.toMatch(/94120|8500|total|amount|unitPrice/);
});
it("propagates a load failure so the page can show an error", async () => {
  select.mockRejectedValue(new Error("offline"));
  await expect(getJobEstimates("job-one", true)).rejects.toThrow("offline");
});
