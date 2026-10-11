// Dimension lines for a ramp: for each ramp run its rise at the top, its
// horizontal run along the floor, its length along the slope, the slope angle
// at the foot and its width; the rail height at mid ramp. A level run (one
// landing) is the stair's landing dimensions plus its rail height.
import type { MeasureData } from './measure';
import { stairGeometry } from './measure-geometry';
import { arcDim, linearDim, stairDims, type SceneDim } from './measure-dims';
import { dim, meas, UP, v3, vadd, vmul, vsub, vunit } from './measure-dims-kit';
import { rampAngleCalc } from './measure-run-calc';

export function rampDims(data: MeasureData): SceneDim[] {
  const model = stairGeometry(data);
  if (!model) return [];
  const out: SceneDim[] = [];
  data.segments.forEach((s, i) => {
    if (s.kind !== 'ramp') return;
    const t = model.treads.find((x) => x.segIdx === i);
    if (!t) return;
    const [c0, c1, , c3] = t.corners;
    const across = vunit(vsub(c3, c0)), left = vmul(across, -1);
    const along = vunit(v3(c1.x - c0.x, c1.y - c0.y, 0));
    const R = meas(s.rise), U = meas(s.runH), S = meas(s.length);
    const foot = v3(c1.x, c1.y, c0.z);
    const rise = linearDim(foot, c1, left, 14);
    out.push(dim({ key: `rampRise:${i}`, kind: 'rampRise', slots: [`s${i}.rampRise`], scope: 'context', segs: [i], unit: 'len', value: R, calc: S !== null && U !== null && S > U ? Math.sqrt(S * S - U * U) : null, lines: rise.lines, anchor: rise.anchor }));
    const run = linearDim(c0, foot, vadd(vmul(left, 0.55), vmul(UP, -0.83)), 12);
    out.push(dim({ key: `rampRun:${i}`, kind: 'rampRun', slots: [`s${i}.rampRun`], scope: 'overall', segs: [i], unit: 'len', value: U, calc: S !== null && R !== null && S > R ? Math.sqrt(S * S - R * R) : null, lines: run.lines, anchor: run.anchor }));
    const sl = vunit(vsub(c1, c0)), n = vunit(vsub(UP, vmul(sl, sl.z)));
    const len = linearDim(c0, c1, vadd(n, vmul(left, 0.4)), 10);
    out.push(dim({ key: `rampLength:${i}`, kind: 'rampLength', slots: [`s${i}.rampLength`], scope: 'overall', segs: [i], unit: 'len', value: S, calc: R !== null && U !== null ? Math.hypot(R, U) : null, lines: len.lines, anchor: len.anchor }));
    const arc = arcDim(vadd(c0, vmul(left, 0.5)), along, sl, 16);
    out.push(dim({ key: `rampAngle:${i}`, kind: 'rampAngle', slots: [`s${i}.rampAngle`], scope: 'context', segs: [i], unit: 'deg', value: meas(s.angleDeg), calc: rampAngleCalc(data, i), lines: arc.lines, anchor: arc.anchor }));
    const w = linearDim(c0, c3, vmul(along, -1), 9);
    out.push(dim({ key: `rampWidth:${i}`, kind: 'rampWidth', slots: [`s${i}.rampWidth`], scope: 'context', segs: [i], unit: 'len', value: meas(s.width), calc: null, lines: w.lines, anchor: w.anchor }));
  });
  out.push(...railHeightDim(data, model));
  return out;
}

/** Rail height above the walking surface, on the left edge half way along the first piece. */
function railHeightDim(data: MeasureData, model: NonNullable<ReturnType<typeof stairGeometry>>): SceneDim[] {
  const t = model.treads[0];
  if (!t) return [];
  const p = vadd(t.corners[0], vmul(vsub(t.corners[1], t.corners[0]), 0.5)), H = meas(data.rail.height);
  const along = vunit(v3(t.corners[1].x - t.corners[0].x, t.corners[1].y - t.corners[0].y, 0));
  const d = linearDim(p, vadd(p, vmul(UP, H ?? 36)), vmul(along, -1), 5);
  return [dim({ key: 'railHeight', kind: 'railHeight', slots: ['rail.height'], scope: 'context', segs: [], unit: 'len', value: H, calc: null, lines: d.lines, anchor: d.anchor })];
}

export function levelRunDims(data: MeasureData): SceneDim[] {
  const model = stairGeometry(data);
  if (!model) return [];
  return [...stairDims(data, model), ...railHeightDim(data, model)];
}
