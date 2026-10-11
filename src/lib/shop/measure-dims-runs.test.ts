import { describe, expect, it } from "vitest";
import { newMeasureData } from "./measure";
import { dimForSlot, sceneDims } from "./measure-dims";
import { dimName } from "./measure-dims-i18n";
import { measurementQueue } from "./measure-next";
import { newWallCapRun } from "./measure-wall-cap";
import { balconyFixture, deckFixture, fenceFixture } from "./scene-shapes/scene-shapes.fixture";
import { customFixture } from "./scene-shapes/scene-shapes-b.fixture";
import { measureScene } from "./measure-scene";

const len = (d: { lines: [{ x: number; y: number; z: number }, { x: number; y: number; z: number }][] }) => {
  const [a, b] = d.lines[2];
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
};

describe("deck dimension lines", () => {
  it("every side length on its own line, lit by its Next slot; corners carry the turn", () => {
    const d = deckFixture(), dims = sceneDims(d, "deck");
    const s1 = dimForSlot(dims, "deck.side0.length")!;
    expect(s1.value).toBe(192);
    expect(len(s1)).toBeCloseTo(192);
    expect(dimForSlot(dims, "deck.side1.openingWidth")!.value).toBe(42);
    expect(len(dimForSlot(dims, "deck.side1.openingWidth")!)).toBeCloseTo(42);
    const corner = dimForSlot(dims, "deck.side0.turnDeg")!;
    expect(corner.unit).toBe("deg");
    expect(corner.value).toBe(90);
    // Three sides against the house with equal ends: square corners.
    expect(corner.calc).toBe(90);
    expect(dimForSlot(dims, "deck.side2.turnDeg")).toBeNull(); // the last side ends at the house
    expect(dimForSlot(dims, "deck.side1.heightAboveGrade")!.value).toBe(48);
    expect(dimForSlot(dims, "deck.postSpacing")!.calc).toBeCloseTo(64);
  });
  it("the 3D carries them as dimension lines", () => {
    const s = measureScene(deckFixture(), "deck");
    expect(s.lines.some((l) => l.id === "dimline:deckSide:0")).toBe(true);
  });
  it("names are translated", () => {
    expect(dimName("pt", "deckCorner")).toBe("Canto");
    expect(dimName("es", "rampAngle")).toBe("Pendiente");
  });
});

describe("fence dimension lines", () => {
  it("segments, height, post spacing and footing", () => {
    const d = fenceFixture(), dims = sceneDims(d, "fence");
    expect(len(dimForSlot(dims, "fence.seg0")!)).toBeCloseTo(Math.hypot(192, 8), 0);
    expect(dimForSlot(dims, "fence.height")!.value).toBe(48);
    expect(dimForSlot(dims, "fence.postSpacing")!.value).toBe(72);
    expect(dimForSlot(dims, "fence.postSpacing")!.calc).toBeCloseTo(64);
    expect(dimForSlot(dims, "fence.footingDepth")!.value).toBe(36);
    // A turning run has no single end-to-end line.
    expect(dimForSlot(dims, "fence.totalRun")).toBeNull();
  });
  it("a straight run shows the total against the sum of its segments", () => {
    const d = fenceFixture();
    d.fence!.segments.forEach((s) => { s.turnDeg = ""; });
    const t = dimForSlot(sceneDims(d, "fence"), "fence.totalRun")!;
    expect(t.calc).toBe(480);
    expect(t.state).toBe("calculated");
  });
});

describe("balcony dimension lines", () => {
  it("edge, projection, slab, edge distance, guard height and embedment", () => {
    const dims = sceneDims(balconyFixture(), "balcony");
    expect(len(dimForSlot(dims, "bal.edgeLength")!)).toBeCloseTo(120);
    expect(len(dimForSlot(dims, "bal.slabThickness")!)).toBeCloseTo(6);
    expect(len(dimForSlot(dims, "bal.edgeDistance")!)).toBeCloseTo(4);
    expect(dimForSlot(dims, "bal.guardHeight")!.value).toBe(42);
    expect(dimForSlot(dims, "bal.anchorEmbedment")!.value).toBe(3);
    expect(dims.find((x) => x.kind === "projection")!.value).toBe(60);
  });
});

describe("wall cap dimension lines", () => {
  it("run lengths, the corner turn, cap width and core edge distances at every post", () => {
    const d = newMeasureData("wall_cap", 1), w = d.wallCap!;
    Object.assign(w, { mount: "core", dropSide: "left", drop: "60", railHeight: "42" });
    w.runs[0].length = "120";
    Object.assign(w.runs[0].posts[0], { capWidth: "10", edgeHigh: "4" });
    w.runs.push(newWallCapRun(1, { length: "60", turn: "90", turnDir: "right" }));
    const dims = sceneDims(d, "wall_cap"), p0 = w.runs[0].posts[0].id;
    expect(len(dimForSlot(dims, `wc.${w.runs[0].id}.length`)!)).toBeCloseTo(120);
    expect(dimForSlot(dims, `wc.${w.runs[1].id}.turn`)!.value).toBe(90);
    expect(len(dimForSlot(dims, `wc.${p0}.capWidth`)!)).toBeCloseTo(10);
    expect(len(dimForSlot(dims, `wc.${p0}.edgeHigh`)!)).toBeCloseTo(4);
    // The low edge is what the cap leaves: 10 − 4.
    expect(dimForSlot(dims, `wc.${p0}.edgeLow`)!.calc).toBe(6);
    expect(dimForSlot(dims, "wc.drop")!.value).toBe(60);
  });
});

describe("ramp and level run dimension lines", () => {
  it("rise, run, slope length, angle and width per ramp", () => {
    const d = newMeasureData("ramp", 1), r = d.segments[0];
    if (r.kind === "ramp") Object.assign(r, { runH: "144", rise: "12", width: "48" });
    const dims = sceneDims(d, "ramp");
    expect(len(dimForSlot(dims, "s0.rampRun")!)).toBeCloseTo(144);
    expect(len(dimForSlot(dims, "s0.rampRise")!)).toBeCloseTo(12);
    expect(dimForSlot(dims, "s0.rampLength")!.calc).toBeCloseTo(Math.hypot(144, 12));
    expect(dimForSlot(dims, "s0.rampAngle")!.calc).toBeCloseTo(4.76, 1);
    expect(len(dimForSlot(dims, "s0.rampWidth")!)).toBeCloseTo(48);
    expect(dimForSlot(dims, "rail.height")).toBeTruthy();
  });
  it("a level run gets its landing dimensions and rail height", () => {
    const d = newMeasureData("level_run", 1), p = d.segments[0];
    if (p.kind === "platform") Object.assign(p, { length: "96", depth: "48" });
    const dims = sceneDims(d, "level_run");
    expect(dimForSlot(dims, "s0.length")!.value).toBe(96);
    expect(dimForSlot(dims, "s0.diag")!.calc).toBeCloseTo(Math.hypot(96, 48));
    expect(dimForSlot(dims, "rail.height")).toBeTruthy();
  });
});

describe("custom dimension lines and Next walk", () => {
  it("every drawn line has a line and a Next slot", () => {
    const d = customFixture(), path = d.plan!.paths![0];
    path.segs[1].len = "";
    const dims = sceneDims(d, "custom");
    expect(dims.filter((x) => x.kind === "planLine")).toHaveLength(3);
    const q = measurementQueue(d, "custom", [{ key: "plan_lengths", detail: "1" }]);
    expect(q.slots.map((s) => s.id)).toContain(`plan.${path.id}.1`);
    expect(q.open[0].id).toBe(`plan.${path.id}.1`);
    expect(dimForSlot(dims, `plan.${path.id}.1`)).toBeTruthy();
  });
});
