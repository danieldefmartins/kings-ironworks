// Geometry verification for measure sheets. Field values are free-text
// (inches + fractions, optional feet); this module parses them, cross-checks
// redundant measurements against each other, and reports green/yellow/red
// results. It NEVER corrects a field value — it only surfaces disagreement.

import {
  requiredPhotoSlots,
  isFabCriticalPhoto,
  planPaths,
  METHODS_BY_ATTACH,
  HARDWARE_METHODS,
  HW_REQUIRED,
  FASTENER_METHODS,
  type CurveSegment,
  type FlightSegment,
  type MeasureData,
  type MeasureShape,
  type PlatformSegment,
  type PostMeasure,
  type RampSegment,
  type Termination,
  type WellData,
} from "./measure";

// ---- Parsing ---------------------------------------------------------------

// "23 3/4", "23-3/4", '23 3/4"', "3' 6 1/2\"", "41.75", "32°" → number (inches
// or degrees, caller's context). Returns null when empty or unreadable.
export function parseMeas(s: string | undefined | null): number | null {
  if (!s) return null;
  let t = s.trim().toLowerCase();
  if (t === "") return null;
  t = t.replace(/[°º]/g, "").replace(/(in|inch|inches|deg)\b/g, "").trim();

  let total = 0;
  // feet component: 3' or 3ft
  const ft = t.match(/^(\d+(?:\.\d+)?)\s*(?:'|ft)\s*/);
  if (ft) {
    total += parseFloat(ft[1]) * 12;
    t = t.slice(ft[0].length);
  }
  t = t.replace(/"/g, "").trim();
  if (t === "") return ft ? total : null;

  // inches: "a b/c", "a-b/c", "b/c", or decimal
  const m = t.match(/^(\d+(?:\.\d+)?)?(?:[\s-]*(\d+)\s*\/\s*(\d+))?$/);
  if (!m || (!m[1] && !m[2])) return null;
  if (m[1]) total += parseFloat(m[1]);
  if (m[2] && m[3]) {
    const den = parseInt(m[3], 10);
    if (!den) return null;
    total += parseInt(m[2], 10) / den;
  }
  return total;
}

// 41.766 → '41 3/4"' (nearest 1/16 for display only — never written back).
export function formatIn(n: number): string {
  const sixteenths = Math.round(n * 16);
  const whole = Math.floor(sixteenths / 16);
  let num = sixteenths % 16;
  if (num === 0) return `${whole}"`;
  let den = 16;
  while (num % 2 === 0) {
    num /= 2;
    den /= 2;
  }
  return `${whole ? `${whole} ` : ""}${num}/${den}"`;
}

// ---- Tolerances (shop policy — inches / degrees) ---------------------------

// Default tolerances — each organization can override these in its settings
// (they are shop policy, not universal engineering rules).
export interface Tol {
  green: number;
  yellow: number;
}
export interface Tolerances {
  riseSum: Tol;
  runSum: Tol;
  rake: Tol;
  angle: Tol; // degrees
  widthVar: Tol;
}
export const TOLERANCES: Tolerances = {
  riseSum: { green: 0.25, yellow: 0.75 },
  runSum: { green: 0.375, yellow: 1.0 },
  rake: { green: 0.5, yellow: 1.5 },
  angle: { green: 1.0, yellow: 2.5 },
  widthVar: { green: 0.375, yellow: 1.0 },
};
export function mergeTolerances(t?: Partial<Record<keyof Tolerances, Partial<Tol>>> | null): Tolerances {
  if (!t) return TOLERANCES;
  const out = { ...TOLERANCES } as Tolerances;
  (Object.keys(TOLERANCES) as (keyof Tolerances)[]).forEach((k) => {
    const o = t[k];
    if (o && typeof o.green === "number" && typeof o.yellow === "number") {
      out[k] = { green: o.green, yellow: o.yellow };
    }
  });
  return out;
}

export type CheckLevel = "green" | "yellow" | "red" | "na";

export interface CheckResult {
  key: string; // i18n key: check_<key>
  level: CheckLevel;
  expected: number | null; // computed from redundant measurements
  actual: number | null; // directly measured value
  delta: number | null;
  unit: "in" | "deg";
  detail?: string; // e.g. which flight
}

function grade(
  delta: number,
  tol: { green: number; yellow: number }
): CheckLevel {
  const d = Math.abs(delta);
  if (d <= tol.green) return "green";
  if (d <= tol.yellow) return "yellow";
  return "red";
}

function compare(
  key: string,
  expected: number | null,
  actual: number | null,
  tol: { green: number; yellow: number },
  unit: "in" | "deg",
  detail?: string
): CheckResult {
  if (expected === null || actual === null) {
    return { key, level: "na", expected, actual, delta: null, unit, detail };
  }
  const delta = actual - expected;
  return { key, level: grade(delta, tol), expected, actual, delta, unit, detail };
}

// ---- Cross-checks ----------------------------------------------------------

// A stair "turns" when any landing changes direction — then flight geometry
// must be verified per flight; one global run/rake spans different directions
// and proves nothing.
function stairTurns(data: MeasureData): boolean {
  return data.segments.some(
    (s) =>
      (s.kind === "platform" && (s as PlatformSegment).turn !== "none") ||
      s.kind === "curve" ||
      (s.kind === "flight" &&
        (s as FlightSegment).steps.some((st) => st.winder && (st.turnDeg || "").trim() !== ""))
  );
}

// Circular-arc redundancy: chord = 2R·sin(θ/2), arc = R·θ. With radius plus
// either sweep or chord, the other two are computable and cross-checked.
function curveChecks(seg: CurveSegment, tol: Tolerances, tag?: string): CheckResult[] {
  const out: CheckResult[] = [];
  const R = parseMeas(seg.radius);
  const chord = parseMeas(seg.chord);
  const arc = parseMeas(seg.arc);
  const sweep = parseMeas(seg.sweepDeg);
  let theta: number | null = null; // radians
  if (R !== null && R > 0) {
    if (sweep !== null && sweep > 0) theta = (sweep * Math.PI) / 180;
    else if (chord !== null && chord > 0 && chord / (2 * R) <= 1) {
      theta = 2 * Math.asin(chord / (2 * R));
    }
  }
  const calcArc = theta !== null && R !== null ? R * theta : null;
  out.push(compare("curve_arc", calcArc, arc, tol.rake, "in", tag));
  if (sweep !== null && R !== null && theta !== null) {
    const calcChord = 2 * R * Math.sin(theta / 2);
    out.push(compare("curve_chord", calcChord, chord, tol.rake, "in", tag));
  } else {
    out.push({ key: "curve_chord", level: "na", expected: null, actual: null, delta: null, unit: "in", detail: tag });
  }
  return out;
}



// ---- The sphere rule against a surface that is not one plane ---------------
//
// The same trap shows up in two places: a window well guard next to a house
// wall with a water table trim, and a stair rail next to an existing column
// with a skirt at its base. In both, the measurer naturally works off the
// surface that sticks out furthest — the trim, the skirt — and above it the
// surface steps BACK. The real gap up there is what was measured plus that
// step-back, and that is what an inspector's sphere finds.
//
//     real gap = gap measured to the proud face + how far the face behind sits back
//     allowed  = sphere - step-back
//
// Measure 4" off a 3/4" skirt and you have opened 4 3/4" above it.
export interface SphereClearance {
  sphere: number;
  setback: number; // how far the surface behind sits back from the proud face
  allowed: number; // the largest gap that may be measured to the proud face
  measured: number | null;
  real: number | null; // what the sphere will actually find
  fails: boolean;
  impossible: boolean; // the step-back alone busts the sphere
}

export function sphereClearance(
  measuredToProud: number | null,
  setback: number,
  sphere = 4
): SphereClearance {
  const back = Math.max(0, setback);
  const allowed = sphere - back;
  const real = measuredToProud === null ? null : measuredToProud + back;
  return {
    sphere,
    setback: back,
    allowed,
    measured: measuredToProud,
    real,
    fails: real !== null && real > sphere + 0.0001,
    impossible: allowed <= 0,
  };
}

// ---- Window wells ----------------------------------------------------------

// The 4" sphere rule against a house wall that is not a single plane.
//
// The guard's end post is dimensioned off the most PROUD surface — normally a
// water table trim standing off the siding. Every other band of the wall sits
// further back, so the real gap at that band is the measured gap PLUS that
// band's setback. The deepest band therefore governs:
//
//     gap at band i = postToWall + setback_i
//     worst gap     = postToWall + max(setback)
//     allowed       = sphere - max(setback)
//
// Measure 4" off the trim and a 1 1/4" recess behind it opens 5 1/4" at the
// foundation — which is what fails inspection. Returns null when the profile
// has not been measured yet.
export interface WellClearance {
  sphere: number;
  maxSetback: number;
  deepest: string; // label of the governing band
  allowed: number; // largest permissible post gap off the proud face
  actual: number | null; // what was measured
  worst: number | null; // the real gap at the deepest band
  impossible: boolean; // profile alone busts the sphere — needs a closure plate
}

export function wellClearance(well: WellData | null | undefined): WellClearance | null {
  if (!well) return null;
  const sphere = parseMeas(well.maxSphere) ?? 4;
  const bands = (well.bands || [])
    .map((b) => ({ label: b.label, setback: parseMeas(b.setback) }))
    .filter((b) => b.setback !== null) as { label: string; setback: number }[];
  if (bands.length === 0) return null;
  let deep = bands[0];
  for (const b of bands) if (b.setback > deep.setback) deep = b;
  const maxSetback = Math.max(0, deep.setback);
  const allowed = sphere - maxSetback;
  const actual = parseMeas(well.postToWall);
  return {
    sphere,
    maxSetback,
    deepest: deep.label,
    allowed,
    actual,
    worst: actual === null ? null : actual + maxSetback,
    impossible: allowed <= 0,
  };
}

function wellChecks(data: MeasureData, tol: Tolerances): CheckResult[] {
  const out: CheckResult[] = [];
  const w = data.well;
  if (!w) return out;

  // Inside dims must agree with the outside dims less the wall thickness.
  // A well has a return wall at each end but no wall on the house side.
  const outL = parseMeas(w.lengthAtHouse);
  const outP = parseMeas(w.projection);
  const th = parseMeas(w.wallThickness);
  const inL = parseMeas(w.insideLength);
  const inP = parseMeas(w.insideProjection);
  out.push(compare("well_inside_length", outL !== null && th !== null ? outL - 2 * th : null, inL, tol.runSum, "in"));
  out.push(compare("well_inside_proj", outP !== null && th !== null ? outP - th : null, inP, tol.runSum, "in"));

  // Squareness: the two inside diagonals of a rectangular well must match.
  const dA = parseMeas(w.diagA);
  const dB = parseMeas(w.diagB);
  out.push(compare("well_square", dA, dB, tol.rake, "in"));

  // THE clearance check — red blocks submit.
  const cl = wellClearance(w);
  if (w.deliverables.includes("guard")) {
    if (!cl) {
      out.push({ key: "well_clearance", level: "na", expected: null, actual: null, delta: null, unit: "in" });
    } else if (cl.impossible) {
      out.push({
        key: "well_clearance",
        level: "red",
        expected: cl.allowed,
        actual: cl.actual,
        delta: null,
        unit: "in",
        detail: cl.deepest,
      });
    } else if (cl.actual === null) {
      out.push({ key: "well_clearance", level: "na", expected: cl.allowed, actual: null, delta: null, unit: "in", detail: cl.deepest });
    } else {
      // Any worst-case gap over the sphere fails outright — this is code, not
      // a shop tolerance, so it does not get a yellow band.
      const over = cl.worst! - cl.sphere;
      out.push({
        key: "well_clearance",
        level: over > 0.0001 ? "red" : "green",
        expected: cl.allowed,
        actual: cl.actual,
        delta: over,
        unit: "in",
        detail: cl.deepest,
      });
    }
  }

  // Egress advisories (IRC R310) — jurisdictions vary, so these only warn.
  const depth = parseMeas(w.depth);
  if (depth !== null && depth > 44 && !w.deliverables.includes("ladder")) {
    out.push({ key: "well_ladder_required", level: "yellow", expected: 44, actual: depth, delta: depth - 44, unit: "in" });
  }
  if (outP !== null && outP < 36) {
    out.push({ key: "well_projection_min", level: "yellow", expected: 36, actual: outP, delta: outP - 36, unit: "in" });
  }
  if (inL !== null && inP !== null) {
    const sqft = (inL * inP) / 144;
    if (sqft < 9) {
      out.push({ key: "well_area_min", level: "yellow", expected: 9, actual: Math.round(sqft * 100) / 100, delta: Math.round((sqft - 9) * 100) / 100, unit: "in" });
    }
  }
  if (w.deliverables.includes("ladder")) {
    const sp = parseMeas(w.ladderSpacing);
    if (sp !== null && sp > 18) {
      out.push({ key: "well_rung_spacing", level: "yellow", expected: 18, actual: sp, delta: sp - 18, unit: "in" });
    }
    const so = parseMeas(w.ladderStandoff);
    if (so !== null && so < 3) {
      out.push({ key: "well_rung_standoff", level: "yellow", expected: 3, actual: so, delta: so - 3, unit: "in" });
    }
    const lw = parseMeas(w.ladderWidth);
    if (lw !== null && lw < 12) {
      out.push({ key: "well_ladder_width", level: "yellow", expected: 12, actual: lw, delta: lw - 12, unit: "in" });
    }
  }
  return out;
}


// ---- Fire escapes ----------------------------------------------------------

// Geometry that proves itself, plus the handful of code minimums worth
// flagging. Existing fire escapes routinely fail current code — that is the
// point of the inspection — so none of these block a sheet. What blocks a
// NEW installation is handled in requiredGaps.
function fireChecks(data: MeasureData, tol: Tolerances): CheckResult[] {
  const out: CheckResult[] = [];
  const f = data.fire;
  if (!f) return out;

  f.levels.forEach((l, i) => {
    const tag = l.label ? l.label : `#${i + 1}`;

    // A stair's risers must add up to the floor-to-floor it spans.
    const n = parseMeas(l.stairRisers);
    const rise = parseMeas(l.stairRise);
    const ftf = parseMeas(l.floorToFloor);
    if (n !== null && rise !== null) {
      out.push(compare("fe_riser_sum", n * rise, ftf, tol.riseSum, "in", tag));
    }

    // And the pitch must agree with that rise over that run.
    const run = parseMeas(l.stairRun);
    const ang = parseMeas(l.stairAngle);
    if (rise !== null && run !== null && run > 0) {
      const calc = (Math.atan2(rise, run) * 180) / Math.PI;
      out.push(compare("fe_stair_angle", calc, ang, tol.angle, "deg", tag));
    }

    // Guards: 42" is the current minimum for new work.
    const gh = parseMeas(l.guardHeight);
    if (gh !== null && gh < 42) {
      out.push({ key: "fe_guard_height", level: "yellow", expected: 42, actual: gh, delta: gh - 42, unit: "in", detail: tag });
    }
    // Infill: the same 4" sphere as everywhere else.
    const ps = parseMeas(l.picketSpacing);
    if (ps !== null && ps > 4) {
      out.push({ key: "fe_picket_spacing", level: "yellow", expected: 4, actual: ps, delta: ps - 4, unit: "in", detail: tag });
    }
  });

  // The stack should account for its own height: the lowest platform, plus
  // every floor-to-floor above it, equals the top platform above grade.
  const lowest = f.levels[f.levels.length - 1];
  const top = f.levels[0];
  if (lowest && top) {
    const base = parseMeas(lowest.heightAboveGrade);
    let sum: number | null = base;
    for (let i = 0; i < f.levels.length - 1 && sum !== null; i++) {
      const ftf = parseMeas(f.levels[i].floorToFloor);
      sum = ftf === null ? null : sum + ftf;
    }
    out.push(compare("fe_stack_height", sum, parseMeas(f.totalHeight), tol.riseSum, "in"));
  }

  // The drop ladder has to actually reach the ground. On an inspection or a
  // repair survey a ladder that falls short IS the finding being recorded, so
  // it must never block the sheet — only a new installation is specifying it.
  if (f.ladder.present) {
    const spec = f.purpose === "new";
    const deployed = parseMeas(f.ladder.deployedAboveGrade);
    if (deployed !== null && deployed > 0) {
      out.push({ key: "fe_ladder_reach", level: spec ? "red" : "yellow", expected: 0, actual: deployed, delta: deployed, unit: "in" });
    }
    const rung = parseMeas(f.ladder.rungSpacing);
    if (rung !== null && rung > 18) {
      out.push({ key: "fe_rung_spacing", level: spec ? "red" : "yellow", expected: 18, actual: rung, delta: rung - 18, unit: "in" });
    }
    if (f.ladder.operates === "seized") {
      out.push({ key: "fe_ladder_seized", level: spec ? "red" : "yellow", expected: null, actual: null, delta: null, unit: "in" });
    } else if (f.ladder.operates === "stiff") {
      out.push({ key: "fe_ladder_stiff", level: "yellow", expected: null, actual: null, delta: null, unit: "in" });
    }
  }
  return out;
}


// ---- Gates -----------------------------------------------------------------

function gateChecks(data: MeasureData, tol: Tolerances): CheckResult[] {
  const out: CheckResult[] = [];
  const g = data.gate;
  if (!g) return out;

  // Posts are rarely plumb. Top and bottom widths disagreeing is the number
  // that decides whether a square leaf will even fit.
  const wt = parseMeas(g.widthTop);
  const wb = parseMeas(g.widthBottom);
  out.push(compare("gate_width_agree", wt, wb, tol.widthVar, "in"));

  // Same for the two post heights, which reveal the grade across the opening.
  out.push(compare("gate_height_agree", parseMeas(g.heightHinge), parseMeas(g.heightLatch), tol.widthVar, "in"));

  // Squareness of the opening.
  out.push(compare("gate_square", parseMeas(g.diagA), parseMeas(g.diagB), tol.rake, "in"));

  // THE gate check: a leaf swinging over rising ground binds. The bottom
  // clearance has to be greater than the grade rise across the swing path,
  // or the gate stops before it is open.
  const clear = parseMeas(g.groundClearance);
  const rise = parseMeas(g.gradeRise);
  const swings = g.operation === "single_swing" || g.operation === "double_swing" || g.operation === "bifold";
  if (swings && clear !== null && rise !== null) {
    if (rise <= 0) {
      out.push({ key: "gate_swing_clearance", level: "green", expected: 0, actual: clear, delta: null, unit: "in" });
    } else {
      out.push({
        key: "gate_swing_clearance",
        level: clear > rise ? "green" : "red",
        expected: rise,
        actual: clear,
        delta: clear - rise,
        unit: "in",
      });
    }
  }

  const ps = parseMeas(g.picketSpacing);
  if (ps !== null && ps > 4) {
    out.push({ key: "gate_picket_spacing", level: g.use === "pool" ? "red" : "yellow", expected: 4, actual: ps, delta: ps - 4, unit: "in" });
  }
  return out;
}

// ---- Fence runs ------------------------------------------------------------

function fenceChecks(data: MeasureData, tol: Tolerances): CheckResult[] {
  const out: CheckResult[] = [];
  const f = data.fence;
  if (!f) return out;

  // The segments have to add up to the run measured end to end.
  let sum: number | null = 0;
  for (const sg of f.segments) {
    const L = parseMeas(sg.length);
    if (L === null) { sum = null; break; }
    sum += L;
  }
  out.push(compare("fence_run_sum", sum, parseMeas(f.totalRun), tol.runSum, "in"));

  // And the panels have to add up to the segment they sit in.
  const pw = parseMeas(f.panelWidth);
  if (pw !== null && pw > 0) {
    f.segments.forEach((sg, i) => {
      const n = parseMeas(sg.panels);
      const L = parseMeas(sg.length);
      if (n !== null && L !== null) {
        out.push(compare("fence_panel_fit", n * pw, L, tol.runSum, "in", sg.label || `#${i + 1}`));
      }
    });
  }

  const ps = parseMeas(f.picketSpacing);
  if (ps !== null && ps > 4) {
    out.push({ key: "fence_picket_spacing", level: "yellow", expected: 4, actual: ps, delta: ps - 4, unit: "in" });
  }
  return out;
}

// ---- Balcony / juliet ------------------------------------------------------

function balconyChecks(data: MeasureData): CheckResult[] {
  const out: CheckResult[] = [];
  const b = data.balcony;
  if (!b) return out;

  // An anchor that goes deeper than the slab can hold breaks straight
  // through it. Embedment plus the cover the shop wants underneath has to
  // fit inside the slab.
  const emb = parseMeas(b.anchorEmbedment);
  const th = parseMeas(b.slabThickness);
  const cover = parseMeas(b.minCover) ?? 0;
  if (emb !== null && th !== null) {
    out.push({
      key: "bal_embedment",
      level: emb + cover > th ? "red" : "green",
      expected: th - cover,
      actual: emb,
      delta: emb + cover - th,
      unit: "in",
    });
  }

  // Anchoring too near the edge blows the corner out of the slab.
  const ed = parseMeas(b.edgeDistance);
  if (ed !== null && ed < 4) {
    out.push({ key: "bal_edge_distance", level: ed < 2 ? "red" : "yellow", expected: 4, actual: ed, delta: ed - 4, unit: "in" });
  }

  const gh = parseMeas(b.guardHeight);
  if (gh !== null && gh < 42) {
    out.push({ key: "bal_guard_height", level: "yellow", expected: 42, actual: gh, delta: gh - 42, unit: "in" });
  }
  const ps = parseMeas(b.picketSpacing);
  if (ps !== null && ps > 4) {
    out.push({ key: "bal_picket_spacing", level: "yellow", expected: 4, actual: ps, delta: ps - 4, unit: "in" });
  }
  return out;
}


// ---- Deck perimeters -------------------------------------------------------

function deckChecks(data: MeasureData, tol: Tolerances): CheckResult[] {
  const out: CheckResult[] = [];
  const dk = data.deck;
  if (!dk) return out;

  const railed = dk.sides.filter((s) => s.railed);

  // The sides have to add up to the perimeter measured end to end — the same
  // discipline as a fence run, for the same reason: it is checked before
  // anything is cut.
  let sum: number | null = 0;
  for (const sd of railed) {
    const L = parseMeas(sd.length);
    if (L === null) { sum = null; break; }
    sum += L;
  }
  out.push(compare("deck_perimeter_sum", sum, parseMeas(dk.totalPerimeter), tol.runSum, "in"));

  // A closed outline's exterior angles must come to a full turn. On an
  // irregular deck — 45° cut corners, a bump-out, an octagonal end — this is
  // what catches a corner nobody wrote down, which no length check can see.
  if (dk.closedLoop) {
    let turn: number | null = 0;
    for (const sd of dk.sides) {
      const t = sd.turnDeg.trim() === "" ? 0 : parseMeas(sd.turnDeg);
      if (t === null) { turn = null; break; }
      turn += t;
    }
    if (turn !== null) {
      out.push({
        key: "deck_turn_sum",
        level: Math.abs(Math.abs(turn) - 360) <= 2 ? "green" : "red",
        expected: 360,
        actual: Math.abs(turn),
        delta: Math.abs(turn) - 360,
        unit: "deg",
      });
    }
  }

  // THE deck check. A post fixed to the deck boards alone has only the board
  // to resist the moment from a push at guard height; it levers the screws out.
  // It has to reach the rim joist or solid blocking.
  if (dk.mount === "surface") {
    const backed = dk.blocking.trim() !== "";
    out.push({
      key: "deck_post_anchorage",
      level: backed ? "yellow" : "red",
      expected: null,
      actual: null,
      delta: null,
      unit: "in",
      detail: backed ? dk.blocking : undefined,
    });
  }

  // A walking surface more than 30" above grade needs a guard, and the guard
  // has a minimum height. Under it is a spec error on something we are about
  // to fabricate, so it blocks rather than warns.
  const heights = dk.sides
    .map((s) => parseMeas(s.heightAboveGrade))
    .filter((h): h is number => h !== null);
  const maxHeight = heights.length ? Math.max(...heights) : null;
  const guardRequired = maxHeight !== null && maxHeight > 30;
  const minGuard = dk.occupancy === "commercial" ? 42 : 36;
  const gh = parseMeas(dk.guardHeight);
  if (guardRequired && gh !== null) {
    out.push({
      key: "deck_guard_height",
      level: gh < minGuard ? "red" : "green",
      expected: minGuard,
      actual: gh,
      delta: gh - minGuard,
      unit: "in",
    });
  }

  // An unrailed side that is high enough to need a guard is either the house
  // wall or an oversight — warn, never block, because only the measurer knows.
  dk.sides.forEach((sd, i) => {
    if (sd.railed) return;
    const h = parseMeas(sd.heightAboveGrade);
    if (h !== null && h > 30) {
      out.push({
        key: "deck_unrailed_height",
        level: "yellow",
        expected: 30,
        actual: h,
        delta: h - 30,
        unit: "in",
        detail: sd.label || `#${i + 1}`,
      });
    }
  });

  // Posts spaced beyond what the chosen post section can carry.
  const sp = parseMeas(dk.postSpacing);
  const maxSp = parseMeas(dk.maxPostSpacing);
  if (sp !== null) {
    if (maxSp !== null && sp > maxSp) {
      out.push({ key: "deck_post_spacing", level: "red", expected: maxSp, actual: sp, delta: sp - maxSp, unit: "in" });
    } else if (maxSp === null && sp > 72) {
      out.push({ key: "deck_post_spacing", level: "yellow", expected: 72, actual: sp, delta: sp - 72, unit: "in" });
    }
  }

  // Post count against the railed length it has to cover.
  const n = parseMeas(dk.postCount);
  if (n !== null && sp !== null && sp > 0 && sum !== null) {
    out.push(compare("deck_post_fit", (n - 1) * sp, sum, tol.runSum, "in"));
  }

  const ps = parseMeas(dk.picketSpacing);
  if (ps !== null && ps > 4) {
    out.push({ key: "deck_picket_spacing", level: "yellow", expected: 4, actual: ps, delta: ps - 4, unit: "in" });
  }

  // An opening cannot be wider than the side it is cut out of.
  dk.sides.forEach((sd, i) => {
    if (!sd.opening || sd.opening === "none") return;
    const w = parseMeas(sd.openingWidth);
    const L = parseMeas(sd.length);
    if (w !== null && L !== null && w > L) {
      out.push({
        key: "deck_opening_fit",
        level: "red",
        expected: L,
        actual: w,
        delta: w - L,
        unit: "in",
        detail: sd.label || `#${i + 1}`,
      });
    }
  });

  return out;
}

// Existing columns and walls with a skirt or trim at the base: the gap the
// measurer took off the skirt is not the gap the inspector will find above it.
function skirtChecks(data: MeasureData, sphere = 4): CheckResult[] {
  const out: CheckResult[] = [];
  for (const p of data.posts) {
    if (p.pointType !== "existing_post" && p.pointType !== "concrete_wall") continue;
    const skirt = parseMeas(p.skirtProjection);
    if (skirt === null || skirt <= 0) continue;
    const cl = sphereClearance(parseMeas(p.infillGap), skirt, sphere);
    const tag = `${p.pointType === "concrete_wall" ? "wall" : "column"}`;
    if (cl.impossible) {
      out.push({ key: "skirt_clearance", level: "red", expected: cl.allowed, actual: cl.measured, delta: null, unit: "in", detail: tag });
    } else if (cl.measured === null) {
      out.push({ key: "skirt_clearance", level: "na", expected: cl.allowed, actual: null, delta: null, unit: "in", detail: tag });
    } else {
      out.push({
        key: "skirt_clearance",
        level: cl.fails ? "red" : "green",
        expected: cl.allowed,
        actual: cl.measured,
        delta: cl.real! - cl.sphere,
        unit: "in",
        detail: tag,
      });
    }
  }
  return out;
}

export function runChecks(
  data: MeasureData,
  shape: MeasureShape,
  tolIn?: Tolerances
): CheckResult[] {
  const tol = tolIn || TOLERANCES;
  // An existing column or wall with a skirt is a hazard wherever posts are
  // placed, so this rides along with whatever else the shape checks.
  const skirt = skirtChecks(data);
  if (shape === "custom") return [...customChecks(data), ...spanChecks(data), ...skirt];
  if (shape === "window_well") return wellChecks(data, tol);
  if (shape === "fire_escape") return fireChecks(data, tol);
  if (shape === "gate") return gateChecks(data, tol);
  if (shape === "fence") return fenceChecks(data, tol);
  if (shape === "balcony") return balconyChecks(data);
  if (shape === "deck") {
    // An irregular deck can also be drawn, in which case the same
    // scale-independent closure test the custom shape uses applies here.
    const drawn = data.plan && data.plan.points.length >= 3 ? customChecks(data) : [];
    return [...deckChecks(data, tol), ...drawn, ...skirt];
  }
  if (shape === "spiral" || shape === "level_run" || shape === "ramp") {
    return [...spiralOrLevelChecks(data, shape, tol), ...skirt];
  }

  const flights = data.segments.filter((s) => s.kind === "flight") as FlightSegment[];
  const out: CheckResult[] = [];
  const turns = stairTurns(data);
  const multi = flights.length > 1;

  // per-flight step sums
  const sums = flights.map((fl) => {
    let r: number | null = 0;
    let u: number | null = 0;
    for (const st of fl.steps) {
      const rv = parseMeas(st.rise);
      const uv = parseMeas(st.run);
      r = r === null || rv === null ? null : r + rv;
      u = u === null || uv === null ? null : u + uv;
    }
    return { r, u };
  });
  const commonRise = sums.reduce<number | null>((acc, x, i) => {
    if (flights[i].branch) return acc;
    return acc === null || x.r === null ? null : acc + x.r;
  }, 0);
  const branchRises = sums
    .map((x, i) => (flights[i].branch ? x.r : null))
    .filter((x): x is number => x !== null);
  // A bifurcated stair has alternate upper routes. Floor-to-floor follows the
  // taller branch; adding left + right would manufacture a false discrepancy.
  let riseSum = commonRise === null
    ? null
    : commonRise + (branchRises.length ? Math.max(...branchRises) : 0);
  // curves and ramps in a mixed assembly contribute to the total rise
  for (const seg of data.segments) {
    if (seg.kind === "curve" || seg.kind === "ramp") {
      const rv = seg.rise.trim() === "" ? 0 : parseMeas(seg.rise);
      riseSum = riseSum === null || rv === null ? null : riseSum + rv;
    }
  }

  // 1) sum of ALL risers vs floor-to-floor — vertical heights add regardless
  // of turns, so this stays global.
  const floorToFloor = parseMeas(data.overall.floorToFloor) ?? parseMeas(data.overall.totalRise);
  out.push(compare("rise_sum", riseSum, floorToFloor, tol.riseSum, "in"));

  if (!turns && !multi) {
    // single straight rail line: global run + rake are meaningful
    let platRun = 0;
    let platKnown = true;
    for (const seg of data.segments) {
      if (seg.kind === "platform") {
        const l = parseMeas((seg as PlatformSegment).length);
        if (l === null) platKnown = false;
        else platRun += l;
      }
    }
    const runSum = sums[0]?.u ?? null;
    const totalRun = parseMeas(data.overall.totalRun);
    const runExpected = runSum === null || !platKnown ? null : runSum + platRun;
    out.push(compare("run_sum", runExpected, totalRun, tol.runSum, "in"));

    const rake = parseMeas(data.overall.rakeLength);
    const riseF = sums[0]?.r ?? null;
    const diag = riseF !== null && runSum !== null ? Math.hypot(riseF, runSum) : null;
    out.push(compare("rake", diag, rake, tol.rake, "in"));
  } else {
    // flights turn: verify each flight against ITS OWN controls
    flights.forEach((fl, i) => {
      const tag = `#${i + 1}`;
      const { r, u } = sums[i];
      out.push(compare("flight_rise", r, parseMeas(fl.ctrlRise), tol.riseSum, "in", tag));
      out.push(compare("flight_run", u, parseMeas(fl.ctrlRun), tol.runSum, "in", tag));
      const diag = r !== null && u !== null ? Math.hypot(r, u) : null;
      out.push(compare("flight_rake", diag, parseMeas(fl.rake), tol.rake, "in", tag));
    });
  }

  // landing squareness: measured diagonal vs √(length² + depth²)
  data.segments.forEach((seg, si) => {
    if (seg.kind !== "platform") return;
    const pl = seg as PlatformSegment;
    const L = parseMeas(pl.length);
    const D = parseMeas(pl.depth);
    const dg = parseMeas(pl.diag);
    const calc = L !== null && D !== null ? Math.hypot(L, D) : null;
    out.push(
      compare("landing_diag", calc, dg, tol.rake, "in", data.segments.length > 2 ? `#${si}` : undefined)
    );
  });

  // computed vs measured stair angle, per flight
  flights.forEach((fl, i) => {
    const { r, u } = sums[i];
    const calc = r !== null && u !== null && u > 0 ? (Math.atan2(r, u) * 180) / Math.PI : null;
    const meas = parseMeas(fl.angleDeg);
    out.push(
      compare("angle", calc, meas, tol.angle, "deg", multi ? `#${i + 1}` : undefined)
    );
  });

  // winder treads: for a linearly tapered tread the run at the walkline is
  // runIn + (runOut − runIn) · (offset / width), where offset is the
  // organization's walkline distance from the NARROW edge (datums.walkline —
  // code walklines are commonly 12", not mid-tread). With a recorded offset
  // the check enforces normally; without one we fall back to the mid-width
  // average but cap it at VERIFY — an assumption must never block a
  // correctly measured stair. (The turn angle has no closed check without
  // the wedge vertex position, so it is captured but not cross-verified.)
  const walkOff = parseMeas(data.datums.walkline || "");
  flights.forEach((fl, fi) => {
    const W = parseMeas(fl.width);
    fl.steps.forEach((st, si) => {
      if (!st.winder) return;
      const rIn = parseMeas(st.runIn || "");
      const rOut = parseMeas(st.runOut || "");
      const rWalk = parseMeas(st.run);
      let expected: number | null = null;
      let assumed = false;
      if (rIn !== null && rOut !== null) {
        if (walkOff !== null && W !== null && W > 0 && walkOff <= W) {
          expected = rIn + (rOut - rIn) * (walkOff / W);
        } else {
          expected = (rIn + rOut) / 2;
          assumed = true;
        }
      }
      const res = compare(
        "winder_run",
        expected,
        rWalk,
        tol.runSum,
        "in",
        `${multi ? `#${fi + 1} ` : ""}${mtStep(fl, si)}`
      );
      if (assumed && res.level === "red") res.level = "yellow";
      out.push(res);
    });
  });

  // curve + ramp segments inside a mixed assembly
  data.segments.forEach((seg, si) => {
    const tag = data.segments.length > 1 ? `#${si + 1}` : undefined;
    if (seg.kind === "curve") out.push(...curveChecks(seg as CurveSegment, tol, tag));
    if (seg.kind === "ramp") {
      const rp = seg as RampSegment;
      const runH = parseMeas(rp.runH);
      const rise = parseMeas(rp.rise);
      const calcAng =
        runH !== null && rise !== null && runH > 0
          ? (Math.atan2(rise, runH) * 180) / Math.PI
          : null;
      out.push(compare("angle", calcAng, parseMeas(rp.angleDeg), tol.angle, "deg", tag));
      const calcSlope = runH !== null && rise !== null ? Math.hypot(runH, rise) : null;
      out.push(compare("ramp_slope", calcSlope, parseMeas(rp.length), tol.rake, "in", tag));
    }
  });

  out.push(...spanChecks(data));

  // 5) width variation bottom / mid / top
  const widths = [
    parseMeas(data.overall.widthBottom),
    parseMeas(data.overall.widthMid),
    parseMeas(data.overall.widthTop),
  ].filter((w): w is number => w !== null);
  if (widths.length >= 2) {
    const varAmt = Math.max(...widths) - Math.min(...widths);
    out.push({
      key: "width_var",
      level: grade(varAmt, tol.widthVar),
      expected: 0,
      actual: varAmt,
      delta: varAmt,
      unit: "in",
    });
  } else {
    out.push({ key: "width_var", level: "na", expected: null, actual: null, delta: null, unit: "in" });
  }

  return [...out, ...skirt];
}

// Span molding math: the top clear span minus the lower clear span must equal
// the SUM of both end molding projections (blank molding counts as 0). This
// verifies the whole piece, including rails fitted between TWO molded columns.
function mtStep(fl: FlightSegment, si: number): string {
  return `s${si + 1}`;
}

// The molding-span check compares one measured difference against another, so
// it carries its own fixed tolerance rather than a shop-configurable one — it
// is the only check in this file that does.
function spanChecks(data: MeasureData): CheckResult[] {
  const out: CheckResult[] = [];
  data.spans.forEach((sp, i) => {
    const top = parseMeas(sp.topSpan);
    const lower = parseMeas(sp.lowerSpan);
    const mStart = sp.start.molding.trim() === "" ? 0 : parseMeas(sp.start.molding);
    const mEnd = sp.end.molding.trim() === "" ? 0 : parseMeas(sp.end.molding);
    const anyMolding = sp.start.molding.trim() !== "" || sp.end.molding.trim() !== "";
    if (!anyMolding && (lower === null || top === null)) return; // nothing to verify
    const expected = mStart !== null && mEnd !== null ? mStart + mEnd : null;
    const diff = top !== null && lower !== null ? top - lower : null;
    out.push(
      compare("molding_span", expected, diff, { green: 0.125, yellow: 0.375 }, "in", `#${i + 1}`)
    );
  });
  return out;
}

function spiralOrLevelChecks(
  data: MeasureData,
  shape: MeasureShape,
  tol: Tolerances = TOLERANCES
): CheckResult[] {
  const out: CheckResult[] = [];
  if (shape === "spiral" && data.spiral) {
    // rise per tread should divide floor-to-floor evenly across treads
    const ftf = parseMeas(data.spiral.floorToFloor);
    const treads = parseMeas(data.spiral.treads);
    if (ftf !== null && treads !== null && treads > 0) {
      const riser = ftf / treads;
      out.push({
        key: "spiral_riser",
        level: riser >= 6 && riser <= 9.5 ? "green" : "yellow",
        expected: null,
        actual: riser,
        delta: null,
        unit: "in",
      });
    } else {
      out.push({ key: "spiral_riser", level: "na", expected: null, actual: null, delta: null, unit: "in" });
    }
  }
  out.push(...spanChecks(data));
  if (shape === "ramp") {
    const seg = data.segments[0];
    if (seg && seg.kind === "ramp") {
      const slope = parseMeas(seg.length); // sloped length
      const runH = parseMeas(seg.runH); // horizontal run
      const rise = parseMeas(seg.rise);
      const ang = parseMeas(seg.angleDeg);
      // angle from the unambiguous horizontal-run triangle
      const calcAng =
        runH !== null && rise !== null && runH > 0
          ? (Math.atan2(rise, runH) * 180) / Math.PI
          : null;
      out.push(compare("angle", calcAng, ang, tol.angle, "deg"));
      // sloped length vs √(run² + rise²)
      const calcSlope = runH !== null && rise !== null ? Math.hypot(runH, rise) : null;
      out.push(compare("ramp_slope", calcSlope, slope, tol.rake, "in"));
    }
  }
  return out;
}

// Custom drawn plans: scale-independent closure check. For a CLOSED shape
// whose drawn directions are known and every segment length is entered, the
// length-weighted direction vectors must sum to ~zero. Catches a wrong
// segment length without knowing the drawing's scale.
// A drawing holds one or more runs. An OPEN run is the ordinary case — a rail
// from the wall to the steps does not come back to itself — so closure is only
// tested on runs the measurer explicitly closed. Each closed run is checked on
// its own; one bad outline does not condemn the others.
function customChecks(data: MeasureData): CheckResult[] {
  const paths = planPaths(data.plan);
  const closed = paths.filter((p) => p.closed && p.points.length >= 3);
  if (!closed.length) {
    return [{ key: "plan_closure", level: "na", expected: null, actual: null, delta: null, unit: "in" }];
  }

  const out: CheckResult[] = [];
  closed.forEach((path, idx) => {
    const tag = path.label || (paths.length > 1 ? `#${idx + 1}` : undefined);
    const n = path.points.length;
    let ex = 0;
    let ey = 0;
    let perimeter = 0;
    for (let i = 0; i < n; i++) {
      const a = path.points[i];
      const b = path.points[(i + 1) % n];
      const len = parseMeas(path.segs[i]?.len);
      if (len === null) {
        out.push({ key: "plan_closure", level: "na", expected: null, actual: null, delta: null, unit: "in", detail: tag });
        return;
      }
      const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      ex += (len * (b.x - a.x)) / d;
      ey += (len * (b.y - a.y)) / d;
      perimeter += len;
    }
    const err = Math.hypot(ex, ey);
    const pct = perimeter > 0 ? err / perimeter : 0;
    out.push({
      key: "plan_closure",
      level: pct <= 0.01 ? "green" : pct <= 0.03 ? "yellow" : "red",
      expected: 0,
      actual: err,
      delta: err,
      unit: "in",
      detail: tag,
    });
  });
  return out;
}

// ---- Completeness gate -----------------------------------------------------

// A missing item is either fabrication-critical — the shop cannot cut steel
// without it — or documentation, which the job still wants but which must not
// hold a complete set of measurements hostage. Untagged gaps are "fab".
export type GapTier = "fab" | "doc";

export interface Gap {
  key: string; // i18n key: gap_<key>
  detail?: string;
  tier?: GapTier;
}

export function gapTier(g: Gap): GapTier {
  return g.tier || "fab";
}

// What must exist before a sheet can be submitted for review. Requirements
// are conditional: what a base-plate post needs differs from a core-drilled
// one; a guardrail needs infill information a wall rail does not.
export function requiredGaps(data: MeasureData, shape: MeasureShape): Gap[] {
  const gaps: Gap[] = [];
  const has = (s: string | undefined | null) => !!s && s.trim() !== "";
  // A well sheet may be grate-only, in which case there is no rail piece and
  // none of the guardrail material or span requirements apply.
  const isWell = shape === "window_well";
  const wellGuard = isWell && !!data.well?.deliverables.includes("guard");
  // An inspection or repair survey records an existing structure — it has no
  // rail pieces to fabricate and no materials to order yet.
  const isFire = shape === "fire_escape";
  const fireNew = isFire && data.fire?.purpose === "new";
  // Gates, fences and balconies carry their own material and layout fields;
  // the stair-oriented span and datum requirements do not apply.
  const isGate = shape === "gate";
  const isFence = shape === "fence";
  const isBalcony = shape === "balcony";
  // A deck carries its own perimeter, post and material fields; the stair
  // datum and floor-change questions describe a stair run and do not apply.
  const isDeck = shape === "deck";
  const selfContained = isGate || isFence || isDeck;

  if (shape !== "custom" && shape !== "spiral" && shape !== "window_well" && shape !== "fire_escape" && shape !== "gate" && shape !== "fence" && shape !== "balcony" && shape !== "deck" && !has(data.datums.orientation)) {
    gaps.push({ key: "orientation" });
  }
  if (!isWell && !isFire && !selfContained && !isBalcony && !has(data.finish.floorChange)) gaps.push({ key: "floor_change" });
  if (
    (data.finish.floorChange === "bottom" || data.finish.floorChange === "both") &&
    !has(data.finish.bottomAdjustment)
  ) gaps.push({ key: "bottom_adjustment" });
  if (
    (data.finish.floorChange === "top" || data.finish.floorChange === "both") &&
    !has(data.finish.topAdjustment)
  ) gaps.push({ key: "top_adjustment" });

  const flights = data.segments.filter((s) => s.kind === "flight") as FlightSegment[];
  const hasPlatform = data.segments.some((s) => s.kind === "platform");
  const turns = data.segments.some(
    (s) => s.kind === "platform" && (s as PlatformSegment).turn !== "none"
  );

  if (shape === "gate") {
    const g = data.gate;
    if (!g) gaps.push({ key: "gate_missing" });
    else {
      for (const [k, v] of [
        ["gate_use", g.use],
        ["gate_operation", g.operation],
        ["gate_width_top", g.widthTop],
        ["gate_width_bottom", g.widthBottom],
        ["gate_height_hinge", g.heightHinge],
        ["gate_ground_clearance", g.groundClearance],
        ["gate_surface", g.surface],
        ["gate_infill", g.infill],
        ["gate_hinges", g.hinges],
        ["gate_latch", g.latch],
      ] as const) if (!has(v)) gaps.push({ key: k });
      const swings = g.operation === "single_swing" || g.operation === "double_swing" || g.operation === "bifold";
      if (swings) {
        // Without the grade rise the swing-clearance check cannot run at all.
        if (!has(g.gradeRise)) gaps.push({ key: "gate_grade_rise" });
        if (!has(g.swingDir)) gaps.push({ key: "gate_swing_dir" });
        if (!has(g.hingeSide)) gaps.push({ key: "gate_hinge_side" });
      }
      if (!g.postsExisting) {
        if (!has(g.postSize)) gaps.push({ key: "gate_post_size" });
        if (!has(g.footingDepth)) gaps.push({ key: "gate_footing" });
      }
      if (g.automated) {
        if (!has(g.opener)) gaps.push({ key: "gate_opener" });
        if (!has(g.powerAtGate)) gaps.push({ key: "gate_power" });
        if (!has(g.safetyDevices)) gaps.push({ key: "gate_safety" });
      }
    }
  } else if (shape === "fence") {
    const f = data.fence;
    if (!f) gaps.push({ key: "fence_missing" });
    else {
      for (const [k, v] of [
        ["fence_total_run", f.totalRun],
        ["fence_height", f.height],
        ["fence_post_spacing", f.postSpacing],
        ["fence_post_size", f.postSize],
        ["fence_footing", f.footingDepth],
        ["fence_start_term", f.startTerm],
        ["fence_end_term", f.endTerm],
        ["fence_utilities", f.utilities],
      ] as const) if (!has(v)) gaps.push({ key: k });
      if (f.segments.length === 0) gaps.push({ key: "fence_segments" });
      f.segments.forEach((sg, i) => {
        const tag = sg.label || `#${i + 1}`;
        if (!has(sg.length)) gaps.push({ key: "fence_seg_length", detail: tag });
        // How a panel meets a slope changes the whole panel order.
        if (has(sg.gradeChange) && !has(sg.followsGrade)) {
          gaps.push({ key: "fence_seg_grade", detail: tag });
        }
      });
    }
  } else if (shape === "balcony") {
    const b = data.balcony;
    if (!b) gaps.push({ key: "balcony_missing" });
    else {
      for (const [k, v] of [
        ["bal_kind", b.kind],
        ["bal_mount", b.mount],
        ["bal_edge_length", b.edgeLength],
        ["bal_guard_height_f", b.guardHeight],
        ["bal_slab_material", b.slabMaterial],
        ["bal_finished_floor", b.finishedFloor],
        ["bal_returns", b.returns],
      ] as const) if (!has(v)) gaps.push({ key: k });
      // Anything bolted into a slab edge needs the numbers the check runs on.
      if (b.mount !== "embedded") {
        for (const [k, v] of [
          ["bal_anchor_type", b.anchorType],
          ["bal_slab_thickness", b.slabThickness],
          ["bal_embedment_f", b.anchorEmbedment],
          ["bal_edge_distance_f", b.edgeDistance],
        ] as const) if (!has(v)) gaps.push({ key: k });
      }
      if (b.kind === "juliet" && !has(b.doorOpening)) gaps.push({ key: "bal_door_opening" });
    }
  } else if (shape === "deck") {
    const dk = data.deck;
    if (!dk) gaps.push({ key: "deck_missing" });
    else {
      for (const [k, v] of [
        ["deck_surface", dk.surface],
        ["deck_total_perimeter", dk.totalPerimeter],
        ["deck_mount", dk.mount],
        ["deck_guard_height_f", dk.guardHeight],
        ["deck_post_spacing_f", dk.postSpacing],
        ["deck_corners", dk.corners],
      ] as const) if (!has(v)) gaps.push({ key: k });

      if (dk.sides.length === 0) gaps.push({ key: "deck_sides" });
      dk.sides.forEach((sd, i) => {
        const tag = sd.label || `#${i + 1}`;
        if (!has(sd.length)) gaps.push({ key: "deck_side_length", detail: tag });
        // Height above grade decides whether that side needs a guard at all,
        // so it is needed on every side, railed or not.
        if (!has(sd.heightAboveGrade)) gaps.push({ key: "deck_side_height", detail: tag });
        if (sd.opening && sd.opening !== "none" && !has(sd.openingWidth)) {
          gaps.push({ key: "deck_opening_width", detail: tag });
        }
      });

      // Whatever the post grabs has to be described, because the anchorage
      // check is the reason this sheet exists.
      if (dk.mount === "surface" || dk.mount === "fascia" || dk.mount === "through_bolt") {
        if (!has(dk.rimJoistSize)) gaps.push({ key: "deck_rim_size" });
        if (!has(dk.rimMaterial)) gaps.push({ key: "deck_rim_material" });
        if (!has(dk.blocking)) gaps.push({ key: "deck_blocking" });
        if (!has(dk.deckingThickness)) gaps.push({ key: "deck_decking_thickness" });
      }
      if (dk.mount === "core_drill" || dk.mount === "embedded") {
        if (!has(dk.framingCondition)) gaps.push({ key: "deck_framing_condition" });
      }
      // A stair opening is measured on its own stair sheet; say which one.
      if (dk.sides.some((s) => s.opening === "stairs") && !has(dk.stairSheets)) {
        gaps.push({ key: "deck_stair_sheets", tier: "doc" });
      }
    }
  } else if (shape === "fire_escape") {
    const f = data.fire;
    if (!f) {
      gaps.push({ key: "fire_missing" });
    } else {
      if (!has(f.purpose)) gaps.push({ key: "fire_purpose" });
      if (!has(f.wallMaterial)) gaps.push({ key: "fire_wall_material" });
      if (!has(f.totalHeight)) gaps.push({ key: "fire_total_height" });
      if (f.levels.length === 0) gaps.push({ key: "fire_levels" });

      f.levels.forEach((l, i) => {
        const tag = l.label || `#${i + 1}`;
        // Every purpose needs the balcony footprint and how it holds on.
        if (!has(l.platLength)) gaps.push({ key: "fire_plat_length", detail: tag });
        if (!has(l.platWidth)) gaps.push({ key: "fire_plat_width", detail: tag });
        if (!has(l.heightAboveGrade)) gaps.push({ key: "fire_height_grade", detail: tag });

        if (f.purpose === "new") {
          // Fabricating it means the full geometry, per level.
          if (!has(l.deck)) gaps.push({ key: "fire_deck", detail: tag });
          if (!has(l.guardHeight)) gaps.push({ key: "fire_guard_height", detail: tag });
          if (!has(l.picketSpacing)) gaps.push({ key: "fire_picket_spacing", detail: tag });
          if (!has(l.anchorType)) gaps.push({ key: "fire_anchor_type", detail: tag });
          if (!has(l.anchorCount)) gaps.push({ key: "fire_anchor_count", detail: tag });
          if (!has(l.openingType)) gaps.push({ key: "fire_opening", detail: tag });
          // The lowest level drops a ladder instead of a stair.
          const lowest = i === f.levels.length - 1;
          if (!lowest) {
            for (const [k, v] of [
              ["fire_stair_risers", l.stairRisers],
              ["fire_stair_rise", l.stairRise],
              ["fire_stair_run", l.stairRun],
              ["fire_stair_width", l.stairWidth],
              ["fire_floor_to_floor", l.floorToFloor],
            ] as const) if (!has(v)) gaps.push({ key: k, detail: tag });
          }
        } else {
          // Inspecting or repairing: every level needs a verdict.
          if (!has(l.condition.rating)) gaps.push({ key: "fire_level_rating", detail: tag });
          if (!has(l.condition.anchors)) gaps.push({ key: "fire_anchor_condition", detail: tag });
        }
      });

      if (f.ladder.present) {
        if (!has(f.ladder.type)) gaps.push({ key: "fire_ladder_type" });
        if (!has(f.ladder.landingSurface)) gaps.push({ key: "fire_ladder_landing" });
        if (f.purpose === "new") {
          if (!has(f.ladder.length)) gaps.push({ key: "fire_ladder_length" });
          if (!has(f.ladder.width)) gaps.push({ key: "fire_ladder_width" });
          if (!has(f.ladder.rungSpacing)) gaps.push({ key: "fire_ladder_rung" });
        } else if (!has(f.ladder.operates)) {
          gaps.push({ key: "fire_ladder_operates" });
        }
      }

      if (f.purpose !== "new" && f.purpose !== "") {
        if (!has(f.overall.rating)) gaps.push({ key: "fire_overall_rating" });
      }
      if (f.purpose === "inspect" && !has(f.loadTest)) gaps.push({ key: "fire_load_test" });
      if (f.purpose === "repair" && !has(f.violations) && !has(f.notes)) {
        gaps.push({ key: "fire_repair_scope" });
      }
    }
  } else if (shape === "window_well") {
    const w = data.well;
    if (!w) {
      gaps.push({ key: "well_missing" });
    } else {
      if (w.deliverables.length === 0) gaps.push({ key: "well_deliverable" });
      if (!has(w.construction)) gaps.push({ key: "well_construction" });
      for (const [k, v] of [
        ["well_length", w.lengthAtHouse],
        ["well_projection", w.projection],
        ["well_depth", w.depth],
        ["well_thickness", w.wallThickness],
      ] as const) if (!has(v)) gaps.push({ key: k });

      if (w.deliverables.includes("guard")) {
        if (!has(w.guardHeight)) gaps.push({ key: "well_guard_height" });
        // The wall profile is what makes the guard pass inspection.
        if (!has(w.wallRef)) gaps.push({ key: "well_wall_ref" });
        if (w.bands.length === 0) gaps.push({ key: "well_wall_bands" });
        else {
          const bad = w.bands.filter((b) => !has(b.label) || !has(b.setback)).length;
          if (bad > 0) gaps.push({ key: "well_band_fields", detail: `${bad}` });
        }
        if (!has(w.postToWall)) gaps.push({ key: "well_post_to_wall" });
      }
      if (w.deliverables.includes("gate")) {
        if (!has(w.gateWidth)) gaps.push({ key: "well_gate_width" });
        if (!has(w.gateSwing)) gaps.push({ key: "well_gate_swing" });
        if (!has(w.gateHinge)) gaps.push({ key: "well_gate_hinge" });
      }
      if (w.deliverables.includes("ladder")) {
        for (const [k, v] of [
          ["well_ladder_width", w.ladderWidth],
          ["well_ladder_rungs", w.ladderRungs],
          ["well_ladder_spacing", w.ladderSpacing],
          ["well_ladder_standoff", w.ladderStandoff],
        ] as const) if (!has(v)) gaps.push({ key: k });
      }
      if (w.deliverables.includes("grate")) {
        if (!has(w.grateBearing)) gaps.push({ key: "well_grate_bearing" });
        if (!has(w.grateInfill)) gaps.push({ key: "well_grate_infill" });
        if (!has(w.grateLoad)) gaps.push({ key: "well_grate_load" });
      }
    }
  } else if (shape === "spiral") {
    if (!data.spiral || !has(data.spiral.floorToFloor)) gaps.push({ key: "floor_to_floor" });
    if (!data.spiral || !has(data.spiral.diameter)) gaps.push({ key: "diameter" });
  } else if (shape === "custom") {
    const plan = data.plan;
    if (!plan || plan.points.length < 2) {
      gaps.push({ key: "plan_drawing" });
    } else {
      const missingLens = plan.segs.filter((sg) => !has(sg.len)).length;
      if (missingLens > 0) gaps.push({ key: "plan_lengths", detail: `${missingLens}` });
      const missingTypes = plan.segs.filter((sg) => !has(sg.kind)).length;
      if (missingTypes > 0) gaps.push({ key: "plan_types", detail: `${missingTypes}` });
      const incompleteFlights = plan.segs.filter(
        (sg) => sg.kind === "flight" && (!has(sg.steps) || !has(sg.rise) || !has(sg.run) || !has(sg.width))
      ).length;
      if (incompleteFlights > 0) gaps.push({ key: "plan_flights", detail: `${incompleteFlights}` });
    }
  } else if (shape === "level_run") {
    const seg = data.segments[0] as PlatformSegment | undefined;
    if (!seg || !has(seg.length)) gaps.push({ key: "run_length" });
  } else if (shape === "ramp") {
    const seg = data.segments[0];
    if (
      !seg ||
      seg.kind !== "ramp" ||
      !has(seg.rise) ||
      !has(seg.runH) ||
      !has(seg.length) ||
      !has(seg.angleDeg) ||
      !has(seg.width)
    ) {
      gaps.push({ key: "ramp_geometry" });
    }
  } else {
    let missingSteps = 0;
    let missingWinder = 0;
    flights.forEach((fl, fi) => {
      fl.steps.forEach((st) => {
        if (!has(st.rise) || !has(st.run)) missingSteps += 1;
        if (st.winder && (!has(st.runIn) || !has(st.runOut) || !has(st.turnDeg))) {
          missingWinder += 1;
        }
      });
      if (!has(fl.width)) gaps.push({ key: "flight_width", detail: `#${fi + 1}` });
      if (!has(fl.angleDeg)) gaps.push({ key: "flight_angle", detail: `#${fi + 1}` });
      // flights that turn need their own controls — one global rake/run
      // cannot verify them
      if (turns || flights.length > 1) {
        if (!has(fl.rake)) gaps.push({ key: "flight_rake", detail: `#${fi + 1}` });
        if (!has(fl.ctrlRise)) gaps.push({ key: "flight_ctrl_rise", detail: `#${fi + 1}` });
        if (!has(fl.ctrlRun)) gaps.push({ key: "flight_ctrl_run", detail: `#${fi + 1}` });
      }
    });
    if (missingSteps > 0) gaps.push({ key: "steps", detail: `${missingSteps}` });
    if (missingWinder > 0) gaps.push({ key: "winder", detail: `${missingWinder}` });
    // mixed-assembly curve and ramp segments must be measurable
    data.segments.forEach((seg, si) => {
      const tag = `#${si + 1}`;
      if (seg.kind === "curve") {
        const c = seg as CurveSegment;
        if (!has(c.radius) || !has(c.chord) || !has(c.arc) || !has(c.width)) {
          gaps.push({ key: "curve_geometry", detail: tag });
        }
      }
      if (seg.kind === "ramp" && shape === "builder") {
        const rp = seg as RampSegment;
        if (!has(rp.rise) || !has(rp.runH) || !has(rp.length) || !has(rp.angleDeg) || !has(rp.width)) {
          gaps.push({ key: "ramp_geometry", detail: tag });
        }
      }
    });
    if (!has(data.overall.floorToFloor) && !has(data.overall.totalRise)) {
      gaps.push({ key: "floor_to_floor" });
    }
    if (!turns && flights.length === 1) {
      if (!has(data.overall.totalRun)) gaps.push({ key: "total_run" });
      if (!has(data.overall.rakeLength)) gaps.push({ key: "rake" });
    }
  }

  // landings need their own dimensions + squareness diagonal
  data.segments.forEach((seg, si) => {
    if (seg.kind !== "platform") return;
    const pl = seg as PlatformSegment;
    const tag = data.segments.length > 2 ? `#${si}` : undefined;
    if (!has(pl.length) && shape !== "level_run") gaps.push({ key: "landing_length", detail: tag });
    if (!has(pl.depth)) gaps.push({ key: "landing_depth", detail: tag });
    if (!has(pl.diag)) gaps.push({ key: "landing_diag", detail: tag });
  });

  if (!has(data.rail.height)) gaps.push({ key: "rail_height" });

  // rail terminations
  if (!has(data.rail.returns)) gaps.push({ key: "returns" });
  if ((data.rail.kind === "Handrail" || data.rail.kind === "Both") && !has(data.rail.extensions)) {
    gaps.push({ key: "extensions" });
  }
  if (shape === "wall_rail" && !has(data.rail.brackets)) gaps.push({ key: "brackets" });

  // posts: position + mount always; the rest depends on how it mounts
  const postPhotos = new Set(data.photos.map((p) => p.slot));
  data.posts.forEach((p, i) => {
    const tag = `P${i + 1}`;
    const posOk = p.stepIdx !== null ? has(p.fromNosing) : has(p.pos);
    if (p.stepIdx !== null && !has(p.distanceFromFirst)) {
      gaps.push({ key: "post_first_edge", detail: tag });
    }
    if (!posOk || !has(p.fromEdge) || (p.pointType === "railing_post" && !has(p.mount))) {
      gaps.push({ key: "post", detail: tag });
      return; // mount unknown — conditional rules can't apply yet
    }
    if (p.pointType === "existing_post") {
      if (!has(p.anchor)) gaps.push({ key: "existing_material", detail: tag });
      if (!has(p.existingW) || !has(p.existingD)) gaps.push({ key: "existing_post_size", detail: tag });
      if (!has(p.skirtProjection)) gaps.push({ key: "post_skirt", detail: tag });
      // A skirt that projects makes the gap above it bigger than the one you
      // measured, so the measured gap is needed to work out whether the
      // infill passes. No projection, nothing to work out.
      const skirt = parseMeas(p.skirtProjection);
      if (skirt !== null && skirt > 0 && !has(p.infillGap)) {
        gaps.push({ key: "post_infill_gap", detail: tag });
      }
    }
    if ((p.pointType === "concrete_wall" || p.pointType === "clip") && !has(p.anchor)) {
      gaps.push({ key: "existing_material", detail: tag });
    }
    if (p.pointType === "clip" && !has(p.clipDetail)) gaps.push({ key: "clip_detail", detail: tag });
    if (p.pointType !== "railing_post") return;
    if (!has(p.substrate)) gaps.push({ key: "post_substrate", detail: tag });
    if (p.mount === "Base plate") {
      if (!has(p.plate)) gaps.push({ key: "post_plate", detail: tag });
      if (!has(p.anchors)) gaps.push({ key: "post_anchors", detail: tag });
      if (!has(p.edgeDist)) gaps.push({ key: "post_edge", detail: tag });
      if (!postPhotos.has(`post_${p.id}`)) gaps.push({ key: "post_photo", detail: tag, tier: "doc" });
    } else if (p.mount === "Core-drill") {
      if (!has(p.anchors)) gaps.push({ key: "post_hole", detail: tag });
      if (!has(p.obstruction)) gaps.push({ key: "post_obstruction", detail: tag });
    } else if (p.mount === "Side mount") {
      if (!has(p.plate)) gaps.push({ key: "post_plate", detail: tag });
      if (!has(p.anchors)) gaps.push({ key: "post_anchors", detail: tag });
    }
  });

  // materials the shop cannot order without
  if (shape !== "wall_rail" && (!isWell || wellGuard) && (!isFire || fireNew) && !isFence && !has(data.materials.post)) gaps.push({ key: "mat_post" });
  if ((!isWell || wellGuard) && (!isFire || fireNew) && !has(data.materials.topRail)) gaps.push({ key: "mat_toprail" });
  if ((!isFire || fireNew) && !has(data.materials.finish)) gaps.push({ key: "mat_finish" });
  if (
    (data.rail.kind === "Guardrail" || data.rail.kind === "Both") &&
    shape !== "wall_rail" &&
    (!isWell || wellGuard) &&
    (!isFire || fireNew) &&
    !has(data.materials.picket)
  ) {
    gaps.push({ key: "mat_picket" });
  }

  // Every rail piece: how long is it and how does EACH end attach? At least
  // one span, both terminations defined, methods valid for their substrate.
  const skipSpans = (isWell && !wellGuard) || (isFire && !fireNew) || selfContained;
  if (data.spans.length === 0 && !skipSpans) {
    gaps.push({ key: "span_missing" });
  }
  const termPhotos = new Set(data.photos.map((p) => p.slot));
  const postIds = new Set(data.posts.map((p) => p.id));
  const spanIds = new Set(data.spans.map((sp) => sp.id));
  (skipSpans ? [] : data.spans).forEach((sp, i) => {
    const tag = `#${i + 1}`;
    if (!has(sp.topSpan)) gaps.push({ key: "span_top", detail: tag });
    const anyMolding = sp.start.molding.trim() !== "" || sp.end.molding.trim() !== "";
    if (anyMolding && !has(sp.lowerSpan)) gaps.push({ key: "span_lower", detail: tag });
    (["start", "end"] as const).forEach((endKey) => {
      gaps.push(
        ...terminationGaps(sp[endKey], `${tag} ${endKey}`, termPhotos, `term_${sp.id}_${endKey}`, postIds, spanIds, sp.id)
      );
    });
  });

  // The worker records the site constraint; the shop decides splice method.
  if ((!isFire || fireNew) && !has(data.fab.maxPiece)) gaps.push({ key: "max_piece" });

  // required photo slots (+ the landing when there is one)
  const filled = new Set(data.photos.map((p) => p.slot));
  const slots = [...requiredPhotoSlots(shape)];
  if (hasPlatform) slots.push("landing");
  for (const slot of slots) {
    if (!filled.has(slot)) {
      gaps.push({ key: "photo", detail: slot, tier: isFabCriticalPhoto(slot) ? "fab" : "doc" });
    }
  }

  return gaps;
}

// The single completeness model. Everything on screen — the header line, the
// stage chips, the review verdict, the submit gate — reads from this, so the
// worker is never shown two different answers to "am I done?".
//
// Two levels, deliberately:
//   ready    — every fabrication-critical item is answered and no check is
//              red. The shop can work from this sheet.
//   docsOpen — ready, but photos or other documentation are still owed. The
//              sheet submits; the follow-ups stay listed.
export interface Readiness {
  fabGaps: Gap[];
  docGaps: Gap[];
  redChecks: CheckResult[];
  checks: CheckResult[];
  /** The one number the worker sees: what still stands between here and the shop. */
  remaining: number;
  /** Documentation still owed once the sheet is fabrication-ready. */
  docRemaining: number;
  ready: boolean;
  docsOpen: boolean;
  /** Nothing left at all — fabrication and documentation both clear. */
  complete: boolean;
}

export function sheetReadiness(
  data: MeasureData,
  shape: MeasureShape,
  tol?: Tolerances
): Readiness {
  const gaps = requiredGaps(data, shape);
  const fabGaps = gaps.filter((g) => gapTier(g) === "fab");
  const docGaps = gaps.filter((g) => gapTier(g) === "doc");
  const checks = runChecks(data, shape, tol);
  const redChecks = checks.filter((c) => c.level === "red");
  const remaining = fabGaps.length + redChecks.length;
  return {
    fabGaps,
    docGaps,
    redChecks,
    checks,
    remaining,
    docRemaining: docGaps.length,
    ready: remaining === 0,
    docsOpen: remaining === 0 && docGaps.length > 0,
    complete: remaining === 0 && docGaps.length === 0,
  };
}

// A sheet may be submitted once it is fabrication-ready. Documentation gaps
// travel with it as follow-ups rather than blocking the submission.
export function submitBlockers(
  data: MeasureData,
  shape: MeasureShape,
  tol?: Tolerances
): { gaps: Gap[]; docGaps: Gap[]; redChecks: CheckResult[] } {
  const r = sheetReadiness(data, shape, tol);
  return { gaps: r.fabGaps, docGaps: r.docGaps, redChecks: r.redChecks };
}

// ---- Post ordering (shared by sketches, editor, and revision viewer) -------

// Platform/landing posts sort by their measured position along the run, not
// by the order they were tapped in.
export function sortPlatPosts<T extends { pos: string }>(posts: T[]): T[] {
  return [...posts].sort((a, b) => {
    const pa = parseMeas(a.pos);
    const pb = parseMeas(b.pos);
    if (pa === null && pb === null) return 0;
    if (pa === null) return 1;
    if (pb === null) return -1;
    return pa - pb;
  });
}

// Posts in the same order the sketch numbers them (walk segments bottom-up;
// several posts may share a tread, landing posts sort by measured position).
export function orderedPosts(data: MeasureData): PostMeasure[] {
  const out: PostMeasure[] = [];
  data.segments.forEach((seg, si) => {
    if (seg.kind === "flight") {
      seg.steps.forEach((_, i) => {
        out.push(...data.posts.filter((po) => po.segIdx === si && po.stepIdx === i));
      });
    } else {
      out.push(...sortPlatPosts(data.posts.filter((po) => po.segIdx === si)));
    }
  });
  return out;
}

function terminationGaps(
  t: Termination,
  tag: string,
  photoSlots: Set<string>,
  photoSlot: string,
  postIds: Set<string>,
  spanIds: Set<string>,
  ownSpanId: string
): Gap[] {
  const gaps: Gap[] = [];
  const has = (v: string | undefined | null) => !!v && v.trim() !== "";

  if (!has(t.attachTo)) {
    gaps.push({ key: "term_target", detail: tag });
    return gaps; // nothing else can be validated yet
  }
  // topology: a free post END is a real measured post; "continue" points at
  // the adjoining span — never free text
  if (t.attachTo === "free_post" && (!has(t.postId) || !postIds.has(t.postId))) {
    gaps.push({ key: "term_postref", detail: tag });
  }
  if (
    t.attachTo === "continue" &&
    (!has(t.spanRef) || !spanIds.has(t.spanRef) || t.spanRef === ownSpanId)
  ) {
    gaps.push({ key: "term_spanref", detail: tag });
  }
  const allowed = METHODS_BY_ATTACH[t.attachTo] || [];
  if (allowed.length > 0) {
    if (!has(t.method)) {
      gaps.push({ key: "term_method", detail: tag });
    } else if (!allowed.includes(t.method)) {
      gaps.push({ key: "term_method_invalid", detail: tag });
    }
    // weld only into steel; wood floors only take a plate with blocking
    if (t.method === "weld" && t.attachTo === "existing_post" && t.material !== "Steel") {
      gaps.push({ key: "term_weld_steel", detail: tag });
    }
    if (t.attachTo === "floor" && t.material === "Wood" && t.method !== "base_plate") {
      gaps.push({ key: "term_wood_floor", detail: tag });
    }
  }
  if ((t.attachTo === "wall" || t.attachTo === "existing_post" || t.attachTo === "floor") && !has(t.material)) {
    gaps.push({ key: "term_material", detail: tag });
  }
  if (t.attachTo === "wall" && !has(t.backing)) gaps.push({ key: "term_backing", detail: tag });
  if (t.attachTo === "floor" && t.material === "Wood" && !has(t.backing)) {
    gaps.push({ key: "term_backing", detail: tag });
  }
  if (t.attachTo === "existing_post") {
    if (!has(t.columnW)) gaps.push({ key: "term_column_w", detail: tag });
    if (!has(t.columnD)) gaps.push({ key: "term_column_d", detail: tag });
  }
  if (has(t.molding) && !has(t.moldingHeight)) gaps.push({ key: "term_molding_h", detail: tag });
  if (has(t.method) && (HARDWARE_METHODS as string[]).includes(t.method)) {
    const hw = t.hardware;
    if ((FASTENER_METHODS as string[]).includes(t.method)) {
      if (!has(hw.fastener)) gaps.push({ key: "term_fastener", detail: tag });
      if (!has(hw.qty)) gaps.push({ key: "term_qty", detail: tag });
    }
    if (!has(hw.elevation)) gaps.push({ key: "term_elevation", detail: tag });
    if (!has(hw.shopField)) gaps.push({ key: "term_shopfield", detail: tag });
    // the dimensions the shop needs to actually FABRICATE this connection
    for (const field of HW_REQUIRED[t.method] || []) {
      if (!has(hw[field])) gaps.push({ key: `term_hw_${field}`, detail: tag });
    }
    if (!photoSlots.has(photoSlot)) gaps.push({ key: "term_photo", detail: tag, tier: "doc" });
  }
  return gaps;
}
