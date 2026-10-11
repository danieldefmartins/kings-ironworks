import type { MeasureData } from './measure';
import type { Point3 } from './measure-geometry';
import { parseMeas, formatIn } from './measure-parse';
import { arcDim, linearDim, type SceneDim, type DimState } from './measure-dims';
import { fireHeights } from './scene-shapes/scene-fire-escape';
import type { CalcResult } from './measure-calc-struct';

/**
 * Fire escape: dimension lines on the same 3D the scene draws
 * (scene-shapes/scene-fire-escape.ts — wall face y = 0, platforms toward −y,
 * levels stored top down).
 *
 *   overall   floor to floor between every two levels, chained up the right
 *             side; the stack, grade to the top platform
 *   per level height above grade, platform length and width, guard height,
 *             one riser and one tread of its stair, the stair's width and its
 *             angle at the foot
 *   ladder    its length, width and rung spacing
 *
 * Approve: each level's stair angle from its rise over its run.
 */
const P = (x: number, y: number, z: number): Point3 => ({ x, y, z });
const UP = P(0, 0, 1), DOWN = P(0, 0, -1), LEFT = P(-1, 0, 0), RIGHT = P(1, 0, 0), FRONT = P(0, -1, 0);
const num = (s: string | undefined | null, zero = false) => {
  const n = parseMeas(s ?? '');
  return n !== null && Number.isFinite(n) && (zero ? n >= 0 : n > 0) && (s ?? '').trim() !== '' ? n : null;
};
const state = (v: number | null, c: number | null): DimState => (v !== null ? 'measured' : c !== null ? 'calculated' : 'unknown');
const deg = (r: number) => (r * 180) / Math.PI;

/** Stair angle from a level's own rise and run. */
export function fireStairAngleCalc(l: { stairRise: string; stairRun: string }): number | null {
  const r = num(l.stairRise), u = num(l.stairRun);
  return r !== null && u !== null ? deg(Math.atan2(r, u)) : null;
}

/** Grade to the top platform from the lowest platform and every floor to floor above it. */
export function fireStackCalc(data: MeasureData): number | null {
  const f = data.fire;
  if (!f?.levels.length) return null;
  let sum = num(f.levels[f.levels.length - 1].heightAboveGrade, true);
  for (let i = 0; i < f.levels.length - 1 && sum !== null; i++) {
    const ftf = num(f.levels[i].floorToFloor);
    sum = ftf === null ? null : sum + ftf;
  }
  return sum;
}

export function fireDims(data: MeasureData): SceneDim[] {
  const f = data.fire, out: SceneDim[] = [];
  if (!f?.levels.length) return out;
  const heights = fireHeights(f.levels), n = f.levels.length;
  const dims = f.levels.map(l => ({ L: num(l.platLength) ?? 120, W: num(l.platWidth) ?? 42 }));
  const maxL = Math.max(...dims.map(d => d.L)), top = Math.max(...heights.map(h => h.z));
  const push = (d: Omit<SceneDim, 'state' | 'lines' | 'anchor'> & { a: Point3; b: Point3; nv: Point3; off: number }) => {
    const { a, b, nv, off, ...rest } = d, dim = linearDim(a, b, nv, off);
    out.push({ ...rest, state: state(rest.value, rest.calc), lines: dim.lines, anchor: dim.anchor });
  };
  push({ key: 'fire:total', kind: 'fireTotal', slots: ['fire.totalHeight'], scope: 'overall', unit: 'len', value: num(f.totalHeight), calc: fireStackCalc(data),
    a: P(maxL + 30, -2, 0), b: P(maxL + 30, -2, top), nv: RIGHT, off: 18 });
  f.levels.forEach((l, i) => {
    const { z } = heights[i], { L, W } = dims[i], at = `fire.l${i}`;
    // Grade to this platform, stepped out so the lines of a tall stack do not sit on each other.
    push({ key: `fire:hag:${i}`, kind: 'fireHeight', slots: [`${at}.heightAboveGrade`], scope: 'context', unit: 'len', value: num(l.heightAboveGrade, true), calc: null,
      a: P(0, -W, 0), b: P(0, -W, z), nv: LEFT, off: 14 + 9 * (n - 1 - i) });
    if (i < n - 1) {
      const lower = heights[i + 1];
      const calc = !heights[i].provisional && !lower.provisional ? z - lower.z : null;
      push({ key: `fire:ftf:${i}`, kind: 'fireFtf', slots: [`${at}.floorToFloor`], scope: 'overall', unit: 'len', value: num(l.floorToFloor), calc,
        a: P(Math.max(L, dims[i + 1].L), -W, lower.z), b: P(Math.max(L, dims[i + 1].L), -W, z), nv: RIGHT, off: 12 });
    }
    push({ key: `fire:platL:${i}`, kind: 'platLength', slots: [`${at}.platLength`], scope: 'context', unit: 'len', value: num(l.platLength), calc: null,
      a: P(0, -W, z), b: P(L, -W, z), nv: FRONT, off: 10 });
    push({ key: `fire:platW:${i}`, kind: 'platDepth', slots: [`${at}.platWidth`], scope: 'context', unit: 'len', value: num(l.platWidth), calc: null,
      a: P(L, 0, z), b: P(L, -W, z), nv: RIGHT, off: 10 });
    const gh = num(l.guardHeight);
    push({ key: `fire:guard:${i}`, kind: 'guardHeight', slots: [`${at}.guardHeight`], scope: 'context', unit: 'len', value: gh, calc: null,
      a: P(L, -W, z), b: P(L, -W, z + (gh ?? 42)), nv: FRONT, off: 6 });
    if (i >= n - 1) return;
    // The stair down to the next level — the scene's own placement.
    const lowerZ = heights[i + 1].z, drop = z - lowerZ;
    const risers = num(l.stairRisers) !== null ? Math.round(num(l.stairRisers)!) : null, rise = num(l.stairRise), run = num(l.stairRun), sw = num(l.stairWidth) ?? 22;
    const nR = risers ?? Math.max(2, Math.round(drop / (rise ?? 8))), r = drop / nR;
    const t = run ?? (rise !== null ? rise : 8) / Math.tan(((num(l.stairAngle) ?? 55) * Math.PI) / 180);
    const total = t * (nR - 1), Lo = Math.min(L, dims[i + 1].L), dir = i % 2 === 0 ? -1 : 1;
    const xt = dir < 0 ? Math.min(Lo, L) - 6 : 6, xb = xt + dir * Math.min(total, Lo - 12);
    const yIn = -W + sw + 1.5, yOut = -W + 1.5, tp = (xb - xt) / Math.max(1, nR - 1);
    // First tread below the platform: its depth, and the riser up to the platform.
    const x1 = xt + tp * 0.5, z1 = z - r, half = tp / 2;
    push({ key: `fire:run:${i}`, kind: 'fireRun', slots: [`${at}.stairRun`], scope: 'context', unit: 'len', value: run, calc: null,
      a: P(x1 - half, yOut, z1), b: P(x1 + half, yOut, z1), nv: DOWN, off: 6 });
    push({ key: `fire:rise:${i}`, kind: 'fireRise', slots: [`${at}.stairRise`], scope: 'context', unit: 'len', value: rise, calc: num(l.floorToFloor) !== null && risers ? num(l.floorToFloor)! / risers : null,
      a: P(x1 + half, yOut, z1 - r), b: P(x1 + half, yOut, z1), nv: P(dir, 0, 0), off: 6 });
    push({ key: `fire:sw:${i}`, kind: 'width', slots: [`${at}.stairWidth`], scope: 'context', unit: 'len', value: num(l.stairWidth), calc: null,
      a: P(xt, yOut, z), b: P(xt, yIn, z), nv: UP, off: 8 });
    // Pitch: at the foot of the stair, between the lower deck and the stringer.
    const foot = P(xb + tp / 2, yOut, lowerZ), head = P(xt, yOut, z);
    const pitch = { x: head.x - foot.x, y: 0, z: head.z - foot.z }, pl = Math.hypot(pitch.x, pitch.z);
    if (pl > 1) {
      const arc = arcDim(foot, P(Math.sign(pitch.x) || 1, 0, 0), P(pitch.x / pl, 0, pitch.z / pl), 14);
      out.push({ key: `fire:angle:${i}`, kind: 'angle', slots: [`${at}.stairAngle`], scope: 'context', unit: 'deg', value: num(l.stairAngle), calc: fireStairAngleCalc(l),
        state: state(num(l.stairAngle), fireStairAngleCalc(l)), lines: arc.lines, anchor: arc.anchor });
    }
  });
  // Drop ladder off the lowest platform: the scene's placement.
  const lad = f.ladder, lo = n - 1;
  if (lad.present) {
    const { z } = heights[lo], { L, W } = dims[lo], len = num(lad.length), width = num(lad.width) ?? 16, stowed = num(lad.stowedAboveGrade, true), rung = num(lad.rungSpacing);
    const bottom = stowed ?? Math.max(0, z - (len ?? z)), topZ = len !== null ? bottom + len : z + 42, x = lo % 2 === 0 ? L - 12 - width / 2 : 12 + width / 2, y = -W - 3;
    push({ key: 'fire:ladder:len', kind: 'ladderLength', slots: ['fire.ladder.length'], scope: 'context', unit: 'len', value: len, calc: null,
      a: P(x + width / 2, y, bottom), b: P(x + width / 2, y, topZ), nv: RIGHT, off: 10 });
    push({ key: 'fire:ladder:w', kind: 'width', slots: ['fire.ladder.width'], scope: 'context', unit: 'len', value: num(lad.width), calc: null,
      a: P(x - width / 2, y, bottom), b: P(x + width / 2, y, bottom), nv: DOWN, off: 8 });
    const r0 = bottom + 2, step = rung ?? 12;
    push({ key: 'fire:ladder:rung', kind: 'rung', slots: ['fire.ladder.rungSpacing'], scope: 'context', unit: 'len', value: rung, calc: null,
      a: P(x - width / 2, y, r0), b: P(x - width / 2, y, r0 + step), nv: LEFT, off: 6 });
  }
  return out;
}

/** A level's stair angle, from its rise over its run. */
export function fireSlotCalc(slotId: string, data: MeasureData): CalcResult | null {
  const m = slotId.match(/^fire\.l(\d+)\.stairAngle$/);
  if (!m) return null;
  const l = data.fire?.levels[Number(m[1])];
  if (!l) return null;
  const calc = fireStairAngleCalc(l), r = num(l.stairRise), u = num(l.stairRun);
  return { calc, note: calc !== null && r !== null && u !== null ? `${formatIn(r)} / ${formatIn(u)}` : undefined };
}
