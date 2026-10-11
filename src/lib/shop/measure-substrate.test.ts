import { describe, expect, it } from "vitest";
import {
  ANCHOR_KEYS,
  FINISH_TYPES,
  SUB_CONDITIONS,
  SUB_HIDDEN,
  SUB_MATERIALS,
  SUB_MOUNTS,
  SURFACE_KEYS,
  applySubToAll,
  blankSubstrate,
  finishAdd,
  finishChecks,
  finishedRisers,
  finishedView,
  getSub,
  guessMaterial,
  heightNotes,
  mountLocations,
  previousSub,
  setSub,
  setSurface,
  substrateChecks,
  suggestAnchor,
  surfacesFor,
  type Substrate,
} from "./measure-substrate";
import { SUBSTRATE_STR } from "./measure-substrate-i18n";
import { SubstrateSchema, SurfacesSchema } from "./measure-substrate-schema";
import { newMeasureData, newPost, newSpan, normalizeMeasureData, type FlightSegment, type MeasureData } from "./measure";
import { runChecks } from "./measure-checks";
import { codeCheck } from "./measure-code";
import { newMember } from "./measure-structural";

const sub = (p: Partial<Substrate>): Substrate => ({ ...blankSubstrate(), ...p });
const levels = (cs: { level: string }[]) => cs.map((c) => c.level);

describe("anchor suggestion", () => {
  it("brick goes into the brick, not the mortar, 3\" from the edge", () => {
    expect(suggestAnchor("brick", "surface_flange")).toEqual({ anchor: "sleeve_brick", minEdge: 3, minDepth: 3 });
    expect(suggestAnchor("brick", "side_mount")?.anchor).toBe("sleeve_brick");
  });
  it("concrete core gets hydraulic cement / epoxy grout, 3–4\" from the edge", () => {
    const s = suggestAnchor("poured_concrete", "core_drill")!;
    expect(s.anchor).toBe("core_grout");
    expect(s.minEdge).toBeGreaterThanOrEqual(3);
    expect(s.minEdge).toBeLessThanOrEqual(4);
    expect(s.minDepth).toBe(4);
  });
  it("uses the material's usual mount when none is picked", () => {
    expect(suggestAnchor("poured_concrete")?.anchor).toBe("core_grout");
    expect(suggestAnchor("steel")?.anchor).toBe("weld");
    expect(suggestAnchor("steel", "through_bolt")?.anchor).toBe("bolt_steel");
  });
  it("wood is through-bolted or lagged into framing with blocking", () => {
    expect(suggestAnchor("wood_framing", "through_bolt")?.anchor).toBe("through_bolt");
    expect(suggestAnchor("wood_deck", "surface_flange")?.anchor).toBe("lag_blocking");
  });
  it("stucco and siding need a standoff block and flashing", () => {
    expect(suggestAnchor("stucco", "side_mount")?.anchor).toBe("standoff_flash");
    expect(suggestAnchor("siding", "surface_flange")?.anchor).toBe("standoff_flash");
  });
  it("a post-tensioned slab is never drilled before a scan", () => {
    expect(suggestAnchor("poured_concrete", "core_drill", "pt_slab")?.anchor).toBe("scan_first");
    expect(suggestAnchor("poured_concrete", "core_drill", "pt_slab", true)?.anchor).toBe("core_grout");
  });
  it("has a suggestion for every material × mount", () => {
    for (const m of SUB_MATERIALS) for (const mo of SUB_MOUNTS) {
      const s = suggestAnchor(m, mo);
      expect(s && ANCHOR_KEYS.includes(s.anchor)).toBe(true);
    }
    expect(suggestAnchor("")).toBeNull();
  });
});

describe("substrate checks", () => {
  it("edge distance: green at the minimum, yellow close, red too close", () => {
    expect(levels(substrateChecks(sub({ material: "brick", mount: "surface_flange", edgeDist: "3" }), "P1"))).toEqual(["green"]);
    expect(levels(substrateChecks(sub({ material: "brick", mount: "surface_flange", edgeDist: "2 1/2" }), "P1"))).toEqual(["yellow"]);
    const red = substrateChecks(sub({ material: "brick", mount: "surface_flange", edgeDist: "1 1/2" }), "P1");
    expect(red[0]).toMatchObject({ key: "sub_edge", level: "red", expected: 3, actual: 1.5, detail: "P1" });
  });
  it("rotted or spalled substrate is red, cracked or unknown yellow", () => {
    expect(substrateChecks(sub({ material: "wood_framing", condition: "rotted" }), "x")[0].level).toBe("red");
    expect(substrateChecks(sub({ material: "poured_concrete", condition: "spalled" }), "x")[0].level).toBe("red");
    expect(substrateChecks(sub({ material: "brick", condition: "cracked" }), "x")[0].level).toBe("yellow");
    expect(substrateChecks(sub({ material: "brick", condition: "sound" }), "x")[0].level).toBe("green");
  });
  it("hidden utilities: PT slab red until scanned, radiant yellow", () => {
    const pt = substrateChecks(sub({ material: "poured_concrete", mount: "core_drill", hidden: "pt_slab" }), "x");
    expect(pt.find((c) => c.key === "sub_pt_slab")?.level).toBe("red");
    const scanned = substrateChecks(sub({ material: "poured_concrete", mount: "core_drill", hidden: "pt_slab", scanned: true }), "x");
    expect(scanned.find((c) => c.key === "sub_pt_slab")?.level).toBe("green");
    expect(substrateChecks(sub({ material: "tile_slab", hidden: "radiant" }), "x").find((c) => c.key === "sub_hidden")?.level).toBe("yellow");
  });
  it("cladding without standoff + flashing is red", () => {
    expect(substrateChecks(sub({ material: "siding" }), "x").find((c) => c.key === "sub_cladding")?.level).toBe("red");
    expect(substrateChecks(sub({ material: "stucco", standoff: true }), "x").find((c) => c.key === "sub_cladding")?.level).toBe("green");
  });
  it("deck boards alone cannot hold a guard post", () => {
    expect(substrateChecks(sub({ material: "wood_deck" }), "x").find((c) => c.key === "sub_decking")?.level).toBe("red");
    expect(substrateChecks(sub({ material: "composite", blocking: true }), "x").find((c) => c.key === "sub_decking")?.level).toBe("green");
  });
  it("weld only to steel; core depth checked", () => {
    expect(substrateChecks(sub({ material: "brick", mount: "weld" }), "x").find((c) => c.key === "sub_weld")?.level).toBe("red");
    expect(substrateChecks(sub({ material: "poured_concrete", mount: "core_drill", depth: "2" }), "x").find((c) => c.key === "sub_depth")?.level).toBe("red");
    expect(substrateChecks(sub({ material: "poured_concrete", mount: "core_drill", depth: "6" }), "x").find((c) => c.key === "sub_depth")?.level).toBe("green");
  });
  it("says nothing until a material is chosen", () => {
    expect(substrateChecks(sub({ edgeDist: "1" }), "x")).toEqual([]);
    expect(substrateChecks(undefined, "x")).toEqual([]);
  });
});

describe("migration and sync", () => {
  it("guesses materials from older free text in three languages", () => {
    expect(guessMaterial("Granite")).toBe("stone");
    expect(guessMaterial("tijolo")).toBe("brick");
    expect(guessMaterial("hormigón")).toBe("poured_concrete");
    expect(guessMaterial("Trex decking")).toBe("composite");
    expect(guessMaterial("vinyl siding")).toBe("siding");
    expect(guessMaterial("")).toBe("");
  });
  it("fills a post's substrate from its old mount / anchor / edge fields", () => {
    const d = newMeasureData("straight", 4);
    d.posts.push({ ...newPost(0, 0), id: "p1", mount: "Core-drill", anchor: "Brick", edgeDist: "3 1/2" });
    const n = normalizeMeasureData(d);
    expect(n.posts[0].sub).toMatchObject({ material: "brick", mount: "core_drill", edgeDist: "3 1/2" });
    // An old sheet stays readable: legacy fields untouched.
    expect(n.posts[0].anchor).toBe("Brick");
  });
  it("writes back to the old fields so older readers keep working", () => {
    const d = normalizeMeasureData(newMeasureData("straight", 4));
    d.posts.push({ ...newPost(0, 0), id: "p1" });
    setSub(d, "post:p1", sub({ material: "poured_concrete", mount: "surface_flange", edgeDist: "4" }));
    expect(d.posts[0]).toMatchObject({ anchor: "Concrete", mount: "Base plate", edgeDist: "4" });
  });
  it("maps the opening jamb and structural bearings onto the shared model", () => {
    const op = normalizeMeasureData(newMeasureData("opening", 1));
    op.opening!.substrate = "brick";
    const n = normalizeMeasureData(op);
    expect(n.opening!.sub?.material).toBe("brick");
    setSub(n, "opening", sub({ material: "stucco" }));
    expect(n.opening!.substrate).toBe("stucco");

    const st = normalizeMeasureData(newMeasureData("structural", 1));
    const m = newMember("lintel", "L1");
    m.bearingL = { substrate: "brick", condition: "poor", length: "4", wall: "8" };
    st.structural!.members.push(m);
    const s2 = normalizeMeasureData(st);
    expect(s2.structural!.members[0].bearingL.sub).toMatchObject({ material: "brick", condition: "spalled", depth: "8" });
    // The older UI edits the enum directly: the shared model follows it.
    s2.structural!.members[0].bearingL.substrate = "concrete";
    expect(getSub(s2, `struct:${m.id}:L`)?.material).toBe("poured_concrete");
    setSub(s2, `struct:${m.id}:R`, sub({ material: "block_filled", condition: "sound" }));
    expect(s2.structural!.members[0].bearingR).toMatchObject({ substrate: "block", condition: "good" });
  });
  it("Same as previous and Apply to all make twenty posts one tap", () => {
    const d = normalizeMeasureData(newMeasureData("straight", 8));
    for (let i = 0; i < 5; i++) d.posts.push({ ...newPost(0, i), id: `p${i}` });
    setSub(d, "post:p0", sub({ material: "stone", mount: "core_drill", edgeDist: "3" }));
    expect(previousSub(d, "straight", "post:p1")?.material).toBe("stone");
    setSub(d, "post:p3", sub({ edgeDist: "5" }));
    expect(applySubToAll(d, "straight", "post:p0")).toBe(4);
    expect(d.posts.every((p) => p.sub?.material === "stone")).toBe(true);
    // A location's own edge distance survives.
    expect(d.posts[3].sub?.edgeDist).toBe("5");
  });
  it("lists every fastening location on a gate, a deck and a structural sheet", () => {
    const g = normalizeMeasureData(newMeasureData("gate", 1));
    expect(mountLocations(g, "gate").map((l) => l.key)).toEqual(["gate:hinge", "gate:latch"]);
    const dk = normalizeMeasureData(newMeasureData("deck", 3));
    expect(mountLocations(dk, "deck").map((l) => l.key)).toContain("deck:posts");
    const st = normalizeMeasureData(newMeasureData("structural", 1));
    const c = newMember("column", "C1");
    st.structural!.members.push(c);
    expect(mountLocations(st, "structural").map((l) => l.key)).toEqual([`struct:${c.id}:base`]);
    const sp = normalizeMeasureData(newMeasureData("straight", 3));
    const span = newSpan();
    span.start.attachTo = "wall";
    sp.spans.push(span);
    expect(mountLocations(sp, "straight").map((l) => l.key)).toEqual([`term:${span.id}:start`]);
  });
  it("substrate problems reach the sheet's checks", () => {
    const d = normalizeMeasureData(newMeasureData("gate", 1));
    setSub(d, "gate:hinge", sub({ material: "brick", edgeDist: "1" }));
    const c = runChecks(d, "gate").find((x) => x.key === "sub_edge");
    expect(c).toMatchObject({ level: "red" });
  });
  it("validates every new field (zod strips unknown keys)", () => {
    const full = sub({ material: "brick", condition: "sound", edgeDist: "3", depth: "4", mount: "core_drill", hidden: "none", scanned: true, standoff: false, blocking: false, anchor: "x", note: "y" });
    expect(SubstrateSchema.parse(full)).toEqual(full);
    const sf = { treads: { installed: "no" as const, type: "hardwood" as const, thickness: '3/4"' } };
    expect(SurfacesSchema.parse(sf)).toEqual(sf);
  });
});

// A 4-riser stair, every riser 7 1/2", rail 36" above the nosings.
function stair(): MeasureData {
  const d = normalizeMeasureData(newMeasureData("straight", 4));
  const fl = d.segments[0] as FlightSegment;
  fl.steps.forEach((s) => { s.rise = "7 1/2"; s.run = "11"; });
  d.rail.height = "36";
  d.rail.kind = "Handrail";
  return d;
}

describe("future finishes", () => {
  it("uses the typed thickness, else the finish's usual build-up", () => {
    expect(finishAdd({ installed: "no", type: "hardwood", thickness: "" })).toBe(0.75);
    expect(finishAdd({ installed: "no", type: "tile", thickness: "1" })).toBe(1);
    expect(finishAdd({ installed: "yes", type: "tile", thickness: "1" })).toBe(0);
    for (const t of FINISH_TYPES) expect(finishAdd({ installed: "no", type: t, thickness: "" })).toBeGreaterThan(0);
  });
  it("offers the surfaces each work type measures from", () => {
    expect(surfacesFor(stair(), "straight")).toEqual(["bottom", "treads", "top"]);
    expect(surfacesFor(normalizeMeasureData(newMeasureData("l_shape", 4)), "l_shape")).toContain("landing");
    expect(surfacesFor(normalizeMeasureData(newMeasureData("gate", 1)), "gate")).toEqual(["ground"]);
    expect(surfacesFor(normalizeMeasureData(newMeasureData("deck", 2)), "deck")).toEqual(["deck"]);
    expect(surfacesFor(normalizeMeasureData(newMeasureData("structural", 1)), "structural")).toEqual(["slab"]);
  });
  it("rail height is re-expressed from the finished tread", () => {
    const d = stair();
    setSurface(d, "treads", { installed: "no", type: "hardwood", thickness: "3/4" });
    expect(finishedView(d, "straight").rail.height).toBe('35 1/4"');
    expect(heightNotes(d, "straight")).toEqual([{ key: "fin_h_rail", surface: "treads", measured: 36, finished: 35.25 }]);
    // Nothing pending: the very same object comes back.
    const clean = stair();
    expect(finishedView(clean, "straight")).toBe(clean);
  });
  it("only the first and last riser move", () => {
    const d = stair();
    setSurface(d, "treads", { installed: "no", type: "hardwood", thickness: "3/4" });
    setSurface(d, "bottom", { installed: "no", type: "tile", thickness: "1/2" });
    // first: 7.5 + 0.75 - 0.5; last: 7.5 + 0 (top finished) - 0.75
    expect(finishedRisers(d)[0].finished).toEqual([7.75, 7.5, 7.5, 6.75]);
  });
  it("mixed finishes that break the 3/8\" riser rule are red; worse-but-legal is yellow", () => {
    const d = stair();
    setSurface(d, "treads", { installed: "no", type: "hardwood", thickness: "3/4" });
    expect(finishChecks(d, "straight")[0]).toMatchObject({ key: "finish_riser_mix", level: "red" });
    setSurface(d, "top", { installed: "no", type: "hardwood", thickness: "3/4" });
    setSurface(d, "bottom", { installed: "no", type: "tile", thickness: "1/2" });
    // first riser +1/4, last riser 0 → variation 1/4: legal, but worse than as measured.
    expect(finishChecks(d, "straight")[0].level).toBe("yellow");
    setSurface(d, "bottom", { installed: "no", type: "hardwood", thickness: "3/4" });
    expect(finishChecks(d, "straight")[0].level).toBe("green");
  });
  it("code check judges the finished height", () => {
    const d = stair();
    d.rail.height = "34 1/2";
    const before = codeCheck(d, "straight").results.find((r) => r.rule === "handrail_height");
    expect(before?.level).toBe("green");
    setSurface(d, "treads", { installed: "no", type: "stone", thickness: "1 1/4" });
    setSurface(d, "bottom", { installed: "no", type: "stone", thickness: "1 1/4" });
    setSurface(d, "top", { installed: "no", type: "stone", thickness: "1 1/4" });
    const after = codeCheck(d, "straight").results.find((r) => r.rule === "handrail_height");
    expect(after?.actual).toBe(33.25);
  });
  it("gate clearance and deck guard compensate for pavers / decking to come", () => {
    const g = normalizeMeasureData(newMeasureData("gate", 1));
    g.gate!.groundClearance = "3";
    setSurface(g, "ground", { installed: "no", type: "stone", thickness: "2 3/8" });
    expect(finishedView(g, "gate").gate!.groundClearance).toBe('5/8"');
    const dk = normalizeMeasureData(newMeasureData("deck", 2));
    dk.deck!.guardHeight = "36";
    setSurface(dk, "deck", { installed: "no", type: "composite", thickness: "1" });
    expect(finishedView(dk, "deck").deck!.guardHeight).toBe('35"');
  });
  it("old floor-change fields migrate in and stay in step", () => {
    const d = newMeasureData("straight", 3);
    d.finish.floorChange = "bottom";
    d.finish.bottomAdjustment = '+3/4"';
    d.finish.futureTopping = "Hardwood";
    const n = normalizeMeasureData(d);
    expect(n.surfaces?.bottom).toEqual({ installed: "no", type: "hardwood", thickness: '3/4"' });
    setSurface(n, "top", { installed: "no", type: "tile", thickness: "1/2" });
    expect(n.finish.floorChange).toBe("both");
    expect(n.finish.topAdjustment).toBe('+1/2"');
  });
});

describe("strings", () => {
  it("every key has EN, PT and ES", () => {
    for (const l of ["en", "pt", "es"] as const) {
      for (const v of Object.values(SUBSTRATE_STR[l])) expect(v.trim()).not.toBe("");
    }
    const need = [
      ...SUB_MATERIALS.map((m) => `sub_mat_${m}`), ...SUB_CONDITIONS.map((c) => `sub_cond_${c}`),
      ...SUB_MOUNTS.map((m) => `sub_mount_${m}`), ...SUB_HIDDEN.map((h) => `sub_hidden_${h}`),
      ...ANCHOR_KEYS.map((a) => `sub_anchor_${a}`), ...FINISH_TYPES.map((t) => `fin_type_${t}`),
      ...SURFACE_KEYS.map((k) => `fin_surf_${k}`), ...SURFACE_KEYS.map((k) => `fin_rough_${k}`),
      "check_sub_edge", "check_sub_depth", "check_sub_condition", "check_sub_hidden", "check_sub_pt_slab",
      "check_sub_cladding", "check_sub_decking", "check_sub_weld", "check_finish_riser_mix",
    ];
    for (const k of need) for (const l of ["en", "pt", "es"] as const) expect(SUBSTRATE_STR[l][k], `${l}:${k}`).toBeTruthy();
  });
});
