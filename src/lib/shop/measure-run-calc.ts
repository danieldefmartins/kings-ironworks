// Calculated values for the railed-run work types, to approve or modify
// (the stair's pattern in measure-angle.ts), and "Same for all" copies.
//
//   deck corner   a closed outline's turns come to a full turn, so the last
//                 corner is 360° less the others; a rectangle's corners are 90°
//                 (four sides with equal opposites, or three sides against the
//                 house with equal ends).
//   ramp slope    the angle from the rise over the horizontal run, with the
//                 slope ratio held to 1:12 (8.33 %).
//   fence grade   the rise of each bay: the segment's grade over its panels.
import type { MeasureData } from './measure';
import { parseMeas } from './measure-parse';
import { siteNumber } from './measure-site';

const deg = (r: number) => (r * 180) / Math.PI;
const signedDeg = (s: string | undefined | null): number | null => {
  const t = (s ?? '').trim().replace(/[−–]/g, '-');
  return t ? siteNumber(t) : null;
};
const pos = (s: string | undefined | null) => {
  const n = parseMeas(s ?? '');
  return n !== null && Number.isFinite(n) && n > 0 ? n : null;
};

/** Whether side n's end is a corner the deck turns at (the last side of an open deck ends at the house). */
export function deckHasCorner(data: MeasureData, n: number): boolean {
  const d = data.deck;
  if (!d || n < 0 || n >= d.sides.length) return false;
  return d.closedLoop || n < d.sides.length - 1;
}

/** The turn at the end of deck side n implied by the others, degrees (+ left). */
export function deckTurnCalc(data: MeasureData, n: number): number | null {
  const d = data.deck;
  if (!d || !deckHasCorner(data, n)) return null;
  const sides = d.sides;
  const others = sides.map((s, i) => (i === n ? null : signedDeg(s.turnDeg)));
  const filled = others.filter((t): t is number => t !== null);
  const sign = filled.length ? (filled.reduce((a, b) => a + b, 0) >= 0 ? 1 : -1) : 1;
  // Closed: the exterior turns of a closed outline add to a full turn.
  if (d.closedLoop && sides.length >= 3 && others.every((t, i) => i === n || t !== null)) {
    const rest = 360 * sign - filled.reduce((a, b) => a + b, 0);
    return Math.abs(rest) > 0.05 && Math.abs(rest) <= 180 ? Math.round(rest * 10) / 10 : null;
  }
  const L = sides.map((s) => pos(s.length));
  const eq = (a: number | null, b: number | null) => a !== null && b !== null && Math.abs(a - b) <= 0.5;
  // A rectangle: square corners.
  if (d.closedLoop && sides.length === 4 && eq(L[0], L[2]) && eq(L[1], L[3])) return 90 * sign;
  if (!d.closedLoop && sides.length === 3 && eq(L[0], L[2]) && L[1] !== null) return 90 * sign;
  return null;
}


/** A ramp's slope angle from its rise and horizontal run. */
export function rampAngleCalc(data: MeasureData, segIdx: number): number | null {
  const s = data.segments[segIdx];
  if (!s || s.kind !== 'ramp') return null;
  const r = parseMeas(s.rise), u = pos(s.runH);
  return r !== null && u !== null && r >= 0 ? deg(Math.atan2(r, u)) : null;
}


/** Accessible-ramp limit: 1 in 12. */
export const RAMP_MAX_RATIO = 12;
/** "1:N" for a ramp (run per unit of rise) and whether it is within 1:12. Null until rise and run are in. */
export function rampRatio(data: MeasureData, segIdx: number): { ratio: number; ok: boolean; level: 'green' | 'yellow' | 'red' } | null {
  const s = data.segments[segIdx];
  if (!s || s.kind !== 'ramp') return null;
  const r = pos(s.rise), u = pos(s.runH);
  if (r === null || u === null) return null;
  const ratio = u / r;
  // A hair under 12 is a tape reading, not a different ramp.
  const level = ratio >= RAMP_MAX_RATIO - 1e-6 ? 'green' : ratio >= RAMP_MAX_RATIO - 0.5 ? 'yellow' : 'red';
  return { ratio, ok: level !== 'red', level };
}

/** Grade each bay climbs on a fence segment: its rise over its panels. Null on level ground or without panels. */
export function fenceGradePerBay(data: MeasureData, segIdx: number, panels?: number): number | null {
  const sg = data.fence?.segments[segIdx];
  if (!sg) return null;
  const rise = signedDeg(sg.gradeChange), n = panels ?? pos(sg.panels);
  return rise && n ? Math.abs(rise) / n : null;
}
