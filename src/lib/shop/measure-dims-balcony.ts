// Dimension lines for a balcony or Juliet: the edge length (or the door
// opening), how far it projects, the guard height, the slab thickness, the
// anchor's edge distance and embedment. Balcony scene coordinates: wall face
// at Y = 0, balcony toward −Y, finished floor at Z = 0.
import type { MeasureData } from './measure';
import { linearDim, type SceneDim } from './measure-dims';
import { dim, meas, v3 } from './measure-dims-kit';
import { BALCONY_SKETCH, balconyLines } from './measure-post-suggest-balcony';

export function balconyDims(data: MeasureData): SceneDim[] {
  const b = data.balcony, lines = balconyLines(data, true);
  if (!b || !lines) return [];
  const out: SceneDim[] = [];
  const juliet = b.kind === 'juliet';
  const L = (juliet ? meas(b.doorOpening) ?? meas(b.edgeLength) : meas(b.edgeLength)) || BALCONY_SKETCH.length;
  const P = meas(b.projection) ?? 0, H = meas(b.guardHeight) ?? meas(data.rail.height) ?? BALCONY_SKETCH.guard;
  const post0 = lines.runs[0].path[0];
  if (juliet) {
    // The rail's own length, where a Juliet sheet records one beside the door opening.
    const r = linearDim(v3(0, -P, H), v3(L, -P, H), v3(0, 0, 1), 8);
    out.push(dim({ key: 'balEdge', kind: 'edgeLength', slots: ['bal.edgeLength'], scope: 'context', mark: 'number', unit: 'len', value: meas(b.edgeLength), calc: null, lines: r.lines, anchor: r.anchor }));
    const d = linearDim(v3(0, 0, 0), v3(L, 0, 0), v3(0, 0, -1), 10);
    out.push(dim({ key: 'balDoor', kind: 'doorOpening', slots: ['bal.doorOpening'], scope: 'overall', unit: 'len', value: meas(b.doorOpening), calc: null, lines: d.lines, anchor: d.anchor }));
  } else {
    const d = linearDim(v3(0, -P, 0), v3(L, -P, 0), v3(0, -1, 0), 18);
    out.push(dim({ key: 'balEdge', kind: 'edgeLength', slots: ['bal.edgeLength'], scope: 'overall', unit: 'len', value: meas(b.edgeLength), calc: null, lines: d.lines, anchor: d.anchor }));
    if (P > 0) {
      const p = linearDim(v3(0, 0, 0), v3(0, -P, 0), v3(-1, 0, 0), 14);
      out.push(dim({ key: 'balProjection', kind: 'projection', slots: [], scope: 'overall', unit: 'len', value: P, calc: null, lines: p.lines, anchor: p.anchor }));
    }
  }
  // Slab thickness at the slab's outer edge, and the anchor centre in from that edge (the front line of posts).
  const T = meas(b.slabThickness);
  const t = linearDim(v3(L, -P, 0), v3(L, -P, -(T ?? 6)), v3(1, 0, 0), 8);
  out.push(dim({ key: 'balSlab', kind: 'slabThickness', slots: ['bal.slabThickness'], scope: 'context', unit: 'len', value: T, calc: null, lines: t.lines, anchor: t.anchor }));
  const front = lines.runs.find((r) => r.id === 'bal:front')!.path[0].y, x = L / 2, E = meas(b.edgeDistance);
  const e = linearDim(v3(x, -P, 0.3), v3(x, Math.abs(front + P) > 0.25 ? front : -P + (E ?? 3), 0.3), v3(1, 0, 0), 6);
  out.push(dim({ key: 'balEdgeDist', kind: 'edgeDistance', slots: ['bal.edgeDistance'], scope: 'context', unit: 'len', value: E, calc: null, lines: e.lines, anchor: e.anchor }));
  if (!juliet) {
    const d = linearDim(v3(0, 0, 0), v3(L, 0, 0), v3(0, 0, -1), 10);
    out.push(dim({ key: 'balDoor', kind: 'doorOpening', slots: ['bal.doorOpening'], scope: 'context', mark: 'number', unit: 'len', value: meas(b.doorOpening), calc: null, lines: d.lines, anchor: d.anchor }));
  }
  // The finished floor the guard height is taken from: the walking surface under the guard.
  const floor = lines.runs.flatMap((r) => r.path.slice(1).map((q, i) => [{ ...r.path[i], z: 0.3 }, { ...q, z: 0.3 }] as [typeof q, typeof q]));
  const slab: [ReturnType<typeof v3>, ReturnType<typeof v3>][] = P > 0 ? [[v3(0, 0, 0.3), v3(0, -P, 0.3)], [v3(0, -P, 0.3), v3(L, -P, 0.3)], [v3(L, -P, 0.3), v3(L, 0, 0.3)]] : [];
  out.push(dim({ key: 'balFloor', kind: 'finishedFloor', slots: ['bal.finishedFloor'], scope: 'context', mark: 'number', unit: 'len', value: meas(b.finishedFloor), calc: null, lines: [...floor, ...slab], anchor: v3(L / 2, -P, 0.3) }));
  const g = linearDim(post0, v3(post0.x, post0.y, H), v3(-1, 0, 0), 6);
  out.push(dim({ key: 'balGuard', kind: 'guardHeight', slots: ['bal.guardHeight'], scope: 'context', unit: 'len', value: meas(b.guardHeight), calc: null, lines: g.lines, anchor: g.anchor }));
  // Embedment: down from the floor at the first post (shown with the guard only where the post is set into the slab).
  const M = meas(b.anchorEmbedment), set = b.mount === 'core_drill' || b.mount === 'embedded';
  const m = linearDim(post0, v3(post0.x, post0.y, -(M ?? 4)), v3(-1, 0, 0), 6);
  out.push(dim({ key: 'balEmbed', kind: 'embedment', slots: ['bal.anchorEmbedment'], scope: 'context', ...(set ? {} : { mark: 'number' as const }), unit: 'len', value: M, calc: null, lines: m.lines, anchor: m.anchor }));
  return out;
}
