// KIW Field Measure — shop pieces: custom fabricated items that are not shaped
// by a site. Bar and counter frames, wine racks, brackets, shelf frames, sign
// brackets, furniture bases, grilles to a drawing.
//
// What goes wrong with these is rarely the steel; it is the SIZE:
//   - a wine rack built to the niche width measured once, at the front, that
//     will not slide past the drywall bulge at the back;
//   - a counter frame built square for a niche that is 3/8" out;
//   - a sign bracket with no idea what wall it bolts to or what it carries.
//
// So a piece that fits a niche is read at back / front / top / bottom, both
// heights and both depths, plus the front diagonals, and the shop builds to the
// TIGHTEST reading minus a clearance — the same rule the opening sheet uses for
// a reveal. A freestanding or wall-mounted piece is built to its design size.
//
// Pure: parsing, fabricate-to size, checks, gaps. UI in
// shapes/ShopPieceSections.tsx, print in shapes/ShopPiecePrint.tsx, 3D in
// scene-shapes/shop-piece.ts.

import { parseMeas } from "./measure-parse";
import type { CheckLevel, CheckResult, Gap } from "./measure-checks";
import type { Substrate } from "./measure-substrate";

// ---- Model ------------------------------------------------------------------

export const SP_TYPES = [
  "bar_frame",
  "counter_frame",
  "wine_rack",
  "bracket",
  "shelf_frame",
  "sign_bracket",
  "furniture_base",
  "grille",
  "other",
] as const;
export type SpType = (typeof SP_TYPES)[number];

export const SP_MOUNTS = ["freestanding", "wall", "counter"] as const;
export type SpMount = (typeof SP_MOUNTS)[number];

export const SP_SUBSTRATES = ["studs", "masonry", "concrete", "wood", "steel", "stone"] as const;
export const SP_FINISHES = ["powder", "dtm", "clear", "raw", "galvanized", "blackened"] as const;
export const SP_LOADS = ["none", "bottles", "people", "stone_top", "equipment", "other"] as const;
export const SP_PHOTO_SLOTS = ["sp_reference", "sp_site"] as const;

/** Lbs per 750 ml bottle in a rack (glass + wine). */
export const BOTTLE_LB = 3.3;

export type WKey = "wBack" | "wFront" | "wTop" | "wBottom";
export type HKey = "hLeft" | "hRight" | "hBack";
export type DKey = "dTop" | "dBottom";
export const W_KEYS: readonly WKey[] = ["wBack", "wFront", "wTop", "wBottom"];
export const H_KEYS: readonly HKey[] = ["hLeft", "hRight", "hBack"];
export const D_KEYS: readonly DKey[] = ["dTop", "dBottom"];
/** Freestanding / wall pieces: one design size each way. */
export const DESIGN_KEYS = { w: "wFront", h: "hLeft", d: "dTop" } as const;

export interface SpMaterial {
  id: string;
  profile: string; // 1-1/2" sq tube 11ga, 1/4" plate, 3/4" round bar
  use: string; // frame, legs, shelf supports, infill
  qty: string; // pieces or length
}

export interface ShopPiece extends Record<WKey | HKey | DKey, string> {
  id: string;
  label: string;
  type: "" | SpType;
  qty: string;
  diagA: string; // front face, corner to corner
  diagB: string;
  /** Out-of-square decision for a red niche: build square to the smallest, or to a template. */
  squareFix: "" | "smallest" | "template";
  notes: string;
}

export interface ShopPieceData {
  mount: "" | SpMount;
  /** The piece fits into a niche / between walls: read it at several points and build to the tightest. */
  niche: boolean;
  /** Per side in a niche (width) and at the top and back. */
  clearance: string;
  substrate: "" | (typeof SP_SUBSTRATES)[number];
  fastener: string;
  materials: SpMaterial[];
  finish: "" | (typeof SP_FINISHES)[number];
  color: string;
  load: "" | (typeof SP_LOADS)[number];
  bottles: string;
  loadNote: string;
  drawingRef: string; // drawing no. / designer / "photo from client"
  /** Shared mounting model for a wall / counter mount (measure-substrate). */
  sub?: Substrate;
  pieces: ShopPiece[];
  notes: string;
}

let seq = 0;
function sid(p: string): string {
  seq = (seq + 1) % 1e6;
  return `${p}${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export const SP_DEFAULT_CLEARANCE = '1/4"';

export function newShopPiece(from?: Partial<ShopPiece>): ShopPiece {
  return {
    label: "",
    type: "",
    qty: "1",
    wBack: "", wFront: "", wTop: "", wBottom: "",
    hLeft: "", hRight: "", hBack: "",
    dTop: "", dBottom: "",
    diagA: "", diagB: "",
    squareFix: "",
    notes: "",
    ...from,
    id: sid("sp"),
  };
}

export function newSpMaterial(from?: Partial<SpMaterial>): SpMaterial {
  return { profile: "", use: "", qty: "", ...from, id: sid("sm") };
}

export function blankShopPiece(): ShopPieceData {
  return {
    mount: "",
    niche: false,
    clearance: SP_DEFAULT_CLEARANCE,
    substrate: "",
    fastener: "",
    materials: [],
    finish: "",
    color: "",
    load: "",
    bottles: "",
    loadNote: "",
    drawingRef: "",
    pieces: [newShopPiece()],
    notes: "",
  };
}

export function normalizeShopPiece(raw: Partial<ShopPieceData>): ShopPieceData {
  const b = blankShopPiece();
  return {
    ...b,
    ...raw,
    materials: (raw.materials || []).map((m) => ({ ...newSpMaterial(), ...m })),
    pieces: (raw.pieces || b.pieces).map((p) => ({ ...newShopPiece(), ...p })),
  };
}

// ---- Arithmetic ---------------------------------------------------------------

export interface SpTol {
  green: number;
  yellow: number;
}
export const SP_TOL: { square: SpTol; spread: SpTol } = {
  square: { green: 0.25, yellow: 0.5 },
  spread: { green: 0.25, yellow: 0.5 },
};

function grade(d: number, tol: SpTol): Exclude<CheckLevel, "na"> {
  const a = Math.abs(d);
  return a <= tol.green ? "green" : a <= tol.yellow ? "yellow" : "red";
}

export interface SpSpread<K extends string> {
  min: number;
  max: number;
  spread: number;
  minKey: K;
  count: number;
}

export function spreadOf<K extends string>(p: Record<K, string>, keys: readonly K[]): SpSpread<K> | null {
  let best: SpSpread<K> | null = null;
  for (const k of keys) {
    const n = parseMeas(p[k]);
    if (n === null || n <= 0) continue;
    if (!best) best = { min: n, max: n, spread: 0, minKey: k, count: 1 };
    else {
      if (n < best.min) { best.min = n; best.minKey = k; }
      best.max = Math.max(best.max, n);
      best.count += 1;
      best.spread = best.max - best.min;
    }
  }
  return best;
}

export const isNiche = (d: Pick<ShopPieceData, "niche">) => !!d.niche;

export interface SpFabSize {
  width: number | null;
  height: number | null;
  depth: number | null;
  /** The reading each one comes from (niche) — the tightest. */
  from: { w?: WKey; h?: HKey; d?: DKey };
  /** Niche dimension used before the clearance. */
  open: { w: number | null; h: number | null; d: number | null };
  clearance: number;
  niche: boolean;
}

/**
 * The size the shop builds to.
 *
 * In a niche the piece has to pass the tightest point: smallest width minus the
 * clearance each side, smallest height minus one clearance (it sits on the
 * niche floor), smallest depth minus one clearance (flush at the front, gap at
 * the back). Anything else is built to the design size entered.
 */
export function spFabSize(d: Pick<ShopPieceData, "niche" | "clearance">, p: ShopPiece): SpFabSize {
  const niche = isNiche(d);
  if (!niche) {
    return {
      width: parseMeas(p[DESIGN_KEYS.w]),
      height: parseMeas(p[DESIGN_KEYS.h]),
      depth: parseMeas(p[DESIGN_KEYS.d]),
      from: {},
      open: { w: null, h: null, d: null },
      clearance: 0,
      niche,
    };
  }
  const c = Math.max(0, parseMeas(d.clearance) ?? 0);
  const ws = spreadOf<WKey>(p, W_KEYS), hs = spreadOf<HKey>(p, H_KEYS), ds = spreadOf<DKey>(p, D_KEYS);
  const pos = (n: number | null) => (n !== null && n > 0 ? n : null);
  return {
    width: ws ? pos(ws.min - 2 * c) : null,
    height: hs ? pos(hs.min - c) : null,
    depth: ds ? pos(ds.min - c) : null,
    from: { w: ws?.minKey, h: hs?.minKey, d: ds?.minKey },
    open: { w: ws?.min ?? null, h: hs?.min ?? null, d: ds?.min ?? null },
    clearance: c,
    niche,
  };
}

export function pieceQty(p: ShopPiece): number {
  const q = parseInt(p.qty || "1", 10);
  return Number.isFinite(q) && q > 0 ? q : 1;
}

export function pieceTag(p: ShopPiece, i: number): string {
  return p.label.trim() ? p.label.trim() : `#${i + 1}`;
}

/** Bottle load in lb, when the rack's bottle count is known. */
export function bottleLoad(d: Pick<ShopPieceData, "load" | "bottles">): number | null {
  if (d.load !== "bottles") return null;
  const n = parseInt(d.bottles || "", 10);
  return Number.isFinite(n) && n > 0 ? n * BOTTLE_LB : null;
}

// ---- Checks --------------------------------------------------------------------

function cr(key: string, level: CheckLevel, expected: number | null, actual: number | null, detail?: string): CheckResult {
  return { key, level, expected, actual, delta: expected !== null && actual !== null ? actual - expected : null, unit: "in", detail };
}

/** A badly out-of-square niche stays red until somebody decides how to build it. */
const decided = (level: CheckLevel, p: ShopPiece): CheckLevel => (level === "red" && p.squareFix ? "yellow" : level);

export function shopPieceChecks(d: ShopPieceData | null | undefined, tol = SP_TOL): CheckResult[] {
  const out: CheckResult[] = [];
  if (!d) return out;
  d.pieces.forEach((p, i) => {
    const tag = pieceTag(p, i);
    if (isNiche(d)) {
      const a = parseMeas(p.diagA), b = parseMeas(p.diagB);
      if (a !== null && b !== null && a > 0 && b > 0) out.push(cr("sp_square", decided(grade(a - b, tol.square), p), Math.min(a, b), Math.max(a, b), tag));
      for (const [key, keys] of [["sp_width_spread", W_KEYS], ["sp_height_spread", H_KEYS], ["sp_depth_spread", D_KEYS]] as const) {
        const s = spreadOf<string>(p as unknown as Record<string, string>, keys as readonly string[]);
        if (s && s.count >= 2) out.push(cr(key, decided(grade(s.spread, tol.spread), p), s.min, s.max, tag));
      }
      const f = spFabSize(d, p);
      if ((f.open.w !== null && f.width === null) || (f.open.h !== null && f.height === null) || (f.open.d !== null && f.depth === null)) {
        out.push(cr("sp_fab_none", "red", null, null, tag));
      }
    }
    if (pieceQty(p) > 1) out.push({ ...cr("sp_typical", "yellow", null, null, `${tag} × ${pieceQty(p)}`) });
  });
  // People on it (bar foot rail, bench, stair-like base) is a structural question.
  if (d.load === "people") out.push(cr("sp_people_load", "yellow", null, null));
  if ((d.mount === "wall" || d.mount === "counter") && d.substrate === "studs" && (d.load === "bottles" || d.load === "stone_top" || d.load === "people")) {
    out.push(cr("sp_stud_load", "yellow", null, null));
  }
  return out;
}

// ---- What the sheet still needs -------------------------------------------------

export function shopPieceGaps(d: ShopPieceData | null | undefined, photos: { slot: string }[]): Gap[] {
  const gaps: Gap[] = [];
  const has = (s: string | undefined | null) => !!s && s.trim() !== "";
  if (!d) return [{ key: "sp_missing" }];
  if (!has(d.mount)) gaps.push({ key: "sp_mount" });
  if (isNiche(d) && !has(d.clearance)) gaps.push({ key: "sp_clearance" });
  // Answered in the shared mounting editor; same key as its blank-mounting gap so the two never double up.
  if ((d.mount === "wall" || d.mount === "counter") && !has(d.substrate)) gaps.push({ key: "sub_shoppiece", detail: "shoppiece" });
  if (!d.pieces.length) gaps.push({ key: "sp_pieces" });
  d.pieces.forEach((p, i) => {
    const tag = pieceTag(p, i);
    if (!has(p.type)) gaps.push({ key: "sp_type", detail: tag });
    if (isNiche(d)) {
      if (W_KEYS.some((k) => !has(p[k]))) gaps.push({ key: "sp_widths", detail: tag });
      if (H_KEYS.some((k) => !has(p[k]))) gaps.push({ key: "sp_heights", detail: tag });
      if (D_KEYS.some((k) => !has(p[k]))) gaps.push({ key: "sp_depths", detail: tag });
      if (!has(p.diagA) || !has(p.diagB)) gaps.push({ key: "sp_diagonals", detail: tag });
    } else {
      if (!has(p[DESIGN_KEYS.w])) gaps.push({ key: "sp_width", detail: tag });
      if (!has(p[DESIGN_KEYS.h])) gaps.push({ key: "sp_height", detail: tag });
      if (!has(p[DESIGN_KEYS.d])) gaps.push({ key: "sp_depth", detail: tag });
    }
  });
  if (!d.materials.some((m) => has(m.profile))) gaps.push({ key: "sp_materials" });
  if (!has(d.finish)) gaps.push({ key: "sp_finish" });
  if (!has(d.load)) gaps.push({ key: "sp_load" });
  else if (d.load === "bottles" && !has(d.bottles)) gaps.push({ key: "sp_bottles" });
  const filled = new Set(photos.map((p) => p.slot));
  // The drawing / reference picture is what the piece is built from.
  if (!filled.has("sp_reference") && !has(d.drawingRef)) gaps.push({ key: "photo", detail: "sp_reference", tier: "fab" });
  if (!filled.has("sp_site") && (isNiche(d) || d.mount === "wall" || d.mount === "counter")) gaps.push({ key: "photo", detail: "sp_site", tier: "doc" });
  return gaps;
}

export function shopPieceProgressValues(d: ShopPieceData): string[] {
  const vals: string[] = [d.mount, d.finish, d.load];
  for (const p of d.pieces) {
    vals.push(p.type);
    if (isNiche(d)) vals.push(...W_KEYS.map((k) => p[k]), ...H_KEYS.map((k) => p[k]), ...D_KEYS.map((k) => p[k]), p.diagA, p.diagB);
    else vals.push(p[DESIGN_KEYS.w], p[DESIGN_KEYS.h], p[DESIGN_KEYS.d]);
  }
  return vals;
}
