import { describe, expect, it } from "vitest";
import { newFlightSegment, newMeasureData, type FlightSegment } from "./measure";
import { flightGaps, requiredGaps } from "./measure-checks";

// A flight measured end to end, so a test can say "this one is finished"
// without listing the same six fields every time.
function measured(steps = 2): FlightSegment {
  const fl = newFlightSegment(steps);
  fl.steps = fl.steps.map(() => ({ rise: "7", run: "11", nosing: "1" }));
  fl.width = "36";
  fl.angleDeg = "32";
  fl.rake = "100";
  return fl;
}

describe("flightGaps", () => {
  it("reports nothing for a flight that is fully measured", () => {
    expect(flightGaps(measured(), 0, { needRake: true, multi: true })).toEqual([]);
  });

  it("names the flight every gap belongs to", () => {
    const fl = newFlightSegment(2);
    const gaps = flightGaps(fl, 1, { needRake: true, multi: true });
    expect(gaps.every((g) => g.flight === 1)).toBe(true);
    expect(gaps.map((g) => g.key).sort()).toEqual(
      ["flight_angle", "flight_rake", "flight_width", "steps"].sort()
    );
    // The step gap has to say WHICH flight owes steps, not just how many.
    expect(gaps.find((g) => g.key === "steps")?.detail).toBe("#2 · 2");
  });

  it("leaves the single-flight wording alone", () => {
    const gaps = flightGaps(newFlightSegment(3), 0, { needRake: false, multi: false });
    expect(gaps.find((g) => g.key === "steps")?.detail).toBe("3");
    expect(gaps.some((g) => g.key === "flight_rake")).toBe(false);
  });

  it("asks winder treads for their turn", () => {
    const fl = measured(2);
    fl.steps[0] = { ...fl.steps[0], winder: true };
    const gaps = flightGaps(fl, 0, { needRake: true, multi: true });
    expect(gaps.map((g) => g.key)).toEqual(["winder"]);
  });
});

describe("a multi-flight sheet is not done until every flight is", () => {
  it("still reports the untouched flight once the first one is measured", () => {
    const data = newMeasureData("l_shape", 3, 3);
    const flights = data.segments.filter((s) => s.kind === "flight");
    expect(flights.length).toBe(2);
    data.segments[data.segments.indexOf(flights[0])] = measured(3);

    const gaps = requiredGaps(data, "l_shape");
    const flightsWithGaps = new Set(
      gaps.filter((g) => g.flight !== undefined).map((g) => g.flight)
    );
    expect(flightsWithGaps.has(0)).toBe(false);
    expect(flightsWithGaps.has(1)).toBe(true);
  });
});
