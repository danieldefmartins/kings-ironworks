import { expect, it } from "vitest";
import { isMeasuringPath } from "./ShopAccess";
it("preserves every measuring route and leaves ordinary shop screens in the new navigation", () => {
  for (const path of ["/shop/leads", "/shop/new-measure", "/shop/job/id/measure", "/shop/job/id/measure/sheet", "/shop/job/id/measure/sheet/rev/1"]) expect(isMeasuringPath(path)).toBe(true);
  for (const path of ["/shop", "/shop/jobs", "/shop/job/id", "/shop/admin/payroll", "/shop/more"]) expect(isMeasuringPath(path)).toBe(false);
});
