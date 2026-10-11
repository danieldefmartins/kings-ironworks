// Dimension lines for a balcony or Juliet: the edge length (or the door
// opening), how far it projects, the guard height, the slab thickness, the
// anchor's edge distance and embedment. Balcony scene coordinates: wall face
// at Y = 0, balcony toward −Y, finished floor at Z = 0.
import type { MeasureData } from './measure';
import { linearDim, type SceneDim } from './measure-dims';
import { dim, meas, v3 } from './measure-dims-kit';
import { balconyLines } from './measure-post-suggest-balcony';

export function balconyDims(data: MeasureData): SceneDim[] {
  const b = data.balcony, lines = balconyLines(data);
  if (!b || !lines) return [];
  const out: SceneDim[] = [];
  const juliet = b.kind === 'juliet';
  const L = juliet ? meas(b.doorOpening) ?? meas(b.edgeLength) ?? 0 : meas(b.edgeLength) ?? 0;
  const P = meas(b.projection) ?? 0, H = meas(b.guardHeight) ?? meas(data.rail.height);
  const post0 = lines.runs[0].path[0];
  if (juliet) {
    const d = linearDim(v3(0, 0, 0), v3(L, 0, 0), v3(0, 0, -1), 10);
    out.push(dim({ key: 'balDoor', kind: 'doorOpening', slots: ['bal.doorOpening'], scope: 'overall', unit: 'len', value: meas(b.doorOpening), calc: null, lines: d.lines, anchor: d.anchor }));
  } else {
    const d = linearDim(v3(0, -P, 0), v3(L, -P, 0), v3(0, -1, 0), 18);
    out.push(dim({ key: 'balEdge', kind: 'edgeLength', slots: ['bal.edgeLength'], scope: 'overall', unit: 'len', value: meas(b.edgeLength), calc: null, lines: d.lines, anchor: d.anchor }));
    if (P > 0) {
      const p = linearDim(v3(0, 0, 0), v3(0, -P, 0), v3(-1, 0, 0), 14);
      out.push(dim({ key: 'balProjection', kind: 'projection', slots: [], scope: 'overall', unit: 'len', value: P, calc: null, lines: p.lines, anchor: p.anchor }));
      const T = meas(b.slabThickness);
      const t = linearDim(v3(L, -P, 0), v3(L, -P, -(T ?? 6)), v3(1, 0, 0), 8);
      out.push(dim({ key: 'balSlab', kind: 'slabThickness', slots: ['bal.slabThickness'], scope: 'context', unit: 'len', value: T, calc: null, lines: t.lines, anchor: t.anchor }));
      // Anchor centre in from the slab edge: the front line of posts.
      if (b.mount !== 'fascia') {
        const front = lines.runs.find((r) => r.id === 'bal:front')!.path[0].y, x = L / 2;
        const e = linearDim(v3(x, -P, 0.3), v3(x, front, 0.3), v3(1, 0, 0), 6);
        out.push(dim({ key: 'balEdgeDist', kind: 'edgeDistance', slots: ['bal.edgeDistance'], scope: 'context', unit: 'len', value: meas(b.edgeDistance), calc: null, lines: e.lines, anchor: e.anchor }));
      }
    }
  }
  const g = linearDim(post0, v3(post0.x, post0.y, H ?? 42), v3(-1, 0, 0), 6);
  out.push(dim({ key: 'balGuard', kind: 'guardHeight', slots: ['bal.guardHeight'], scope: 'context', unit: 'len', value: meas(b.guardHeight), calc: null, lines: g.lines, anchor: g.anchor }));
  if (b.mount === 'core_drill' || b.mount === 'embedded') {
    const E = meas(b.anchorEmbedment);
    const e = linearDim(post0, v3(post0.x, post0.y, -(E ?? 4)), v3(-1, 0, 0), 6);
    out.push(dim({ key: 'balEmbed', kind: 'embedment', slots: ['bal.anchorEmbedment'], scope: 'context', unit: 'len', value: E, calc: null, lines: e.lines, anchor: e.anchor }));
  }
  return out;
}
