// Geometry verification for measure sheets. Field values are free-text
// (inches + fractions, optional feet); this module parses them, cross-checks
// redundant measurements against each other, and reports green/yellow/red
// results. It NEVER corrects a field value — it only surfaces disagreement.

import {
  requiredPhotoSlots,
  type FlightSegment,
  type MeasureData,
  type MeasureShape,
  type PlatformSegment,
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

export const TOLERANCES = {
  riseSum: { green: 0.25, yellow: 0.75 },
  runSum: { green: 0.375, yellow: 1.0 },
  rake: { green: 0.5, yellow: 1.5 },
  angle: { green: 1.0, yellow: 2.5 }, // degrees
  widthVar: { green: 0.375, yellow: 1.0 },
} as const;

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

export function runChecks(data: MeasureData, shape: MeasureShape): CheckResult[] {
  if (shape === "spiral" || shape === "level_run" || shape === "ramp") {
    return spiralOrLevelChecks(data, shape);
  }

  const flights = data.segments.filter((s) => s.kind === "flight") as FlightSegment[];
  const out: CheckResult[] = [];

  let riseSum: number | null = 0;
  let runSum: number | null = 0;
  for (const fl of flights) {
    for (const st of fl.steps) {
      const r = parseMeas(st.rise);
      const u = parseMeas(st.run);
      riseSum = riseSum === null || r === null ? null : riseSum + r;
      runSum = runSum === null || u === null ? null : runSum + u;
    }
  }
  // platforms add to horizontal run between flights
  let platRun = 0;
  let platKnown = true;
  for (const seg of data.segments) {
    if (seg.kind === "platform") {
      const l = parseMeas((seg as PlatformSegment).length);
      if (l === null) platKnown = false;
      else platRun += l;
    }
  }

  // 1) sum of risers vs floor-to-floor (falls back to measured total rise)
  const floorToFloor = parseMeas(data.overall.floorToFloor) ?? parseMeas(data.overall.totalRise);
  out.push(compare("rise_sum", riseSum, floorToFloor, TOLERANCES.riseSum, "in"));

  // 2) sum of runs (+ landings) vs measured total run
  const totalRun = parseMeas(data.overall.totalRun);
  const runExpected = runSum === null || !platKnown ? runSum === null ? null : runSum + platRun : runSum + platRun;
  out.push(compare("run_sum", runExpected, totalRun, TOLERANCES.runSum, "in"));

  // 3) computed diagonal vs measured rake (per rail line, flights only)
  const rake = parseMeas(data.overall.rakeLength);
  const diag =
    riseSum !== null && runSum !== null
      ? Math.hypot(riseSum, runSum)
      : null;
  out.push(compare("rake", diag, rake, TOLERANCES.rake, "in"));

  // 4) computed vs measured stair angle, per flight
  flights.forEach((fl, i) => {
    let r = 0;
    let u = 0;
    let known = true;
    for (const st of fl.steps) {
      const rv = parseMeas(st.rise);
      const uv = parseMeas(st.run);
      if (rv === null || uv === null) known = false;
      else {
        r += rv;
        u += uv;
      }
    }
    const calc = known && u > 0 ? (Math.atan2(r, u) * 180) / Math.PI : null;
    const meas = parseMeas(fl.angleDeg);
    out.push(
      compare("angle", calc, meas, TOLERANCES.angle, "deg", flights.length > 1 ? `#${i + 1}` : undefined)
    );
  });

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
      level: grade(varAmt, TOLERANCES.widthVar),
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

function spiralOrLevelChecks(data: MeasureData, shape: MeasureShape): CheckResult[] {
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
  if (shape === "ramp") {
    const seg = data.segments[0];
    if (seg && seg.kind === "ramp") {
      const len = parseMeas(seg.length);
      const rise = parseMeas(seg.rise);
      const ang = parseMeas(seg.angleDeg);
      const calc = len && rise !== null && len > 0 ? (Math.asin(Math.min(1, rise / len)) * 180) / Math.PI : null;
      out.push(compare("angle", calc, ang, TOLERANCES.angle, "deg"));
    }
  }
  return out;
}

// ---- Completeness gate -----------------------------------------------------

export interface Gap {
  key: string; // i18n key: gap_<key>
  detail?: string;
}

// What must exist before a sheet can be submitted for review.
export function requiredGaps(data: MeasureData, shape: MeasureShape): Gap[] {
  const gaps: Gap[] = [];
  const has = (s: string | undefined | null) => !!s && s.trim() !== "";

  if (!has(data.datums.orientation)) gaps.push({ key: "orientation" });

  if (shape === "spiral") {
    if (!data.spiral || !has(data.spiral.floorToFloor)) gaps.push({ key: "floor_to_floor" });
    if (!data.spiral || !has(data.spiral.diameter)) gaps.push({ key: "diameter" });
  } else if (shape === "level_run") {
    const seg = data.segments[0] as PlatformSegment | undefined;
    if (!seg || !has(seg.length)) gaps.push({ key: "run_length" });
  } else if (shape === "ramp") {
    const seg = data.segments[0];
    if (!seg || seg.kind !== "ramp" || !has(seg.length) || !has(seg.rise)) {
      gaps.push({ key: "ramp_geometry" });
    }
  } else {
    let missingSteps = 0;
    const flights = data.segments.filter((s) => s.kind === "flight") as FlightSegment[];
    flights.forEach((fl, fi) => {
      fl.steps.forEach((st) => {
        if (!has(st.rise) || !has(st.run)) missingSteps += 1;
      });
      if (!has(fl.width)) gaps.push({ key: "flight_width", detail: `#${fi + 1}` });
      if (!has(fl.angleDeg)) gaps.push({ key: "flight_angle", detail: `#${fi + 1}` });
    });
    if (missingSteps > 0) gaps.push({ key: "steps", detail: `${missingSteps}` });
    if (!has(data.overall.floorToFloor) && !has(data.overall.totalRise)) {
      gaps.push({ key: "floor_to_floor" });
    }
    if (!has(data.overall.totalRun)) gaps.push({ key: "total_run" });
    if (!has(data.overall.rakeLength)) gaps.push({ key: "rake" });
  }

  if (!has(data.rail.height)) gaps.push({ key: "rail_height" });

  // posts: every placed post needs its position + mount
  data.posts.forEach((p, i) => {
    const posOk = p.stepIdx !== null ? has(p.fromNosing) : has(p.pos);
    if (!posOk || !has(p.fromEdge) || !has(p.mount)) {
      gaps.push({ key: "post", detail: `P${i + 1}` });
    }
  });

  // required photo slots
  const filled = new Set(data.photos.map((p) => p.slot));
  for (const slot of requiredPhotoSlots(shape)) {
    if (!filled.has(slot)) gaps.push({ key: "photo", detail: slot });
  }

  return gaps;
}

// A sheet may be submitted when nothing is missing and no check is red.
export function submitBlockers(
  data: MeasureData,
  shape: MeasureShape
): { gaps: Gap[]; redChecks: CheckResult[] } {
  return {
    gaps: requiredGaps(data, shape),
    redChecks: runChecks(data, shape).filter((c) => c.level === "red"),
  };
}
