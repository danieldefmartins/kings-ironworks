import type { MeasureData } from './measure';
import { linearDim, type SceneDim } from './measure-dims';
import { finishDim, P3, pos, diagonal } from './measure-dims-gate';
import { heightSpread, isFaceMount, openingFabSize, widthSpread, type OpeningData } from './measure-opening';
import { openingLayout } from './scene-shapes/scene-opening';

/**
 * Opening dimension lines, on the 3D's own layout (scene-opening.ts): each hole
 * on the shared wall, seen from outside (wall face y = 0, viewer at −y).
 *
 *   three widths (top over the head, middle across the hole, bottom under the
 *   sill) · three heights (left and right outside the jambs, centre up the
 *   middle) · both diagonals, dashed · the reveal into the jamb · the
 *   "fabricate to" width and height on the piece · a Juliet's sill height
 *   inside and its projection off the wall.
 *
 * Middle width and centre height are the overall ones; the rest of an opening's
 * lines come up when the Next card asks them or the opening is selected.
 */
export function openingDims(data: MeasureData): SceneDim[] {
  const o = data.opening as OpeningData | null | undefined;
  if (!o || !o.units.length) return [];
  const out: SceneDim[] = [];
  const layout = openingLayout(o), face = isFaceMount(o.mount);
  o.units.forEach((u, i) => {
    const { hole, depth, cx, sillZ } = layout.units[i], id = u.id, parts = [`opening:${id}`];
    const pt = (k: number) => P3(cx + hole.points[k].x, 0, sillZ + hole.points[k].z);
    const [BL, B, BR, MR, TR, T, TL, ML] = [0, 1, 2, 3, 4, 5, 6, 7].map(pt);
    const add = (key: string, a: ReturnType<typeof pt>, b: ReturnType<typeof pt>, n: ReturnType<typeof pt>, off: number, value: number | null, calc: number | null, overall = false) => {
      const d = linearDim(a, b, n, off);
      out.push(finishDim({ key: `op:${id}:${key}`, kind: `op_${key}`, slots: [`op.${id}.${key}`], unit: 'len', value, calc, lines: d.lines, anchor: d.anchor, parts, scope: overall ? 'overall' : 'context' }));
    };
    const UP = P3(0, 0, 1), DOWN = P3(0, 0, -1), L = P3(-1, 0, 0), R = P3(1, 0, 0);
    add('wTop', TL, TR, UP, 6, pos(u.wTop), null);
    add('wMid', ML, MR, UP, 0.01, pos(u.wMid), null, true);
    add('wBot', BL, BR, DOWN, 6, pos(u.wBot), null);
    add('hLeft', BL, TL, L, 6, pos(u.hLeft), null);
    add('hCenter', B, T, R, 0.01, pos(u.hCenter), null, true);
    add('hRight', BR, TR, R, 6, pos(u.hRight), null);

    // Corner to corner: A top-left → bottom-right, B top-right → bottom-left.
    const ws = widthSpread(u), hs = heightSpread(u);
    const w = pos(u.wMid) ?? (ws ? (ws.min + ws.max) / 2 : null), h = pos(u.hCenter) ?? (hs ? (hs.min + hs.max) / 2 : null);
    const calcD = w !== null && h !== null ? Math.hypot(w, h) : null;
    for (const [k, a, b] of [['diagA', TL, BR], ['diagB', TR, BL]] as const) {
      const d = diagonal(a, b);
      out.push(finishDim({ key: `op:${id}:${k}`, kind: `op_${k}`, slots: [`op.${id}.${k}`], unit: 'len', value: pos(u[k]), calc: calcD, ...d, parts, scope: 'context' }));
    }

    // Reveal: into the right jamb, three quarters up.
    if (!face) {
      const z = sillZ + hole.height * 0.75, x = cx + (MR.x - cx);
      const d = linearDim(P3(x, 0, z), P3(x, depth, z), R, 6);
      out.push(finishDim({ key: `op:${id}:reveal`, kind: 'op_reveal', slots: [`op.${id}.reveal`], unit: 'len', value: pos(u.reveal), calc: null, lines: d.lines, anchor: d.anchor, parts, scope: 'context' }));
    }

    // "Fabricate to": the piece, outside the hole's own lines.
    const fab = openingFabSize(o, u);
    if (fab) {
      const fw = pos(u.fabW) ?? fab.width, fh = pos(u.fabH) ?? fab.height;
      const z0 = sillZ + (face ? -fab.allowance : fab.allowance), x0 = cx - fw / 2, x1 = cx + fw / 2, y = face ? (o.mount === 'face_in' ? depth + 0.75 : -0.75) : 0;
      const dw = linearDim(P3(x0, y, z0 + fh), P3(x1, y, z0 + fh), UP, 16);
      out.push(finishDim({ key: `op:${id}:fabW`, kind: 'op_fabW', slots: [`op.${id}.fabW`], unit: 'len', value: pos(u.fabW), calc: fab.width, lines: dw.lines, anchor: dw.anchor, parts, scope: 'context' }));
      const dh = linearDim(P3(x1, y, z0), P3(x1, y, z0 + fh), R, 16);
      out.push(finishDim({ key: `op:${id}:fabH`, kind: 'op_fabH', slots: [`op.${id}.fabH`], unit: 'len', value: pos(u.fabH), calc: fab.height, lines: dh.lines, anchor: dh.anchor, parts, scope: 'context' }));
    }

    // Juliet: the inside floor sits its sill height below the sill; the guard stands off the face.
    if (o.product === 'juliet' && i === 0) {
      const s = pos(o.julietSill), x = BL.x - 4;
      const d = linearDim(P3(x, depth, sillZ - (s ?? 18)), P3(x, depth, sillZ), L, 6);
      out.push(finishDim({ key: 'op:julietSill', kind: 'op_julietSill', slots: ['op.julietSill'], unit: 'len', value: s, calc: null, lines: d.lines, anchor: d.anchor, scope: 'context' }));
      const pj = pos(o.julietProjection), xr = BR.x + 2;
      const p = linearDim(P3(xr, 0, sillZ), P3(xr, -(pj ?? 4), sillZ), DOWN, 4);
      out.push(finishDim({ key: 'op:julietProjection', kind: 'op_julietProjection', slots: ['op.julietProjection'], unit: 'len', value: pj, calc: null, lines: p.lines, anchor: p.anchor, scope: 'context' }));
    }
  });
  return out;
}
