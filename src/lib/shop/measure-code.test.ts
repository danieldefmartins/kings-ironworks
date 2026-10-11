import { describe, expect, it } from "vitest";
import { newMeasureData, newPresetMeasureData, type MeasureData, type MeasureShape } from "./measure";
import {
  codeCheck,
  codeCite,
  codeLimits,
  effectiveCodeSettings,
  handrailProfile,
  stairTriangleSphere,
  type CodeRule,
} from "./measure-code";
import { codeLimitText } from "./measure-code-i18n";

function stair(rises: string[], runs: string[], extra?: (d: MeasureData) => void): MeasureData {
  const d = newMeasureData("straight", rises.length);
  const fl = d.segments[0];
  if (fl.kind !== "flight") throw new Error();
  fl.steps.forEach((s, i) => { s.rise = rises[i]; s.run = runs[i] ?? ""; });
  extra?.(d);
  return d;
}
const find = (d: MeasureData, shape: MeasureShape, rule: CodeRule, org?: string) =>
  codeCheck(d, shape, org).results.filter((r) => r.rule === rule);
const one = (d: MeasureData, shape: MeasureShape, rule: CodeRule, org?: string) => {
  const r = find(d, shape, rule, org);
  expect(r.length).toBe(1);
  return r[0];
};

describe("profiles", () => {
  it("defaults to MA 780 residential and the org default when the sheet has none", () => {
    const d = newMeasureData("straight", 3);
    expect(effectiveCodeSettings(d).profile).toBe("ma780");
    expect(effectiveCodeSettings(d, "ibc2021").profile).toBe("ibc2021");
    d.code = { profile: "irc2021", occupancy: "" };
    expect(effectiveCodeSettings(d, "ibc2021").profile).toBe("irc2021");
  });
  it("IBC profile is commercial by default; occupancy toggle wins", () => {
    const d = newMeasureData("straight", 3);
    d.code = { profile: "ibc2021", occupancy: "" };
    expect(codeCheck(d, "straight").occupancy).toBe("commercial");
    d.code = { profile: "ibc2021", occupancy: "residential" };
    expect(codeCheck(d, "straight").occupancy).toBe("residential");
  });
  it("deck occupancy is used when the code toggle is on auto", () => {
    const d = newMeasureData("deck", 4);
    d.deck!.occupancy = "commercial";
    expect(codeCheck(d, "deck").occupancy).toBe("commercial");
  });
  it("custom overrides replace only the named limits", () => {
    const lim = codeLimits({ profile: "custom", occupancy: "", base: "irc2021", overrides: { riserMax: "8", guardHeight: "" } }, "residential");
    expect(lim.riserMax).toBe(8);
    expect(lim.guardHeight).toBe(36);
    expect(lim.treadMin).toBe(10);
  });
  it("citations follow the book", () => {
    expect(codeCite({ profile: "irc2021", occupancy: "" }, "residential", "guardH")).toBe("IRC R312.1.2");
    expect(codeCite({ profile: "ibc2021", occupancy: "" }, "commercial", "guardH")).toBe("IBC 1015.3");
    expect(codeCite({ profile: "ma780", occupancy: "" }, "residential", "guardH")).toBe("780 CMR R312.1.2");
    expect(codeCite({ profile: "ma780", occupancy: "" }, "commercial", "riser")).toBe("780 CMR 1011.5.2");
  });
});

describe("stair geometry", () => {
  it("riser max: IRC 7-3/4, MA 8-1/4, IBC 7", () => {
    const d = stair(["8", "8", "8"], ["10", "10", ""]);
    d.code = { profile: "irc2021", occupancy: "" };
    expect(one(d, "straight", "riser_max").level).toBe("red");
    d.code = { profile: "ma780", occupancy: "" };
    expect(one(d, "straight", "riser_max").level).toBe("green");
    const c = stair(["7 1/4", "7 1/4"], ["11", ""]);
    c.code = { profile: "ibc2021", occupancy: "" };
    const r = one(c, "straight", "riser_max");
    expect(r.level).toBe("red");
    expect(r.limit).toBe(7);
    expect(r.cite).toBe("IBC 1011.5.2");
  });
  it("tread min ignores the blank top run, flags a short tread", () => {
    const d = stair(["7", "7", "7"], ["9 1/2", "10", ""]);
    d.code = { profile: "irc2021", occupancy: "" };
    const t = one(d, "straight", "tread_min");
    expect(t.actual).toBe(9.5);
    expect(t.level).toBe("red");
  });
  it("riser variation over 3/8 is red, at 3/8 is green", () => {
    expect(one(stair(["7", "7 3/8"], ["10", ""]), "straight", "riser_variation").level).toBe("green");
    expect(one(stair(["7", "7 1/2"], ["10", ""]), "straight", "riser_variation").level).toBe("red");
  });
  it("tread variation", () => {
    expect(one(stair(["7", "7", "7"], ["10", "10 1/2", ""]), "straight", "tread_variation").level).toBe("red");
  });
  it("commercial minimum riser 4\"", () => {
    const d = stair(["3 1/2", "7"], ["11", ""]);
    d.code = { profile: "ibc2021", occupancy: "" };
    expect(one(d, "straight", "riser_min").level).toBe("red");
    d.code = { profile: "irc2021", occupancy: "" };
    expect(find(d, "straight", "riser_min")).toHaveLength(0);
  });
  it("winders: walkline 10\" and narrow end 6\" (IRC)", () => {
    const d = stair(["7", "7"], ["9", ""], (dd) => {
      const fl = dd.segments[0];
      if (fl.kind === "flight") Object.assign(fl.steps[0], { winder: true, runIn: "5", runOut: "14" });
    });
    d.code = { profile: "irc2021", occupancy: "" };
    expect(one(d, "straight", "winder_walkline").level).toBe("red");
    expect(one(d, "straight", "winder_narrow").level).toBe("red");
    // the winder is not a regular tread
    expect(find(d, "straight", "tread_min")).toHaveLength(0);
  });
  it("evaluates nothing when nothing is measured", () => {
    const d = newMeasureData("straight", 4);
    expect(codeCheck(d, "straight").results).toEqual([]);
  });
});

describe("guards and handrails on stairs", () => {
  const base = (h: string, kind = "Guardrail") =>
    stair(["7 1/2", "7 1/2", "7 1/2", "7 1/2", "7 1/2"], ["10", "10", "10", "10", ""], (d) => {
      d.rail.kind = kind; d.rail.height = h; d.datums.orientation = "left_wall"; d.code = { profile: "irc2021", occupancy: "" };
    });
  it("stair guard 34\" res from nosing; red when drop > 30\"", () => {
    const d = base("33");
    const r = one(d, "straight", "stair_guard_height");
    expect(r.level).toBe("red");
    expect(r.limit).toBe(34);
    expect(one(base("36"), "straight", "stair_guard_height").level).toBe("green");
  });
  it("short stair: low guard is only a verify", () => {
    const d = stair(["7", "7"], ["10", ""], (dd) => { dd.rail.kind = "Guardrail"; dd.rail.height = "30"; });
    expect(one(d, "straight", "stair_guard_height").level).toBe("yellow");
  });
  it("commercial stair guard needs 42\"", () => {
    const d = base("36");
    d.code = { profile: "ibc2021", occupancy: "" };
    expect(one(d, "straight", "stair_guard_height").level).toBe("red");
  });
  it("guard required on an open side over 30\" when the rail is handrail only", () => {
    const r = one(base("36", "Handrail"), "straight", "guard_required");
    expect(r.level).toBe("yellow");
    expect(r.actual).toBe(37.5);
    expect(codeLimitText(r)).toBe('> 30"');
    expect(one(base("36", "Guardrail"), "straight", "guard_required").level).toBe("green");
  });
  it("handrail height 34–38", () => {
    expect(one(base("36", "Handrail"), "straight", "handrail_height").level).toBe("green");
    expect(one(base("39", "Handrail"), "straight", "handrail_height").level).toBe("red");
    // combined rail at guard height above 38 → needs a separate handrail
    const both = base("42", "Both");
    const r = one(both, "straight", "handrail_height");
    expect(r.level).toBe("yellow");
    expect(r.note).toBe("separate_handrail");
  });
  it("handrail required on 4+ risers; guard at 34–38 serves", () => {
    expect(one(base("36"), "straight", "handrail_required").level).toBe("green");
    expect(one(base("42"), "straight", "handrail_required").level).toBe("yellow");
  });
  it("landing above 30\" needs level-surface guard height", () => {
    const d = newMeasureData("stair_platform", 5);
    const fl = d.segments[0];
    if (fl.kind === "flight") fl.steps.forEach((s) => { s.rise = "7 1/2"; s.run = "10"; });
    d.rail.kind = "Guardrail"; d.rail.height = "34"; d.code = { profile: "irc2021", occupancy: "" };
    const r = one(d, "stair_platform", "guard_height");
    expect(r.level).toBe("red");
    expect(r.limit).toBe(36);
  });
  it("wall rail is a handrail", () => {
    const d = newMeasureData("wall_rail", 3);
    d.rail.height = "40";
    expect(one(d, "wall_rail", "handrail_height").level).toBe("red");
  });
});

describe("openings", () => {
  it("4-3/8\" allowed on residential stairs, not on landings or commercial", () => {
    const d = stair(["7"], ["10"], (dd) => { dd.rail.kind = "Guardrail"; dd.materials.picketSpacing = "4 1/4"; dd.code = { profile: "irc2021", occupancy: "" }; });
    expect(one(d, "straight", "stair_infill_opening").level).toBe("green");
    d.code = { profile: "ibc2021", occupancy: "" };
    expect(one(d, "straight", "stair_infill_opening").level).toBe("red");
    const p = newMeasureData("stair_platform", 2);
    p.rail.kind = "Guardrail"; p.materials.picketSpacing = "4 1/4";
    expect(one(p, "stair_platform", "landing_infill_opening").level).toBe("red");
  });
  it("level run: 4\" sphere and bottom clearance", () => {
    const d = newMeasureData("level_run", 1);
    d.rail.kind = "Guardrail"; d.materials.picketSpacing = "4 1/2"; d.fab.bottomClearance = "3";
    expect(one(d, "level_run", "infill_opening").level).toBe("red");
    expect(one(d, "level_run", "bottom_clearance").level).toBe("green");
    d.fab.bottomClearance = "5";
    expect(one(d, "level_run", "bottom_clearance").level).toBe("red");
  });
  it("stair triangle: incircle of the scaled rise/run triangle", () => {
    expect(stairTriangleSphere(7.5, 10, 0)).toBeCloseTo(5);
    expect(stairTriangleSphere(7.5, 10, 2)!).toBeGreaterThan(6);
    const d = stair(["7 1/2", "7 1/2"], ["10", ""], (dd) => { dd.rail.kind = "Guardrail"; dd.fab.bottomClearance = "2"; });
    const r = one(d, "straight", "stair_triangle");
    expect(r.level).toBe("yellow"); // a stringer may close it: verify, never red
    d.fab.bottomClearance = "1";
    expect(one(d, "straight", "stair_triangle").level).toBe("green");
  });
  it("handrail guard doesn't get infill checks", () => {
    const d = stair(["7"], ["10"], (dd) => { dd.rail.kind = "Handrail"; dd.materials.picketSpacing = "6"; });
    expect(find(d, "straight", "stair_infill_opening")).toHaveLength(0);
  });
});

describe("graspability", () => {
  it("parses pipe, square tube, rect and round", () => {
    expect(handrailProfile('1-1/2" Sch40 pipe')).toEqual({ kind: "round", od: 1.9 });
    expect(handrailProfile('2" Sch40 pipe')).toEqual({ kind: "round", od: 2.375 });
    expect(handrailProfile('1-1/2" sq tube')).toEqual({ kind: "other", perimeter: 6, maxDim: 1.5 });
    expect(handrailProfile("Molded cap rail")).toBeNull();
    expect(handrailProfile('1-1/2" round bar')).toEqual({ kind: "round", od: 1.5 });
    expect(handrailProfile('1x2 rect tube')).toEqual({ kind: "other", perimeter: 6, maxDim: 2 });
  });
  it("flags 2\" pipe and 2\" square tube, passes 1-1/2\" pipe", () => {
    const d = stair(["7"], ["10"], (dd) => { dd.rail.kind = "Handrail"; dd.materials.topRail = '1-1/2" Sch40 pipe'; });
    expect(one(d, "straight", "handrail_grasp").level).toBe("green");
    d.materials.topRail = '2" Sch40 pipe';
    expect(one(d, "straight", "handrail_grasp").level).toBe("red");
    d.materials.topRail = '2" sq tube';
    expect(one(d, "straight", "handrail_grasp").level).toBe("red");
    d.materials.topRail = "Molded cap rail";
    expect(find(d, "straight", "handrail_grasp")).toHaveLength(0);
  });
});

describe("ramps", () => {
  it("slope 1:12, rise 30\" per run (commercial), landing 60\"", () => {
    const d = newMeasureData("ramp", 1);
    const r = d.segments[0];
    if (r.kind !== "ramp") throw new Error();
    r.rise = "20"; r.runH = "240"; // exactly 1:12
    expect(one(d, "ramp", "ramp_slope").level).toBe("green");
    r.runH = "200";
    expect(one(d, "ramp", "ramp_slope").level).toBe("red");
    // residential: no rise-per-run limit
    expect(find(d, "ramp", "ramp_rise")).toHaveLength(0);
    d.code = { profile: "ibc2021", occupancy: "" };
    r.rise = "32"; r.runH = "400";
    expect(one(d, "ramp", "ramp_rise").level).toBe("red");
  });
  it("slope from angle when run is missing", () => {
    const d = newMeasureData("ramp", 1);
    const r = d.segments[0];
    if (r.kind === "ramp") r.angleDeg = "6";
    expect(one(d, "ramp", "ramp_slope").level).toBe("red"); // tan 6° ≈ 1:9.5
  });
  it("landing between ramps", () => {
    const d = newMeasureData("ramp", 1);
    d.segments.push({ kind: "platform", length: "48", depth: "", diag: "", slope: "", slopeDir: "", turn: "none" });
    d.segments.push({ kind: "ramp", length: "", runH: "", rise: "", angleDeg: "", width: "" });
    d.code = { profile: "ibc2021", occupancy: "" };
    expect(one(d, "builder", "ramp_landing").level).toBe("red");
    d.code = { profile: "irc2021", occupancy: "" };
    expect(one(d, "builder", "ramp_landing").level).toBe("green");
  });
});

describe("decks and balconies", () => {
  it("deck side over 30\": railed green, unrailed yellow; low guard red", () => {
    const d = newMeasureData("deck", 2);
    d.deck!.sides[0].heightAboveGrade = "48";
    d.deck!.sides[1].heightAboveGrade = "40";
    d.deck!.sides[1].railed = false;
    const r = find(d, "deck", "guard_required");
    expect(r.map((x) => x.level)).toEqual(["green", "yellow"]);
    d.deck!.guardHeight = "34";
    expect(one(d, "deck", "guard_height").level).toBe("red");
    d.deck!.guardHeight = "36";
    expect(one(d, "deck", "guard_height").level).toBe("green");
    d.deck!.occupancy = "commercial";
    expect(one(d, "deck", "guard_height").level).toBe("red");
  });
  it("low deck: short guard is only a verify", () => {
    const d = newMeasureData("deck", 1);
    d.deck!.sides[0].heightAboveGrade = "20";
    d.deck!.guardHeight = "30";
    expect(find(d, "deck", "guard_required")).toHaveLength(0);
    expect(one(d, "deck", "guard_height").level).toBe("yellow");
  });
  it("balcony guard and picket spacing", () => {
    const d = newMeasureData("balcony", 1);
    d.balcony!.guardHeight = "36"; d.balcony!.picketSpacing = "4 1/8";
    expect(one(d, "balcony", "guard_height").level).toBe("green");
    expect(one(d, "balcony", "infill_opening").level).toBe("red");
  });
});

describe("pool gates", () => {
  const pool = () => {
    const d = newMeasureData("gate", 1);
    Object.assign(d.gate!, { use: "pool", heightHinge: "46", heightLatch: "48", groundClearance: "3", picketSpacing: "3 3/4", swingDir: "in", surface: "grass" });
    return d;
  };
  it("height, gap, infill, swing, latch reminder", () => {
    const d = pool();
    expect(one(d, "gate", "pool_height").level).toBe("red");
    expect(one(d, "gate", "pool_gap").level).toBe("red");
    expect(one(d, "gate", "pool_infill").level).toBe("green");
    expect(one(d, "gate", "pool_swing").level).toBe("red");
    expect(one(d, "gate", "pool_latch").level).toBe("yellow");
  });
  it("hard surface allows 4\" gap; outward swing passes", () => {
    const d = pool();
    d.gate!.surface = "Concrete"; d.gate!.swingDir = "out";
    expect(one(d, "gate", "pool_gap").level).toBe("green");
    expect(one(d, "gate", "pool_swing").level).toBe("green");
  });
  it("non-pool gates are not checked", () => {
    const d = pool();
    d.gate!.use = "walk";
    expect(codeCheck(d, "gate").results).toEqual([]);
  });
});

describe("window wells, spirals, ladders", () => {
  it("well deeper than 44\" needs a ladder; ladder geometry", () => {
    const d = newMeasureData("window_well", 1);
    d.well!.depth = "50";
    expect(one(d, "window_well", "well_ladder").level).toBe("yellow");
    d.well!.deliverables = ["ladder"];
    d.well!.ladderWidth = "11"; d.well!.ladderStandoff = "3"; d.well!.ladderSpacing = "20";
    expect(one(d, "window_well", "well_ladder").level).toBe("green");
    expect(one(d, "window_well", "well_ladder_width").level).toBe("red");
    expect(one(d, "window_well", "well_ladder_standoff").level).toBe("green");
    expect(one(d, "window_well", "well_ladder_spacing").level).toBe("red");
    d.well!.depth = "40";
    expect(find(d, "window_well", "well_ladder")).toHaveLength(0);
  });
  it("spiral width, riser, tread at walkline", () => {
    const d = newMeasureData("spiral", 12);
    Object.assign(d.spiral!, { clearWidth: "25", floorToFloor: "108", treads: "12", rotationDeg: "360", columnSize: "4" });
    expect(one(d, "spiral", "spiral_width").level).toBe("red");
    expect(one(d, "spiral", "spiral_riser").level).toBe("green"); // 9"
    // r = 2 + 12 = 14, 30° per tread → chord 7.25"
    const t = one(d, "spiral", "spiral_tread");
    expect(t.actual).toBeCloseTo(7.246, 2);
    expect(t.level).toBe("green");
  });
  it("fixed fire-escape ladder over 20/24 ft", () => {
    const d = newMeasureData("fire_escape", 2);
    d.fire!.ladder.type = "fixed"; d.fire!.ladder.length = "22'";
    expect(one(d, "fire_escape", "fixed_ladder").note).toBe("cage");
    d.fire!.ladder.length = "26'";
    const r = one(d, "fire_escape", "fixed_ladder");
    expect(r.note).toBe("fall_arrest");
    expect(r.level).toBe("yellow");
    d.fire!.ladder.type = "drop";
    expect(find(d, "fire_escape", "fixed_ladder")).toHaveLength(0);
  });
});

describe("drawn flights", () => {
  it("custom plan flights use their step measures", () => {
    const { data } = newPresetMeasureData("multi_flight", 3, 2);
    expect(codeCheck(data, "builder").results).toEqual([]);
    const d = newMeasureData("custom", 0);
    d.plan = { points: [], closed: false, segs: [], paths: [{ id: "a", label: "", points: [], closed: false, segs: [
      { len: "", note: "", kind: "flight", steps: "3", rise: "8", run: "9", width: "", stepMeasures: [] },
    ] }] };
    d.code = { profile: "irc2021", occupancy: "" };
    expect(one(d, "custom", "riser_max").level).toBe("red");
    expect(one(d, "custom", "tread_min").level).toBe("red");
  });
});
