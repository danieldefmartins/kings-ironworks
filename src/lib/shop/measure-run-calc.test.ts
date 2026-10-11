import { describe, expect, it } from "vitest";
import { newMeasureData } from "./measure";
import { deckTurnCalc, fenceGradePerBay, rampRatio } from "./measure-run-calc";
import { slotCalc as runSlotAngle } from "./measure-calc-registry";
import { applyCopy, slotCopy } from "./measure-copy";
import { calcState } from "./measure-calc";
import { newWallCapRun } from "./measure-wall-cap";
import { fenceFixture } from "./scene-shapes/scene-shapes.fixture";

describe("deck corners", () => {
  it("a closed outline's last corner is a full turn less the others", () => {
    const d = newMeasureData("deck", 5);
    d.deck!.closedLoop = true;
    ["90", "45", "45", "90", ""].forEach((t, i) => { d.deck!.sides[i].turnDeg = t; d.deck!.sides[i].length = "100"; });
    expect(deckTurnCalc(d, 4)).toBe(90);
    // A right-handed outline keeps its sign.
    ["-90", "-45", "-45", "-90", ""].forEach((t, i) => { d.deck!.sides[i].turnDeg = t; });
    expect(deckTurnCalc(d, 4)).toBe(-90);
  });
  it("rectangles get square corners; an open deck's last side ends at the house", () => {
    const d = newMeasureData("deck", 3);
    ["192", "144", "192"].forEach((l, i) => { d.deck!.sides[i].length = l; });
    expect(deckTurnCalc(d, 0)).toBe(90);
    expect(deckTurnCalc(d, 2)).toBeNull();
    d.deck!.sides[2].length = "180";
    expect(deckTurnCalc(d, 0)).toBeNull();
  });
  it("approve stores the calculation with its source; a reading is checked against it", () => {
    const d = newMeasureData("deck", 3);
    ["192", "144", "192"].forEach((l, i) => { d.deck!.sides[i].length = l; });
    runSlotAngle("deck.side1.turnDeg", d)!.approve(d);
    expect(d.deck!.sides[1].turnDeg).toBe("90");
    expect(d.calcSources?.["deck.side1.turnDeg"]).toBe("calculated-approved");
    const slot = runSlotAngle("deck.side1.turnDeg", d)!;
    expect(calcState(d.deck!.sides[1].turnDeg, slot.source, slot.calc, "deg")).toBe("approved");
    slot.read(d, "88");
    expect(d.calcSources?.["deck.side1.turnDeg"]).toBe("measured");
  });
});

describe("ramp slope", () => {
  it("1:12 or flatter is green; steeper is red", () => {
    const d = newMeasureData("ramp", 1), r = d.segments[0];
    if (r.kind !== "ramp") throw new Error();
    Object.assign(r, { rise: "12", runH: "144" });
    expect(rampRatio(d, 0)).toMatchObject({ ratio: 12, level: "green" });
    r.runH = "120";
    expect(rampRatio(d, 0)).toMatchObject({ level: "red", ok: false });
    expect(runSlotAngle("s0.rampAngle", d)!.verdict?.key).toBe("nx_ramp_steep");
  });
});

describe("fence grade per bay", () => {
  it("is the segment's grade over its panels", () => {
    const d = fenceFixture();
    expect(fenceGradePerBay(d, 1, 4)).toBeCloseTo(4.5);
    expect(fenceGradePerBay(d, 2, 2)).toBeNull();
  });
});

describe("same for all", () => {
  it("copies a cap width to every empty post, or replaces all", () => {
    const d = newMeasureData("wall_cap", 1), w = d.wallCap!;
    w.runs.push(newWallCapRun(2));
    const [a, b] = w.runs[0].posts, c = w.runs[1].posts[0];
    a.capWidth = "10";
    c.capWidth = "9";
    const cp = slotCopy(`wc.${a.id}.capWidth`, d)!;
    expect(cp.labelKey).toBe("nx_copyAll_posts");
    expect(cp.targets(false).length).toBe(2);
    expect(cp.targets(true).length).toBe(3);
    applyCopy(d, cp, false);
    expect([b.capWidth, c.capWidth]).toEqual(["10", "9"]);
    applyCopy(d, cp, true);
    expect(c.capWidth).toBe("10");
  });
  it("only copies a real measurement, and only to deck sides that have an opening", () => {
    const d = newMeasureData("deck", 3);
    d.deck!.sides[0].openingWidth = "42";
    d.deck!.sides[0].opening = "stairs";
    d.deck!.sides[2].opening = "gate";
    expect(slotCopy("deck.side0.openingWidth", d)!.targets(false).length).toBe(1);
    d.deck!.sides[0].openingWidth = "x";
    expect(slotCopy("deck.side0.openingWidth", d)?.targets(false).length ?? 0).toBe(0);
    expect(slotCopy("deck.side0.length", d)).toBeNull();
  });
});
