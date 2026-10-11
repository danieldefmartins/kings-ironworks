// Small helpers the per-shape dimension adapters share (measure-dims-*.ts).
import type { Point3 } from './measure-geometry';
import type { DimState, SceneDim, Seg3 } from './measure-dims';
import { parseMeas } from './measure-parse';

export type V = Point3;
export const v3 = (x: number, y: number, z: number): V => ({ x, y, z });
export const vadd = (a: V, b: V): V => v3(a.x + b.x, a.y + b.y, a.z + b.z);
export const vsub = (a: V, b: V): V => v3(a.x - b.x, a.y - b.y, a.z - b.z);
export const vmul = (a: V, k: number): V => v3(a.x * k, a.y * k, a.z * k);
export const vlen = (a: V) => Math.hypot(a.x, a.y, a.z);
export const vunit = (a: V): V => { const l = vlen(a); return l > 1e-9 ? vmul(a, 1 / l) : v3(0, 0, 0); };
export const UP = v3(0, 0, 1);
/** Left of travel in plan. */
export const leftOf = (a: V, b: V): V => vunit(v3(-(b.y - a.y), b.x - a.x, 0));

/** A measured length (or angle), positive, else null. */
export const meas = (s: string | undefined | null): number | null => {
  const t = (s ?? '').trim();
  if (!t) return null;
  const n = parseMeas(t);
  return n !== null && Number.isFinite(n) && n >= 0 ? n : null;
};

export const stateOf = (value: number | null, calc: number | null): DimState =>
  value !== null ? 'measured' : calc !== null ? 'calculated' : 'unknown';

/** Build a SceneDim from its parts; state follows value / calc. */
export function dim(d: Omit<SceneDim, 'state'> & { lines: Seg3[] }): SceneDim {
  return { ...d, state: stateOf(d.value, d.calc) };
}
