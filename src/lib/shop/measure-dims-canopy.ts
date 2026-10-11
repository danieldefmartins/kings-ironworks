import type { MeasureData } from './measure';
import { linearDim, type SceneDim } from './measure-dims';
import { finishDim, P3, pos } from './measure-dims-gate';
import { canopyGeometry, canopyFallCalc, hasDoor, isSkylight, sheds } from './measure-canopy';

/**
 * Canopy dimension lines, on scene-canopy.ts's layout: house wall on y = 0,
 * the canopy projecting toward +y, x along the width from the left end.
 *
 *   width along the front · projection · trim / soffit at each end · underside
 *   at the wall · fall to the front (≈ the minimum pitch until read) · tie-rod
 *   anchor rise · each post from its own grade · door head and width.
 */
export function canopyDims(data: MeasureData): SceneDim[] {
  const c = data.canopy;
  if (!c || !c.kind) return [];
  const out: SceneDim[] = [];
  const g = canopyGeometry(c), sky = isSkylight(c);
  // The same stand-ins the 3D draws with, so the lines land on the drawing.
  const W = g.width && g.width > 0 ? g.width : 72, P = g.projection && g.projection > 0 ? g.projection : 48;
  const D = g.depth && g.depth > 0 ? g.depth : 6, H = sky ? pos(c.curb) ?? 6 : g.mount ?? 90;
  const fall = g.fall ?? (sheds(c) ? (P / 12) * 0.5 : 0), under = (y: number) => H - fall * (y / P), t = 2;
  const X = P3(1, 0, 0), NX = P3(-1, 0, 0), OUT = P3(0, 1, 0);
  const push = (key: string, slot: string, kind: string, a: ReturnType<typeof P3>, b: ReturnType<typeof P3>, n: ReturnType<typeof P3>, off: number, value: number | null, calc: number | null = null, scope: SceneDim['scope'] = 'overall', parts?: string[]) => {
    const d = linearDim(a, b, n, off);
    out.push(finishDim({ key: `cn:${key}`, kind, slots: [slot], unit: 'len', value, calc, lines: d.lines, anchor: d.anchor, scope, parts }));
  };
  const top = (y: number) => (sky ? H + 1.5 : under(y) + D);

  push('width', 'cn.width', 'cnWidth', P3(0, P, top(P)), P3(W, P, top(P)), P3(0, 0.45, 0.9), 12, g.width);
  push('projection', 'cn.projection', sky ? 'cnLength' : 'cnProjection', P3(W, 0, top(0)), P3(W, P, top(0)), P3(0.6, 0, 0.8), 12, g.projection);
  if (sky) {
    push('curb', 'cn.curb', 'cnCurb', P3(0, 0, 0), P3(0, 0, H), NX, 8, pos(c.curb));
  } else {
    const sL = pos(c.soffitL), sR = pos(c.soffitR), wallTop = Math.max(H + D, 0) + 12;
    push('soffitL', 'cn.soffitL', 'cnSoffitL', P3(-6, 0, 0), P3(-6, 0, sL ?? wallTop), NX, 10, sL, null, 'context');
    push('soffitR', 'cn.soffitR', 'cnSoffitR', P3(W + 6, 0, 0), P3(W + 6, 0, sR ?? wallTop), X, 10, sR, null, 'context');
    push('mount', 'cn.mount', 'cnMount', P3(W * 0.12, 0, 0), P3(W * 0.12, 0, H), OUT, 3, g.mount);
  }
  // Fall: the drop from the wall's underside level to the front edge, at the right front corner.
  if (c.roof !== 'open') {
    const front = under(P), level = H, x = W;
    if (Math.abs(fall) >= 1 / 16) {
      const d = linearDim(P3(x, P, front), P3(x, P, level), X, 8);
      out.push(finishDim({
        key: 'cn:fall', kind: 'cnFall', slots: ['cn.fall'], unit: 'len', value: g.fall === null ? null : Math.abs(g.fall), calc: canopyFallCalc(c),
        lines: d.lines, dashed: [[P3(x, 0, level), P3(x, P, level)]], anchor: d.anchor, scope: 'context',
      }));
    }
  }
  if (sky) return out;
  if (c.support === 'tie_rods') {
    const r = pos(c.rodRise);
    push('rodRise', 'cn.rodRise', 'cnRodRise', P3(t / 2, 0, H + D), P3(t / 2, 0, H + D + (r ?? 18)), NX, 8, r, null, 'context');
  }
  if (c.support === 'posts') {
    const n = Math.max(1, c.posts.length);
    c.posts.forEach((p, i) => {
      const x = n === 1 ? W / 2 : t / 2 + ((W - t) * i) / (n - 1), h = pos(p.height), topZ = under(P);
      const d = linearDim(P3(x, P - t / 2, h !== null ? topZ - h : 0), P3(x, P - t / 2, topZ), OUT, 8);
      out.push(finishDim({ key: `cn:post:${p.id}`, kind: 'cnPost', label: p.label || `P${i + 1}`, slots: [`cn.post.${p.id}`], unit: 'len', value: h, calc: null, lines: d.lines, anchor: d.anchor, scope: 'overall', parts: [`canopy:post-${p.id}`] }));
    });
  }
  if (hasDoor(c) && c.door.swing !== 'none') {
    const dw = pos(c.door.width), dh = pos(c.door.head), x0 = W / 2 - (dw ?? 36) / 2;
    push('doorHead', 'cn.doorHead', 'cnDoorHead', P3(x0, 0, 0), P3(x0, 0, dh ?? 82), OUT, 4, dh, null, 'context', ['canopy:door']);
    if (c.door.swing === 'out') push('doorWidth', 'cn.doorWidth', 'cnDoorWidth', P3(x0, 0, 0), P3(x0 + (dw ?? 36), 0, 0), OUT, 10, dw, null, 'context', ['canopy:door']);
  }
  return out;
}
