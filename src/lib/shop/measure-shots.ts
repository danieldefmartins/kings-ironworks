// The professional shot list: for every kind of work, the photos a fabricator
// needs to build from without driving back to the site. Each shot carries a
// ghost (the silhouette drawn over the viewfinder) and whether a tape belongs
// in frame.
//
// Tiers:
//   required     — the job owes this photo. Shots the shape ALREADY required
//                  (requiredPhotoSlots) keep their existing gap tier; every
//                  other required shot is a documentation gap (yellow, never
//                  blocks a submission).
//   recommended  — asked for, counted in the progress ring, never a gap.

import {
  requiredPhotoSlots,
  type MeasureData,
  type MeasurePhoto,
  type MeasureShape,
} from "./measure";

export type ShotTier = "required" | "recommended";

export type ShotGhost =
  | "stair_up"
  | "stair_down"
  | "side"
  | "closeup"
  | "rail"
  | "opening"
  | "jamb"
  | "sill"
  | "beam"
  | "bearing"
  | "slab"
  | "gate"
  | "post"
  | "grade"
  | "wide"
  | "overhead"
  | "ladder";

export interface ShotDef {
  slot: string;
  tier: ShotTier;
  ghost: ShotGhost;
  /** A tape measure should be readable in the frame. */
  tape?: boolean;
}

const R = (slot: string, ghost: ShotGhost, tape = false): ShotDef => ({ slot, tier: "required", ghost, tape });
const r = (slot: string, ghost: ShotGhost, tape = false): ShotDef => ({ slot, tier: "recommended", ghost, tape });

const TAPE = r("tape_critical", "closeup", true);
const OBSTRUCTION = r("obstruction", "wide");
const EXISTING_RAIL = r("existing_rail", "rail");

function stairShots(platform: boolean): ShotDef[] {
  return [
    R("overall_bottom", "stair_up"),
    R("overall_top", "stair_down"),
    R("left_side", "side"),
    R("right_side", "side"),
    R("bottom_term", "closeup", true),
    R("top_term", "closeup", true),
    R("mount_surface", "closeup", true),
    platform ? R("landing", "slab", true) : r("landing", "slab", true),
    EXISTING_RAIL,
    TAPE,
    OBSTRUCTION,
  ];
}

/** The ordered shot list for a sheet. `data` only refines it (a landing). */
export function shotList(shape: MeasureShape, data?: Pick<MeasureData, "segments"> | null): ShotDef[] {
  const platform = !!data?.segments?.some((s) => s.kind === "platform");
  switch (shape) {
    case "spiral":
      return [
        R("overall_bottom", "stair_up"),
        R("overall_top", "stair_down"),
        R("spiral_opening", "overhead", true),
        R("mount_surface", "closeup", true),
        TAPE,
        OBSTRUCTION,
      ];
    case "level_run":
    case "wall_rail":
    case "custom":
      return [
        R("overall_bottom", "wide"),
        R("overall_top", "wide"),
        R("bottom_term", "closeup", true),
        R("top_term", "closeup", true),
        R("mount_surface", "closeup", true),
        EXISTING_RAIL,
        TAPE,
        OBSTRUCTION,
      ];
    case "canopy":
      return [
        R("cn_overall", "wide"),
        R("cn_wall", "closeup", true),
        R("cn_trim", "overhead", true),
        R("cn_grade", "grade"),
        TAPE,
        OBSTRUCTION,
      ];
    case "wall_cap":
      return [
        R("wc_overall", "wide"),
        R("wc_cap", "closeup", true),
        R("wc_drop", "grade"),
        R("wc_ends", "wide"),
        r("wc_walk", "grade"),
        EXISTING_RAIL,
        TAPE,
      ];
    case "shop_piece":
      return [
        R("sp_reference", "closeup"),
        R("sp_site", "wide", true),
        r("sp_mount_surface", "closeup", true),
        TAPE,
        OBSTRUCTION,
      ];
    case "window_well":
      return [
        R("well_overall", "overhead"),
        R("well_wall_profile", "closeup", true),
        R("well_window", "opening"),
        R("well_inside", "overhead"),
        r("well_grade", "grade"),
        TAPE,
      ];
    case "fire_escape":
      return [
        R("fe_elevation", "ladder"),
        R("fe_anchors", "closeup", true),
        R("fe_ladder", "ladder"),
        R("fe_deck", "stair_down"),
        r("fe_each_level", "wide"),
        r("fe_corrosion", "closeup", true),
        TAPE,
      ];
    case "gate":
      return [
        R("gate_opening", "gate"),
        R("gate_inside", "gate"),
        R("gate_posts", "post", true),
        R("gate_ground", "grade"),
        r("gate_hinge", "closeup", true),
        r("gate_latch", "closeup", true),
        TAPE,
      ];
    case "fence":
      return [
        R("fence_run", "wide"),
        R("fence_start", "post"),
        R("fence_end", "post"),
        R("fence_grade", "grade"),
        r("fence_mount", "closeup", true),
        OBSTRUCTION,
      ];
    case "balcony":
      return [
        R("bal_overall", "wide"),
        R("bal_slab_edge", "slab", true),
        R("bal_mount", "closeup", true),
        R("bal_underside", "beam"),
        EXISTING_RAIL,
        TAPE,
      ];
    case "deck":
      return [
        R("deck_overall", "wide"),
        R("deck_framing", "beam"),
        R("deck_edge", "closeup", true),
        R("deck_grade", "grade"),
        r("deck_stairs", "side"),
        EXISTING_RAIL,
        TAPE,
      ];
    case "opening":
      return [
        R("op_straight", "opening"),
        R("op_jamb_left", "jamb", true),
        R("op_jamb_right", "jamb", true),
        R("op_sill", "sill", true),
        r("op_head", "sill", true),
        r("op_inside", "opening"),
        TAPE,
      ];
    case "structural":
      return [
        R("st_overall", "wide"),
        R("st_bearing", "bearing", true),
        R("st_bearing_far", "bearing", true),
        R("st_beam_under", "beam"),
        R("st_base", "slab", true),
        R("st_access", "wide"),
        TAPE,
        OBSTRUCTION,
      ];
    default:
      return stairShots(platform);
  }
}

/** Shot slots the checklist itself added on top of the shape's own required set. */
export function addedRequiredShots(shape: MeasureShape, data?: Pick<MeasureData, "segments"> | null): string[] {
  const own = new Set(requiredPhotoSlots(shape));
  // The landing photo is already demanded by requiredGaps whenever there is one.
  if (data?.segments?.some((s) => s.kind === "platform")) own.add("landing");
  return shotList(shape, data)
    .filter((s) => s.tier === "required" && !own.has(s.slot))
    .map((s) => s.slot);
}

/** Documentation gaps for the checklist's added required shots — never blocking. */
export function shotGaps(
  data: Pick<MeasureData, "segments" | "photos">,
  shape: MeasureShape
): { key: "photo"; detail: string; tier: "doc" }[] {
  const filled = new Set((data.photos || []).map((p) => p.slot));
  return addedRequiredShots(shape, data)
    .filter((slot) => !filled.has(slot))
    .map((slot) => ({ key: "photo" as const, detail: slot, tier: "doc" as const }));
}

export interface ShotProgress {
  done: number;
  total: number;
  requiredDone: number;
  requiredTotal: number;
  /** First shot still missing, required ones first, in list order. */
  next: ShotDef | null;
}

export function shotProgress(data: Pick<MeasureData, "segments" | "photos">, shape: MeasureShape): ShotProgress {
  const list = shotList(shape, data);
  const filled = new Set((data.photos || []).map((p) => p.slot));
  const req = list.filter((s) => s.tier === "required");
  const missing = list.filter((s) => !filled.has(s.slot));
  return {
    done: list.filter((s) => filled.has(s.slot)).length,
    total: list.length,
    requiredDone: req.filter((s) => filled.has(s.slot)).length,
    requiredTotal: req.length,
    next: missing.find((s) => s.tier === "required") || missing[0] || null,
  };
}

/** The missing shot that follows `slot` (wrapping), required before recommended. */
export function nextShotAfter(
  data: Pick<MeasureData, "segments" | "photos">,
  shape: MeasureShape,
  slot: string
): ShotDef | null {
  const list = shotList(shape, data);
  const filled = new Set((data.photos || []).map((p) => p.slot));
  filled.add(slot);
  const i = list.findIndex((s) => s.slot === slot);
  const order = [...list.slice(i + 1), ...list.slice(0, Math.max(0, i))];
  const missing = order.filter((s) => !filled.has(s.slot));
  return missing.find((s) => s.tier === "required") || missing[0] || null;
}

// ---- Capture metadata -------------------------------------------------------

export interface ShotFix {
  lat: number;
  lng: number;
  acc?: number;
}

/** A photo entry with its capture time and (when the phone gave one) GPS fix. */
export function stampPhoto(
  slot: string,
  path: string,
  fix: ShotFix | null,
  now: Date = new Date(),
  marked = false
): MeasurePhoto {
  const p: MeasurePhoto = { slot, path, takenAt: now.toISOString() };
  if (fix && Number.isFinite(fix.lat) && Number.isFinite(fix.lng) && Math.abs(fix.lat) <= 90 && Math.abs(fix.lng) <= 180) {
    p.lat = Math.round(fix.lat * 1e6) / 1e6;
    p.lng = Math.round(fix.lng * 1e6) / 1e6;
    if (fix.acc !== undefined && Number.isFinite(fix.acc) && fix.acc >= 0) p.acc = Math.round(fix.acc);
  }
  if (marked) p.marked = true;
  return p;
}

/** "42.40840° N, 71.05370° W" — readable on a print sheet. */
export function formatGps(lat: number, lng: number): string {
  const f = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(5)}° ${v >= 0 ? pos : neg}`;
  return `${f(lat, "N", "S")}, ${f(lng, "E", "W")}`;
}

// ---- Dimension line on a photo ---------------------------------------------

export interface DimGeometry {
  /** Perpendicular end ticks: [x1,y1,x2,y2] each. */
  ticks: [number, number, number, number][];
  /** Arrowheads at both ends as polyline point lists. */
  heads: [number, number][][];
  /** Label centre and rotation (degrees), kept upright. */
  label: { x: number; y: number; angle: number };
}

/** Geometry for a dimension line a→b drawn with stroke width `lw`. */
export function dimGeometry(a: { x: number; y: number }, b: { x: number; y: number }, lw: number): DimGeometry {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const t = lw * 4;
  const h = Math.min(lw * 4.5, len / 3);
  const tick = (p: { x: number; y: number }): [number, number, number, number] => [p.x + nx * t, p.y + ny * t, p.x - nx * t, p.y - ny * t];
  const head = (p: { x: number; y: number }, dir: 1 | -1): [number, number][] => [
    [p.x + dir * ux * h + nx * h * 0.45, p.y + dir * uy * h + ny * h * 0.45],
    [p.x, p.y],
    [p.x + dir * ux * h - nx * h * 0.45, p.y + dir * uy * h - ny * h * 0.45],
  ];
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;
  return {
    ticks: [tick(a), tick(b)],
    heads: [head(a, 1), head(b, -1)],
    label: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, angle },
  };
}
