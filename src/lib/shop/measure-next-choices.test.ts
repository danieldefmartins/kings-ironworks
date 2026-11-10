import { describe, expect, it } from "vitest";
import { newMeasureData } from "./measure";
import { requiredGaps as fabGaps } from "./measure-checks";
import { gapChoices } from "./measure-next-choices";

describe("one-tap answers on the Next card", () => {
  it("each answer closes the requirement it belongs to", () => {
    const data = newMeasureData("straight", 3);
    for (const key of ["orientation", "floor_change", "mat_post", "mat_toprail", "max_piece"]) {
      expect(fabGaps(data, "straight").some((g) => g.key === key), `${key} open before`).toBe(true);
      const c = gapChoices({ key }, "en")!;
      expect(c.question).not.toBe("");
      expect(c.options.length).toBeGreaterThan(0);
      expect(c.options.every((o) => o.label && !o.label.startsWith("orient_"))).toBe(true);
      c.put(data, c.options[0].value);
      expect(fabGaps(data, "straight").some((g) => g.key === key), `${key} closed after`).toBe(false);
    }
  });
  it("speaks the measurer's language and leaves per-item requirements to their panel", () => {
    expect(gapChoices({ key: "orientation" }, "pt")!.options[0].label).toBe("Esquerda é parede");
    expect(gapChoices({ key: "max_piece" }, "es")!.options[0].label).toMatch(/pasa/);
    expect(gapChoices({ key: "flight_angle", detail: "#1" }, "en")).toBeNull();
    expect(gapChoices({ key: "photo_missing" }, "en")).toBeNull();
  });
});
