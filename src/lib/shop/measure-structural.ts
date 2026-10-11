// KIW Field Measure — structural steel.
//
// Beams, lintels, columns / lally columns, posts, moment frames, porch column
// replacements and ledger angles. A structural sheet is not a railing: there is
// no rail, no infill and no stair. What the shop needs is a MEMBER LIST — every
// piece of steel with its role, its profile (usually off an engineer's stamped
// drawing) and the field dimensions it will be cut from — and proof that those
// dimensions agree with each other and with the drawing before anything is cut.
//
// The failures this sheet exists to prevent:
//   - a beam cut to the clear span measured once, at the one place the opening
//     happened to be narrow, so it does not bear at the other face;
//   - a lintel with 2" of bearing on brick, which is a crack waiting to happen;
//   - four columns cut to one height on a slab that falls 3/4" across the room;
//   - a field dimension that quietly disagrees with the stamped drawing;
//   - a 22' beam that does not fit through the basement door.
//
// Everything here is pure: parsing, cut lengths, weights, checks and gaps. The
// UI (shapes/StructuralSections.tsx) and print (StructuralPrint.tsx) only read it.

import { parseMeas } from "./measure-parse";
import type { CheckLevel, CheckResult, Gap } from "./measure-checks";

// ---- Model ------------------------------------------------------------------

export const STRUCT_ROLES = ["beam", "lintel", "column", "post", "brace", "ledger", "cover"] as const;
export type StructRole = (typeof STRUCT_ROLES)[number];

export const STRUCT_SUBSTRATES = ["brick", "block", "concrete", "stone", "wood", "steel"] as const;
export type StructSubstrate = "" | (typeof STRUCT_SUBSTRATES)[number];

export const STRUCT_CONDITIONS = ["good", "fair", "poor"] as const;
export type StructCondition = "" | (typeof STRUCT_CONDITIONS)[number];

export const STRUCT_CARRIES = ["joists", "wall", "roof", "point", "nothing"] as const;
export const STRUCT_SHORING = ["none", "shores", "needles", "tbd"] as const;
export const STRUCT_FOOTINGS = ["known", "unknown", "new"] as const;
export const STRUCT_FINISHES = ["dtm", "galvanized", "primer", "intumescent"] as const;
export const STRUCT_LIFTS = ["hand", "dolly", "lift", "crane"] as const;

/** One end of a beam or lintel, or the base of a column. */
export interface StructBearing {
  substrate: StructSubstrate;
  condition: StructCondition;
  /** Bearing length available / to be provided at this end (into the wall). */
  length: string;
  /** Wall thickness at this end — bearing can never be longer than the wall. */
  wall: string;
}

/** One reading of a dimension taken at a named place ("C1 front", "at drain"). */
export interface StructReading {
  id: string;
  label: string;
  value: string;
}

export interface StructMember {
  id: string;
  mark: string; // B1, L1, C1 …
  role: StructRole;
  profile: string; // W8x15, HSS4x4x1/4, L4x4x3/8, 3-1/2" lally, or "TBD by engineer"
  qty: string;
  // Spanning members (beam / lintel / ledger / brace)
  spanA: string; // clear span, first reading (top / one face)
  spanB: string; // clear span, second reading (bottom / other face)
  bearingL: StructBearing;
  bearingR: StructBearing;
  minBearing: string; // the drawing's required bearing; overrides the shop rule
  existing: string; // existing lintel / beam / column size, as found
  elevation: string; // top of steel, relative to the sheet datum
  carries: "" | (typeof STRUCT_CARRIES)[number];
  shoring: "" | (typeof STRUCT_SHORING)[number];
  // Vertical members (column / post / cover)
  heights: StructReading[]; // top of slab / footing to underside of beam
  plumb: string; // out of plumb over the height, as read on the level
  base: StructBearing; // what the column stands on
  footing: "" | (typeof STRUCT_FOOTINGS)[number];
  footingSize: string;
  basePlate: string; // 12x12x3/8, or "none"
  capPlate: string; // 8x8x3/8, or "none"
  anchors: string; // (4) 5/8" adhesive anchors, 7" embed
  shim: string; // allowance left for shims / grout
  finishFloor: string; // finish floor to be added later, raising the base
  // Engineer's drawing values, entered beside the field value they compare to
  dwgSpan: string;
  dwgHeight: string;
  dwgElevation: string;
  notes: string;
}

export interface StructFrame {
  on: boolean;
  opening: string; // clear opening the frame sits in
  cc: string; // column centre to centre
  diagA: string; // corner-to-corner diagonals of the opening
  diagB: string;
  dwgOpening: string;
  dwgCc: string;
}

export interface StructEngineering {
  stamped: "" | "yes" | "no";
  drawingNo: string;
  revision: string;
  engineer: string;
  required: "" | "yes" | "no";
  permit: "" | "yes" | "no" | "others";
  connection: string; // welded / bolted per drawing
}

export interface StructAccess {
  path: string; // how the steel gets in: bulkhead, side yard, through the kitchen
  doorWidth: string;
  stairWidth: string;
  maxLength: string; // longest piece that fits through that path
  maxWeight: string; // heaviest piece the crew can move there, lb
  lift: "" | (typeof STRUCT_LIFTS)[number];
  splice: string; // where a too-long piece may be spliced
}

export interface StructuralData {
  datum: string; // what elevations are measured from
  members: StructMember[];
  frame: StructFrame;
  eng: StructEngineering;
  finish: "" | (typeof STRUCT_FINISHES)[number];
  fireRating: string;
  color: string;
  access: StructAccess;
  notes: string;
}

let seq = 0;
function sid(): string {
  seq = (seq + 1) % 1e6;
  return `st${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function blankBearing(): StructBearing {
  return { substrate: "", condition: "", length: "", wall: "" };
}

export function newReading(label = ""): StructReading {
  return { id: sid(), label, value: "" };
}

export const ROLE_PREFIX: Record<StructRole, string> = {
  beam: "B", lintel: "L", column: "C", post: "P", brace: "BR", ledger: "LG", cover: "CC",
};

export function isSpanning(role: StructRole): boolean {
  return role === "beam" || role === "lintel" || role === "ledger" || role === "brace";
}
export function isBearingRole(role: StructRole): boolean {
  return role === "beam" || role === "lintel";
}
export function isVertical(role: StructRole): boolean {
  return role === "column" || role === "post" || role === "cover";
}

export function newMember(role: StructRole, mark = "", profile = ""): StructMember {
  return {
    id: sid(), mark, role, profile, qty: "1",
    spanA: "", spanB: "", bearingL: blankBearing(), bearingR: blankBearing(), minBearing: "",
    existing: "", elevation: "", carries: "", shoring: "",
    // Two readings by default: one is never enough on a slab nobody has levelled.
    heights: isVertical(role) ? [newReading(), newReading()] : [],
    plumb: "", base: blankBearing(), footing: "", footingSize: "",
    basePlate: "", capPlate: "", anchors: "", shim: "", finishFloor: "",
    dwgSpan: "", dwgHeight: "", dwgElevation: "", notes: "",
  };
}

/** Next free mark for a role: B1, B2 … */
export function nextMark(members: StructMember[], role: StructRole): string {
  const p = ROLE_PREFIX[role];
  const used = new Set(members.map((m) => m.mark.toUpperCase()));
  for (let i = 1; i < 200; i++) if (!used.has(`${p}${i}`)) return `${p}${i}`;
  return `${p}${members.length + 1}`;
}

export function blankStructural(): StructuralData {
  return {
    datum: "",
    members: [],
    frame: { on: false, opening: "", cc: "", diagA: "", diagB: "", dwgOpening: "", dwgCc: "" },
    eng: { stamped: "", drawingNo: "", revision: "", engineer: "", required: "", permit: "", connection: "" },
    // DTM paint is the shop default unless galvanized or powder coat is asked for.
    finish: "dtm",
    fireRating: "",
    color: "Black",
    access: { path: "", doorWidth: "", stairWidth: "", maxLength: "", maxWeight: "", lift: "", splice: "" },
    notes: "",
  };
}

/** Fill anything a stored sheet predates. Never drops a value. */
export function normalizeStructural(s: Partial<StructuralData> | null | undefined): StructuralData | null {
  if (!s) return null;
  const b = blankStructural();
  const bearing = (x?: Partial<StructBearing>) => ({ ...blankBearing(), ...(x || {}) });
  return {
    ...b,
    ...s,
    frame: { ...b.frame, ...(s.frame || {}) },
    eng: { ...b.eng, ...(s.eng || {}) },
    access: { ...b.access, ...(s.access || {}) },
    members: (s.members || []).map((m) => {
      const base = newMember(m.role || "beam");
      return {
        ...base,
        ...m,
        heights: (m.heights || []).map((r) => ({ ...newReading(), ...r })),
        bearingL: bearing(m.bearingL),
        bearingR: bearing(m.bearingR),
        base: bearing(m.base),
      };
    }),
  };
}

// ---- Templates ----------------------------------------------------------------
// The jobs KIW actually measures. Each adds members to the sheet; nothing here
// is a size — the profile comes from the drawing or is typed in the field.

export type StructTemplate = "beam" | "lintel" | "columns" | "frame" | "porch" | "ledger";
export const STRUCT_TEMPLATES: StructTemplate[] = ["frame", "beam", "lintel", "columns", "porch", "ledger"];

export function applyTemplate(s: StructuralData, t: StructTemplate): void {
  const add = (role: StructRole, profile = "") => {
    const m = newMember(role, nextMark(s.members, role), profile);
    s.members.push(m);
    return m;
  };
  if (t === "beam") add("beam");
  else if (t === "lintel") {
    const m = add("lintel");
    m.carries = "wall";
  } else if (t === "columns") {
    const m = add("column", '3-1/2" lally');
    m.qty = "1";
  } else if (t === "frame") {
    add("beam");
    add("column");
    add("column");
    s.frame.on = true;
  } else if (t === "porch") {
    const m = add("post");
    m.qty = "1";
  } else if (t === "ledger") add("ledger", "L4x4x3/8");
}

// ---- Profiles: naming, weight per foot, depth --------------------------------
// Weights are lb/ft. W, S, M, HP, C and MC carry their weight in the name; HSS,
// angles, plate and pipe are computed or looked up. "≈" weights are flagged so
// nobody quotes freight off a formula.

export interface ProfileInfo {
  family: "W" | "S" | "M" | "HP" | "C" | "MC" | "HSS" | "L" | "PIPE" | "LALLY" | "PL";
  label: string; // normalised: W8x15, HSS4x4x1/4 …
  lbPerFt: number;
  depth: number | null; // in-plane depth, in
  width: number | null; // flange / leg width, in
  approx: boolean;
}

// Actual depth (d) and flange width (bf) for the W shapes KIW meets in houses.
const W_DIMS: Record<string, [number, number]> = {
  W4x13: [4.16, 4.06],
  W5x16: [5.01, 5.0], W5x19: [5.15, 5.03],
  W6x9: [5.9, 3.94], W6x12: [6.03, 4.0], W6x15: [5.99, 5.99], W6x16: [6.28, 4.03],
  W6x20: [6.2, 6.02], W6x25: [6.38, 6.08],
  W8x10: [7.89, 3.94], W8x13: [7.99, 4.0], W8x15: [8.11, 4.02], W8x18: [8.14, 5.25],
  W8x21: [8.28, 5.27], W8x24: [7.93, 6.5], W8x28: [8.06, 6.54], W8x31: [8.0, 8.0],
  W8x35: [8.12, 8.02], W8x40: [8.25, 8.07],
  W10x12: [9.87, 3.96], W10x15: [9.99, 4.0], W10x17: [10.1, 4.01], W10x19: [10.2, 4.02],
  W10x22: [10.2, 5.75], W10x26: [10.3, 5.77], W10x30: [10.5, 5.81], W10x33: [9.73, 7.96],
  W10x39: [9.92, 7.99], W10x45: [10.1, 8.02],
  W12x14: [11.9, 3.97], W12x16: [12.0, 3.99], W12x19: [12.2, 4.01], W12x22: [12.3, 4.03],
  W12x26: [12.2, 6.49], W12x30: [12.3, 6.52], W12x35: [12.5, 6.56], W12x40: [11.9, 8.01],
  W12x45: [12.1, 8.05], W12x50: [12.2, 8.08],
  W14x22: [13.7, 5.0], W14x26: [13.9, 5.03], W14x30: [13.8, 6.73], W14x34: [14.0, 6.75],
  W16x26: [15.7, 5.5], W16x31: [15.9, 5.53], W16x36: [15.9, 6.99], W16x40: [16.0, 7.0],
  W18x35: [17.7, 6.0], W18x40: [17.9, 6.02], W18x46: [18.1, 6.06],
};

// AISC tabulated weights for common square / rectangular HSS (lb/ft).
const HSS_WEIGHTS: Record<string, number> = {
  "2x2x1/8": 3.05, "2x2x3/16": 4.32, "2x2x1/4": 5.41,
  "2-1/2x2-1/2x3/16": 5.59, "2-1/2x2-1/2x1/4": 7.11,
  "3x3x1/8": 4.75, "3x3x3/16": 6.87, "3x3x1/4": 8.81, "3x3x5/16": 10.58,
  "3-1/2x3-1/2x1/4": 10.51, "3-1/2x3-1/2x5/16": 12.7,
  "4x4x1/8": 6.46, "4x4x3/16": 9.42, "4x4x1/4": 12.21, "4x4x5/16": 14.83, "4x4x3/8": 17.27, "4x4x1/2": 21.63,
  "5x5x3/16": 11.97, "5x5x1/4": 15.62, "5x5x5/16": 19.08, "5x5x3/8": 22.37, "5x5x1/2": 28.43,
  "6x6x3/16": 14.53, "6x6x1/4": 19.02, "6x6x5/16": 23.34, "6x6x3/8": 27.48, "6x6x1/2": 35.24,
  "8x8x1/4": 25.82, "8x8x5/16": 31.84, "8x8x3/8": 37.69, "8x8x1/2": 48.85,
  "3x2x3/16": 5.59, "3x2x1/4": 7.11, "4x2x3/16": 6.87, "4x2x1/4": 8.81,
  "4x3x1/4": 10.51, "5x3x1/4": 12.21, "6x2x1/4": 12.21, "6x3x1/4": 13.91, "6x4x1/4": 15.62,
  "6x4x3/8": 22.37, "8x4x1/4": 19.02, "8x4x3/8": 27.48, "8x6x1/4": 22.42, "8x6x3/8": 32.58,
  "10x4x1/4": 22.42, "10x6x3/8": 37.69,
};

// Standard-weight pipe by OD (in) → lb/ft. Adjustable posts and lally shells.
const PIPE_STD: Record<string, [number, number]> = {
  // nominal: [OD, lb/ft]
  "2": [2.375, 3.65], "2-1/2": [2.875, 5.79], "3": [3.5, 7.58], "3-1/2": [4.0, 9.11],
  "4": [4.5, 10.79], "5": [5.563, 14.62], "6": [6.625, 18.97],
};

// Concrete-filled lally columns by OD. Shell plus fill; varies by maker.
const LALLY: Record<string, number> = {
  "3-1/2": 10.5, "4": 13.0, "4-1/2": 15.5, "5-9/16": 22.0,
};

function frac(t: string): number | null {
  const s = t.trim().replace(/"/g, "");
  if (!/^[\d./\s-]+$/.test(s)) return null;
  return parseMeas(s);
}

function fmtFrac(n: number): string {
  const whole = Math.floor(n + 1e-9);
  const rem = n - whole;
  const s16 = Math.round(rem * 16);
  if (s16 === 0) return String(whole);
  if (s16 === 16) return String(whole + 1);
  let num = s16, den = 16;
  while (num % 2 === 0) { num /= 2; den /= 2; }
  return whole ? `${whole}-${num}/${den}` : `${num}/${den}`;
}

/** Parse a profile name as crews and engineers write it. Null when unknown. */
export function profileInfo(raw: string | null | undefined): ProfileInfo | null {
  if (!raw) return null;
  const s = raw.trim().toUpperCase().replace(/[×*]/g, "X").replace(/″|''/g, '"');
  if (!s || /TBD/.test(s)) return null;
  const compact = s.replace(/\s+/g, "");

  // Rolled shapes: weight is in the name.
  const rolled = compact.match(/^(W|S|M|HP|MC|C)(\d+(?:\.\d+)?)X(\d+(?:\.\d+)?)$/);
  if (rolled) {
    const family = rolled[1] as ProfileInfo["family"];
    const label = `${family}${rolled[2]}x${rolled[3]}`;
    const dims = family === "W" ? W_DIMS[label] : undefined;
    return {
      family, label, lbPerFt: parseFloat(rolled[3]),
      depth: dims ? dims[0] : parseFloat(rolled[2]),
      width: dims ? dims[1] : null,
      approx: false,
    };
  }

  // Lally column: 3-1/2" lally, LALLY 4"
  if (/LALLY/.test(compact)) {
    const m = s.match(/(\d+(?:[-\s]\d+\/\d+)?(?:\.\d+)?)/);
    const od = m ? frac(m[1]) : null;
    if (od === null) return null;
    const key = fmtFrac(od);
    const lb = LALLY[key] ?? 3.4 * Math.PI * od * 0.12 + 0.65 * od * od; // shell + fill, rough
    return { family: "LALLY", label: `${key}" lally`, lbPerFt: lb, depth: od, width: od, approx: true };
  }

  // Pipe: PIPE3STD, 3" SCH40 PIPE, PIPE 3-1/2
  if (/PIPE|SCH/.test(compact)) {
    const m = s.replace(/SCH\s*\d+/g, "").match(/(\d+(?:[-\s]\d+\/\d+)?(?:\.\d+)?)/);
    const nom = m ? frac(m[1]) : null;
    if (nom === null) return null;
    const row = PIPE_STD[fmtFrac(nom)];
    if (!row) return null;
    return { family: "PIPE", label: `Pipe ${fmtFrac(nom)} STD`, lbPerFt: row[1], depth: row[0], width: row[0], approx: false };
  }

  // HSS / tube a x b x t
  const tube = compact.match(/^(?:HSS|TS|TUBE)?([\d./-]+)X([\d./-]+)X([\d./-]+)(?:TUBE|HSS)?$/);
  if (tube && (/^(HSS|TS|TUBE)/.test(compact) || /TUBE|HSS$/.test(compact))) {
    const a = frac(tube[1]), b = frac(tube[2]), t = frac(tube[3]);
    if (a === null || b === null || t === null || t <= 0 || 2 * t >= Math.min(a, b)) return null;
    const [big, small] = a >= b ? [a, b] : [b, a];
    const key = `${fmtFrac(big)}x${fmtFrac(small)}x${fmtFrac(t)}`;
    const tab = HSS_WEIGHTS[key];
    // Nominal wall, outside corner radius 2t / inside t (lands within ~1% of
    // the AISC tables for the sizes above).
    const area = 2 * t * (big + small - 2 * t) - (4 - Math.PI) * ((2 * t) ** 2 - t ** 2);
    return {
      family: "HSS", label: `HSS${key}`, lbPerFt: tab ?? 3.4 * area,
      depth: a, width: b, approx: tab === undefined,
    };
  }

  // Angle: L4x4x3/8
  const ang = compact.match(/^L([\d./-]+)X([\d./-]+)X([\d./-]+)$/);
  if (ang) {
    const a = frac(ang[1]), b = frac(ang[2]), t = frac(ang[3]);
    if (a === null || b === null || t === null || t <= 0 || t >= Math.min(a, b)) return null;
    return {
      family: "L", label: `L${fmtFrac(a)}x${fmtFrac(b)}x${fmtFrac(t)}`,
      lbPerFt: 3.4 * t * (a + b - t), depth: a, width: b, approx: false,
    };
  }

  // Plate / flat bar: PL3/8x12, FB 1/2x6
  const pl = compact.match(/^(?:PL|FB|FLAT)([\d./-]+)X([\d./-]+)$/);
  if (pl) {
    const x = frac(pl[1]), y = frac(pl[2]);
    if (x === null || y === null || x <= 0 || y <= 0) return null;
    const [t, w] = x <= y ? [x, y] : [y, x];
    return { family: "PL", label: `PL${fmtFrac(t)}x${fmtFrac(w)}`, lbPerFt: 3.4 * t * w, depth: w, width: t, approx: false };
  }
  return null;
}

/** Quick-pick profiles per role (free text still allowed). */
export const PROFILE_PRESETS: Record<StructRole, string[]> = {
  beam: ["W8x15", "W8x18", "W10x22", "W12x26", "TBD by engineer"],
  lintel: ["L4x4x3/8", "L6x4x3/8", "L5x3-1/2x5/16", "C8x11.5", "TBD by engineer"],
  column: ['3-1/2" lally', "W6x20", "HSS4x4x1/4", "HSS6x6x3/8", "TBD by engineer"],
  post: ["HSS4x4x1/4", "HSS6x6x1/4", "HSS3x3x1/4", "TBD by engineer"],
  brace: ["L3x3x1/4", "HSS3x3x3/16", "TBD by engineer"],
  ledger: ["L4x4x3/8", "L6x4x3/8", "C8x11.5", "TBD by engineer"],
  cover: ["HSS6x6x3/16", "HSS8x8x1/4", "TBD by engineer"],
};

export const PLATE_PRESETS = ["12x12x3/8", "10x10x1/2", "8x8x3/8", "6x6x3/8", "none"];

/** Thickness of a plate written as "12x12x3/8" or "3/8"; "none" is 0. */
export function plateThickness(spec: string | null | undefined): number | null {
  if (!spec || !spec.trim()) return null;
  const s = spec.trim().toLowerCase();
  if (/^(none|no|n\/a|-|0)$/.test(s)) return 0;
  const parts = s.replace(/^pl\s*/, "").split(/\s*[x×*]\s*/);
  const t = frac(parts[parts.length - 1]);
  return t !== null && t >= 0 && t < 4 ? t : null;
}

// ---- Shop rules -----------------------------------------------------------------
// Minimum bearing for a beam or lintel with no engineer's number. These are the
// shop's floors, not a design: masonry gets 4" under a lintel and 8" under a
// beam (a beam brings joist or point loads onto a few bricks), concrete 4", wood
// framing 3". Steel-to-steel is a connection detail, not a bearing, so it is not
// checked here. A drawing value always wins.
export const STRUCT_MIN_BEARING: Record<Exclude<StructSubstrate, "" | "steel">, { lintel: number; beam: number }> = {
  brick: { lintel: 4, beam: 8 },
  block: { lintel: 4, beam: 8 },
  stone: { lintel: 4, beam: 8 },
  concrete: { lintel: 4, beam: 4 },
  wood: { lintel: 3, beam: 3 },
};

export function requiredBearing(m: StructMember, end: StructBearing): number | null {
  const dwg = parseMeas(m.minBearing);
  if (dwg !== null && dwg > 0) return dwg;
  if (!end.substrate || end.substrate === "steel") return null;
  const rule = STRUCT_MIN_BEARING[end.substrate];
  return m.role === "lintel" ? rule.lintel : rule.beam;
}

// Tolerances for structural cross-checks (inches). Shop policy, kept with the
// sheet that uses them.
export const STRUCT_TOL = {
  span: { green: 0.25, yellow: 0.5 }, // two readings of one clear span
  height: { green: 0.25, yellow: 0.5 }, // readings at one column
  frameHeight: { green: 0.25, yellow: 0.5 }, // column to column (slab slope)
  square: { green: 0.25, yellow: 0.5 }, // diagonal difference
  drawing: { green: 0.375, yellow: 0.75 }, // field vs stamped drawing
  plumb: { green: 0.25, yellow: 0.5 },
  frameFit: 0.5, // clearance wanted each side of a frame in its opening, total
};

// ---- Derived geometry ------------------------------------------------------------

const val = (s: string | undefined | null) => parseMeas(s ?? "");

export function memberQty(m: StructMember): number {
  const n = Math.round(Number((m.qty || "").trim()));
  return Number.isFinite(n) && n > 0 ? Math.min(n, 999) : 1;
}

export function spanReadings(m: StructMember): number[] {
  return [val(m.spanA), val(m.spanB)].filter((n): n is number => n !== null && n > 0);
}

export function heightReadings(m: StructMember): number[] {
  return m.heights.map((r) => val(r.value)).filter((n): n is number => n !== null && n > 0);
}

/** The column profile a frame beam sits on — its depth sets the beam length. */
export function frameColumn(s: StructuralData): StructMember | undefined {
  return s.members.find((m) => m.role === "column" || m.role === "post");
}

export type CutPartKey =
  | "span" | "bearingL" | "bearingR" | "frameCc" | "colDepth"
  | "height" | "basePlate" | "capPlate" | "shim" | "length";

export interface CutPart {
  key: CutPartKey;
  value: number;
  sign: 1 | -1;
}

export interface StructCut {
  /** Finished cut length, inches. Null while something it needs is missing. */
  length: number | null;
  parts: CutPart[];
  /** Which input is missing, as an i18n key suffix, while length is null. */
  missing?: "span" | "bearing" | "height" | "plate" | "frame";
}

/**
 * Cut length, with every term stated:
 *   beam / lintel   longest clear-span reading + bearing L + bearing R
 *                   (the longest reading, so it bears at its worst face too)
 *   frame beam      column centre-to-centre + one column depth (outside to
 *                   outside), when the beam has no span of its own
 *   ledger / brace  longest length reading
 *   column / post   shortest height reading − base plate − cap plate − shim
 *   cover           shortest height reading − shim
 * Square cut, no kerf or weld allowance.
 */
export function memberCut(m: StructMember, s?: StructuralData | null): StructCut {
  const parts: CutPart[] = [];
  const done = (): StructCut => ({
    length: parts.reduce((t, p) => t + p.sign * p.value, 0),
    parts,
  });
  if (isSpanning(m.role)) {
    const spans = spanReadings(m);
    if (!spans.length) {
      // A frame beam is dimensioned off the columns it sits on.
      if (m.role === "beam" && s?.frame.on) {
        const cc = val(s.frame.cc);
        const col = frameColumn(s);
        const d = profileInfo(col?.profile)?.depth ?? null;
        if (cc === null || cc <= 0 || d === null) return { length: null, parts, missing: "frame" };
        parts.push({ key: "frameCc", value: cc, sign: 1 }, { key: "colDepth", value: d, sign: 1 });
        return done();
      }
      return { length: null, parts, missing: "span" };
    }
    if (!isBearingRole(m.role)) {
      parts.push({ key: "length", value: Math.max(...spans), sign: 1 });
      return done();
    }
    parts.push({ key: "span", value: Math.max(...spans), sign: 1 });
    const bl = val(m.bearingL.length), br = val(m.bearingR.length);
    if (bl === null || br === null) return { length: null, parts, missing: "bearing" };
    parts.push({ key: "bearingL", value: bl, sign: 1 }, { key: "bearingR", value: br, sign: 1 });
    return done();
  }
  const hs = heightReadings(m);
  if (!hs.length) return { length: null, parts, missing: "height" };
  parts.push({ key: "height", value: Math.min(...hs), sign: 1 });
  if (m.role !== "cover") {
    const bp = plateThickness(m.basePlate), cp = plateThickness(m.capPlate);
    if (bp === null || cp === null) return { length: null, parts, missing: "plate" };
    if (bp > 0) parts.push({ key: "basePlate", value: bp, sign: -1 });
    if (cp > 0) parts.push({ key: "capPlate", value: cp, sign: -1 });
  }
  const shim = val(m.shim);
  if (shim !== null && shim > 0) parts.push({ key: "shim", value: shim, sign: -1 });
  return done();
}

export interface MemberWeight {
  lbPerFt: number | null;
  each: number | null; // lb, one piece
  total: number | null; // lb, all pieces
  approx: boolean;
}

export function memberWeight(m: StructMember, s?: StructuralData | null): MemberWeight {
  const info = profileInfo(m.profile);
  const cut = memberCut(m, s).length;
  if (!info) return { lbPerFt: null, each: null, total: null, approx: false };
  if (cut === null || cut <= 0) return { lbPerFt: info.lbPerFt, each: null, total: null, approx: info.approx };
  const each = (cut / 12) * info.lbPerFt;
  return { lbPerFt: info.lbPerFt, each, total: each * memberQty(m), approx: info.approx };
}

export interface StructSummary {
  pieces: number;
  totalWeight: number | null; // null when no member weighs anything yet
  weightComplete: boolean; // every member has a weight
  approx: boolean;
  longest: { mark: string; length: number } | null;
  heaviest: { mark: string; weight: number } | null;
}

export function structuralSummary(s: StructuralData | null | undefined): StructSummary {
  const out: StructSummary = { pieces: 0, totalWeight: null, weightComplete: true, approx: false, longest: null, heaviest: null };
  if (!s) return out;
  for (const m of s.members) {
    out.pieces += memberQty(m);
    const cut = memberCut(m, s).length;
    if (cut !== null && (!out.longest || cut > out.longest.length)) out.longest = { mark: m.mark, length: cut };
    const w = memberWeight(m, s);
    if (w.total === null || w.each === null) { out.weightComplete = false; continue; }
    out.totalWeight = (out.totalWeight ?? 0) + w.total;
    out.approx = out.approx || w.approx;
    if (!out.heaviest || w.each > out.heaviest.weight) out.heaviest = { mark: m.mark, weight: w.each };
  }
  if (!s.members.length) out.weightComplete = false;
  return out;
}

// ---- Checks ------------------------------------------------------------------------

function grade(delta: number, tol: { green: number; yellow: number }): CheckLevel {
  const d = Math.abs(delta);
  return d <= tol.green ? "green" : d <= tol.yellow ? "yellow" : "red";
}

function cmp(key: string, expected: number | null, actual: number | null, tol: { green: number; yellow: number }, detail?: string, cap?: CheckLevel): CheckResult | null {
  if (expected === null || actual === null) return null;
  const delta = actual - expected;
  let level = grade(delta, tol);
  if (cap === "yellow" && level === "red") level = "yellow";
  return { key, level, expected, actual, delta, unit: "in", detail };
}

/** Every structural cross-check. Only checks that can run are returned. */
export function structuralChecks(s: StructuralData | null | undefined): CheckResult[] {
  const out: CheckResult[] = [];
  if (!s) return out;
  const push = (c: CheckResult | null) => { if (c) out.push(c); };
  const stamped = s.eng.stamped === "yes";

  for (const m of s.members) {
    const tag = m.mark || ROLE_PREFIX[m.role];
    if (isSpanning(m.role)) {
      // The same opening measured twice. Out of square jambs or a bowed wall
      // show up here before the steel is cut short.
      push(cmp("struct_span_pair", val(m.spanA), val(m.spanB), STRUCT_TOL.span, tag));
      const spans = spanReadings(m);
      if (stamped && spans.length) push(cmp("struct_dwg_span", val(m.dwgSpan), Math.max(...spans), STRUCT_TOL.drawing, tag));
      if (stamped) push(cmp("struct_dwg_elev", val(m.dwgElevation), val(m.elevation), STRUCT_TOL.drawing, tag));
    }
    if (isBearingRole(m.role)) {
      // A beam with no span of its own sits on columns, not in a wall.
      const framed = m.role === "beam" && !spanReadings(m).length && s.frame.on;
      if (!framed) {
        for (const [end, b] of [["L", m.bearingL], ["R", m.bearingR]] as const) {
          const have = val(b.length);
          const need = requiredBearing(m, b);
          if (have !== null && need !== null) {
            out.push({
              key: "struct_bearing", level: have + 1e-9 >= need ? "green" : "red",
              expected: need, actual: have, delta: have - need, unit: "in", detail: `${tag} ${end}`,
            });
          }
          const wall = val(b.wall);
          if (have !== null && wall !== null && wall > 0 && have > wall + 1e-9) {
            // Longer than the wall is thick: the steel would stand proud of the far face.
            out.push({ key: "struct_bearing_wall", level: "yellow", expected: wall, actual: have, delta: have - wall, unit: "in", detail: `${tag} ${end}` });
          }
        }
      }
    }
    if (isVertical(m.role)) {
      const hs = heightReadings(m);
      if (hs.length >= 2) {
        // Readings at one column disagree: a sloped slab or a sagging beam.
        push(cmp("struct_column_heights", Math.max(...hs), Math.min(...hs), STRUCT_TOL.height, tag));
      }
      if (stamped && hs.length) push(cmp("struct_dwg_height", val(m.dwgHeight), Math.min(...hs), STRUCT_TOL.drawing, tag));
      const pl = val(m.plumb);
      if (pl !== null) push(cmp("struct_plumb", 0, pl, STRUCT_TOL.plumb, tag, "yellow"));
    }
  }

  // Columns measured against each other. A slab that falls across the room is
  // not a mistake, but it means each column is cut to its own height.
  const cols = s.members.filter((m) => m.role === "column" || m.role === "post");
  const colMins = cols.map((m) => ({ m, h: heightReadings(m) })).filter((x) => x.h.length).map((x) => ({ mark: x.m.mark, h: Math.min(...x.h) }));
  if (colMins.length >= 2) {
    const hi = colMins.reduce((a, b) => (b.h > a.h ? b : a));
    const lo = colMins.reduce((a, b) => (b.h < a.h ? b : a));
    push(cmp("struct_frame_heights", hi.h, lo.h, STRUCT_TOL.frameHeight, `${lo.mark}–${hi.mark}`, "yellow"));
  }

  if (s.frame.on) {
    const da = val(s.frame.diagA), db = val(s.frame.diagB);
    push(cmp("struct_frame_square", da, db, STRUCT_TOL.square));
    const cc = val(s.frame.cc), open = val(s.frame.opening);
    const d = profileInfo(frameColumn(s)?.profile)?.depth ?? null;
    if (cc !== null && open !== null && d !== null) {
      const outside = cc + d;
      const room = open - outside;
      out.push({
        key: "struct_frame_fit",
        level: room < 0 ? "red" : room < STRUCT_TOL.frameFit ? "yellow" : "green",
        expected: outside, actual: open, delta: room, unit: "in",
      });
    }
    if (stamped) {
      push(cmp("struct_dwg_cc", val(s.frame.dwgCc), cc, STRUCT_TOL.drawing));
      push(cmp("struct_dwg_opening", val(s.frame.dwgOpening), open, STRUCT_TOL.drawing));
    }
  }

  // Does the longest piece get to where it goes?
  const sum = structuralSummary(s);
  const maxLen = val(s.access.maxLength);
  if (sum.longest && maxLen !== null && maxLen > 0) {
    const over = sum.longest.length - maxLen;
    out.push({
      key: "struct_piece_length",
      level: over <= 0 ? "green" : s.access.splice.trim() ? "yellow" : "red",
      expected: maxLen, actual: sum.longest.length, delta: over, unit: "in", detail: sum.longest.mark,
    });
  }
  return out;
}

/** Heaviest piece vs what the crew can move there without equipment. */
export function weightVerdict(s: StructuralData): { level: CheckLevel; heaviest: number | null; max: number | null } {
  const sum = structuralSummary(s);
  const max = parseFloat((s.access.maxWeight || "").replace(/[^\d.]/g, ""));
  const heaviest = sum.heaviest?.weight ?? null;
  if (heaviest === null || !Number.isFinite(max) || max <= 0) return { level: "na", heaviest, max: Number.isFinite(max) ? max : null };
  const equipped = s.access.lift === "lift" || s.access.lift === "crane";
  return { level: heaviest <= max || equipped ? "green" : "yellow", heaviest, max };
}

// ---- Completeness -------------------------------------------------------------------

export function structuralGaps(s: StructuralData | null | undefined): Gap[] {
  const gaps: Gap[] = [];
  if (!s) return [{ key: "struct_missing" }];
  const has = (v: string | undefined | null) => !!v && v.trim() !== "";
  const stamped = s.eng.stamped === "yes";

  if (!has(s.eng.stamped)) gaps.push({ key: "struct_eng_stamped" });
  if (stamped && !has(s.eng.drawingNo)) gaps.push({ key: "struct_eng_drawing_no" });
  if (!has(s.eng.required) && s.eng.stamped !== "yes") gaps.push({ key: "struct_eng_required", tier: "doc" });
  if (!has(s.eng.permit)) gaps.push({ key: "struct_permit", tier: "doc" });

  if (s.members.length === 0) gaps.push({ key: "struct_members" });
  const usesElevation = s.members.some((m) => has(m.elevation));
  if (usesElevation && !has(s.datum)) gaps.push({ key: "struct_datum" });

  for (const m of s.members) {
    const tag = m.mark || ROLE_PREFIX[m.role];
    if (!has(m.profile)) gaps.push({ key: "struct_profile", detail: tag });
    else if (/tbd/i.test(m.profile)) gaps.push({ key: "struct_profile_tbd", detail: tag });
    if (!has(m.qty)) gaps.push({ key: "struct_qty", detail: tag });

    if (isSpanning(m.role)) {
      const framed = m.role === "beam" && s.frame.on && !has(m.spanA) && !has(m.spanB);
      if (!framed) {
        if (!has(m.spanA)) gaps.push({ key: "struct_span", detail: tag });
        // Twice, at two places: once is how beams get cut short.
        if (isBearingRole(m.role) && !has(m.spanB)) gaps.push({ key: "struct_span_second", detail: tag });
      }
      if (isBearingRole(m.role) && !framed) {
        for (const [end, b] of [["L", m.bearingL], ["R", m.bearingR]] as const) {
          if (!has(b.length)) gaps.push({ key: "struct_bearing_len", detail: `${tag} ${end}` });
          if (!has(b.substrate)) gaps.push({ key: "struct_bearing_substrate", detail: `${tag} ${end}` });
          if (b.substrate && b.substrate !== "steel" && b.substrate !== "wood" && !has(b.wall)) {
            gaps.push({ key: "struct_wall", detail: `${tag} ${end}` });
          }
          if (b.substrate && !b.condition) gaps.push({ key: "struct_condition", detail: `${tag} ${end}`, tier: "doc" });
        }
      }
      if (isBearingRole(m.role)) {
        if (!m.carries) gaps.push({ key: "struct_carries", detail: tag });
        if (!m.shoring) gaps.push({ key: "struct_shoring", detail: tag, tier: "doc" });
        if (!has(m.existing)) gaps.push({ key: "struct_existing", detail: tag, tier: "doc" });
      }
      if (stamped && !framed && !has(m.dwgSpan)) gaps.push({ key: "struct_dwg_value", detail: tag, tier: "doc" });
    }

    if (isVertical(m.role)) {
      const readings = m.heights.filter((r) => has(r.value)).length;
      if (readings === 0) gaps.push({ key: "struct_heights", detail: tag });
      // More than one place: slabs are rarely level.
      else if (readings < 2) gaps.push({ key: "struct_heights_second", detail: tag });
      if (m.role === "cover") {
        if (!has(m.existing)) gaps.push({ key: "struct_existing", detail: tag });
      } else {
        if (!has(m.basePlate)) gaps.push({ key: "struct_base_plate", detail: tag });
        if (!has(m.capPlate)) gaps.push({ key: "struct_cap_plate", detail: tag });
        if (plateThickness(m.basePlate) !== 0 && has(m.basePlate) && !has(m.anchors)) gaps.push({ key: "struct_anchors", detail: tag });
        if (!m.base.substrate) gaps.push({ key: "struct_base_substrate", detail: tag });
        if (!m.footing) gaps.push({ key: "struct_footing", detail: tag });
        if (!has(m.plumb)) gaps.push({ key: "struct_plumb", detail: tag, tier: "doc" });
      }
      if (stamped && !has(m.dwgHeight)) gaps.push({ key: "struct_dwg_value", detail: tag, tier: "doc" });
    }
  }

  if (s.frame.on) {
    if (!has(s.frame.opening)) gaps.push({ key: "struct_frame_opening" });
    if (!has(s.frame.cc)) gaps.push({ key: "struct_frame_cc" });
    if (!has(s.frame.diagA) || !has(s.frame.diagB)) gaps.push({ key: "struct_frame_diag" });
  }

  if (!s.finish) gaps.push({ key: "struct_finish" });
  if (s.finish === "intumescent" && !has(s.fireRating)) gaps.push({ key: "struct_fire_rating" });
  if (!has(s.access.maxLength)) gaps.push({ key: "struct_max_length" });
  if (!has(s.access.path)) gaps.push({ key: "struct_access_path", tier: "doc" });
  if (!s.access.lift) gaps.push({ key: "struct_lift", tier: "doc" });
  return gaps;
}

// ---- Materials hand-off --------------------------------------------------------------
// Every measured, cuttable piece becomes a steel source the Materials workspace
// can assign to a catalog bar. One source per piece so the takeoff counts them.

export interface StructuralSteelSource {
  key: string;
  label: string;
  role: string;
  length: number;
  profile: string;
  signature: string;
}

export function structuralSteelSources(s: StructuralData | null | undefined): StructuralSteelSource[] {
  if (!s) return [];
  const out: StructuralSteelSource[] = [];
  for (const m of s.members) {
    const cut = memberCut(m, s).length;
    if (cut === null || cut <= 0 || !m.profile.trim() || /tbd/i.test(m.profile)) continue;
    const n = memberQty(m);
    const signature = JSON.stringify([m.id, m.mark, m.role, m.profile, cut, n]);
    for (let i = 0; i < n; i++) {
      out.push({
        key: `structural-${m.id}:${i + 1}`,
        label: n > 1 ? `${m.mark}-${i + 1}` : m.mark,
        role: m.role,
        length: cut,
        profile: profileInfo(m.profile)?.label ?? m.profile,
        signature,
      });
    }
  }
  return out;
}
