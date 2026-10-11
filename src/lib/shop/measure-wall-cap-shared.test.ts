// Wall-cap and shop-piece sheets on the shared machinery: Next card walking
// order, mounting substrate, code check, 3D dispatch, second-measure sources.
import { describe, expect, it } from "vitest";
import { newMeasureData } from "./measure";
import { blankWallCap, newWallCapPost, newWallCapRun } from "./measure-wall-cap";
import { newShopPiece } from "./measure-shop-piece";
import { measurementQueue } from "./measure-next";
import { requiredGaps, runChecks } from "./measure-checks";
import { blankMountGaps, getSub, mountLocations, setSub, blankSubstrate } from "./measure-substrate";
import { codeCheck } from "./measure-code";
import { measureScene } from "./measure-scene";
import { sceneShapeOf } from "./scene-shapes";
import { surveyDimensions } from "./measure-survey";

function wallSheet() {
  const d = newMeasureData("wall_cap", 0);
  const w = blankWallCap();
  Object.assign(w, { kind: "retaining", material: "concrete", dropSide: "right", mount: "core", loose: "no", cracked: "no" });
  w.runs = [newWallCapRun(0, { length: "" })];
  w.runs[0].posts = [newWallCapPost(), newWallCapPost()];
  w.runs.push(newWallCapRun(1, { length: "", turnDir: "left" }));
  d.wallCap = w;
  return d;
}

describe("Next card walking order", () => {
  it("wall cap: drop and rail first, then run by run, post by post (cap, top, both edges)", () => {
    const d = wallSheet();
    const q = measurementQueue(d, "wall_cap", requiredGaps(d, "wall_cap"));
    const ids = q.open.filter((i) => i.type === "slot").map((i) => (i.type === "slot" ? i.slot.labelKey + (i.slot.detail ? `@${i.slot.detail}` : "") : ""));
    expect(ids.slice(0, 4)).toEqual(["wc_drop", "wc_railHeight", "wc_coreDia", "wc_coreDepth"]);
    expect(ids).toContain("wc_runLength@R1");
    const p1 = ids.indexOf("wc_capWidth@P1"), p2 = ids.indexOf("wc_capWidth@P2"), r2 = ids.indexOf("wc_runLength@R2");
    expect(p1).toBeGreaterThan(ids.indexOf("wc_runLength@R1"));
    expect(ids.slice(p1, p1 + 4)).toEqual(["wc_capWidth@P1", "wc_top@P1", "wc_edgeHigh@P1", "wc_edgeLow@P1"]);
    expect(p2).toBeGreaterThan(p1);
    expect(r2).toBeGreaterThan(p2);
    expect(ids).toContain("wc_turnAngle@R2");
    const turn = q.slots.find((s) => s.labelKey === "wc_turnAngle")!;
    expect(turn.unit).toBe("deg");
    turn.put(d, "90");
    expect(d.wallCap!.runs[1].turn).toBe("90");
  });
  it("wall cap: no edge distances asked when the posts are not cored", () => {
    const d = wallSheet();
    d.wallCap!.mount = "plate";
    const q = measurementQueue(d, "wall_cap", requiredGaps(d, "wall_cap"));
    expect(q.slots.some((s) => s.labelKey === "wc_edgeHigh")).toBe(false);
  });
  it("shop piece: niche read back/front/top/bottom, heights, depths, diagonals", () => {
    const d = newMeasureData("shop_piece", 0);
    d.shopPiece!.niche = true;
    d.shopPiece!.pieces = [newShopPiece({ label: "Rack" })];
    const q = measurementQueue(d, "shop_piece", requiredGaps(d, "shop_piece"));
    const keys = q.slots.map((s) => s.part);
    expect(keys).toEqual(["wBack", "wFront", "wTop", "wBottom", "hLeft", "hRight", "hBack", "dTop", "dBottom", "diagA", "diagB"]);
    expect(q.slots[0].group).toMatchObject({ kind: "piece", label: "Rack" });
  });
  it("shop piece: a freestanding piece is just W, H, D", () => {
    const d = newMeasureData("shop_piece", 0);
    const q = measurementQueue(d, "shop_piece", requiredGaps(d, "shop_piece"));
    expect(q.slots.map((s) => s.labelKey)).toEqual(["sp_w", "sp_h", "sp_d"]);
  });
});

describe("shared mounting substrate", () => {
  it("every wall-cap post is a mounting location, filled from the wall's cap material", () => {
    const d = wallSheet();
    const locs = mountLocations(d, "wall_cap");
    expect(locs.map((l) => l.label)).toEqual(["P1", "P2", "P3"]);
    expect(locs[0].sub?.material).toBe("poured_concrete");
    expect(locs[0].sub?.mount).toBe("core_drill");
    expect(blankMountGaps(d, "wall_cap")).toEqual([]);
  });
  it("the nearest edge of the two at a post is its edge distance; editing writes back", () => {
    const d = wallSheet();
    const p = d.wallCap!.runs[0].posts[0];
    p.edgeHigh = "6"; p.edgeLow = "2 1/2";
    const key = `wallcap:${p.id}`;
    expect(getSub(d, key)?.edgeDist).toBe('2 1/2"');
    setSub(d, key, { ...blankSubstrate(), material: "stone", condition: "cracked" });
    expect(p.material).toBe("stone");
    expect(d.wallCap!.cracked).toBe("yes");
    expect(getSub(d, key)?.material).toBe("stone");
    // Mounting checks ride along with the wall-cap checks.
    expect(runChecks(d, "wall_cap").some((c) => c.key.startsWith("sub_") || "detailI18n" in c)).toBe(true);
  });
  it("a wall-mounted shop piece fastens to one location, synced with its substrate", () => {
    const d = newMeasureData("shop_piece", 0);
    expect(mountLocations(d, "shop_piece")).toEqual([]);
    d.shopPiece!.mount = "wall";
    expect(requiredGaps(d, "shop_piece").some((g) => g.key === "sub_shoppiece" && g.detail === "shoppiece")).toBe(true);
    setSub(d, "shoppiece", { ...blankSubstrate(), material: "wood_framing" });
    expect(d.shopPiece!.substrate).toBe("studs");
    expect(requiredGaps(d, "shop_piece").some((g) => g.key === "sub_shoppiece")).toBe(false);
  });
});

describe("code check, 3D, second measure", () => {
  it("a wall with a drop gets guard-required and guard-height code rows", () => {
    const d = wallSheet();
    Object.assign(d.wallCap!, { drop: "60", railHeight: "34", capAboveWalk: "0", occupancy: "commercial" });
    const r = codeCheck(d, "wall_cap").results;
    expect(r.find((x) => x.rule === "guard_required")?.level).toBe("green");
    const h = r.find((x) => x.rule === "guard_height")!;
    expect(h.limit).toBe(42);
    expect(h.level).toBe("red");
  });
  it("the scene picks the wall-cap / shop-piece adapter from the sheet's data", () => {
    const d = wallSheet();
    expect(sceneShapeOf(d)).toBe("wall_cap");
    expect(measureScene(d).meshes.some((m) => m.id.startsWith("wallcap:wall"))).toBe(true);
    const s = newMeasureData("shop_piece", 0);
    expect(sceneShapeOf(s)).toBe("shop_piece");
    expect(measureScene(s).meshes.some((m) => m.id.startsWith("shoppiece:"))).toBe(true);
  });
  it("cap widths and niche readings can be re-measured by a second person", () => {
    const d = wallSheet();
    d.wallCap!.runs[0].posts[0].capWidth = "12";
    expect(surveyDimensions(d).some((x) => x.keys.at(-1) === "capWidth")).toBe(true);
  });
});
