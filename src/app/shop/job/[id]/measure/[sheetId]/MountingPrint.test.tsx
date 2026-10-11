import { expect, it } from "vitest";
import { warningText } from "./MountingPrint";

it("prints substrate warnings as what was found", () => {
  const base = { level: "yellow" as const, expected: null, actual: null, delta: null, unit: "in" as const };
  expect(warningText("en", { ...base, key: "sub_condition", value: "cracked", detail: "P3" })).toBe("P3 · Substrate: cracked");
  expect(warningText("pt", { ...base, key: "sub_condition", value: "rotted", detail: "x", detailI18n: { pt: "Poste do trinco" } })).toBe("Poste do trinco · Base: podre");
  expect(warningText("en", { ...base, key: "sub_edge", detail: "P1", expected: 3, actual: 2 })).toBe('P1 · Too close to the edge 2" (min 3")');
  expect(warningText("en", { ...base, key: "riser_sum" })).toBeNull();
});
