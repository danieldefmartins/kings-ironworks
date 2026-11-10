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

  it("a wall handrail is not asked the stair width", () => {
    expect(keys("wall_rail", 4)).not.toContain("flight_width");
    expect(keys("straight", 4)).toContain("flight_width");
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
