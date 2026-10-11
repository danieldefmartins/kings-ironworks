import { describe, expect, it } from "vitest";
import {
  applyKind,
  blankCanopy,
  canopyChecks,
  canopyGaps,
  canopyGeometry,
  fmtSlope,
  normalizeCanopy,
  setSupport,
  undersideAt,
  type CanopyData,
} from "./measure-canopy";
import { CanopySchema } from "./measure-canopy-schema";
import { CANOPY_STR } from "./measure-canopy-i18n";
import { newMeasureData, normalizeMeasureData, requiredPhotoSlots } from "./measure";
import { requiredGaps, runChecks } from "./measure-checks";
import { mt } from "./measure-i18n";
import { measureScene } from "./measure-scene";
import { canopyScene } from "./scene-shapes/scene-canopy";
import { SCENE_SHAPES, sceneShapeOf } from "./scene-shapes";
import { measurementQueue } from "./measure-next";
import { sceneProjectOrder, sceneProjectShape } from "./measure-scene-setup";

function entry(over: Partial<CanopyData> = {}): CanopyData {
  const c = blankCanopy();
  applyKind(c, "entry");
  Object.assign(c, {
    substrate: "brick",
    width: "72",
    projection: "48",
    depth: "6",
    soffitL: "112",
    soffitR: "112",
    mount: "92",
    fall: "2",
    drain: "away",
    rodRise: "12",
    roof: "glass",
    flashing: "counter",
    gutter: "none",
    door: { swing: "out", width: "36", head: "84" },
    ...over,
  });
  return c;
}
const level = (c: CanopyData, key: string) => canopyChecks(c).find((k) => k.key === key)?.level;

describe("canopy geometry", () => {
  it("works out slope, front underside, lowest point and room under the trim", () => {
    const g = canopyGeometry(entry());
    expect(g.slopePerFt).toBeCloseTo(0.5);
    expect(g.front).toBe(90);
    expect(g.lowest).toBe(90);
    // 92 + 6 frame + 12 rod anchor = 110 under a 112 trim
    expect(g.wallTop).toBe(110);
    expect(g.trimClear).toBe(2);
  });

  it("a front gutter hangs below the front edge and sets the headroom", () => {
    const g = canopyGeometry(entry({ gutter: "front", gutterDrop: "4" }));
    expect(g.lowest).toBe(86);
  });

  it("drain toward the wall flips the fall", () => {
    const c = entry({ drain: "toward" });
    expect(canopyGeometry(c).fall).toBe(-2);
    expect(canopyGeometry(c).lowest).toBe(92);
  });

  it("underside at a distance interpolates along the pitch", () => {
    expect(undersideAt(entry(), 24)).toBe(91);
    expect(undersideAt(entry(), 100)).toBe(90);
  });

  it("formats slope per foot in fractions", () => {
    expect(fmtSlope(0.5)).toBe('1/2"/ft');
    expect(fmtSlope(0.25)).toBe('1/4"/ft');
    expect(fmtSlope(-0.5)).toBe('−1/2"/ft');
    expect(fmtSlope(null)).toBe("—");
  });
});

describe("canopy checks", () => {
  it("a well-measured entry canopy passes", () => {
    const checks = canopyChecks(entry());
    expect(checks.length).toBeGreaterThan(4);
    expect(checks.filter((c) => c.level === "red")).toEqual([]);
  });

  it("slope toward the wall is red — water into the house", () => {
    expect(level(entry({ drain: "toward" }), "canopy_slope_wall")).toBe("red");
    expect(level(entry({ fall: "-1" }), "canopy_slope_wall")).toBe("red");
  });

  it("a nearly flat roof is a review, an open pergola has no slope check", () => {
    expect(level(entry({ fall: "1/2" }), "canopy_slope")).toBe("yellow");
    const p = entry({ roof: "open" });
    expect(canopyChecks(p).some((c) => c.key.startsWith("canopy_slope"))).toBe(false);
  });

  it("headroom under the lowest point must be at least 80\"", () => {
    expect(level(entry({ mount: "81", fall: "2" }), "canopy_headroom")).toBe("red");
    expect(level(entry({ mount: "82", fall: "2" }), "canopy_headroom")).toBe("green");
    expect(level(entry({ mount: "84", fall: "2", gutter: "front", gutterDrop: "3" }), "canopy_headroom")).toBe("red");
  });

  it("tie-rod anchors that land above the trim are red", () => {
    expect(level(entry({ rodRise: "16" }), "canopy_trim_rods")).toBe("red");
    expect(level(entry({ rodRise: "13 3/4" }), "canopy_trim_rods")).toBe("yellow");
  });

  it("trim out of level end to end is flagged", () => {
    expect(level(entry({ soffitR: "113" }), "canopy_trim_level")).toBe("yellow");
    expect(level(entry({ soffitR: "112 1/4" }), "canopy_trim_level")).toBe("green");
  });

  it("projection is graded against the support type", () => {
    expect(level(entry({ projection: "60" }), "canopy_proj_tie_rods")).toBe("green");
    expect(level(entry({ projection: "72" }), "canopy_proj_tie_rods")).toBe("yellow");
    expect(level(entry({ projection: "96" }), "canopy_proj_tie_rods")).toBe("red");
    expect(level(entry({ support: "brackets", projection: "30" }), "canopy_proj_brackets")).toBe("green");
    expect(level(entry({ support: "brackets", projection: "48" }), "canopy_proj_brackets")).toBe("yellow");
    expect(level(entry({ support: "brackets", projection: "60" }), "canopy_proj_brackets")).toBe("red");
    const posts = entry({ projection: "120" });
    setSupport(posts, "posts");
    expect(canopyChecks(posts).some((c) => c.key.startsWith("canopy_proj_"))).toBe(false);
  });

  it("posts of different heights mean the grade slopes", () => {
    const c = entry();
    setSupport(c, "posts");
    c.posts[0].height = "90";
    c.posts[1].height = "91 1/2";
    expect(level(c, "canopy_post_heights")).toBe("yellow");
    c.posts[1].height = "90 1/8";
    expect(level(c, "canopy_post_heights")).toBe("green");
  });

  it("canopy below the door trim, or an out-swinging door hitting it, is red", () => {
    expect(level(entry({ mount: "83" }), "canopy_door_head")).toBe("red");
    expect(level(entry(), "canopy_door_head")).toBe("green");
    // Underside at 36" out = 92 - 2*36/48 = 90.5; door 84 → clear
    expect(level(entry(), "canopy_door_swing")).toBe("green");
    expect(level(entry({ mount: "85", fall: "2", door: { swing: "out", width: "36", head: "84" } }), "canopy_door_swing")).toBe("red");
    expect(canopyChecks(entry({ door: { swing: "in", width: "36", head: "84" } })).some((c) => c.key === "canopy_door_swing")).toBe(false);
  });

  it("snow load on a long projection wants an engineer", () => {
    expect(level(entry({ projection: "60" }), "canopy_snow")).toBe("yellow");
    expect(level(entry({ projection: "60", engineer: "yes" }), "canopy_snow")).toBe("green");
    expect(level(entry({ projection: "60", snow: false }), "canopy_snow")).toBeUndefined();
  });

  it("skylights skip wall checks", () => {
    const c = blankCanopy();
    applyKind(c, "skylight");
    Object.assign(c, { width: "30", projection: "48", fall: "4", drain: "away", roof: "glass" });
    const keys = canopyChecks(c).map((k) => k.key);
    expect(keys).toEqual(["canopy_slope"]);
  });
});

describe("canopy gaps", () => {
  it("an empty sheet asks only what is being covered", () => {
    expect(canopyGaps(blankCanopy()).map((g) => g.key)).toEqual(["canopy_kind"]);
  });
  it("a complete entry canopy has nothing left", () => {
    expect(canopyGaps(entry())).toEqual([]);
  });
  it("posts each need a height; a door swing needs its head", () => {
    const c = entry({ door: { swing: "out", width: "", head: "" } });
    setSupport(c, "posts");
    const keys = canopyGaps(c).map((g) => g.key);
    expect(keys).toContain("canopy_door_head");
    expect(keys).toContain("canopy_door_width");
    expect(keys.filter((k) => k === "canopy_post_height")).toHaveLength(2);
  });
  it("every gap and check key has EN / PT / ES text", () => {
    const c = blankCanopy();
    c.kind = "entry";
    c.door.swing = "out";
    c.support = "tie_rods";
    const keys = [...canopyGaps(c).map((g) => `gap_${g.key}`), "gap_canopy_kind", "gap_canopy_posts", "gap_canopy_post_height", "gap_canopy_curb"];
    const checkKeys = ["slope_wall", "slope", "headroom", "trim", "trim_rods", "trim_level", "proj_tie_rods", "proj_brackets", "post_heights", "door_head", "door_swing", "snow"].map((k) => `check_canopy_${k}`);
    for (const k of [...keys, ...checkKeys, "shape_canopy", "slot_cn_overall", "slot_cn_wall", "slot_cn_trim", "slot_cn_grade"]) {
      for (const l of ["en", "pt", "es"] as const) expect(CANOPY_STR[l][k], `${l}:${k}`).toBeTruthy();
    }
    expect(mt("pt", "shape_canopy")).toBe("Cobertura e toldo");
  });
  it("PT and ES are translated, not copied from EN", () => {
    const same = Object.keys(CANOPY_STR.en).filter((k) => CANOPY_STR.en[k] === CANOPY_STR.pt[k] && CANOPY_STR.en[k] === CANOPY_STR.es[k] && /[a-z]{4}/i.test(CANOPY_STR.en[k]));
    // Brand-neutral words that are the same in all three
    expect(same.filter((k) => !["cn_roof_metal", "cn_ok", "cn_obs_meter", "cn_fin_dtm"].includes(k) && !/Policarbonato|Polycarbonate/.test(CANOPY_STR.en[k]))).toEqual([]);
  });
});

describe("canopy sheet wiring", () => {
  it("new sheets start with a blank canopy, survive normalize and validate", () => {
    const d = newMeasureData("canopy", 0);
    expect(d.canopy?.finish).toBe("dtm");
    expect(d.canopy?.snow).toBe(true);
    d.canopy = entry();
    const back = normalizeMeasureData(JSON.parse(JSON.stringify(d)));
    expect(back.canopy).toEqual(d.canopy);
    const parsed = CanopySchema.parse(d.canopy);
    expect(parsed).toEqual(d.canopy);
  });
  it("normalize drops unknown values", () => {
    const c = normalizeCanopy({ kind: "zeppelin" as never, obstructions: ["light", "ufo"] as never, snow: undefined });
    expect(c.kind).toBe("");
    expect(c.obstructions).toEqual(["light"]);
    expect(c.snow).toBe(true);
  });
  it("runChecks and requiredGaps route the canopy shape", () => {
    const d = newMeasureData("canopy", 0);
    d.canopy = entry({ drain: "toward" });
    expect(runChecks(d, "canopy").some((c) => c.key === "canopy_slope_wall" && c.level === "red")).toBe(true);
    const gaps = requiredGaps(d, "canopy").map((g) => g.key);
    expect(gaps).toContain("photo");
    expect(requiredPhotoSlots("canopy")).toEqual(["cn_overall", "cn_wall", "cn_trim", "cn_grade"]);
  });
  it("is in the project setup work-type grid", () => {
    expect(sceneProjectOrder("exterior")).toContain("canopy");
    expect(sceneProjectOrder("interior")).toContain("canopy");
    expect(sceneProjectShape("canopy")).toBe("canopy");
  });
});

describe("canopy 3D adapter", () => {
  it("draws nothing until a kind is chosen", () => {
    const d = newMeasureData("canopy", 0);
    expect(canopyScene(d)).toEqual({ meshes: [], lines: [], pending: [] });
  });
  it("registers in the shape map and joins the measure scene", () => {
    expect(SCENE_SHAPES.canopy).toBe(canopyScene);
    expect(sceneShapeOf(newMeasureData("canopy", 0))).toBe("canopy");
    const d = newMeasureData("canopy", 0);
    d.canopy = entry();
    const s = measureScene(d);
    expect(s.meshes.some((m) => m.id === "canopy:front")).toBe(true);
    expect(s.lines.filter((l) => l.label === "Tie rod")).toHaveLength(2);
    expect(s.bounds.max.x).toBeGreaterThanOrEqual(72);
  });
  it("the frame follows the measured pitch and posts reach their own grade", () => {
    const d = newMeasureData("canopy", 0);
    const c = entry();
    setSupport(c, "posts");
    c.posts[0].height = "88";
    c.posts[1].height = "90";
    d.canopy = c;
    const s = canopyScene(d);
    const front = s.meshes.find((m) => m.id === "canopy:front")!;
    expect(Math.min(...front.vertices.map((v) => v.z))).toBeCloseTo(90);
    const ledger = s.meshes.find((m) => m.id === "canopy:ledger")!;
    expect(Math.max(...ledger.vertices.map((v) => v.z))).toBeCloseTo(92 + 6);
    const posts = s.meshes.filter((m) => m.kind === "post");
    expect(posts).toHaveLength(2);
    expect(posts.map((p) => Math.min(...p.vertices.map((v) => v.z)))).toEqual([2, 0]);
    expect(s.meshes.every((m) => !m.provisional)).toBe(true);
  });
  it("missing dimensions draw provisional at a typical size", () => {
    const d = newMeasureData("canopy", 0);
    d.canopy = blankCanopy();
    applyKind(d.canopy, "door_hood");
    const s = canopyScene(d);
    expect(s.pending).toEqual(["Canopy"]);
    expect(s.meshes.filter((m) => m.kind === "attached").every((m) => m.provisional)).toBe(true);
  });
  it("skylights draw a curb and frame, no wall", () => {
    const d = newMeasureData("canopy", 0);
    d.canopy = blankCanopy();
    applyKind(d.canopy, "skylight");
    const s = canopyScene(d);
    expect(s.meshes.map((m) => m.id)).toEqual(["canopy:curb", "canopy:frame", "canopy:roofing"]);
  });
});

describe("canopy Next-card walk", () => {
  it("walks width, projection, trim L/R, underside, fall, post heights, door trim", () => {
    const d = newMeasureData("canopy", 0);
    const c = blankCanopy();
    applyKind(c, "entry");
    setSupport(c, "posts");
    c.door.swing = "in";
    d.canopy = c;
    const q = measurementQueue(d, "canopy", requiredGaps(d, "canopy"));
    const ids = q.open.filter((i) => i.type === "slot").map((i) => i.id);
    expect(ids).toEqual([
      "cn.width", "cn.projection", "cn.soffitL", "cn.soffitR", "cn.mount", "cn.fall",
      `cn.post.${c.posts[0].id}`, `cn.post.${c.posts[1].id}`, "cn.doorHead",
    ]);
    q.slots[0].put(d, "72");
    expect(d.canopy?.width).toBe("72");
  });
  it("labels every slot in EN / PT / ES", () => {
    const d = newMeasureData("canopy", 0);
    d.canopy = entry();
    const q = measurementQueue(d, "canopy", []);
    expect(q.slots.length).toBeGreaterThan(6);
    for (const s of q.slots) for (const l of ["en", "pt", "es"] as const) expect(CANOPY_STR[l][s.labelKey], s.labelKey).toBeTruthy();
  });
});
