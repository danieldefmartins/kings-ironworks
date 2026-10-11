import type { MeasureData } from './measure';
import type { Point3 } from './measure-geometry';
import { parseMeas, formatIn } from './measure-parse';
import { linearDim, type SceneDim, type Seg3, type DimState } from './measure-dims';
import type { CalcResult } from './measure-calc-struct';

/**
 * Spiral stair: dimension lines on the 3D the scene draws
 * (scene-shapes/scene-spiral.ts — column at the origin, first tread facing −y).
 *
 *   overall   floor to floor beside the stair, the diameter under the floor,
 *             the landing edge (column centre to its outer corner)
 *   context   the total rotation as an arc on the floor, one tread's angle,
 *             one riser between the first two treads
 *
 * Approve: riser = floor to floor ÷ treads; tread angle = rotation ÷ treads.
 */
const P = (x: number, y: number, z: number): Point3 => ({ x, y, z });
const num = (s: string | undefined | null) => {
  const n = parseMeas(s ?? '');
  return n !== null && Number.isFinite(n) && n > 0 && (s ?? '').trim() !== '' ? n : null;
};
const state = (v: number | null, c: number | null): DimState => (v !== null ? 'measured' : c !== null ? 'calculated' : 'unknown');

export function spiralRiserCalc(data: MeasureData): number | null {
  const s = data.spiral, f = num(s?.floorToFloor), t = num(s?.treads);
  return f !== null && t !== null ? f / Math.round(t) : null;
}
export function spiralTreadAngleCalc(data: MeasureData): number | null {
  const s = data.spiral, r = num(s?.rotationDeg), t = num(s?.treads);
  return r !== null && t !== null ? r / Math.round(t) : null;
}

/** A flat arc on a horizontal plane, from angle a0 through `sweep` (radians, signed), with its two legs. */
function flatArc(z: number, r: number, a0: number, sweep: number): { lines: Seg3[]; anchor: Point3 } {
  const at = (a: number, rr = r) => P(rr * Math.cos(a), rr * Math.sin(a), z);
  const steps = Math.max(8, Math.ceil(Math.abs(sweep) / (Math.PI / 24)));
  const lines: Seg3[] = [[P(0, 0, z), at(a0, r * 1.15)], [P(0, 0, z), at(a0 + sweep, r * 1.15)]];
  for (let i = 0; i < steps; i++) lines.push([at(a0 + (sweep * i) / steps), at(a0 + (sweep * (i + 1)) / steps)]);
  return { lines, anchor: at(a0 + sweep / 2, r + 8) };
}

export function spiralDims(data: MeasureData): SceneDim[] {
  const s = data.spiral, out: SceneDim[] = [];
  if (!s) return out;
  const ftf = num(s.floorToFloor), count = num(s.treads) !== null ? Math.round(num(s.treads)!) : null, rot = num(s.rotationDeg), dia = num(s.diameter);
  const n = Math.max(2, Math.min(40, count ?? 12)), H = ftf ?? n * 8.5, R = (dia ?? 60) / 2, turn = ((rot ?? 360) * Math.PI) / 180;
  const riser = H / n, step = turn / n, sign = s.direction === 'cw' ? -1 : 1, start = -Math.PI / 2;
  const riserCalc = spiralRiserCalc(data), angleCalc = spiralTreadAngleCalc(data);
  const lin = (d: Omit<SceneDim, 'state' | 'lines' | 'anchor'>, a: Point3, b: Point3, nv: Point3, off: number) => {
    const dim = linearDim(a, b, nv, off);
    out.push({ ...d, state: state(d.value, d.calc), lines: dim.lines, anchor: dim.anchor });
  };
  const riserVal = num(s.riser);
  lin({ key: 'spiral:f2f', kind: 'f2f', slots: ['spiral.f2f'], scope: 'overall', unit: 'len', value: ftf, calc: riserVal !== null && count !== null ? riserVal * count : null },
    P(R, 0, 0), P(R, 0, H), P(1, 0, 0), 14);
  lin({ key: 'spiral:dia', kind: 'diameter', slots: ['spiral.dia'], scope: 'overall', unit: 'len', value: dia, calc: null },
    P(-R, 0, 0), P(R, 0, 0), P(0, 0, -1), 8);
  // Landing: the last tread squared to the column — its edge from the column centre to the outer corner.
  const q0 = start + sign * step * (n - 1), qa = P(0, 0, H), qb = P(R * Math.cos(q0), R * Math.sin(q0), H);
  lin({ key: 'spiral:landing', kind: 'landing', slots: [], scope: 'overall', unit: 'len', value: null, calc: dia !== null ? R : null },
    qa, qb, P(0, 0, 1), 6);
  const angleVal = num(s.treadAngle);
  const rotArc = flatArc(1, R * 0.62, start, sign * turn);
  out.push({ key: 'spiral:rotation', kind: 'rotation', slots: ['spiral.rotation'], scope: 'context', unit: 'deg', value: rot,
    calc: angleVal !== null && count !== null ? angleVal * count : null, state: state(rot, angleVal !== null && count !== null ? angleVal * count : null), ...rotArc });
  const treadArc = flatArc(riser + 0.5, R * 0.85, start, sign * step);
  out.push({ key: 'spiral:treadAngle', kind: 'treadAngle', slots: ['spiral.treadAngle'], scope: 'context', unit: 'deg', value: angleVal, calc: angleCalc,
    state: state(angleVal, angleCalc), lines: treadArc.lines.map(([a, b]) => [P(a.x, a.y, a.z), P(b.x, b.y, b.z)] as Seg3), anchor: treadArc.anchor });
  // One riser: from the first tread up to the second, at the outer edge of the second.
  const a2 = start + sign * step * 1.5, rr = R - 3, x = rr * Math.cos(a2), y = rr * Math.sin(a2);
  lin({ key: 'spiral:riser', kind: 'riser', slots: ['spiral.riser'], scope: 'context', unit: 'len', value: riserVal, calc: riserCalc },
    P(x, y, riser), P(x, y, 2 * riser), P(Math.cos(a2), Math.sin(a2), 0), 8);
  return out;
}

export function spiralSlotCalc(slotId: string, data: MeasureData): CalcResult | null {
  const s = data.spiral;
  if (!s) return null;
  const t = num(s.treads), tn = t !== null ? Math.round(t) : null;
  if (slotId === 'spiral.riser') {
    const f = num(s.floorToFloor);
    return { calc: spiralRiserCalc(data), note: f !== null && tn ? `${formatIn(f)} ÷ ${tn}` : undefined };
  }
  if (slotId === 'spiral.treadAngle') {
    const r = num(s.rotationDeg);
    return { calc: spiralTreadAngleCalc(data), note: r !== null && tn ? `${r}° ÷ ${tn}` : undefined };
  }
  return null;
}
