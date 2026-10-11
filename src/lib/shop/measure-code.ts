// Code compliance engine for measure sheets.
//
// A shop sells railings into more than one jurisdiction, so the limits are not
// hard-wired: a sheet carries a CODE PROFILE (which book) and an OCCUPANCY
// (residential / commercial), and every rule reads its numbers from the limits
// that pair resolves to. A "custom" profile starts from a model-code base and
// lets the shop override the handful of limits local amendments usually touch.
//
// Every rule:
//   - runs ONLY when the inputs it needs were actually measured — it never
//     invents a drop, a height or a spacing;
//   - returns green / yellow / red with the measured value, the limit and a
//     one-line citation;
//   - is red only when the measured number definitively violates the limit.
//     Where the field data cannot settle it (an unguarded deck side that may be
//     the house wall, a triangle opening that a stringer may close), it is
//     yellow — "verify" — and never blocks anything.
//
// Code results are advisory. They never change a field and never block
// submission: a railing contractor is regularly hired to put a rail on an
// existing stair whose risers were built to an older code.
//
// Sources (model codes as published by the ICC; MA amendments as noted):
//   IRC 2021  R311.7.5.1 risers ≤ 7-3/4", R311.7.5.2 treads ≥ 10", variation
//             ≤ 3/8" (both sections); R311.7.5.2.1 winders 10" at walkline,
//             6" min; R311.7.8 handrail on flights with ≥ 4 risers;
//             R311.7.8.1 handrail 34–38"; R311.7.8.5 graspability (Type I:
//             round 1-1/4"–2" OD, non-round perimeter 4"–6-1/4" with max
//             cross-section 2-1/4"); R311.7.10.1 spiral (26" clear width,
//             6-3/4" tread at the walkline 12" from the narrow edge, risers
//             ≤ 9-1/2", 78" headroom); R311.8.1 ramp slope ≤ 1:12;
//             R311.8.2 ramp landings ≥ 3'×3'; R312.1.1 guards where the drop
//             is > 30"; R312.1.2 guard 36" (34" on open sides of stairs from
//             the nosing line); R312.1.3 openings: 4" sphere, 4-3/8" on stair
//             open sides, 6" triangle at riser/tread/bottom rail;
//             R310.4.2 area wells deeper than 44" need a permanent ladder
//             (rungs ≥ 12" wide, ≥ 3" off the wall, ≤ 18" o.c.).
//   IBC 2021  1011.5.2 risers 4"–7", treads ≥ 11" (winders 11" at walkline,
//             10" min); 1011.5.4 variation ≤ 3/8"; 1011.10 spiral; 1012.2
//             ramp slope ≤ 1:12; 1012.4 ramp rise ≤ 30" per run; 1012.6.3
//             landing ≥ 60" long; 1014.2 handrail 34–38"; 1014.3 graspability;
//             1015.2 guards where drop > 30"; 1015.3 guard ≥ 42" (stairs
//             measured from the nosing line); 1015.4 openings 4" sphere
//             (4-3/8" only inside dwelling units), 6" triangle;
//             1031.5.2 area-well ladders (> 44" deep).
//   ADA 2010  405.2 slope ≤ 1:12, 405.6 rise ≤ 30", 405.7.3 landing ≥ 60".
//   ISPSC 2021 (pool barriers, referenced by IRC R326 / IBC 3109)
//             305.2.1 barrier ≥ 48" high, bottom gap ≤ 2" (≤ 4" over a solid
//             surface); 305.2 openings 4" sphere; 305.3 gates open outward
//             away from the pool, self-closing and self-latching, release
//             < 54" from grade only on the pool side.
//   OSHA 1910.28(b)(9) fixed ladders over 24 ft need a ladder safety or
//             personal fall-arrest system (cages over 20 ft under the
//             superseded 1910.27 / ANSI A14.3 rule).
//   780 CMR   Massachusetts 10th edition: residential = IRC 2021 as amended
//             (51.00), commercial = IBC 2021 as amended. MA's residential
//             amendment keeps the long-standing 8-1/4" riser / 9" tread
//             (780 CMR R311.7.5.1 / R311.7.5.2). VERIFY against the current
//             amendment set with the local building official; a shop that
//             wants the stricter IRC numbers picks the IRC profile or a custom
//             override.

import { parseMeas } from "./measure-parse";
import type { FlightSegment, MeasureData, MeasureShape, StepMeasure } from "./measure";

// ---- Profiles ---------------------------------------------------------------

export type CodeProfileId = "ma780" | "irc2021" | "ibc2021" | "custom";
export type CodeBaseId = Exclude<CodeProfileId, "custom">;
export const CODE_PROFILES: CodeProfileId[] = ["ma780", "irc2021", "ibc2021", "custom"];
export const CODE_BASES: CodeBaseId[] = ["ma780", "irc2021", "ibc2021"];
export type Occupancy = "residential" | "commercial";
export const DEFAULT_CODE_PROFILE: CodeProfileId = "ma780";

/** The limits a shop most often has to change for a local amendment. */
export const CODE_OVERRIDE_KEYS = [
  "guardHeight",
  "stairGuardHeight",
  "handrailMin",
  "handrailMax",
  "riserMax",
  "treadMin",
  "sphere",
] as const;
export type CodeOverrideKey = (typeof CODE_OVERRIDE_KEYS)[number];

/** Stored on the sheet as `data.code`. Overrides are field text ("36", "7 3/4"). */
export interface CodeSettings {
  profile: CodeProfileId;
  occupancy: "" | Occupancy; // "" = follow the deck's occupancy / the profile default
  base?: CodeBaseId; // custom profiles: which book the overrides start from
  overrides?: Partial<Record<CodeOverrideKey, string>>;
}

export interface CodeLimits {
  guardDrop: number; // guard required when the drop exceeds this
  guardHeight: number; // level walking surfaces
  stairGuardHeight: number; // open sides of stairs, from the nosing line
  handrailMin: number;
  handrailMax: number;
  handrailMinRisers: number; // flights with this many risers need a handrail
  riserMax: number;
  riserMin: number | null;
  treadMin: number;
  stepVariation: number;
  winderWalkline: number;
  winderNarrow: number;
  sphere: number;
  stairSphere: number;
  triangle: number;
  rampSlope: number; // rise / run
  rampRiseMax: number | null; // per run; residential codes set none
  rampLanding: number;
  poolBarrier: number;
  poolGapSoft: number;
  poolGapHard: number;
  poolLatch: number;
  wellLadderDepth: number;
  wellLadderWidth: number;
  wellLadderStandoff: number;
  wellLadderSpacing: number;
  spiralWidth: number;
  spiralTread: number;
  spiralRiser: number;
  spiralWalkline: number;
  ladderCage: number; // inches
  ladderFallArrest: number; // inches
}

// IRC 2021 residential (R311, R312, R310.4)
const IRC_RES: CodeLimits = {
  guardDrop: 30,
  guardHeight: 36,
  stairGuardHeight: 34,
  handrailMin: 34,
  handrailMax: 38,
  handrailMinRisers: 4,
  riserMax: 7.75,
  riserMin: null,
  treadMin: 10,
  stepVariation: 0.375,
  winderWalkline: 10,
  winderNarrow: 6,
  sphere: 4,
  stairSphere: 4.375,
  triangle: 6,
  rampSlope: 1 / 12,
  rampRiseMax: null,
  rampLanding: 36,
  poolBarrier: 48,
  poolGapSoft: 2,
  poolGapHard: 4,
  poolLatch: 54,
  wellLadderDepth: 44,
  wellLadderWidth: 12,
  wellLadderStandoff: 3,
  wellLadderSpacing: 18,
  spiralWidth: 26,
  spiralTread: 6.75,
  spiralRiser: 9.5,
  spiralWalkline: 12,
  ladderCage: 240,
  ladderFallArrest: 288,
};

// IBC 2021 / ADA 2010 commercial (1011, 1012, 1014, 1015, 1031.5)
const IBC_COM: CodeLimits = {
  ...IRC_RES,
  guardHeight: 42,
  stairGuardHeight: 42,
  riserMax: 7,
  riserMin: 4,
  treadMin: 11,
  winderWalkline: 11,
  winderNarrow: 10,
  stairSphere: 4, // 4-3/8" is allowed only inside dwelling units (1015.4 exc. 6)
  rampRiseMax: 30,
  rampLanding: 60,
};

// 780 CMR 51.00 residential amendment: 8-1/4" riser, 9" tread (see header).
const MA_RES: CodeLimits = { ...IRC_RES, riserMax: 8.25, treadMin: 9 };

export function profileDefaultOccupancy(p: CodeProfileId, base?: CodeBaseId): Occupancy {
  const b = p === "custom" ? base || "ma780" : p;
  return b === "ibc2021" ? "commercial" : "residential";
}

/** The settings in force for this sheet: its own, else the org default. */
export function effectiveCodeSettings(data: MeasureData, orgDefault?: string | null): CodeSettings {
  const own = data.code;
  const fallback: CodeProfileId = CODE_PROFILES.includes(orgDefault as CodeProfileId)
    ? (orgDefault as CodeProfileId)
    : DEFAULT_CODE_PROFILE;
  return {
    profile: own?.profile && CODE_PROFILES.includes(own.profile) ? own.profile : fallback,
    occupancy: own?.occupancy || "",
    base: own?.base,
    overrides: own?.overrides,
  };
}

export function effectiveOccupancy(data: MeasureData, s: CodeSettings): Occupancy {
  if (s.occupancy) return s.occupancy;
  if (data.deck?.occupancy) return data.deck.occupancy;
  return profileDefaultOccupancy(s.profile, s.base);
}

export function codeLimits(s: CodeSettings, occ: Occupancy): CodeLimits {
  const base: CodeBaseId = s.profile === "custom" ? s.base || "ma780" : s.profile;
  let lim: CodeLimits;
  if (occ === "commercial") lim = { ...IBC_COM };
  else lim = base === "ma780" ? { ...MA_RES } : { ...IRC_RES };
  if (s.profile === "custom" && s.overrides) {
    for (const k of CODE_OVERRIDE_KEYS) {
      const v = parseMeas(s.overrides[k] || "");
      if (v !== null && v > 0) lim[k] = v;
    }
  }
  return lim;
}

// ---- Citations ---------------------------------------------------------------

type CiteKey =
  | "guardReq" | "guardH" | "openings" | "handrailReq" | "handrailH" | "grasp"
  | "riser" | "tread" | "winder" | "spiral" | "rampSlope" | "rampRise" | "rampLanding"
  | "pool" | "poolGate" | "well" | "ladder";

const IRC_CITE: Record<CiteKey, string> = {
  guardReq: "R312.1.1", guardH: "R312.1.2", openings: "R312.1.3", handrailReq: "R311.7.8",
  handrailH: "R311.7.8.1", grasp: "R311.7.8.5", riser: "R311.7.5.1", tread: "R311.7.5.2",
  winder: "R311.7.5.2.1", spiral: "R311.7.10.1", rampSlope: "R311.8.1", rampRise: "R311.8.1",
  rampLanding: "R311.8.2", pool: "ISPSC 305.2", poolGate: "ISPSC 305.3", well: "R310.4.2",
  ladder: "OSHA 1910.28(b)(9)",
};
const IBC_CITE: Record<CiteKey, string> = {
  guardReq: "1015.2", guardH: "1015.3", openings: "1015.4", handrailReq: "1014.1",
  handrailH: "1014.2", grasp: "1014.3", riser: "1011.5.2", tread: "1011.5.2",
  winder: "1011.5.2", spiral: "1011.10", rampSlope: "1012.2", rampRise: "1012.4",
  rampLanding: "1012.6.3", pool: "ISPSC 305.2", poolGate: "ISPSC 305.3", well: "1031.5.2",
  ladder: "OSHA 1910.28(b)(9)",
};

export function codeCite(s: CodeSettings, occ: Occupancy, key: CiteKey): string {
  const sec = (occ === "commercial" ? IBC_CITE : IRC_CITE)[key];
  if (sec.startsWith("ISPSC") || sec.startsWith("OSHA")) return sec;
  const base = s.profile === "custom" ? s.base || "ma780" : s.profile;
  if (base === "ma780") return `780 CMR ${sec}`;
  if (occ === "commercial") return `IBC ${sec}`;
  return `IRC ${sec}`;
}

// ---- Results -------------------------------------------------------------------

export type CodeLevel = "green" | "yellow" | "red";

export type CodeRule =
  | "guard_required"
  | "guard_height"
  | "stair_guard_height"
  | "handrail_required"
  | "handrail_height"
  | "handrail_grasp"
  | "riser_max"
  | "riser_min"
  | "tread_min"
  | "riser_variation"
  | "tread_variation"
  | "winder_walkline"
  | "winder_narrow"
  | "infill_opening"
  | "stair_infill_opening"
  | "landing_infill_opening"
  | "bottom_clearance"
  | "stair_triangle"
  | "ramp_slope"
  | "ramp_rise"
  | "ramp_landing"
  | "pool_height"
  | "pool_gap"
  | "pool_infill"
  | "pool_swing"
  | "pool_latch"
  | "well_ladder"
  | "well_ladder_width"
  | "well_ladder_standoff"
  | "well_ladder_spacing"
  | "spiral_width"
  | "spiral_riser"
  | "spiral_tread"
  | "fixed_ladder";

export interface CodeResult {
  rule: CodeRule;
  level: CodeLevel;
  /** Measured / derived value (inches unless unit says otherwise). */
  actual: number | null;
  /** max = actual must not exceed limit; min = must reach it; range = limit..limit2;
   *  check = a yes/no condition (limit unused). */
  op: "max" | "min" | "range" | "check";
  limit: number | null;
  limit2?: number;
  unit: "in" | "ratio" | "ft";
  cite: string;
  /** Where on the sheet: flight / side / level tag. */
  detail?: string;
  /** i18n key (code_note_<note>) for why the result is yellow / the condition. */
  note?: string;
}

export interface CodeReport {
  settings: CodeSettings;
  occupancy: Occupancy;
  limits: CodeLimits;
  results: CodeResult[];
  counts: { red: number; yellow: number; green: number };
}

const EPS = 1e-6;

function gradeMax(actual: number, limit: number): CodeLevel {
  return actual <= limit + EPS ? "green" : "red";
}
function gradeMin(actual: number, limit: number): CodeLevel {
  return actual >= limit - EPS ? "green" : "red";
}
const num = (v: string | undefined | null): number | null => {
  if (v === undefined || v === null || v.trim() === "") return null;
  return parseMeas(v);
};
const pos = (v: string | undefined | null): number | null => {
  const n = num(v);
  return n !== null && n > 0 ? n : null;
};

// Shapes whose rail spec (data.rail) describes a stair / level railing.
const RAIL_SHAPES: MeasureShape[] = [
  "straight", "stair_platform", "l_shape", "u_shape", "builder", "level_run", "ramp", "wall_rail", "custom",
];

type RailRole = { guard: boolean; handrail: boolean };
function railRole(data: MeasureData, shape: MeasureShape): RailRole {
  if (shape === "wall_rail") return { guard: false, handrail: true };
  const k = (data.rail.kind || "").toLowerCase();
  if (k === "both") return { guard: true, handrail: true };
  if (k === "handrail") return { guard: false, handrail: true };
  if (k === "guardrail") return { guard: true, handrail: false };
  return { guard: false, handrail: false };
}

interface FlightSteps {
  tag: string;
  risers: number[];
  treads: number[]; // non-winder going, nose to nose
  winders: { walk: number | null; narrow: number | null }[];
  count: number; // riser count, measured or not
}

function flightSteps(steps: StepMeasure[], tag: string): FlightSteps {
  const risers: number[] = [];
  const treads: number[] = [];
  const winders: FlightSteps["winders"] = [];
  for (const st of steps) {
    const r = pos(st.rise);
    if (r !== null) risers.push(r);
    if (st.winder) {
      const w = pos(st.run);
      const n = pos(st.runIn);
      if (w !== null || n !== null) winders.push({ walk: w, narrow: n });
    } else {
      // A blank or zero going is the top step landing on the floor, not a tread.
      const u = pos(st.run);
      if (u !== null) treads.push(u);
    }
  }
  return { tag, risers, treads, winders, count: steps.length };
}

function collectFlights(data: MeasureData): FlightSteps[] {
  const flights = data.segments.filter((s) => s.kind === "flight") as FlightSegment[];
  const out = flights.map((fl, i) => flightSteps(fl.steps, flights.length > 1 ? `#${i + 1}` : ""));
  // Drawn (custom / deck) runs: a typed flight line carries either its
  // per-step corrections or one typical rise/run.
  const paths = data.plan?.paths?.length ? data.plan.paths : data.plan?.segs?.length ? [{ segs: data.plan.segs }] : [];
  let n = out.length;
  for (const p of paths) {
    for (const sg of p.segs || []) {
      if (sg.kind !== "flight") continue;
      n += 1;
      const tag = `#${n}`;
      if (sg.stepMeasures && sg.stepMeasures.some((s) => (s.rise || "").trim() || (s.run || "").trim())) {
        out.push(flightSteps(sg.stepMeasures, tag));
      } else {
        const steps = pos(sg.steps);
        out.push({
          tag,
          risers: pos(sg.rise) !== null ? [pos(sg.rise)!] : [],
          treads: pos(sg.run) !== null ? [pos(sg.run)!] : [],
          winders: [],
          count: steps !== null ? Math.round(steps) : 0,
        });
      }
    }
  }
  return out;
}

/** Largest sphere through the triangle a stair's riser, tread and bottom rail
 *  make. The bottom rail runs parallel to the nosing line, `c` above it
 *  (vertically), so the triangle is the rise/run triangle scaled by
 *  (rise + c) / rise; a right triangle's incircle diameter is a + b − h. */
export function stairTriangleSphere(rise: number, run: number, clearance: number): number | null {
  if (rise <= 0 || run <= 0 || clearance < 0) return null;
  const k = (rise + clearance) / rise;
  return k * (rise + run - Math.hypot(rise, run));
}

/** Graspability from a profile description: returns null when it can't tell. */
export function handrailProfile(text: string): { kind: "round"; od: number } | { kind: "other"; perimeter: number; maxDim: number } | null {
  const t = (text || "").toLowerCase().replace(/[”″]/g, '"');
  if (!t.trim()) return null;
  const n = (s: string) => parseMeas(s.replace(/-/g, " ").trim());
  const lead = t.match(/^\s*([\d\s\-\/\.]+)"?/);
  // Schedule pipe: nominal size → actual OD.
  if (/\bpipe\b|sch\s*\d|schedule/.test(t) && lead) {
    const nom = n(lead[1]);
    const OD: Record<string, number> = { "0.75": 1.05, "1": 1.315, "1.25": 1.66, "1.5": 1.9, "2": 2.375, "2.5": 2.875 };
    if (nom !== null && OD[String(nom)]) return { kind: "round", od: OD[String(nom)] };
    return null;
  }
  const rect = t.match(/([\d\s\-\/\.]+)"?\s*x\s*([\d\s\-\/\.]+)"?/);
  if (rect && /tube|rect|flat|bar/.test(t)) {
    const a = n(rect[1]);
    const b = n(rect[2]);
    if (a !== null && b !== null && a > 0 && b > 0) return { kind: "other", perimeter: 2 * (a + b), maxDim: Math.max(a, b) };
    return null;
  }
  if (/\bsq\b|square/.test(t) && lead) {
    const s = n(lead[1]);
    if (s !== null && s > 0) return { kind: "other", perimeter: 4 * s, maxDim: s };
    return null;
  }
  if (/round|rod|\bod\b/.test(t) && lead) {
    const d = n(lead[1]);
    if (d !== null && d > 0) return { kind: "round", od: d };
  }
  return null;
}

const HARD_SURFACE = /concrete|asphalt|paver|stone|granite|brick|tile|cimento|concreto|asfalto|pedra/i;

// ---- Engine ----------------------------------------------------------------------

export function codeCheck(data: MeasureData, shape: MeasureShape, orgDefault?: string | null): CodeReport {
  const s = effectiveCodeSettings(data, orgDefault);
  const occ = effectiveOccupancy(data, s);
  const L = codeLimits(s, occ);
  const cite = (k: CiteKey) => codeCite(s, occ, k);
  const out: CodeResult[] = [];
  const push = (r: CodeResult) => out.push(r);

  const maxRule = (rule: CodeRule, actual: number, limit: number, k: CiteKey, detail?: string) =>
    push({ rule, level: gradeMax(actual, limit), actual, op: "max", limit, unit: "in", cite: cite(k), detail });
  const minRule = (rule: CodeRule, actual: number, limit: number, k: CiteKey, detail?: string) =>
    push({ rule, level: gradeMin(actual, limit), actual, op: "min", limit, unit: "in", cite: cite(k), detail });

  // ---- Stairs: risers, treads, variation, winders ---------------------------
  const flights = RAIL_SHAPES.includes(shape) ? collectFlights(data) : [];
  for (const f of flights) {
    if (f.risers.length) {
      const mx = Math.max(...f.risers);
      maxRule("riser_max", mx, L.riserMax, "riser", f.tag || undefined);
      if (L.riserMin !== null) minRule("riser_min", Math.min(...f.risers), L.riserMin, "riser", f.tag || undefined);
      if (f.risers.length >= 2) {
        const v = mx - Math.min(...f.risers);
        maxRule("riser_variation", v, L.stepVariation, "riser", f.tag || undefined);
      }
    }
    if (f.treads.length) {
      minRule("tread_min", Math.min(...f.treads), L.treadMin, "tread", f.tag || undefined);
      if (f.treads.length >= 2) {
        const v = Math.max(...f.treads) - Math.min(...f.treads);
        maxRule("tread_variation", v, L.stepVariation, "tread", f.tag || undefined);
      }
    }
    const walks = f.winders.map((w) => w.walk).filter((x): x is number => x !== null);
    const narrows = f.winders.map((w) => w.narrow).filter((x): x is number => x !== null);
    if (walks.length) minRule("winder_walkline", Math.min(...walks), L.winderWalkline, "winder", f.tag || undefined);
    if (narrows.length) minRule("winder_narrow", Math.min(...narrows), L.winderNarrow, "winder", f.tag || undefined);
  }

  // ---- Stair / level railing (data.rail) ------------------------------------
  if (RAIL_SHAPES.includes(shape)) {
    const role = railRole(data, shape);
    const h = pos(data.rail.height);
    const hasFlights = flights.length > 0;
    const platforms = data.segments.filter((sg) => sg.kind === "platform");

    // Total rise of the stair = the drop beside its open side at the top.
    const rises = flights.map((f) => (f.risers.length === f.count && f.count > 0 ? f.risers.reduce((a, b) => a + b, 0) : null));
    const measuredRise = rises.length && rises.every((r) => r !== null) ? (rises as number[]).reduce((a, b) => a + b, 0) : null;
    const totalRise = pos(data.overall.floorToFloor) ?? pos(data.overall.totalRise) ?? measuredRise;
    const o = data.datums.orientation;
    const openSide = o === "left_wall" || o === "right_wall" || o === "both_open";

    if (hasFlights && totalRise !== null && openSide && totalRise > L.guardDrop && shape !== "wall_rail") {
      push({
        rule: "guard_required", level: role.guard ? "green" : "yellow", actual: totalRise, op: "max",
        limit: L.guardDrop, unit: "in", cite: cite("guardReq"), note: role.guard ? undefined : "open_side",
      });
    }

    if (role.guard && h !== null) {
      if (hasFlights) {
        // Required only when the drop is known to exceed 30"; otherwise a short
        // guard may be perfectly legal, so it is a "verify".
        const required = totalRise !== null && totalRise > L.guardDrop;
        const ok = h >= L.stairGuardHeight - EPS;
        push({
          rule: "stair_guard_height", level: ok ? "green" : required ? "red" : "yellow", actual: h, op: "min",
          limit: L.stairGuardHeight, unit: "in", cite: cite("guardH"), note: ok || required ? undefined : "if_drop",
        });
        // A landing more than 30" up needs the full level-surface guard height.
        let elev = 0;
        let known = true;
        let fi = 0;
        data.segments.forEach((sg, si) => {
          if (sg.kind === "flight") {
            const r = rises[fi++];
            if (r === null || r === undefined) known = false;
            else elev += r;
          } else if (sg.kind === "platform" && known && elev > L.guardDrop && h < L.guardHeight - EPS) {
            push({
              rule: "guard_height", level: "red", actual: h, op: "min", limit: L.guardHeight, unit: "in",
              cite: cite("guardH"), detail: platforms.length > 1 ? `L${si}` : undefined, note: "landing",
            });
          }
        });
      } else {
        const ok = h >= L.guardHeight - EPS;
        push({
          rule: "guard_height", level: ok ? "green" : "yellow", actual: h, op: "min", limit: L.guardHeight,
          unit: "in", cite: cite("guardH"), note: ok ? undefined : "if_drop",
        });
      }
    }

    if (role.handrail && h !== null && (hasFlights || shape === "ramp" || shape === "wall_rail")) {
      const ok = h >= L.handrailMin - EPS && h <= L.handrailMax + EPS;
      push({
        rule: "handrail_height",
        // A combined rail tall enough for the guard but above 38" means a
        // second, separate handrail — not a defect in the guard.
        level: ok ? "green" : role.guard && h > L.handrailMax ? "yellow" : "red",
        actual: h, op: "range", limit: L.handrailMin, limit2: L.handrailMax, unit: "in", cite: cite("handrailH"),
        note: ok ? undefined : role.guard && h > L.handrailMax ? "separate_handrail" : undefined,
      });
    }

    // Flights of 4+ risers need a handrail; a guard whose top sits 34–38" can serve.
    const longFlight = flights.some((f) => f.count >= L.handrailMinRisers);
    if (longFlight && shape !== "wall_rail" && (role.guard || role.handrail)) {
      const serves = role.handrail || (h !== null && h >= L.handrailMin - EPS && h <= L.handrailMax + EPS);
      if (role.handrail || h !== null) {
        push({
          rule: "handrail_required", level: serves ? "green" : "yellow", actual: null, op: "check", limit: null,
          unit: "in", cite: cite("handrailReq"), note: serves ? undefined : "needs_handrail",
        });
      }
    }

    if (role.handrail) {
      const p = handrailProfile(data.materials.topRail);
      if (p) {
        if (p.kind === "round") {
          const ok = p.od >= 1.25 - EPS && p.od <= 2 + EPS;
          push({ rule: "handrail_grasp", level: ok ? "green" : "red", actual: p.od, op: "range", limit: 1.25, limit2: 2, unit: "in", cite: cite("grasp"), note: "round" });
        } else {
          const ok = p.perimeter >= 4 - EPS && p.perimeter <= 6.25 + EPS && p.maxDim <= 2.25 + EPS;
          push({ rule: "handrail_grasp", level: ok ? "green" : "red", actual: p.perimeter, op: "range", limit: 4, limit2: 6.25, unit: "in", cite: cite("grasp"), note: "perimeter" });
        }
      }
    }

    // Infill: 4" sphere on level surfaces, 4-3/8" on stair open sides (IRC).
    const ps = role.guard ? pos(data.materials.picketSpacing) : null;
    if (ps !== null) {
      if (hasFlights) {
        const onStair = ps <= L.stairSphere + EPS;
        push({ rule: "stair_infill_opening", level: onStair ? "green" : "red", actual: ps, op: "max", limit: L.stairSphere, unit: "in", cite: cite("openings") });
        if (platforms.length && onStair && ps > L.sphere + EPS) {
          push({ rule: "landing_infill_opening", level: "red", actual: ps, op: "max", limit: L.sphere, unit: "in", cite: cite("openings"), note: "landing" });
        }
      } else {
        maxRule("infill_opening", ps, L.sphere, "openings");
      }
    }

    const bc = role.guard ? num(data.fab.bottomClearance) : null;
    if (bc !== null && bc >= 0) {
      if (hasFlights) {
        // Triangle check from the typical step of the steepest measured flight.
        const f = flights.find((x) => x.risers.length && x.treads.length);
        if (f) {
          const r = Math.max(...f.risers);
          const u = Math.min(...f.treads);
          const d = stairTriangleSphere(r, u, bc);
          if (d !== null) {
            push({
              rule: "stair_triangle", level: d <= L.triangle + EPS ? "green" : "yellow", actual: d, op: "max",
              limit: L.triangle, unit: "in", cite: cite("openings"), note: d <= L.triangle + EPS ? undefined : "triangle",
            });
          }
        }
      } else {
        maxRule("bottom_clearance", bc, L.sphere, "openings");
      }
    }
  }

  // ---- Ramps -------------------------------------------------------------------
  const ramps = data.segments.filter((sg) => sg.kind === "ramp");
  data.segments.forEach((sg, si) => {
    if (sg.kind === "ramp") {
      const tag = ramps.length > 1 ? `#${si + 1}` : undefined;
      const rise = num(sg.rise);
      let runH = pos(sg.runH);
      const len = pos(sg.length);
      if (runH === null && rise !== null && len !== null && len > rise) runH = Math.sqrt(len * len - rise * rise);
      let slope: number | null = null;
      if (rise !== null && runH !== null) slope = rise / runH;
      else {
        const ang = num(sg.angleDeg);
        if (ang !== null && ang >= 0 && ang < 45) slope = Math.tan((ang * Math.PI) / 180);
      }
      if (slope !== null) {
        push({ rule: "ramp_slope", level: slope <= L.rampSlope + EPS ? "green" : "red", actual: slope, op: "max", limit: L.rampSlope, unit: "ratio", cite: cite("rampSlope"), detail: tag });
      }
      if (rise !== null && L.rampRiseMax !== null) maxRule("ramp_rise", rise, L.rampRiseMax, "rampRise", tag);
    }
    if (sg.kind === "platform" && ramps.length) {
      const prev = data.segments[si - 1];
      const next = data.segments[si + 1];
      const len = pos(sg.length);
      if (len !== null && (prev?.kind === "ramp" || next?.kind === "ramp")) {
        minRule("ramp_landing", len, L.rampLanding, "rampLanding", data.segments.length > 2 ? `L${si}` : undefined);
      }
    }
  });

  // ---- Decks -----------------------------------------------------------------
  if (data.deck) {
    const dk = data.deck;
    let anyHigh = false;
    dk.sides.forEach((sd, i) => {
      const h = pos(sd.heightAboveGrade);
      if (h === null) return;
      const tag = sd.label ? `${sd.label}` : `#${i + 1}`;
      if (h > L.guardDrop) anyHigh = true;
      if (h > L.guardDrop) {
        const opening = sd.opening === "stairs" || sd.opening === "gate";
        // An unrailed high side may be the house wall — verify, never red.
        push({
          rule: "guard_required", level: sd.railed || opening ? "green" : "yellow", actual: h, op: "max",
          limit: L.guardDrop, unit: "in", cite: cite("guardReq"), detail: tag, note: sd.railed || opening ? undefined : "unrailed_side",
        });
      }
    });
    const gh = pos(dk.guardHeight);
    if (gh !== null) {
      const ok = gh >= L.guardHeight - EPS;
      push({ rule: "guard_height", level: ok ? "green" : anyHigh ? "red" : "yellow", actual: gh, op: "min", limit: L.guardHeight, unit: "in", cite: cite("guardH"), note: ok || anyHigh ? undefined : "if_drop" });
    }
    const ps = pos(dk.picketSpacing);
    if (ps !== null) maxRule("infill_opening", ps, L.sphere, "openings");
    const bc = num(data.fab.bottomClearance);
    if (bc !== null && bc >= 0) maxRule("bottom_clearance", bc, L.sphere, "openings");
  }

  // ---- Balconies -------------------------------------------------------------
  if (data.balcony) {
    const b = data.balcony;
    const gh = pos(b.guardHeight);
    if (gh !== null) minRule("guard_height", gh, L.guardHeight, "guardH");
    const ps = pos(b.picketSpacing);
    if (ps !== null) maxRule("infill_opening", ps, L.sphere, "openings");
    const bc = num(data.fab.bottomClearance);
    if (bc !== null && bc >= 0) maxRule("bottom_clearance", bc, L.sphere, "openings");
  }

  // ---- Pool gates --------------------------------------------------------------
  if (data.gate && data.gate.use === "pool") {
    const g = data.gate;
    const heights = [pos(g.heightHinge), pos(g.heightLatch)].filter((x): x is number => x !== null);
    if (heights.length) minRule("pool_height", Math.min(...heights), L.poolBarrier, "pool");
    const gap = num(g.groundClearance);
    if (gap !== null && gap >= 0) {
      const lim = HARD_SURFACE.test(g.surface || "") ? L.poolGapHard : L.poolGapSoft;
      maxRule("pool_gap", gap, lim, "pool");
    }
    const ps = pos(g.picketSpacing);
    if (ps !== null) maxRule("pool_infill", ps, L.sphere, "pool");
    if (g.swingDir) {
      const ok = g.swingDir === "out";
      push({ rule: "pool_swing", level: ok ? "green" : "red", actual: null, op: "check", limit: null, unit: "in", cite: cite("poolGate"), note: ok ? undefined : "swing_in" });
    }
    // Self-closing / self-latching and the 54" release are hardware the sheet
    // does not measure: one reminder, always yellow.
    push({ rule: "pool_latch", level: "yellow", actual: null, op: "check", limit: L.poolLatch, unit: "in", cite: cite("poolGate"), note: "pool_latch" });
  }

  // ---- Window wells --------------------------------------------------------------
  if (data.well) {
    const w = data.well;
    const depth = pos(w.depth);
    const ladder = w.deliverables.includes("ladder");
    if (depth !== null && depth > L.wellLadderDepth) {
      push({ rule: "well_ladder", level: ladder ? "green" : "yellow", actual: depth, op: "max", limit: L.wellLadderDepth, unit: "in", cite: cite("well"), note: ladder ? undefined : "well_ladder" });
    }
    if (ladder) {
      const lw = pos(w.ladderWidth);
      if (lw !== null) minRule("well_ladder_width", lw, L.wellLadderWidth, "well");
      const so = pos(w.ladderStandoff);
      if (so !== null) minRule("well_ladder_standoff", so, L.wellLadderStandoff, "well");
      const sp = pos(w.ladderSpacing);
      if (sp !== null) maxRule("well_ladder_spacing", sp, L.wellLadderSpacing, "well");
    }
  }

  // ---- Spiral stairs ---------------------------------------------------------------
  if (data.spiral) {
    const sp = data.spiral;
    const cw = pos(sp.clearWidth);
    if (cw !== null) minRule("spiral_width", cw, L.spiralWidth, "spiral");
    const ftf = pos(sp.floorToFloor);
    const n = pos(sp.treads);
    // Same convention as the geometry check: floor-to-floor ÷ tread count.
    if (ftf !== null && n !== null) maxRule("spiral_riser", ftf / n, L.spiralRiser, "spiral");
    const rot = pos(sp.rotationDeg);
    const col = pos(sp.columnSize);
    if (rot !== null && n !== null && col !== null) {
      const r = col / 2 + L.spiralWalkline;
      const theta = ((rot / n) * Math.PI) / 180;
      const tread = 2 * r * Math.sin(theta / 2); // chord: the conservative reading
      minRule("spiral_tread", tread, L.spiralTread, "spiral");
    }
  }

  // ---- Fixed ladders (fire escapes) ----------------------------------------------
  if (data.fire?.ladder?.present && data.fire.ladder.type === "fixed") {
    const len = pos(data.fire.ladder.length);
    if (len !== null && len > L.ladderCage) {
      push({
        rule: "fixed_ladder", level: "yellow", actual: len / 12, op: "max",
        limit: (len > L.ladderFallArrest ? L.ladderFallArrest : L.ladderCage) / 12, unit: "ft", cite: cite("ladder"),
        note: len > L.ladderFallArrest ? "fall_arrest" : "cage",
      });
    }
  }

  const counts = { red: 0, yellow: 0, green: 0 };
  for (const r of out) counts[r.level] += 1;
  return { settings: s, occupancy: occ, limits: L, results: out, counts };
}

/** Code reds as review flags — documentation tier, never a submit blocker. */
export function codeFlags(report: CodeReport): CodeResult[] {
  return report.results.filter((r) => r.level === "red");
}
