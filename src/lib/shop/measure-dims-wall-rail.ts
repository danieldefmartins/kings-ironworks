import type { MeasureData } from './measure';
import type { Point3 } from './measure-geometry';
import { linearDim, stairDims, type SceneDim, type DimState } from './measure-dims';
import { bracketPlan, bracketPositions, wallRailFrame } from './scene-shapes/scene-wall-rail';
import { suggestBrackets } from './measure-post-suggest-wall-rail';

/**
 * Wall rail: the stair's own lines (floor to floor, run, rake, rail height…)
 * plus the rail's — on the 3D the scene draws (scene-shapes/scene-wall-rail.ts).
 *
 *   overall   the spacing between the first two brackets, each extension past
 *             the end nosings
 *   context   the return depth back to the wall
 */
const UP: Point3 = { x: 0, y: 0, z: 1 };
const state = (v: number | null, c: number | null): DimState => (v !== null ? 'measured' : c !== null ? 'calculated' : 'unknown');

export function wallRailDims(data: MeasureData): SceneDim[] {
  const out = stairDims(data), fr = wallRailFrame(data);
  if (!fr) return out;
  const { a, b, along, horiz, topExt, botExt, hasExt, runLen, toWall, rail } = fr;
  const add = (p: Point3, q: Point3, k: number): Point3 => ({ x: p.x + q.x * k, y: p.y + q.y * k, z: p.z + q.z * k });
  const lin = (d: Omit<SceneDim, 'state' | 'lines' | 'anchor'>, p: Point3, q: Point3, n: Point3, off: number) => {
    const dim = linearDim(p, q, n, off);
    out.push({ ...d, state: state(d.value, d.calc), lines: dim.lines, anchor: dim.anchor });
  };
  // Brackets hang under the rail: offsets normal to the rail line.
  const n = { x: -along.x * along.z, y: -along.y * along.z, z: 1 - along.z * along.z };
  // Brackets: first span, measured when the sheet gives a spacing, else the plan's.
  const plan = bracketPlan(data.rail.brackets), at = bracketPositions(data, runLen);
  if (at.length >= 2) {
    const p = add(a, along, at[0]), q = add(a, along, at[1]), down = { x: -n.x, y: -n.y, z: -n.z };
    const sug = suggestBrackets(runLen);
    lin({ key: 'wr:bracket', kind: 'bracketSpacing', slots: ['rail.brackets'], scope: 'overall', unit: 'len', value: plan.spacing, calc: at[1] - at[0] || sug.spanEach },
      { ...p, z: p.z - rail.size / 2 - 1.5 }, { ...q, z: q.z - rail.size / 2 - 1.5 }, down, 6);
  }
  if (hasExt && topExt > 0) lin({ key: 'wr:extTop', kind: 'extension', slots: [], scope: 'overall', unit: 'len', value: topExt, calc: null }, b, { ...add(b, horiz, topExt), z: b.z }, UP, 6);
  if (hasExt && botExt > 0) lin({ key: 'wr:extBot', kind: 'extension', slots: [], scope: 'overall', unit: 'len', value: botExt, calc: null }, { ...add(a, horiz, -botExt), z: a.z }, a, UP, 6);
  if (fr.returns) {
    const end = { ...add(b, horiz, topExt), z: b.z };
    lin({ key: 'wr:return', kind: 'returnDepth', slots: [], scope: 'context', unit: 'len', value: null, calc: fr.offset }, toWall(end), end, UP, 4);
  }
  return out;
}
