import { describe, expect, it } from "vitest";
import { newMeasureData } from "./measure";
import { entryWarning } from "./measure-entry-check";

function stair(rises: string[], runs: string[] = []) {
  const data = newMeasureData("straight", rises.length);
  const flight = data.segments.find((s) => s.kind === "flight")!;
  if (flight.kind === "flight") flight.steps.forEach((s, i) => { s.rise = rises[i] ?? ""; s.run = runs[i] ?? ""; });
  return { data, segIdx: data.segments.indexOf(flight) };
}
const slot = (segIdx: number, stepIdx: number, key: "rise" | "run") => ({ id: `step.${segIdx}.${stepIdx}.${key}`, segIdx, stepIdx });

describe("second look at a step's number as it is typed", () => {
  it("stays quiet for a step that sits with the others", () => {
    const { data, segIdx } = stair(['7 1/4"', '7 1/4"', '7 1/2"', ""]);
    expect(entryWarning(slot(segIdx, 2, "rise"), data, '7 1/2"', "en")).toBeNull();
    expect(entryWarning(slot(segIdx, 3, "rise"), data, '7 5/8"', "en")).toBeNull();
  });
  it("says how far a step is from the others", () => {
    const { data, segIdx } = stair(['7 1/4"', '7 1/4"', '7 1/4"', ""]);
    const w = entryWarning(slot(segIdx, 3, "rise"), data, '8 1/4"', "en")!;
    expect(w.kind).toBe("outlier");
    expect(w.text).toContain('1"');
    expect(w.text).toContain('7 1/4"');
    expect(entryWarning(slot(segIdx, 3, "rise"), data, '8 1/4"', "pt")!.text).toMatch(/degraus/);
  });
  it("catches a typo that is not a step at all", () => {
    const { data, segIdx } = stair(["", "", "", ""]);
    expect(entryWarning(slot(segIdx, 0, "rise"), data, "72", "en")!.kind).toBe("range");
    expect(entryWarning(slot(segIdx, 0, "run"), data, "1", "es")!.text).toMatch(/Huella/);
  });
  it("the first step measured has nothing to disagree with, and unfinished typing is left alone", () => {
    const { data, segIdx } = stair(["", "", "", ""]);
    expect(entryWarning(slot(segIdx, 0, "rise"), data, '7 1/4"', "en")).toBeNull();
    expect(entryWarning(slot(segIdx, 0, "rise"), data, "", "en")).toBeNull();
    expect(entryWarning({ id: "width", segIdx: undefined, stepIdx: undefined }, data, "500", "en")).toBeNull();
  });
});
