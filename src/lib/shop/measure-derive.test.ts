import { describe, expect, it } from "vitest";
import {
  newFlightSegment,
  newMeasureData,
  newPresetMeasureData,
  type FlightSegment,
} from "./measure";
import { requiredGaps } from "./measure-checks";
import {
  deckPerimeter,
  fenceRun,
  flightTotals,
  inchesToField,
  resolve,
  stairTotals,
} from "./measure-derive";

function flight(n: number, rise: string, run: string): FlightSegment {
  const fl = newFlightSegment(n);
  fl.steps = fl.steps.map(() => ({ rise, run, nosing: "" }));
  return fl;
}

describe("inchesToField", () => {
  it("writes what a measurer would have typed", () => {
    expect(inchesToField(36)).toBe("36");
    expect(inchesToField(36.25)).toBe("36 1/4");
    expect(inchesToField(0.5)).toBe("1/2");
  });
});

describe("flightTotals", () => {
  it("adds the risers and treads up, and the pitch line they imply", () => {
    const t = flightTotals(flight(3, "7", "11"))!;
    expect(t.rise).toBe(21);
    expect(t.run).toBe(33);
    expect(t.rake).toBeCloseTo(Math.hypot(21, 33), 6);
  });

  it("stays silent while any step is unmeasured — a partial total is a guess", () => {
    const fl = flight(3, "7", "11");
    fl.steps[1].run = "";
    expect(flightTotals(fl)).toBeNull();
  });
});

describe("stairTotals", () => {
  it("adds every flight up, and keeps landings out of the pitch", () => {
    const { data } = newPresetMeasureData("multi_flight", 3, 2);
    const idx = data.segments
      .map((s, i) => (s.kind === "flight" ? i : -1))
      .filter((i) => i >= 0);
    idx.forEach((i) => (data.segments[i] = flight(3, "7", "11")));
    const plat = data.segments.find((s) => s.kind === "platform");
    if (plat && plat.kind === "platform") plat.length = "48";

    const t = stairTotals(data)!;
    expect(t.totalRise).toBe(42);
    expect(t.totalRun).toBe(66);
    expect(t.totalRunWithLandings).toBe(114);
  });
});

describe("resolve", () => {
  it("prefers what the measurer typed", () => {
    expect(resolve("40", 36)).toEqual({ value: "40", auto: false });
  });
  it("falls back to the calculation, and says so", () => {
    expect(resolve("", 36.25)).toEqual({ value: "36 1/4", auto: true });
  });
  it("has nothing to show when nothing can be worked out", () => {
    expect(resolve("", null)).toEqual({ value: "", auto: false });
  });
});

describe("sums the sheet can do are not asked for twice", () => {
  it("stops demanding the total run once every tread is measured", () => {
    const data = newMeasureData("straight", 4);
    // Nothing measured: the sheet cannot work the run out, so it asks.
    expect(requiredGaps(data, "straight").some((g) => g.key === "total_run")).toBe(true);

    data.segments[0] = flight(4, "7", "11");
    const gaps = requiredGaps(data, "straight");
    expect(gaps.some((g) => g.key === "total_run")).toBe(false);
    // The rake is measured along a different line, so it is still required.
    expect(gaps.some((g) => g.key === "rake")).toBe(true);
  });

  it("adds a fence run up from its bays, and stops asking for it", () => {
    const data = newMeasureData("fence", 3);
    expect(fenceRun(data.fence)).toBeNull();
    expect(requiredGaps(data, "fence").some((g) => g.key === "fence_total_run")).toBe(true);

    data.fence!.segments.forEach((sg) => (sg.length = "96"));
    expect(fenceRun(data.fence)).toBe(288);
    expect(requiredGaps(data, "fence").some((g) => g.key === "fence_total_run")).toBe(false);
  });

  it("adds a deck perimeter up from its sides, and stops asking for it", () => {
    const data = newMeasureData("deck", 4);
    expect(deckPerimeter(data.deck)).toBeNull();
    expect(requiredGaps(data, "deck").some((g) => g.key === "deck_total_perimeter")).toBe(true);

    data.deck!.sides.forEach((sd) => (sd.length = "120"));
    expect(deckPerimeter(data.deck)).toBe(480);
    expect(requiredGaps(data, "deck").some((g) => g.key === "deck_total_perimeter")).toBe(false);
  });
});
