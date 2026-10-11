import { describe, expect, it } from "vitest";
import {
  blankWallCap,
  guardHeight,
  guardRequirement,
  newWallCapPost,
  newWallCapRun,
  normalizeWallCap,
  plateWidth,
  postCut,
  postStations,
  runRailLength,
  runRise,
  signedMeas,
  wallCapChecks,
  wallCapGaps,
  wallCapLimits,
  wallCapSummary,
  type WallCapData,
} from "./measure-wall-cap";
import { WallCapSchema } from "./measure-wall-cap-schema";
import { WALL_CAP_STR } from "./measure-wall-cap-i18n";
import { newMeasureData, normalizeMeasureData, requiredPhotoSlots, sheetProgress } from "./measure";
import { requiredGaps, runChecks } from "./measure-checks";
import { mt } from "./measure-i18n";
import { wallCapScene, wallCapLayout } from "./scene-shapes/scene-wall-cap";
import { SCENE_SHAPES } from "./scene-shapes";
import { measureScene } from "./measure-scene";

function wall(patch: Partial<WallCapData> = {}): WallCapData {
  const w = blankWallCap();
  Object.assign(w, {
    kind: "retaining", material: "concrete", dropSide: "right", drop: "48", capAboveWalk: "0", railHeight: "36",
    mount: "core", coreDia: '2"', coreDepth: '5"', loose: "no", cracked: "no", datum: "laser, P1 = 0",
  }, patch);
  w.runs = [newWallCapRun(0, { length: "120" })];
  w.runs[0].posts = [
    newWallCapPost({ capWidth: "10", top: "0", edgeHigh: "5", edgeLow: "5" }),
    newWallCapPost({ capWidth: "10", top: "0", edgeHigh: "5", edgeLow: "5" }),
  ];
  return w;
}

const keys = (w: WallCapData) => wallCapChecks(w).map((c) => `${c.key}:${c.level}${c.detail ? `:${c.detail}` : ""}`);

describe("wall-cap arithmetic", () => {
  it("reads signed elevations", () => {
    expect(signedMeas("-2 1/2")).toBe(-2.5);
    expect(signedMeas("−1'")).toBe(-12);
    expect(signedMeas("3/4")).toBe(0.75);
    expect(signedMeas("")).toBeNull();
  });
  it("takes the plate's first dimension across the cap", () => {
    expect(plateWidth("5x5x1/2")).toBe(5);
    expect(plateWidth("4 × 6 × 3/8")).toBe(4);
    expect(plateWidth("")).toBeNull();
  });
  it("spaces unmeasured posts evenly and keeps measured stations", () => {
    const r = newWallCapRun(3, { length: "100" });
    expect(postStations(r)).toEqual([0, 50, 100]);
    r.posts[1].at = "30";
    expect(postStations(r)).toEqual([0, 30, 100]);
  });
  it("a run after a corner spaces its posts up to its end (the corner post is the last run's)", () => {
    expect(postStations(newWallCapRun(2, { length: "60" }), true)).toEqual([30, 60]);
  });
  it("a run's slope counts from the corner post it starts at", () => {
    const w = wall();
    w.runs.push(newWallCapRun(1, { length: "60", turn: "90", turnDir: "left" }));
    w.runs[1].posts[0].top = "-6";
    w.runs[1].posts[0].capWidth = "10";
    expect(keys(w)).toContain("wc_slope_decision:red:R2");
    const s = wallCapScene({ ...newMeasureData("wall_cap", 0), wallCap: w });
    const r2 = s.lines.find((l) => l.id === "wallcap:rail:1")!;
    expect(r2.points).toHaveLength(2);
    expect(r2.provisional).toBe(true);
  });
  it("rakes the rail along the slope, stepped stays level", () => {
    const w = wall();
    w.runs[0].posts[1].top = "-9";
    expect(runRise(w.runs[0])?.rise).toBe(9);
    w.runs[0].rail = "raked";
    expect(runRailLength(w.runs[0])).toBeCloseTo(Math.hypot(120, 9));
    w.runs[0].rail = "stepped";
    expect(runRailLength(w.runs[0])).toBe(120);
  });
  it("guard height is cap above the walk plus rail above the cap", () => {
    expect(guardHeight({ capAboveWalk: "6", railHeight: "36" })).toBe(42);
    expect(guardHeight({ capAboveWalk: "", railHeight: "36" })).toBe(36);
    expect(guardHeight({ capAboveWalk: "6", railHeight: "" })).toBeNull();
  });
  it("needs no guard at or under the code drop", () => {
    expect(guardRequirement({ drop: "30" }, { guardDrop: 30, guardHeight: 36 }).required).toBeNull();
    expect(guardRequirement({ drop: "31" }, { guardDrop: 30, guardHeight: 42 }).required).toBe(42);
  });
  it("post cut adds the embed when cored", () => {
    expect(postCut(wall()).length).toBe(41);
    expect(postCut(wall({ mount: "plate" })).length).toBe(36);
    expect(postCut(wall({ mount: "side_low", faceDepth: "8" })).parts.map((p) => p.key)).toEqual(["rail", "face"]);
  });
  it("summarises rail length, posts and narrowest cap", () => {
    const w = wall();
    w.runs.push(newWallCapRun(1, { length: "60", turn: "90", turnDir: "left" }));
    w.runs[1].posts[0].capWidth = "8";
    const s = wallCapSummary(w);
    expect(s.posts).toBe(3);
    expect(s.railLength).toBe(180);
    expect(s.minCap).toBe(8);
  });
});

describe("wall-cap checks", () => {
  it("a clean wall is all green", () => {
    expect(wallCapChecks(wall()).every((c) => c.level === "green")).toBe(true);
  });
  it("edge distance under 3\" is red, at every post and face", () => {
    const w = wall();
    w.runs[0].posts[1].edgeLow = '2 1/2"';
    w.runs[0].posts[1].edgeHigh = '7 1/2"';
    expect(keys(w)).toContain("wc_edge:red:P2 ▼");
    expect(keys(w)).toContain("wc_edge:green:P2 ▲");
  });
  it("edges that do not add up to the cap flag a misread tape", () => {
    const w = wall();
    w.runs[0].posts[0].edgeHigh = "4";
    expect(keys(w)).toContain("wc_edge_sum:red:P1");
    w.runs[0].posts[0].edgeHigh = "5 3/8";
    expect(keys(w)).toContain("wc_edge_sum:yellow:P1");
  });
  it("cap too narrow to core with 3\" each side is red", () => {
    const w = wall({ coreDia: "3" });
    w.runs[0].posts[0].capWidth = "8";
    expect(keys(w)).toContain("wc_cap_narrow_core:red:P1");
  });
  it("a base plate wider than the cap is red", () => {
    const w = wall({ mount: "plate", plateSize: "5x5x1/2" });
    w.runs[0].posts[0].capWidth = "4";
    expect(keys(w)).toContain("wc_plate_fit:red:P1");
    expect(keys(w)).toContain("wc_plate_fit:green:P2");
  });
  it("guard height is graded against the drop", () => {
    expect(keys(wall())).toContain("wc_guard_height:green");
    const commercial = wallCapChecks(wall(), { guardDrop: 30, guardHeight: 42 });
    expect(commercial.find((c) => c.key === "wc_guard_height")?.level).toBe("red");
    expect(keys(wall({ drop: "24" })).some((k) => k.startsWith("wc_guard_height"))).toBe(false);
  });
  it("a sloping run is red until raked or stepped is chosen", () => {
    const w = wall();
    w.runs[0].posts[1].top = "-4";
    expect(keys(w)).toContain("wc_slope_decision:red:R1");
    expect(wallCapGaps(w).some((g) => g.key === "wc_rail_style")).toBe(true);
    w.runs[0].rail = "stepped";
    expect(keys(w)).toContain("wc_slope_decision:green:R1");
    w.runs[0].posts[1].top = "-3/8";
    w.runs[0].rail = "";
    expect(keys(w).some((k) => k.startsWith("wc_slope_decision"))).toBe(false);
  });
  it("loose caps are red when cored, cracked caps are a warning", () => {
    expect(keys(wall({ loose: "yes" }))).toContain("wc_loose:red");
    expect(keys(wall({ loose: "yes", mount: "side_low" }))).toContain("wc_loose:yellow");
    expect(keys(wall({ cracked: "yes" }))).toContain("wc_cracked:yellow");
  });
  it("roof membrane: no-penetration roofs need a clamp; otherwise flashing must be assigned", () => {
    expect(keys(wall({ kind: "roof_edge", membrane: "yes", noPenetration: "yes" }))).toContain("wc_membrane:red");
    expect(keys(wall({ kind: "roof_edge", membrane: "yes", noPenetration: "yes", mount: "clamp" })).some((k) => k.startsWith("wc_membrane"))).toBe(false);
    expect(keys(wall({ kind: "roof_edge", membrane: "yes", noPenetration: "no" }))).toContain("wc_membrane:red");
    expect(keys(wall({ kind: "roof_edge", membrane: "yes", noPenetration: "no", flashBy: "roofer" }))).toContain("wc_membrane:yellow");
  });
});

describe("wall-cap gaps", () => {
  it("a blank wall asks for the wall, drop, mount and every post", () => {
    const g = wallCapGaps(blankWallCap()).map((x) => x.key);
    for (const k of ["wc_kind", "wc_material", "wc_drop_side", "wc_drop", "wc_rail_height", "wc_mount", "wc_condition", "wc_run_length", "wc_cap_width", "wc_top"]) expect(g).toContain(k);
  });
  it("a complete wall has no fabrication gaps", () => {
    expect(wallCapGaps(wall()).filter((g) => (g.tier || "fab") === "fab")).toEqual([]);
  });
  it("asks for edge distances only when cored, and the corner turn after run 1", () => {
    const w = wall({ mount: "plate", plateSize: "4x4" });
    w.runs[0].posts[0].edgeHigh = "";
    expect(wallCapGaps(w).some((g) => g.key === "wc_edges")).toBe(false);
    w.runs.push(newWallCapRun(1, { length: "40" }));
    w.runs[1].posts[0].capWidth = "10";
    w.runs[1].posts[0].top = "0";
    expect(wallCapGaps(w).find((g) => g.key === "wc_turn")?.detail).toBe("R2");
  });
  it("roof edges ask about the membrane", () => {
    expect(wallCapGaps(wall({ kind: "roof_edge" })).some((g) => g.key === "wc_membrane")).toBe(true);
    expect(wallCapGaps(wall({ kind: "roof_edge", membrane: "yes" })).some((g) => g.key === "wc_no_penetration")).toBe(true);
  });
});

describe("wall-cap sheet wiring", () => {
  it("a new wall_cap sheet carries a blank wall, survives normalize and save validation", () => {
    const d = newMeasureData("wall_cap", 0);
    expect(d.wallCap?.runs).toHaveLength(1);
    const w = wall();
    const parsed = WallCapSchema.parse(JSON.parse(JSON.stringify(w)));
    expect(parsed).toEqual(w);
    const round = normalizeMeasureData({ ...d, wallCap: parsed! });
    expect(round.wallCap).toEqual(w);
    expect(WallCapSchema.safeParse(blankWallCap()).success).toBe(true);
  });
  it("runChecks / requiredGaps route to the wall-cap rules, using the sheet's code profile", () => {
    const d = newMeasureData("wall_cap", 0);
    d.wallCap = wall({ occupancy: "commercial" });
    expect(wallCapLimits(d).guardHeight).toBe(42);
    expect(runChecks(d, "wall_cap").find((c) => c.key === "wc_guard_height")?.level).toBe("red");
    const gaps = requiredGaps(d, "wall_cap");
    expect(gaps.filter((g) => g.key === "photo").map((g) => g.detail)).toEqual(requiredPhotoSlots("wall_cap"));
    expect(sheetProgress(d).filled).toBeGreaterThan(0);
  });
  it("every string has EN, PT and ES and every check/gap key has a label", () => {
    for (const l of ["en", "pt", "es"] as const) for (const v of Object.values(WALL_CAP_STR[l])) expect(v.trim()).not.toBe("");
    const w = wall({ loose: "yes", cracked: "yes", kind: "roof_edge", membrane: "yes", noPenetration: "yes", mount: "plate", plateSize: "12x12" });
    w.runs[0].posts[1].top = "-6";
    for (const c of wallCapChecks(w)) expect(mt("pt", `check_${c.key}`)).not.toBe(`check_${c.key}`);
    for (const g of wallCapGaps(blankWallCap())) if (g.key !== "photo") expect(mt("es", `gap_${g.key}`)).not.toBe(`gap_${g.key}`);
    for (const s of requiredPhotoSlots("wall_cap")) expect(mt("pt", `slot_${s}`)).not.toBe(`slot_${s}`);
    expect(mt("pt", "shape_wall_cap")).toBe("Guarda-corpo sobre muro");
  });
});

describe("wall-cap 3D", () => {
  it("turns runs left and right in plan", () => {
    const w = wall();
    w.runs.push(newWallCapRun(1, { length: "60", turn: "90", turnDir: "left" }));
    w.runs.push(newWallCapRun(1, { length: "60", turn: "90", turnDir: "right" }));
    const l = wallCapLayout(w);
    expect(l.runs[1].to.x).toBeCloseTo(120);
    expect(l.runs[1].to.y).toBeCloseTo(60);
    expect(l.runs[2].to.x).toBeCloseTo(180);
    expect(l.runs[2].to.y).toBeCloseTo(60);
  });
  it("draws wall, posts at the cap top and a stepped rail", () => {
    const d = newMeasureData("wall_cap", 0);
    d.wallCap = wall();
    d.wallCap.runs[0].posts[1].top = "-6";
    d.wallCap.runs[0].rail = "stepped";
    const s = wallCapScene(d);
    expect(s.meshes.filter((m) => m.kind === "site").length).toBeGreaterThan(0);
    const posts = s.meshes.filter((m) => m.kind === "post");
    expect(posts).toHaveLength(2);
    expect(Math.max(...posts[1].vertices.map((v) => v.z))).toBeCloseTo(30);
    const rail = s.lines.find((l) => l.kind === "rail")!;
    expect(rail.points.map((p) => p.z)).toEqual([36, 36, 30]);
    expect(s.pending).toEqual([]);
  });
  it("is registered and feeds measureScene; other sheets get nothing from it", () => {
    expect(SCENE_SHAPES.wall_cap).toBeTypeOf("function"); // wrapped by the pre-mirror (scene-shapes/index.ts)
    const d = newMeasureData("wall_cap", 0);
    d.wallCap = wall();
    expect(measureScene(d).meshes.some((m) => m.id.startsWith("wallcap:"))).toBe(true);
    expect(wallCapScene(newMeasureData("straight", 3))).toEqual({ meshes: [], lines: [], pending: [] });
  });
  it("marks missing sizes provisional", () => {
    const d = newMeasureData("wall_cap", 0);
    const s = wallCapScene(d);
    expect(s.meshes.every((m) => m.provisional)).toBe(true);
    expect(s.pending.length).toBeGreaterThan(0);
  });
  it("normalize fills fields added later", () => {
    const w = normalizeWallCap({ kind: "parapet", runs: [{ id: "r", length: "10", posts: [{ id: "p" }] }] } as unknown as Partial<WallCapData>);
    expect(w.runs[0].posts[0].capWidth).toBe("");
    expect(w.runs[0].rail).toBe("");
    expect(w.finish).toBe("dtm");
  });
});
