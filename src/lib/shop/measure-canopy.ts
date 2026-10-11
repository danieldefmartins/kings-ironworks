// KIW Field Measure — canopies, awnings, pergolas, door hoods, carports and
// skylight frames / guards.
//
// A canopy is a small roof hung off a house wall. What goes wrong on these is
// almost never the steel — it is where the steel lands:
//   - the frame (or its tie-rod anchors) collides with trim or a soffit that
//     was not measured, or that is 1" lower at one end than the other;
//   - the roof is pitched back toward the wall and dumps water into the house;
//   - the front edge or gutter is lower than a person (or an out-swinging
//     door) needs to pass under;
//   - a 7' projection is hung on knee brackets that were never meant for it;
//   - four posts are cut to one length on a walk that falls 2" across the front.
//
// Everything here is pure: model, parsing, derived numbers, checks and gaps.
// UI (shapes/CanopySections.tsx), sketch (CanopySketch.tsx), print
// (CanopyPrint.tsx) and 3D (scene-shapes/scene-canopy.ts) only read it.

import { parseMeas } from "./measure-parse";
import { OPENING_SUBSTRATES, type OpeningSubstrate } from "./measure-opening";
import type { CheckLevel, CheckResult, Gap } from "./measure-checks";

// ---- Model ------------------------------------------------------------------

export const CANOPY_KINDS = ["entry", "door_hood", "pergola", "carport", "skylight"] as const;
export type CanopyKind = (typeof CANOPY_KINDS)[number];

/** The wall it mounts to — same vocabulary as an opening's jamb / face. */
export const CANOPY_SUBSTRATES = OPENING_SUBSTRATES;
export type CanopySubstrate = OpeningSubstrate;
/** What the anchors actually bite into behind the face. */
export const CANOPY_BACKINGS = ["solid", "rim", "studs", "unknown"] as const;
export const CANOPY_DATUMS = ["threshold", "landing", "grade"] as const;
export const CANOPY_DRAINS = ["away", "toward", "left", "right"] as const;
export type CanopyDrain = (typeof CANOPY_DRAINS)[number];
export const CANOPY_SUPPORTS = ["tie_rods", "brackets", "posts"] as const;
export type CanopySupport = (typeof CANOPY_SUPPORTS)[number];
export const CANOPY_SWINGS = ["out", "in", "slider", "none"] as const;
export const CANOPY_ROOFS = ["glass", "polycarbonate", "metal", "open"] as const;
export type CanopyRoof = (typeof CANOPY_ROOFS)[number];
export const CANOPY_FLASHINGS = ["counter", "z_flash", "sealant", "by_others"] as const;
export const CANOPY_GUTTERS = ["none", "front", "side"] as const;
export const CANOPY_SIDES = ["left", "right"] as const;
export const CANOPY_OBSTRUCTIONS = ["light", "camera", "doorbell", "vent", "downspout", "meter", "sign"] as const;
export type CanopyObstruction = (typeof CANOPY_OBSTRUCTIONS)[number];
export const CANOPY_FINISHES = ["dtm", "galvanized", "powder"] as const;

export interface CanopyPost {
  id: string;
  label: string;
  /** Grade (or slab) at this post to the underside of the front beam. */
  height: string;
}

export interface CanopyDoor {
  swing: "" | (typeof CANOPY_SWINGS)[number];
  width: string; // door leaf width — how far an out-swinging door reaches
  head: string; // top of door casing above the datum
}

export interface CanopyData {
  kind: "" | CanopyKind;
  substrate: "" | CanopySubstrate;
  backing: "" | (typeof CANOPY_BACKINGS)[number];
  datum: "" | (typeof CANOPY_DATUMS)[number];
  width: string;
  projection: string; // out from the wall (skylight: length)
  depth: string; // frame / fascia depth
  soffitL: string; // datum to underside of existing trim / soffit, left end
  soffitR: string; // … right end
  mount: string; // datum to underside of canopy frame at the wall
  fall: string; // drop from the wall to the front edge; negative = rises
  drain: "" | CanopyDrain;
  support: "" | CanopySupport;
  rodRise: string; // tie-rod wall anchor above the top of the frame
  posts: CanopyPost[];
  door: CanopyDoor;
  roof: "" | CanopyRoof;
  snow: boolean; // New England snow load: engineer to confirm the frame
  engineer: "" | "yes" | "no";
  flashing: "" | (typeof CANOPY_FLASHINGS)[number];
  ledgerNote: string;
  obstructions: CanopyObstruction[];
  obstructionNote: string;
  gutter: "" | (typeof CANOPY_GUTTERS)[number];
  downspout: "" | (typeof CANOPY_SIDES)[number];
  gutterDrop: string; // gutter bottom below the canopy's front underside
  curb: string; // skylight curb height above the roof
  finish: "" | (typeof CANOPY_FINISHES)[number];
  notes: string;
}

let seq = 0;
function cid(): string {
  seq = (seq + 1) % 1e6;
  return `cn${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function newCanopyPost(label = ""): CanopyPost {
  return { id: cid(), label, height: "" };
}

export function blankCanopy(): CanopyData {
  return {
    kind: "",
    substrate: "",
    backing: "",
    datum: "threshold",
    width: "",
    projection: "",
    depth: "",
    soffitL: "",
    soffitR: "",
    mount: "",
    fall: "",
    drain: "",
    support: "",
    rodRise: "",
    posts: [],
    door: { swing: "", width: "", head: "" },
    roof: "",
    snow: true,
    engineer: "",
    flashing: "",
    ledgerNote: "",
    obstructions: [],
    obstructionNote: "",
    gutter: "",
    downspout: "",
    gutterDrop: "",
    curb: "",
    finish: "dtm",
    notes: "",
  };
}

const pick = <T extends readonly string[]>(v: unknown, list: T): "" | T[number] =>
  typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T[number]) : "";
const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Fill anything a stored sheet is missing; unknown values fall back to blank. */
export function normalizeCanopy(raw: Partial<CanopyData> | null | undefined): CanopyData {
  const b = blankCanopy();
  const r = (raw || {}) as Partial<CanopyData>;
  return {
    kind: pick(r.kind, CANOPY_KINDS),
    substrate: pick(r.substrate, CANOPY_SUBSTRATES),
    backing: pick(r.backing, CANOPY_BACKINGS),
    datum: r.datum === undefined ? b.datum : pick(r.datum, CANOPY_DATUMS),
    width: str(r.width),
    projection: str(r.projection),
    depth: str(r.depth),
    soffitL: str(r.soffitL),
    soffitR: str(r.soffitR),
    mount: str(r.mount),
    fall: str(r.fall),
    drain: pick(r.drain, CANOPY_DRAINS),
    support: pick(r.support, CANOPY_SUPPORTS),
    rodRise: str(r.rodRise),
    posts: Array.isArray(r.posts) ? r.posts.map((p) => ({ id: str(p?.id) || cid(), label: str(p?.label), height: str(p?.height) })) : [],
    door: {
      swing: pick(r.door?.swing, CANOPY_SWINGS),
      width: str(r.door?.width),
      head: str(r.door?.head),
    },
    roof: pick(r.roof, CANOPY_ROOFS),
    snow: typeof r.snow === "boolean" ? r.snow : b.snow,
    engineer: r.engineer === "yes" || r.engineer === "no" ? r.engineer : "",
    flashing: pick(r.flashing, CANOPY_FLASHINGS),
    ledgerNote: str(r.ledgerNote),
    obstructions: Array.isArray(r.obstructions)
      ? r.obstructions.filter((o): o is CanopyObstruction => (CANOPY_OBSTRUCTIONS as readonly string[]).includes(o))
      : [],
    obstructionNote: str(r.obstructionNote),
    gutter: pick(r.gutter, CANOPY_GUTTERS),
    downspout: pick(r.downspout, CANOPY_SIDES),
    gutterDrop: str(r.gutterDrop),
    curb: str(r.curb),
    finish: r.finish === undefined ? b.finish : pick(r.finish, CANOPY_FINISHES),
    notes: str(r.notes),
  };
}

/** Sensible starting point per kind — only choices, never a dimension. */
export function applyKind(c: CanopyData, kind: CanopyKind): void {
  c.kind = kind;
  if (kind === "skylight") {
    c.support = "";
    c.posts = [];
    c.datum = "";
    return;
  }
  if (!c.support) c.support = kind === "door_hood" ? "brackets" : kind === "entry" ? "tie_rods" : "posts";
  if (c.support === "posts" && c.posts.length === 0) c.posts = [newCanopyPost("L"), newCanopyPost("R")];
  if (kind === "pergola" && !c.roof) c.roof = "open";
  if (kind === "carport" && !c.datum) c.datum = "grade";
  if ((kind === "carport" || kind === "pergola") && c.datum === "threshold") c.datum = "grade";
}

export function setSupport(c: CanopyData, support: "" | CanopySupport): void {
  c.support = support;
  if (support === "posts" && c.posts.length === 0) c.posts = [newCanopyPost("L"), newCanopyPost("R")];
}

// ---- What applies to which kind ---------------------------------------------

export const isSkylight = (c: CanopyData | null | undefined) => c?.kind === "skylight";
/** Wall-mounted: hangs off the house, so trim, flashing and ledger matter. */
export const wallMounted = (c: CanopyData) => c.kind !== "skylight";
/** A door sits under it. */
export const hasDoor = (c: CanopyData) => c.kind === "entry" || c.kind === "door_hood";
/** An open-slat pergola sheds nothing; slope and gutter do not apply. */
export const sheds = (c: CanopyData) => c.roof !== "open";

// ---- Derived ----------------------------------------------------------------

const num = (s: string | undefined) => (s && s.trim() ? parseMeas(s) : null);

export interface CanopyGeometry {
  width: number | null;
  projection: number | null;
  depth: number | null;
  mount: number | null;
  fall: number | null;
  /** Underside at the front edge. */
  front: number | null;
  /** Rise over run, inches per foot; positive falls away from the wall. */
  slopePerFt: number | null;
  /** Lowest point anyone walks under: front underside or gutter bottom. */
  lowest: number | null;
  /** Lower of the two trim / soffit readings. */
  soffitMin: number | null;
  /** Highest thing on the wall: top of frame, or tie-rod anchor. */
  wallTop: number | null;
  /** Room left between that and the trim. */
  trimClear: number | null;
  postSpread: number | null;
}

/** Fall drawn toward the wall when the measurer said the water goes that way. */
export function signedFall(c: CanopyData): number | null {
  const raw = c.fall.trim();
  // parseMeas reads magnitudes; a leading minus means the front sits higher.
  const neg = /^[-−]/.test(raw);
  const f = num(raw.replace(/^[-−]\s*/, ""));
  if (f === null) return null;
  const v = neg ? -f : f;
  return c.drain === "toward" && v > 0 ? -v : v;
}

export function canopyGeometry(c: CanopyData): CanopyGeometry {
  const width = num(c.width);
  const projection = num(c.projection);
  const depth = num(c.depth);
  const mount = num(c.mount);
  const fall = signedFall(c);
  const front = mount !== null ? mount - (fall ?? 0) : null;
  const slopePerFt = fall !== null && projection ? (fall / projection) * 12 : null;
  const gDrop = c.gutter === "front" ? num(c.gutterDrop) ?? 0 : 0;
  // A front gutter hangs under the front edge only.
  const lowest = mount !== null ? Math.min(mount, (front ?? mount) - gDrop) : null;
  const sL = num(c.soffitL);
  const sR = num(c.soffitR);
  const soffitMin = sL !== null && sR !== null ? Math.min(sL, sR) : sL ?? sR;
  const rise = c.support === "tie_rods" ? num(c.rodRise) ?? 0 : 0;
  const wallTop = mount !== null ? mount + (depth ?? 0) + rise : null;
  const trimClear = soffitMin !== null && wallTop !== null ? soffitMin - wallTop : null;
  const hs = c.posts.map((p) => num(p.height)).filter((n): n is number => n !== null);
  const postSpread = hs.length >= 2 ? Math.max(...hs) - Math.min(...hs) : null;
  return { width, projection, depth, mount, fall, front, slopePerFt, lowest, soffitMin, wallTop, trimClear, postSpread };
}

/** Underside of the canopy at a distance `d` out from the wall. */
export function undersideAt(c: CanopyData, d: number): number | null {
  const g = canopyGeometry(c);
  if (g.mount === null) return null;
  if (!g.projection || g.fall === null) return g.mount;
  return g.mount - g.fall * Math.min(1, Math.max(0, d / g.projection));
}

// ---- Rules ------------------------------------------------------------------

export const CANOPY_RULES = {
  /** IRC R311.7.2 / IBC 1003.2 minimum headroom; 6'-8". */
  headroom: 80,
  /** Water must leave the wall: at least 1/4" per foot on a shedding roof. */
  minSlopePerFt: 0.25,
  /** Trim / soffit out of level by more than this is worth a look. */
  trimLevel: 0.5,
  /** Post heights spread more than this means grade falls: cut each to its own. */
  postSpread: 0.25,
  /** Projection limits per support, inches: [comfortable, engineer]. */
  projection: { tie_rods: [60, 84], brackets: [36, 54], posts: [Infinity, Infinity] } as Record<CanopySupport, [number, number]>,
  /** Snow load: anything projecting past this wants an engineer's eye. */
  snowProjection: 48,
} as const;

function check(key: string, level: CheckLevel, expected: number | null, actual: number | null, detail?: string): CheckResult {
  return { key, level, expected, actual, delta: expected !== null && actual !== null ? actual - expected : null, unit: "in", ...(detail ? { detail } : {}) };
}

export function canopyChecks(c: CanopyData | null | undefined): CheckResult[] {
  if (!c || !c.kind) return [];
  const g = canopyGeometry(c);
  const out: CheckResult[] = [];
  const R = CANOPY_RULES;

  // Water into the house: the one failure that turns into a lawsuit.
  if (sheds(c)) {
    if (c.drain === "toward" || (g.fall !== null && g.fall < 0)) {
      out.push(check("canopy_slope_wall", "red", R.minSlopePerFt, g.slopePerFt));
    } else if (g.slopePerFt !== null) {
      out.push(check("canopy_slope", g.slopePerFt >= R.minSlopePerFt ? "green" : "yellow", R.minSlopePerFt, g.slopePerFt));
    }
  }

  if (!isSkylight(c)) {
    // Headroom under the lowest point.
    if (g.lowest !== null) out.push(check("canopy_headroom", g.lowest >= R.headroom ? "green" : "red", R.headroom, g.lowest));

    // Frame (and tie-rod anchors) under the existing trim / soffit.
    if (g.trimClear !== null && g.soffitMin !== null && g.wallTop !== null) {
      out.push(check(c.support === "tie_rods" ? "canopy_trim_rods" : "canopy_trim", g.trimClear < 0 ? "red" : g.trimClear < 0.5 ? "yellow" : "green", g.soffitMin, g.wallTop));
    }
    const sL = num(c.soffitL);
    const sR = num(c.soffitR);
    if (sL !== null && sR !== null) {
      out.push(check("canopy_trim_level", Math.abs(sL - sR) > R.trimLevel ? "yellow" : "green", sL, sR));
    }

    // Projection the chosen support can carry.
    if (c.support && g.projection !== null && c.support !== "posts") {
      const [ok, max] = R.projection[c.support];
      out.push(check(`canopy_proj_${c.support}`, g.projection <= ok ? "green" : g.projection <= max ? "yellow" : "red", ok, g.projection));
    }

    // Posts on a sloping grade: each one is its own cut.
    if (c.support === "posts" && g.postSpread !== null) {
      const hs = c.posts.map((p) => num(p.height)).filter((n): n is number => n !== null);
      out.push(check("canopy_post_heights", g.postSpread > R.postSpread ? "yellow" : "green", Math.min(...hs), Math.max(...hs)));
    }

    // The door under it.
    if (hasDoor(c)) {
      const head = num(c.door.head);
      if (head !== null && g.mount !== null) {
        out.push(check("canopy_door_head", g.mount >= head ? "green" : "red", head, g.mount));
        const w = num(c.door.width);
        if (c.door.swing === "out" && w !== null) {
          const under = undersideAt(c, w);
          if (under !== null) out.push(check("canopy_door_swing", under - head < 0 ? "red" : under - head < 1 ? "yellow" : "green", head, under));
        }
      }
    }
  }

  // New England snow: a long projection with no engineer is a call to make now.
  if (c.snow && sheds(c) && g.projection !== null && g.projection > R.snowProjection) {
    out.push(check("canopy_snow", c.engineer === "yes" ? "green" : "yellow", R.snowProjection, g.projection));
  }
  return out;
}

// ---- Completeness -----------------------------------------------------------

export const CANOPY_PHOTO_SLOTS = ["cn_overall", "cn_wall", "cn_trim", "cn_grade"] as const;

export function canopyGaps(c: CanopyData | null | undefined): Gap[] {
  if (!c) return [{ key: "canopy_kind" }];
  const gaps: Gap[] = [];
  const need = (v: string, key: string, tier: "fab" | "doc" = "fab") => {
    if (!v.trim()) gaps.push({ key, tier });
  };
  if (!c.kind) return [{ key: "canopy_kind" }];
  need(c.substrate, "canopy_substrate");
  need(c.width, "canopy_width");
  need(c.projection, "canopy_projection");
  if (sheds(c)) {
    need(c.fall, "canopy_fall");
    need(c.drain, "canopy_drain");
  }
  need(c.roof, "canopy_roof");
  if (isSkylight(c)) {
    need(c.curb, "canopy_curb", "doc");
  } else {
    need(c.soffitL, "canopy_soffit_l");
    need(c.soffitR, "canopy_soffit_r");
    need(c.mount, "canopy_mount");
    need(c.support, "canopy_support");
    if (c.support === "tie_rods") need(c.rodRise, "canopy_rod_rise");
    if (c.support === "posts") {
      if (c.posts.length === 0) gaps.push({ key: "canopy_posts" });
      c.posts.forEach((p, i) => {
        if (!p.height.trim()) gaps.push({ key: "canopy_post_height", detail: p.label || `P${i + 1}` });
      });
    }
    need(c.flashing, "canopy_flashing");
    if (hasDoor(c)) {
      need(c.door.swing, "canopy_door_swing");
      if (c.door.swing && c.door.swing !== "none") need(c.door.head, "canopy_door_head");
      if (c.door.swing === "out") need(c.door.width, "canopy_door_width");
    }
    if (sheds(c)) need(c.gutter, "canopy_gutter", "doc");
  }
  need(c.finish, "canopy_finish", "doc");
  return gaps;
}

/** Headline numbers for the summary row and the print header. */
export function canopySummary(c: CanopyData) {
  const g = canopyGeometry(c);
  return { lowest: g.lowest, slopePerFt: g.slopePerFt, projection: g.projection, width: g.width, trimClear: g.trimClear };
}

/** "1/2\" per ft", rounded to the nearest 1/16. */
export function fmtSlope(perFt: number | null, unit = "/ft"): string {
  if (perFt === null || !Number.isFinite(perFt)) return "—";
  const a = Math.abs(perFt);
  const s16 = Math.round(a * 16);
  const whole = Math.floor(s16 / 16);
  let n = s16 % 16;
  let d = 16;
  while (n && n % 2 === 0) {
    n /= 2;
    d /= 2;
  }
  const body = n ? (whole ? `${whole} ${n}/${d}` : `${n}/${d}`) : `${whole}`;
  return `${perFt < 0 ? "−" : ""}${body}"${unit}`;
}
