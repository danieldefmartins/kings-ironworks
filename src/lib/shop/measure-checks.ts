// Geometry verification for measure sheets. Field values are free-text
// (inches + fractions, optional feet); this module parses them, cross-checks
// redundant measurements against each other, and reports green/yellow/red
// results. It NEVER corrects a field value — it only surfaces disagreement.

import {
  requiredPhotoSlots,
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

export function runChecks(
  data: MeasureData,
  shape: MeasureShape,
  tolIn?: Tolerances
): CheckResult[] {
  const tol = tolIn || TOLERANCES;
  if (shape === "custom") return [...customChecks(data), ...spanChecks(data, tol)];
  if (shape === "spiral" || shape === "level_run" || shape === "ramp") {
    return spiralOrLevelChecks(data, shape, tol);
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

  return out;
}

// Span molding math: the top clear span minus the lower clear span must equal
// the SUM of both end molding projections (blank molding counts as 0). This
// verifies the whole piece, including rails fitted between TWO molded columns.
function mtStep(fl: FlightSegment, si: number): string {
  return `s${si + 1}`;
}

function spanChecks(data: MeasureData, tol: Tolerances = TOLERANCES): CheckResult[] {
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
  out.push(...spanChecks(data, tol));
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
function customChecks(data: MeasureData): CheckResult[] {
  const plan = data.plan;
  if (!plan || !plan.closed || plan.points.length < 3) {
    return [{ key: "plan_closure", level: "na", expected: null, actual: null, delta: null, unit: "in" }];
  }
  const n = plan.points.length;
  let ex = 0;
  let ey = 0;
  let perimeter = 0;
  for (let i = 0; i < n; i++) {
    const a = plan.points[i];
    const b = plan.points[(i + 1) % n];
    const len = parseMeas(plan.segs[i]?.len);
    if (len === null) {
      return [{ key: "plan_closure", level: "na", expected: null, actual: null, delta: null, unit: "in" }];
    }
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    ex += (len * (b.x - a.x)) / d;
    ey += (len * (b.y - a.y)) / d;
    perimeter += len;
  }
  const err = Math.hypot(ex, ey);
  const pct = perimeter > 0 ? err / perimeter : 0;
  return [
    {
      key: "plan_closure",
      level: pct <= 0.01 ? "green" : pct <= 0.03 ? "yellow" : "red",
      expected: 0,
      actual: err,
      delta: err,
      unit: "in",
    },
  ];
}

// ---- Completeness gate -----------------------------------------------------

export interface Gap {
  key: string; // i18n key: gap_<key>
  detail?: string;
}

// What must exist before a sheet can be submitted for review. Requirements
// are conditional: what a base-plate post needs differs from a core-drilled
// one; a guardrail needs infill information a wall rail does not.
export function requiredGaps(data: MeasureData, shape: MeasureShape): Gap[] {
  const gaps: Gap[] = [];
  const has = (s: string | undefined | null) => !!s && s.trim() !== "";

  if (!has(data.datums.orientation)) gaps.push({ key: "orientation" });

  const flights = data.segments.filter((s) => s.kind === "flight") as FlightSegment[];
  const hasPlatform = data.segments.some((s) => s.kind === "platform");
  const turns = data.segments.some(
    (s) => s.kind === "platform" && (s as PlatformSegment).turn !== "none"
  );

  if (shape === "spiral") {
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
      if (!postPhotos.has(`post_${p.id}`)) gaps.push({ key: "post_photo", detail: tag });
    } else if (p.mount === "Core-drill") {
      if (!has(p.anchors)) gaps.push({ key: "post_hole", detail: tag });
      if (!has(p.obstruction)) gaps.push({ key: "post_obstruction", detail: tag });
    } else if (p.mount === "Side mount") {
      if (!has(p.plate)) gaps.push({ key: "post_plate", detail: tag });
      if (!has(p.anchors)) gaps.push({ key: "post_anchors", detail: tag });
    }
  });

  // materials the shop cannot order without
  if (shape !== "wall_rail" && !has(data.materials.post)) gaps.push({ key: "mat_post" });
  if (!has(data.materials.topRail)) gaps.push({ key: "mat_toprail" });
  if (!has(data.materials.finish)) gaps.push({ key: "mat_finish" });
  if (
    (data.rail.kind === "Guardrail" || data.rail.kind === "Both") &&
    shape !== "wall_rail" &&
    !has(data.materials.picket)
  ) {
    gaps.push({ key: "mat_picket" });
  }

  // Every rail piece: how long is it and how does EACH end attach? At least
  // one span, both terminations defined, methods valid for their substrate.
  if (data.spans.length === 0) {
    gaps.push({ key: "span_missing" });
  }
  const termPhotos = new Set(data.photos.map((p) => p.slot));
  const postIds = new Set(data.posts.map((p) => p.id));
  const spanIds = new Set(data.spans.map((sp) => sp.id));
  data.spans.forEach((sp, i) => {
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

  // fabrication constraints ("one piece" / "N/A" are valid answers)
  if (!has(data.fab.splices)) gaps.push({ key: "splices" });
  if (!has(data.fab.maxPiece)) gaps.push({ key: "max_piece" });

  // required photo slots (+ the landing when there is one)
  const filled = new Set(data.photos.map((p) => p.slot));
  const slots = [...requiredPhotoSlots(shape)];
  if (hasPlatform) slots.push("landing");
  for (const slot of slots) {
    if (!filled.has(slot)) gaps.push({ key: "photo", detail: slot });
  }

  return gaps;
}

// A sheet may be submitted when nothing is missing and no check is red.
export function submitBlockers(
  data: MeasureData,
  shape: MeasureShape,
  tol?: Tolerances
): { gaps: Gap[]; redChecks: CheckResult[] } {
  return {
    gaps: requiredGaps(data, shape),
    redChecks: runChecks(data, shape, tol).filter((c) => c.level === "red"),
  };
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
    if (!photoSlots.has(photoSlot)) gaps.push({ key: "term_photo", detail: tag });
  }
  return gaps;
}
