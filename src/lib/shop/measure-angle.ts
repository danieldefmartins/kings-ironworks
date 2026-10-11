import type { FlightSegment, JointMeasure, MeasureData } from './measure';
import { flightTotals } from './measure-derive';
import { parseMeas } from './measure-parse';

/**
 * Stair angle, approve or modify. The pitch is already known from the tape —
 * the risers over the treads, or the flight's own control rise over run — so
 * the measurer is offered that number to approve, and only reaches for the
 * digital angle finder when they want to read it themselves. A read angle is
 * then held against the calculated one the same way a joint is checked.
 */
export type AngleSource = '' | 'calculated-approved' | 'measured';

const deg = (r: number) => (r * 180) / Math.PI;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** A flight's pitch from its own measurements: every step, else its control rise and run. */
export function flightAngleCalc(fl: FlightSegment | undefined | null): number | null {
  if (!fl || fl.kind !== 'flight') return null;
  const t = flightTotals(fl);
  if (t && t.run > 0) return deg(Math.atan2(t.rise, t.run));
  const r = parseMeas(fl.ctrlRise), u = parseMeas(fl.ctrlRun);
  if (r !== null && u !== null && r > 0 && u > 0) return deg(Math.atan2(r, u));
  return null;
}

/** The pitch either side of a joint — measured where there is one, else calculated. */
function pitchAt(data: MeasureData, i: number): number | null {
  const seg = data.segments[i];
  if (!seg) return null;
  if (seg.kind === 'flight') return parseMeas(seg.angleDeg) ?? flightAngleCalc(seg);
  if (seg.kind === 'ramp') {
    const m = parseMeas(seg.angleDeg);
    if (m !== null) return m;
    const r = parseMeas(seg.rise), u = parseMeas(seg.runH);
    return r !== null && u !== null && u > 0 ? deg(Math.atan2(r, u)) : null;
  }
  // A landing is level save for its drainage fall (the joint check reads it the same way).
  if (seg.kind === 'platform') return parseMeas(seg.slope) ?? 0;
  return null;
}

/** Change of rail angle across a joint, from the two pitches either side. */
export function jointAngleCalc(data: MeasureData, joint: Pick<JointMeasure, 'afterSegment'>): number | null {
  const lower = pitchAt(data, joint.afterSegment), upper = pitchAt(data, joint.afterSegment + 1);
  return lower === null || upper === null ? null : Math.abs(upper - lower);
}

export type AngleLevel = 'green' | 'yellow' | 'red';
/** A read angle against the calculated one — the same bands as the joint check. */
export function angleCheck(calc: number | null, measured: number | null): { level: AngleLevel; delta: number } | null {
  if (calc === null || measured === null) return null;
  const delta = round1(Math.abs(measured) - calc);
  const off = Math.abs(delta);
  return { level: off <= 1 ? 'green' : off <= 2.5 ? 'yellow' : 'red', delta };
}

/** What gets stored when the calculated angle is approved: one decimal, as a finder reads. */
export function approvedAngle(calc: number): string {
  return String(round1(calc));
}

/** Approve the flight's calculated pitch as its angle. Returns false when there is nothing to approve. */
export function approveFlightAngle(data: MeasureData, segIdx: number): boolean {
  const fl = data.segments[segIdx];
  if (!fl || fl.kind !== 'flight') return false;
  const calc = flightAngleCalc(fl);
  if (calc === null) return false;
  fl.angleDeg = approvedAngle(calc);
  fl.angleSource = 'calculated-approved';
  return true;
}

/** Approve the calculated change of angle at a joint. */
export function approveJointAngle(data: MeasureData, n: number): boolean {
  const j = (data.joints || [])[n];
  if (!j) return false;
  const calc = jointAngleCalc(data, j);
  if (calc === null) return false;
  j.angleChange = approvedAngle(calc);
  j.angleChangeSource = 'calculated-approved';
  return true;
}

/**
 * Where a stored angle came from. A typed value with no source (older sheets)
 * is a reading; an approved value that no longer matches the calculation
 * (the steps were re-measured since) is treated as a reading too, so it is
 * checked rather than silently trusted.
 */
export function angleState(value: string, source: AngleSource | undefined, calc: number | null): 'empty' | 'approved' | 'measured' {
  if (!value.trim()) return 'empty';
  if (source === 'calculated-approved' && calc !== null && approvedAngle(calc) === value.trim()) return 'approved';
  return 'measured';
}
