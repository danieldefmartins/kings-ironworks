import { describe, expect, it } from "vitest";
import { newMeasureData, type FlightSegment, type MeasureShape } from "./measure";
import { requiredGaps } from "./measure-checks";

const keys = (shape: MeasureShape, steps = 0, edit?: (d: ReturnType<typeof newMeasureData>) => void) => {
  const d = newMeasureData(shape, steps);
  edit?.(d);
  return requiredGaps(d, shape).map((g) => g.key);
};

describe("only what the shop needs to build the piece", () => {
  it.each(["gate", "fence", "deck", "balcony", "window_well"] as const)("%s is not asked the stair-rail height or ends again", (shape) => {
    const k = keys(shape, shape === "deck" ? 3 : shape === "fence" ? 2 : 0);
    expect(k).not.toContain("rail_height");
    expect(k).not.toContain("returns");
  });

  it("a stair rail is still asked its height and ends", () => {
    const k = keys("straight", 4);
    expect(k).toContain("rail_height");
    expect(k).toContain("returns");
  });

  it("a level run needs its length, not the floor's depth or diagonal", () => {
    const k = keys("level_run");
    expect(k).toContain("run_length");
    expect(k).not.toContain("landing_depth");
    expect(k).not.toContain("landing_diag");
  });

  it("numbers the shop can build without are never mandatory", () => {
    const all = [...keys("straight", 4), ...keys("wall_rail", 4), ...keys("deck", 3), ...keys("fence", 2), ...keys("balcony")];
    for (const k of ["flight_width", "deck_side_height", "deck_post_spacing_f", "fence_post_spacing", "fence_utilities", "bal_slab_thickness", "bal_embedment_f", "bal_edge_distance_f"]) expect(all).not.toContain(k);
    expect(keys("deck", 3)).toContain("deck_side_length");
    expect(keys("fence", 2)).toContain("fence_height");
  });

  it("floor-to-floor is asked only until the risers add up to it", () => {
    expect(keys("straight", 3)).toContain("floor_to_floor");
    const filled = keys("straight", 3, (d) => {
      (d.segments[0] as FlightSegment).steps.forEach((s) => { s.rise = "7 1/2"; s.run = "10"; });
    });
    expect(filled).not.toContain("floor_to_floor");
    expect(filled).toContain("rake");
  });
});
