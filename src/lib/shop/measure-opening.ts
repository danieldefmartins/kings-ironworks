// Openings — everything that fills or guards a hole in a wall: window guards
// and security grilles, Juliet balconies, security and storm doors, a gate set
// into an opening, transom / decorative panels and skylight or pass-through
// guards.
//
// The reason these get re-fabricated is always the same: the opening is not a
// rectangle. Masonry openings are never square, so ONE width and ONE height is
// a guess. Each opening is measured at three widths (top / middle / bottom),
// three heights (left / centre / right) and both diagonals, and the sheet
// works out the size the shop actually cuts to:
//
//   inside the reveal:  smallest width / height − clearance on each side
//   face-mounted:       largest width / height + overlap on each side
//
// It never corrects what was typed — it only says which number governs and
// how far out of square the hole is.

import { parseMeas } from "./measure-parse";
import type { CheckLevel, CheckResult, Gap } from "./measure-checks";

// ---- Vocabulary -------------------------------------------------------------

export const OPENING_PRODUCTS = [
  "guard",
  "juliet",
  "security_door",
  "storm_door",
  "gate",
  "panel",
  "skylight_guard",
] as const;
export type OpeningProduct = (typeof OPENING_PRODUCTS)[number];

export const OPENING_MOUNTS = ["reveal", "face_out", "face_in"] as const;
export type OpeningMount = (typeof OPENING_MOUNTS)[number];

export const OPENING_SUBSTRATES = [
  "brick",
  "stone",
  "concrete",
  "block",
  "wood",
  "stucco",
  "siding",
  "steel",
] as const;
export type OpeningSubstrate = (typeof OPENING_SUBSTRATES)[number];

export const OPENING_ANCHORS = [
  "sleeve",
  "screw",
  "wedge",
  "epoxy",
  "lag",
  "through_bolt",
  "weld",
  "tamper_screw",
  "other",
] as const;
export type OpeningAnchor = (typeof OPENING_ANCHORS)[number];

/** Products that swing on hinges — they carry the door questions. */
export const OPENING_DOOR_PRODUCTS: readonly OpeningProduct[] = ["security_door", "storm_door", "gate"];
/** Products somebody may have to escape through — they carry the egress flag. */
export const OPENING_EGRESS_PRODUCTS: readonly OpeningProduct[] = ["guard", "security_door", "storm_door", "gate"];
/** Products that sit on a sill rather than a threshold. */
export const OPENING_SILL_PRODUCTS: readonly OpeningProduct[] = ["guard", "juliet", "panel"];

export const OPENING_PHOTO_SLOTS = ["op_straight", "op_jamb_left", "op_jamb_right", "op_sill"] as const;

// ---- Data -------------------------------------------------------------------

export interface OpeningUnit {
  id: string;
  label: string; // "Bedroom 2", "Basement W3"
  qty: string; // identical openings this one measurement stands for
  // Three widths and three heights — masonry openings are never square.
  wTop: string;
  wMid: string;
  wBot: string;
  hLeft: string;
  hCenter: string;
  hRight: string;
  // Corner to corner: A = top-left → bottom-right, B = top-right → bottom-left.
  diagA: string;
  diagB: string;
  reveal: string; // reveal / jamb depth
  sillSlope: string; // fall across the sill depth
  sillProjection: string; // how far the sill stands proud of the face
  egress: "" | "yes" | "no"; // sleeping-room / required egress opening
  quickRelease: "" | "yes" | "no"; // inside quick-release / keyless egress
  sillAff: string; // sill above the finished floor inside (egress ≤ 44", fall protection < 24")
  dropOutside: string; // sill down to grade / the surface below outside
  squareFix: "" | "rect" | "template"; // decision once the hole is badly out
  note: string;
}

export interface OpeningData {
  product: "" | OpeningProduct;
  mount: "" | OpeningMount;
  clearance: string; // per side, inside the reveal
  overlap: string; // per side, face-mounted over the opening
  units: OpeningUnit[];
  // Substrate of the jamb / face and how it is anchored
  substrate: "" | OpeningSubstrate;
  substrateCondition: string;
  anchor: "" | OpeningAnchor;
  anchorNote: string;
  design: string; // bar pattern / infill / mesh
  // Juliet
  julietSill: string; // sill (or floor at the door) above finished floor inside
  julietGuard: "" | "36" | "42"; // required guard height above finished floor
  julietProjection: string;
  julietDoorSwing: "" | "in" | "out";
  julietDoorClears: "" | "yes" | "no";
  // Doors / gates in an opening (viewed from outside)
  doorHinge: "" | "left" | "right";
  doorSwing: "" | "in" | "out";
  threshold: string;
  jambMaterial: string;
  lockSide: "" | "left" | "right";
  notes: string;
}

export const DEFAULT_CLEARANCE = '1/4"';
export const DEFAULT_OVERLAP = '1 1/2"';

function newOpeningId(): string {
  return `o${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function newOpeningUnit(label = "", from?: Partial<OpeningUnit>): OpeningUnit {
  return {
    id: newOpeningId(),
    label,
    qty: "1",
    wTop: "", wMid: "", wBot: "",
    hLeft: "", hCenter: "", hRight: "",
    diagA: "", diagB: "",
    reveal: "", sillSlope: "", sillProjection: "",
    // A new opening on the same sheet is usually the same kind of room.
    egress: from?.egress ?? "",
    quickRelease: from?.quickRelease ?? "",
    sillAff: "", dropOutside: "",
    squareFix: "",
    note: "",
  };
}

export function blankOpening(count = 1): OpeningData {
  const n = Math.min(24, Math.max(1, count || 1));
  return {
    product: "",
    mount: "",
    clearance: DEFAULT_CLEARANCE,
    overlap: DEFAULT_OVERLAP,
    units: Array.from({ length: n }, () => newOpeningUnit()),
    substrate: "",
    substrateCondition: "",
    anchor: "",
    anchorNote: "",
    design: "",
    julietSill: "",
    julietGuard: "",
    julietProjection: "",
    julietDoorSwing: "",
    julietDoorClears: "",
    doorHinge: "",
    doorSwing: "",
    threshold: "",
    jambMaterial: "",
    lockSide: "",
    notes: "",
  };
}

/** Fill every field a sheet written by an older build might be missing. */
export function normalizeOpening(o: Partial<OpeningData>): OpeningData {
  const base = blankOpening(1);
  const units = (o.units || []).map((u) => ({ ...newOpeningUnit(), ...u }));
  return { ...base, ...o, units: units.length ? units : base.units };
}

// ---- Arithmetic -------------------------------------------------------------

export interface OpeningTol {
  green: number;
  yellow: number;
}
/** Shop policy, inches. Same shape as TOLERANCES in measure-checks. */
export const OPENING_TOLERANCES: { square: OpeningTol; spread: OpeningTol; diagWH: OpeningTol } = {
  // Diagonal difference — how far the hole is out of square.
  square: { green: 0.25, yellow: 0.5 },
  // Largest minus smallest of the three widths (or heights).
  spread: { green: 0.25, yellow: 0.5 },
  // Average diagonal against √(W² + H²): disagreement here is a misread tape.
  diagWH: { green: 0.5, yellow: 1.5 },
};

export function gradeOpening(delta: number, tol: OpeningTol): Exclude<CheckLevel, "na"> {
  const d = Math.abs(delta);
  if (d <= tol.green) return "green";
  if (d <= tol.yellow) return "yellow";
  return "red";
}

export type WidthKey = "wTop" | "wMid" | "wBot";
export type HeightKey = "hLeft" | "hCenter" | "hRight";
export const WIDTH_KEYS: readonly WidthKey[] = ["wTop", "wMid", "wBot"];
export const HEIGHT_KEYS: readonly HeightKey[] = ["hLeft", "hCenter", "hRight"];

export interface Spread<K extends string> {
  min: number;
  max: number;
  spread: number;
  /** Which measurement is the smallest (governs inside a reveal). */
  minKey: K;
  /** Which is the largest (governs a face mount). */
  maxKey: K;
  count: number;
}

function spreadOf<K extends string>(u: Record<K, string>, keys: readonly K[]): Spread<K> | null {
  let best: Spread<K> | null = null;
  for (const k of keys) {
    const n = parseMeas(u[k]);
    if (n === null || n <= 0) continue;
    if (!best) best = { min: n, max: n, spread: 0, minKey: k, maxKey: k, count: 1 };
    else {
      if (n < best.min) { best.min = n; best.minKey = k; }
      if (n > best.max) { best.max = n; best.maxKey = k; }
      best.count += 1;
      best.spread = best.max - best.min;
    }
  }
  return best;
}

export function widthSpread(u: OpeningUnit) {
  return spreadOf<WidthKey>(u, WIDTH_KEYS);
}
export function heightSpread(u: OpeningUnit) {
  return spreadOf<HeightKey>(u, HEIGHT_KEYS);
}

export function isFaceMount(mount: OpeningData["mount"]): boolean {
  return mount === "face_out" || mount === "face_in";
}

/** The per-side allowance that applies to this mount, in inches. */
export function sideAllowance(o: Pick<OpeningData, "mount" | "clearance" | "overlap">): number | null {
  const raw = isFaceMount(o.mount) ? o.overlap : o.clearance;
  const n = parseMeas(raw);
  return n === null || n < 0 ? null : n;
}

export interface FabSize {
  /** Finished width / height the shop builds to. */
  width: number;
  height: number;
  /** The opening measurement each one is taken from. */
  widthFrom: WidthKey;
  heightFrom: HeightKey;
  /** The opening dimension used, before the allowance. */
  openW: number;
  openH: number;
  allowance: number;
  face: boolean;
}

/**
 * The size that governs fabrication.
 *
 * Inside the reveal the piece has to pass the TIGHTEST point, so the smallest
 * width and height govern, minus the clearance on each side. Face-mounted, it
 * has to cover the WIDEST point, so the largest governs, plus the overlap on
 * each side. Returns null until at least one width and one height are known,
 * or when the clearance would leave nothing to build.
 */
export function openingFabSize(
  o: Pick<OpeningData, "mount" | "clearance" | "overlap">,
  u: OpeningUnit
): FabSize | null {
  const ws = widthSpread(u);
  const hs = heightSpread(u);
  const a = sideAllowance(o);
  if (!ws || !hs || a === null) return null;
  const face = isFaceMount(o.mount);
  const openW = face ? ws.max : ws.min;
  const openH = face ? hs.max : hs.min;
  const sign = face ? 1 : -1;
  const width = openW + sign * 2 * a;
  const height = openH + sign * 2 * a;
  if (width <= 0 || height <= 0) return null;
  return {
    width,
    height,
    widthFrom: face ? ws.maxKey : ws.minKey,
    heightFrom: face ? hs.maxKey : hs.minKey,
    openW,
    openH,
    allowance: a,
    face,
  };
}

export interface Squareness {
  /** |diagA − diagB| — null until both are measured. */
  diagDiff: number | null;
  diagLevel: CheckLevel;
  widthSpread: number | null;
  widthLevel: CheckLevel;
  heightSpread: number | null;
  heightLevel: CheckLevel;
  /** Worst of the three. */
  level: CheckLevel;
}

const RANK: Record<CheckLevel, number> = { na: 0, green: 1, yellow: 2, red: 3 };
export function worstLevel(levels: CheckLevel[]): CheckLevel {
  return levels.reduce<CheckLevel>((w, l) => (RANK[l] > RANK[w] ? l : w), "na");
}

export function openingSquareness(u: OpeningUnit, tol = OPENING_TOLERANCES): Squareness {
  const a = parseMeas(u.diagA);
  const b = parseMeas(u.diagB);
  const diagDiff = a !== null && b !== null && a > 0 && b > 0 ? Math.abs(a - b) : null;
  const ws = widthSpread(u);
  const hs = heightSpread(u);
  const wsp = ws && ws.count >= 2 ? ws.spread : null;
  const hsp = hs && hs.count >= 2 ? hs.spread : null;
  const diagLevel: CheckLevel = diagDiff === null ? "na" : gradeOpening(diagDiff, tol.square);
  const widthLevel: CheckLevel = wsp === null ? "na" : gradeOpening(wsp, tol.spread);
  const heightLevel: CheckLevel = hsp === null ? "na" : gradeOpening(hsp, tol.spread);
  return {
    diagDiff,
    diagLevel,
    widthSpread: wsp,
    widthLevel,
    heightSpread: hsp,
    heightLevel,
    level: worstLevel([diagLevel, widthLevel, heightLevel]),
  };
}

/** How tall the Juliet guard has to stand above the sill to reach the code height. */
export function julietGuardAboveSill(o: Pick<OpeningData, "julietSill" | "julietGuard">): number | null {
  const sill = parseMeas(o.julietSill);
  const req = parseMeas(o.julietGuard);
  if (sill === null || req === null) return null;
  return Math.max(0, req - sill);
}

/** Sum of every opening's quantity — the number of pieces the shop builds. */
export function openingPieceCount(o: OpeningData): number {
  return o.units.reduce((n, u) => {
    const q = parseInt(u.qty || "1", 10);
    return n + (Number.isFinite(q) && q > 0 ? q : 1);
  }, 0);
}

export function unitTag(u: OpeningUnit, i: number): string {
  return u.label.trim() ? u.label.trim() : `#${i + 1}`;
}

// ---- Checks -----------------------------------------------------------------

function cr(key: string, level: CheckLevel, expected: number | null, actual: number | null, detail?: string): CheckResult {
  return {
    key,
    level,
    expected,
    actual,
    delta: expected !== null && actual !== null ? actual - expected : null,
    unit: "in",
    detail,
  };
}

/** A badly out-of-square hole is red until somebody decides how to build it. */
function decided(level: CheckLevel, u: OpeningUnit): CheckLevel {
  return level === "red" && u.squareFix ? "yellow" : level;
}

export function openingChecks(o: OpeningData | null | undefined, tol = OPENING_TOLERANCES): CheckResult[] {
  const out: CheckResult[] = [];
  if (!o) return out;
  o.units.forEach((u, i) => {
    const tag = unitTag(u, i);
    const a = parseMeas(u.diagA);
    const b = parseMeas(u.diagB);
    if (a !== null && b !== null && a > 0 && b > 0) {
      out.push(cr("op_square", decided(gradeOpening(a - b, tol.square), u), Math.min(a, b), Math.max(a, b), tag));
    } else {
      out.push(cr("op_square", "na", null, null, tag));
    }
    const ws = widthSpread(u);
    if (ws && ws.count >= 2) out.push(cr("op_width_spread", decided(gradeOpening(ws.spread, tol.spread), u), ws.min, ws.max, tag));
    const hs = heightSpread(u);
    if (hs && hs.count >= 2) out.push(cr("op_height_spread", decided(gradeOpening(hs.spread, tol.spread), u), hs.min, hs.max, tag));

    // A misread tape: the diagonals have to agree with the width and height
    // they span, whatever the squareness.
    const w = parseMeas(u.wMid) ?? (ws ? (ws.min + ws.max) / 2 : null);
    const h = parseMeas(u.hCenter) ?? (hs ? (hs.min + hs.max) / 2 : null);
    if (a !== null && b !== null && a > 0 && b > 0 && w !== null && h !== null) {
      const expect = Math.hypot(w, h);
      const mean = (a + b) / 2;
      out.push(cr("op_diag_vs_wh", gradeOpening(mean - expect, tol.diagWH), expect, mean, tag));
    }

    const q = parseInt(u.qty || "1", 10);
    if (Number.isFinite(q) && q > 1) {
      out.push({ key: "op_typical", level: "yellow", expected: null, actual: null, delta: null, unit: "in", detail: `${tag} × ${q}` });
    }

    if (o.product && OPENING_EGRESS_PRODUCTS.includes(o.product as OpeningProduct) && u.egress === "yes" && u.quickRelease === "no") {
      out.push({ key: "op_egress_release", level: "red", expected: null, actual: null, delta: null, unit: "in", detail: tag });
    }

    // Emergency escape openings, IRC R310.2 (780 CMR 51.00): net clear opening
    // ≥ 5.7 sq ft (5.0 at a grade-floor opening), ≥ 24" high, ≥ 20" wide, and
    // the sill ≤ 44" above the floor. The measured hole is the upper bound of
    // the sash's net clear opening, so a hole that already fails is red; a
    // passing hole still needs the window's own net clear checked.
    if (o.product === "guard" && u.egress === "yes") {
      const w = ws ? ws.min : null, h = hs ? hs.min : null;
      if (w !== null && h !== null) {
        const sf = (w * h) / 144;
        const level: CheckLevel = w < 20 || h < 24 || sf < 5 ? "red" : sf < 5.7 ? "yellow" : "green";
        out.push({ key: "op_egress_size", level, expected: null, actual: null, delta: null, unit: "in", detail: `${tag} · ${sf.toFixed(1)} sq ft` });
      }
      const sill = parseMeas(u.sillAff);
      if (sill !== null) out.push(cr("op_egress_sill", sill > 44 ? "red" : "green", 44, sill, tag));
    }

    // Window fall protection, IRC R312.2.1: an operable window whose sill is
    // under 24" above the floor and more than 72" above grade outside needs a
    // guard, a fall-prevention device or an opening limiter.
    const fallSill = parseMeas(o.product === "juliet" ? o.julietSill : u.sillAff), drop = parseMeas(u.dropOutside);
    if (fallSill !== null && drop !== null && fallSill < 24 && drop > 72) {
      const protects = o.product === "guard" || o.product === "juliet";
      out.push({ key: "op_fall_protection", level: protects ? "green" : "yellow", expected: null, actual: null, delta: null, unit: "in", detail: tag });
    }
  });

  const s = sideAllowance(o);
  if (s !== null) {
    o.units.forEach((u, i) => {
      const ws = widthSpread(u);
      const hs = heightSpread(u);
      if (ws && hs && !openingFabSize(o, u)) {
        out.push({ key: "op_fab_none", level: "red", expected: null, actual: null, delta: null, unit: "in", detail: unitTag(u, i) });
      }
    });
  }

  if (o.product === "juliet" && o.julietDoorSwing === "out" && o.julietDoorClears === "no") {
    out.push({ key: "op_juliet_door", level: "red", expected: null, actual: null, delta: null, unit: "in" });
  }
  if (o.product && OPENING_DOOR_PRODUCTS.includes(o.product as OpeningProduct) && o.doorHinge && o.lockSide && o.doorHinge === o.lockSide) {
    out.push({ key: "op_lock_side", level: "red", expected: null, actual: null, delta: null, unit: "in" });
  }
  return out;
}

// ---- What the sheet still needs -------------------------------------------

export function openingGaps(o: OpeningData | null | undefined, photos: { slot: string }[]): Gap[] {
  const gaps: Gap[] = [];
  const has = (s: string | undefined | null) => !!s && s.trim() !== "";
  if (!o) return [{ key: "op_missing" }];
  if (!has(o.product)) gaps.push({ key: "op_product" });
  if (!has(o.mount)) gaps.push({ key: "op_mount" });
  if (isFaceMount(o.mount) ? !has(o.overlap) : !has(o.clearance)) gaps.push({ key: isFaceMount(o.mount) ? "op_overlap" : "op_clearance" });
  if (o.units.length === 0) gaps.push({ key: "op_units" });

  const product = o.product as OpeningProduct | "";
  const egressAsked = !!product && OPENING_EGRESS_PRODUCTS.includes(product);
  o.units.forEach((u, i) => {
    const tag = unitTag(u, i);
    if (WIDTH_KEYS.some((k) => !has(u[k]))) gaps.push({ key: "op_widths", detail: tag });
    if (HEIGHT_KEYS.some((k) => !has(u[k]))) gaps.push({ key: "op_heights", detail: tag });
    if (!has(u.diagA) || !has(u.diagB)) gaps.push({ key: "op_diagonals", detail: tag });
    if (o.mount === "reveal" && !has(u.reveal)) gaps.push({ key: "op_reveal", detail: tag });
    if (egressAsked) {
      if (!has(u.egress)) gaps.push({ key: "op_egress", detail: tag });
      // A sleeping-room window or an exit door with bars on it has to open
      // from inside without a key. Leaving that unsaid is how people die.
      else if (u.egress === "yes" && !has(u.quickRelease)) gaps.push({ key: "op_quick_release", detail: tag });
    }
  });

  if (!has(o.substrate)) gaps.push({ key: "op_substrate" });
  if (!has(o.anchor)) gaps.push({ key: "op_anchor" });

  if (product === "juliet") {
    if (!has(o.julietSill)) gaps.push({ key: "op_juliet_sill" });
    if (!has(o.julietGuard)) gaps.push({ key: "op_juliet_guard" });
    if (!has(o.julietProjection)) gaps.push({ key: "op_juliet_projection" });
    if (!has(o.julietDoorSwing)) gaps.push({ key: "op_juliet_swing" });
    else if (o.julietDoorSwing === "out" && !has(o.julietDoorClears)) gaps.push({ key: "op_juliet_clears" });
  }
  if (product && OPENING_DOOR_PRODUCTS.includes(product)) {
    if (!has(o.doorHinge)) gaps.push({ key: "op_door_hinge" });
    if (!has(o.doorSwing)) gaps.push({ key: "op_door_swing" });
    if (!has(o.threshold)) gaps.push({ key: "op_door_threshold" });
    if (!has(o.jambMaterial)) gaps.push({ key: "op_door_jamb" });
    if (!has(o.lockSide)) gaps.push({ key: "op_door_lock" });
  }

  const filled = new Set(photos.map((p) => p.slot));
  for (const slot of OPENING_PHOTO_SLOTS) {
    if (!filled.has(slot)) gaps.push({ key: "photo", detail: slot, tier: "doc" });
  }
  return gaps;
}

/** Values that count toward the sheet's completeness badge. */
export function openingProgressValues(o: OpeningData): string[] {
  const vals: string[] = [o.product, o.mount, o.substrate, o.anchor];
  for (const u of o.units) vals.push(u.wTop, u.wMid, u.wBot, u.hLeft, u.hCenter, u.hRight, u.diagA, u.diagB);
  return vals;
}
