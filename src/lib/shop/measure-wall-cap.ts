// KIW Field Measure — railing on top of a wall (retaining wall, parapet, knee
// wall, roof edge).
//
// A wall-cap railing is not a stair rail: the posts land in a cap that is only
// a few inches wide, on a wall that steps, slopes and turns, with a drop on one
// side. The failures this sheet exists to prevent:
//
//   - a core drilled 2" from the face of a 10" cap, which spalls the cap the
//     first winter (edge distance is read at every post, both faces);
//   - a 5" base plate ordered for a 4" brick cap;
//   - a 36" guard on a wall with a 9' drop behind it at a commercial site;
//   - a run fabricated level for a wall that falls 6" end to end, because
//     nobody decided stepped or raked;
//   - posts cored through a roof membrane nobody said was there;
//   - posts set into loose cap stones.
//
// The wall is a chain of RUNS. Each run has a length and the turn at its start
// (from the run before), its rail style (stepped / raked) and the POSTS read
// along it. At every post: cap width, top of cap (elevation from the sheet
// datum), and the two edge distances from the core to each cap face.
//
// Everything here is pure: parsing, checks, gaps, fabrication numbers. UI lives
// in shapes/WallCapSections.tsx, print in shapes/WallCapPrint.tsx, 3D in
// scene-shapes/wall-cap.ts.

import { parseMeas } from "./measure-parse";
import type { CheckLevel, CheckResult, Gap } from "./measure-checks";
import type { MeasureData } from "./measure";
import type { Substrate } from "./measure-substrate";
import { codeLimits, effectiveCodeSettings, effectiveOccupancy } from "./measure-code";

// ---- Model ------------------------------------------------------------------

export const WC_KINDS = ["retaining", "parapet", "knee", "roof_edge"] as const;
export type WcKind = (typeof WC_KINDS)[number];

export const WC_MATERIALS = ["concrete", "precast", "stone", "brick", "block", "wood"] as const;
export type WcMaterial = (typeof WC_MATERIALS)[number];

/** core: post cored into the cap · side_high / side_low: fascia-mounted on that face · plate: base plate on the cap · clamp: no-penetration clamp / ballast. */
export const WC_MOUNTS = ["core", "plate", "side_high", "side_low", "clamp"] as const;
export type WcMount = (typeof WC_MOUNTS)[number];

export const WC_RAILS = ["raked", "stepped"] as const;
export type WcRail = (typeof WC_RAILS)[number];

export const WC_FINISHES = ["dtm", "galvanized", "powder", "galv_powder"] as const;
export const WC_PHOTO_SLOTS = ["wc_overall", "wc_cap", "wc_drop", "wc_ends"] as const;

export type YesNo = "" | "yes" | "no";

export interface WallCapPost {
  id: string;
  /** Distance from the start of its run (blank = spaced evenly in drawings). */
  at: string;
  /** Cap width, face to face, at this post. */
  capWidth: string;
  /** Top of cap, from the sheet datum. "-2 1/2" is below the datum. */
  top: string;
  /** Core centre to the high-side face of the cap. */
  edgeHigh: string;
  /** Core centre to the low-side (drop) face of the cap. */
  edgeLow: string;
  /** Only when this post's cap differs from the wall's ("" = same). */
  material: "" | WcMaterial;
  /** Shared mounting model (measure-substrate): material, condition, hidden services, anchor. */
  sub?: Substrate;
}

export interface WallCapRun {
  id: string;
  /** Run length along the wall, end to end (horizontal). */
  length: string;
  /** Turn at the start of this run from the run before, degrees. */
  turn: string;
  turnDir: "" | "left" | "right";
  rail: "" | WcRail;
  posts: WallCapPost[];
}

export interface WallCapData {
  kind: "" | WcKind;
  material: "" | WcMaterial;
  /** Which side of the wall falls away, looking from run 1 start along the wall. */
  dropSide: "" | "left" | "right";
  /** Low-side grade to top of cap (the drop a person would fall). */
  drop: string;
  /** Top of cap above the walking surface on the high side (0 for a flush retaining wall). */
  capAboveWalk: string;
  /** Top of rail above top of cap. */
  railHeight: string;
  occupancy: "" | "residential" | "commercial";
  datum: string;
  mount: "" | WcMount;
  coreDia: string;
  coreDepth: string;
  plateSize: string;
  /** Fascia mount: depth of solid wall face below the cap the brackets bolt into. */
  faceDepth: string;
  loose: YesNo;
  cracked: YesNo;
  /** Roof edge only. */
  membrane: YesNo;
  noPenetration: YesNo;
  flashBy: "" | "roofer" | "kiw" | "others";
  runs: WallCapRun[];
  finish: "" | (typeof WC_FINISHES)[number];
  color: string;
  notes: string;
}

let seq = 0;
function wid(p: string): string {
  seq = (seq + 1) % 1e6;
  return `${p}${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function newWallCapPost(from?: Partial<WallCapPost>): WallCapPost {
  return { at: "", capWidth: "", top: "", edgeHigh: "", edgeLow: "", material: "", ...from, id: wid("wp") };
}

export function newWallCapRun(posts = 2, from?: Partial<WallCapRun>): WallCapRun {
  return {
    length: "",
    turn: "",
    turnDir: "",
    rail: "",
    ...from,
    id: wid("wr"),
    posts: Array.from({ length: posts }, () => newWallCapPost()),
  };
}

export function blankWallCap(): WallCapData {
  return {
    kind: "",
    material: "",
    dropSide: "",
    drop: "",
    capAboveWalk: "",
    railHeight: "",
    occupancy: "",
    datum: "",
    mount: "",
    coreDia: "",
    coreDepth: "",
    plateSize: "",
    faceDepth: "",
    loose: "",
    cracked: "",
    membrane: "",
    noPenetration: "",
    flashBy: "",
    runs: [newWallCapRun(2)],
    finish: "dtm",
    color: "",
    notes: "",
  };
}

export function normalizeWallCap(raw: Partial<WallCapData>): WallCapData {
  const b = blankWallCap();
  return {
    ...b,
    ...raw,
    runs: (raw.runs || b.runs).map((r) => ({
      ...newWallCapRun(0),
      ...r,
      posts: (r.posts || []).map((p) => ({ ...newWallCapPost(), ...p })),
    })),
  };
}

// ---- Arithmetic --------------------------------------------------------------

/** parseMeas with a leading minus (elevations below the datum). */
export function signedMeas(s: string | null | undefined): number | null {
  const t = (s || "").trim();
  if (!t) return null;
  const neg = /^[-−–]/.test(t);
  const n = parseMeas(neg ? t.slice(1) : t);
  return n === null ? null : neg ? -n : n;
}

export const WC_TOL = {
  /** Minimum core-to-face edge distance (shop rule). Under it is red. */
  edgeMin: 3,
  /** Edge + core + edge vs cap width: a misread tape. */
  widthSum: { green: 0.25, yellow: 0.5 },
  /** Top-of-cap change along a run before stepped / raked must be decided. */
  slope: 0.5,
  /** Plate must leave this much cap each side of it. */
  plateMargin: 0,
};

export function postsOf(w: WallCapData): { run: number; post: number; p: WallCapPost; mark: string }[] {
  const out: { run: number; post: number; p: WallCapPost; mark: string }[] = [];
  let n = 0;
  w.runs.forEach((r, ri) => r.posts.forEach((p, pi) => out.push({ run: ri, post: pi, p, mark: `P${++n}` })));
  return out;
}

export function runTag(i: number): string {
  return `R${i + 1}`;
}

/** Plate footprint across the cap: first number of "5x5x1/2" / "4 x 6". */
export function plateWidth(size: string): number | null {
  const parts = size.toLowerCase().replaceAll("×", "x").split("x").map((s) => parseMeas(s.trim()));
  if (!parts.length || parts[0] === null) return null;
  return parts[0];
}

/** Top-of-cap rise across a run, from its first to its last measured post. */
/** Top of cap at the corner a run starts from: the last post of the run before. */
export function cornerTop(w: WallCapData, i: number): number | null {
  for (let k = i - 1; k >= 0; k--) {
    const ps = w.runs[k].posts;
    if (ps.length) return signedMeas(ps[ps.length - 1].top);
  }
  return null;
}

export function runRise(r: WallCapRun, corner: number | null = null): { rise: number; min: number; max: number; count: number } | null {
  const tops = [corner, ...r.posts.map((p) => signedMeas(p.top))].filter((n): n is number => n !== null);
  if (tops.length < 2) return null;
  const min = Math.min(...tops), max = Math.max(...tops);
  return { rise: max - min, min, max, count: tops.length };
}

/** A run whose cap moves more than the slope tolerance needs a stepped / raked decision. */
export function runSloped(r: WallCapRun, corner: number | null = null): boolean {
  const rr = runRise(r, corner);
  return !!rr && rr.rise > WC_TOL.slope;
}

/**
 * Positions of each post along its run: measured where given, else evenly
 * spaced. The first run starts with a post; every later run starts at a corner
 * whose post belongs to the run before, so its own posts are spaced up to its end.
 */
export function postStations(r: WallCapRun, afterCorner = false): number[] {
  const len = parseMeas(r.length);
  const n = r.posts.length;
  return r.posts.map((p, i) => {
    const at = parseMeas(p.at);
    if (at !== null) return at;
    // An unmeasured run draws at a typical 8'.
    const L = len ?? 96;
    if (afterCorner) return (L * (i + 1)) / n;
    return n <= 1 ? 0 : (L * i) / (n - 1);
  });
}

/** Every post in wall order with its run, so the rail runs on round the corners. */
export function railSegments(w: WallCapData): { from: number; to: number; run: number }[] {
  const all = postsOf(w);
  const out: { from: number; to: number; run: number }[] = [];
  for (let i = 1; i < all.length; i++) out.push({ from: i - 1, to: i, run: all[i].run });
  return out;
}

/** Rail length on a run: raked follows the slope of the cap; stepped stays level. */
export function runRailLength(r: WallCapRun, corner: number | null = null): number | null {
  const len = parseMeas(r.length);
  if (len === null) return null;
  const rr = runRise(r, corner);
  if (r.rail === "raked" && rr) return Math.hypot(len, rr.rise);
  return len;
}

/** Required guard height (code limits for the sheet), or null when the drop does not require a guard. */
export function guardRequirement(w: Pick<WallCapData, "drop">, limits: WcLimits): { required: number | null; drop: number | null } {
  const drop = parseMeas(w.drop);
  if (drop === null || drop <= limits.guardDrop) return { required: null, drop };
  return { required: limits.guardHeight, drop };
}

/** Guard height a person standing on the high side sees: cap above walk + rail above cap. */
export function guardHeight(w: Pick<WallCapData, "capAboveWalk" | "railHeight">): number | null {
  const rail = parseMeas(w.railHeight);
  if (rail === null) return null;
  return (parseMeas(w.capAboveWalk) ?? 0) + rail;
}

/** Post cut length: rail above cap, plus the embed when cored. */
export function postCut(w: WallCapData): { length: number | null; parts: { key: string; value: number }[] } {
  const rail = parseMeas(w.railHeight);
  if (rail === null) return { length: null, parts: [] };
  const parts = [{ key: "rail", value: rail }];
  if (w.mount === "core") {
    const d = parseMeas(w.coreDepth);
    if (d !== null) parts.push({ key: "embed", value: d });
  }
  if (w.mount === "side_high" || w.mount === "side_low") {
    const d = parseMeas(w.faceDepth);
    if (d !== null) parts.push({ key: "face", value: d });
  }
  return { length: parts.reduce((s, p) => s + p.value, 0), parts };
}

export function isPenetrating(m: WallCapData["mount"]): boolean {
  return m === "core" || m === "plate" || m === "side_high" || m === "side_low";
}

export interface WallCapSummary {
  posts: number;
  runs: number;
  railLength: number | null;
  totalLength: number | null;
  maxRise: number | null;
  minCap: number | null;
}

export function wallCapSummary(w: WallCapData | null | undefined): WallCapSummary {
  if (!w) return { posts: 0, runs: 0, railLength: null, totalLength: null, maxRise: null, minCap: null };
  let rail = 0, total = 0, railOk = true, totalOk = true;
  let maxRise: number | null = null;
  for (const [i, r] of w.runs.entries()) {
    const rl = runRailLength(r, cornerTop(w, i)), l = parseMeas(r.length);
    if (rl === null) railOk = false; else rail += rl;
    if (l === null) totalOk = false; else total += l;
    const rr = runRise(r, cornerTop(w, i));
    if (rr) maxRise = Math.max(maxRise ?? 0, rr.rise);
  }
  const caps = postsOf(w).map((x) => parseMeas(x.p.capWidth)).filter((n): n is number => n !== null);
  return {
    posts: postsOf(w).length,
    runs: w.runs.length,
    railLength: w.runs.length && railOk ? rail : null,
    totalLength: w.runs.length && totalOk ? total : null,
    maxRise,
    minCap: caps.length ? Math.min(...caps) : null,
  };
}

// ---- Checks -------------------------------------------------------------------

function cr(key: string, level: CheckLevel, expected: number | null, actual: number | null, detail?: string): CheckResult {
  return { key, level, expected, actual, delta: expected !== null && actual !== null ? actual - expected : null, unit: "in", detail };
}

export interface WcLimits {
  guardDrop: number;
  guardHeight: number;
}
export const WC_DEFAULT_LIMITS: WcLimits = { guardDrop: 30, guardHeight: 36 };

/** Guard limits from the sheet's code profile; the wall's own occupancy wins when set. */
export function wallCapLimits(data: MeasureData, orgDefault?: string | null): WcLimits {
  const s = effectiveCodeSettings(data, orgDefault);
  const occ = data.wallCap?.occupancy || effectiveOccupancy(data, s);
  const lim = codeLimits(s, occ);
  return { guardDrop: lim.guardDrop, guardHeight: lim.guardHeight };
}

export function wallCapChecks(w: WallCapData | null | undefined, limits: WcLimits = WC_DEFAULT_LIMITS): CheckResult[] {
  const out: CheckResult[] = [];
  if (!w) return out;
  const posts = postsOf(w);
  const core = w.mount === "core";
  const dia = parseMeas(w.coreDia);

  for (const { p, mark } of posts) {
    const cap = parseMeas(p.capWidth);
    if (core) {
      for (const [k, side] of [["edgeHigh", "high"], ["edgeLow", "low"]] as const) {
        const e = parseMeas(p[k]);
        if (e === null) continue;
        out.push(cr("wc_edge", e < WC_TOL.edgeMin ? "red" : "green", WC_TOL.edgeMin, e, `${mark} ${side === "high" ? "▲" : "▼"}`));
      }
      // Both edge distances are to the core centre: together they are the cap width.
      const eh = parseMeas(p.edgeHigh), el = parseMeas(p.edgeLow);
      if (cap !== null && eh !== null && el !== null) {
        const d = Math.abs(eh + el - cap);
        out.push(cr("wc_edge_sum", d <= WC_TOL.widthSum.green ? "green" : d <= WC_TOL.widthSum.yellow ? "yellow" : "red", cap, eh + el, mark));
      }
      // The core has to fit in the cap at all.
      if (cap !== null && dia !== null && dia + 2 * WC_TOL.edgeMin > cap) {
        out.push(cr("wc_cap_narrow_core", "red", dia + 2 * WC_TOL.edgeMin, cap, mark));
      }
    }
    if (w.mount === "plate") {
      const pw = plateWidth(w.plateSize);
      if (cap !== null && pw !== null) out.push(cr("wc_plate_fit", pw > cap ? "red" : "green", cap, pw, mark));
    }
  }

  // Guard height against the drop.
  const req = guardRequirement(w, limits);
  const have = guardHeight(w);
  if (req.required !== null && have !== null) {
    out.push(cr("wc_guard_height", have + 1e-9 < req.required ? "red" : "green", req.required, have));
  }

  // Each run that slopes or steps needs a decision before anything is bent.
  w.runs.forEach((r, i) => {
    const rr = runRise(r, cornerTop(w, i));
    if (!rr) return;
    if (rr.rise > WC_TOL.slope) out.push(cr("wc_slope_decision", r.rail ? "green" : "red", WC_TOL.slope, rr.rise, runTag(i)));
  });

  // Loose or cracked caps: coring into them is how a rail comes out in a year.
  if (w.loose === "yes") out.push(cr("wc_loose", core || w.mount === "plate" ? "red" : "yellow", null, null));
  if (w.cracked === "yes") out.push(cr("wc_cracked", "yellow", null, null));

  // Roof edge: never penetrate a membrane without saying who flashes it.
  if (w.kind === "roof_edge" && w.membrane === "yes") {
    if (w.noPenetration === "yes" && isPenetrating(w.mount)) out.push(cr("wc_membrane", "red", null, null));
    else if (isPenetrating(w.mount)) out.push(cr("wc_membrane", w.flashBy ? "yellow" : "red", null, null));
  }
  return out;
}

// ---- What the sheet still needs ---------------------------------------------

export function wallCapGaps(w: WallCapData | null | undefined): Gap[] {
  const gaps: Gap[] = [];
  const has = (s: string | undefined | null) => !!s && s.trim() !== "";
  if (!w) return [{ key: "wc_missing" }];
  if (!has(w.kind)) gaps.push({ key: "wc_kind" });
  if (!has(w.material)) gaps.push({ key: "wc_material" });
  if (!has(w.dropSide)) gaps.push({ key: "wc_drop_side" });
  if (!has(w.drop)) gaps.push({ key: "wc_drop" });
  if (!has(w.railHeight)) gaps.push({ key: "wc_rail_height" });
  if (!has(w.mount)) gaps.push({ key: "wc_mount" });
  if (w.mount === "core") {
    if (!has(w.coreDia)) gaps.push({ key: "wc_core_dia" });
    if (!has(w.coreDepth)) gaps.push({ key: "wc_core_depth" });
  }
  if (w.mount === "plate" && !has(w.plateSize)) gaps.push({ key: "wc_plate" });
  if ((w.mount === "side_high" || w.mount === "side_low") && !has(w.faceDepth)) gaps.push({ key: "wc_face_depth" });
  if (!has(w.loose) || !has(w.cracked)) gaps.push({ key: "wc_condition" });
  if (w.kind === "roof_edge") {
    if (!has(w.membrane)) gaps.push({ key: "wc_membrane" });
    else if (w.membrane === "yes" && !has(w.noPenetration)) gaps.push({ key: "wc_no_penetration" });
  }
  if (!w.runs.length) gaps.push({ key: "wc_runs" });
  w.runs.forEach((r, i) => {
    if (!has(r.length)) gaps.push({ key: "wc_run_length", detail: runTag(i) });
    if (i > 0 && (!has(r.turn) || !has(r.turnDir))) gaps.push({ key: "wc_turn", detail: runTag(i) });
    if (runSloped(r, cornerTop(w, i)) && !r.rail) gaps.push({ key: "wc_rail_style", detail: runTag(i) });
  });
  for (const { p, mark } of postsOf(w)) {
    if (!has(p.capWidth)) gaps.push({ key: "wc_cap_width", detail: mark });
    if (!has(p.top)) gaps.push({ key: "wc_top", detail: mark });
    if (w.mount === "core" && (!has(p.edgeHigh) || !has(p.edgeLow))) gaps.push({ key: "wc_edges", detail: mark });
  }
  if (postsOf(w).some((x) => has(x.p.top)) && !has(w.datum)) gaps.push({ key: "wc_datum", tier: "doc" });
  if (!has(w.finish)) gaps.push({ key: "wc_finish", tier: "doc" });
  return gaps;
}

/** Values that count toward the sheet's completeness badge. */
export function wallCapProgressValues(w: WallCapData): string[] {
  const vals: string[] = [w.kind, w.material, w.dropSide, w.drop, w.railHeight, w.mount, w.loose, w.cracked];
  for (const r of w.runs) {
    vals.push(r.length);
    for (const p of r.posts) vals.push(p.capWidth, p.top, ...(w.mount === "core" ? [p.edgeHigh, p.edgeLow] : []));
  }
  return vals;
}
