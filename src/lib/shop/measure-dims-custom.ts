// Dimension lines for a drawn (custom) railing: every drawn line's length,
// beside it on the left of travel, on the same walked plan the 3D draws.
import { planPaths, type MeasureData } from './measure';
import { linearDim, type SceneDim } from './measure-dims';
import { dim, leftOf, meas } from './measure-dims-kit';
import { drawingScale, walkPath } from './scene-shapes/scene-custom';

/** Next-card slot id for one drawn line. */
export const planLineSlot = (pathId: string, i: number) => `plan.${pathId}.${i}`;

export function customDims(data: MeasureData): SceneDim[] {
  const paths = planPaths(data.plan).filter((p) => p.points.length > 1);
  if (!paths.length) return [];
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
  return out;
}
