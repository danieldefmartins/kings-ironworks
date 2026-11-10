// Dimension lines for a drawn (custom) railing: every drawn line's length,
// beside it on the left of travel, on the same walked plan the 3D draws.
import { planPaths, type MeasureData } from './measure';
import { linearDim, type SceneDim } from './measure-dims';
import { dim, leftOf, meas, UP, v3, vadd, vmul, vsub, vunit, type V } from './measure-dims-kit';
import { CUSTOM_SKETCH, drawingScale, walkPath } from './scene-shapes/scene-custom';

/** Next-card slot id for one drawn line. */
export const planLineSlot = (pathId: string, i: number) => `plan.${pathId}.${i}`;

export function customDims(data: MeasureData): SceneDim[] {
  const paths = planPaths(data.plan).filter((p) => p.points.length > 1);
  const H = meas(data.rail.height);
  // Rail height: walking surface to the top of the rail, at the start of the first run (the stand-in run until one is drawn).
  const railAt = (a: V, b: V): SceneDim => {
    const d = linearDim(a, vadd(a, vmul(UP, H ?? CUSTOM_SKETCH.height)), vmul(vunit(vsub(b, a)), -1), 7);
    return dim({ key: 'planRailHeight', kind: 'railHeight', slots: ['rail.height'], scope: 'context', unit: 'len', value: H, calc: null, lines: d.lines, anchor: d.anchor });
  };
  if (!paths.length) return [railAt(v3(0, 0, 0), v3(CUSTOM_SKETCH.length, 0, 0))];
  const scale = drawingScale(paths) ?? 1.2, first = paths[0].points[0];
  const out: SceneDim[] = [];
  for (const path of paths) {
    const o = path.points[0];
    const walk = walkPath(path, scale, { x: (o.x - first.x) * scale, y: -(o.y - first.y) * scale, z: 0 });
    for (let i = 1; i < walk.points.length; i++) {
      const a = walk.points[i - 1], b = walk.points[i];
      const d = linearDim(a, b, leftOf(a, b), 12);
      out.push(dim({ key: `planLine:${path.id}:${i - 1}`, kind: 'planLine', slots: [planLineSlot(path.id, i - 1)], scope: 'overall', unit: 'len', value: meas(path.segs[i - 1]?.len), calc: null, lines: d.lines, anchor: d.anchor }));
    }
  }
  const o = paths[0].points[0], start = walkPath(paths[0], scale, { x: (o.x - first.x) * scale, y: -(o.y - first.y) * scale, z: 0 });
  if (start.points.length > 1) out.push(railAt(start.points[0], start.points[1]));
  return out;
}
