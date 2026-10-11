import type { MeasureData } from './measure';
import type { Point3 } from './measure-geometry';
import { parseMeas, formatIn } from './measure-parse';
import { linearDim, type SceneDim, type DimState } from './measure-dims';
import { spFabSize, type ShopPiece, type ShopPieceData } from './measure-shop-piece';
import type { CalcResult } from './measure-calc-struct';

/**
 * Shop pieces: dimension lines on the 3D the scene draws
 * (scene-shapes/scene-shop-piece.ts — pieces side by side along x, the niche
 * as a wire box round each, front face at y = 0).
 *
 *   niche     every width (top, bottom, front, back), height (left, right,
 *             back) and depth (top, bottom) on its own edge, both front
 *             diagonals dashed; the fabricate-to width, height and depth on
 *             the frame
 *   design    a freestanding or wall piece: its width, height and depth
 *
 * Approve: fabricate-to = tightest reading less the clearance.
 */
const P = (x: number, y: number, z: number): Point3 => ({ x, y, z });
const UP = P(0, 0, 1), DOWN = P(0, 0, -1), LEFT = P(-1, 0, 0), RIGHT = P(1, 0, 0), FRONT = P(0, -1, 0), BACK = P(0, 1, 0);
const TYP = { w: 36, h: 36, d: 12 }, GAP = 18;
const num = (s: string | undefined | null) => {
  const n = parseMeas(s ?? '');
  return n !== null && Number.isFinite(n) && n > 0 && (s ?? '').trim() !== '' ? n : null;
};
const state = (v: number | null, c: number | null): DimState => (v !== null ? 'measured' : c !== null ? 'calculated' : 'unknown');

/** The size the shop builds to: the signed-off fabricate-to size where there is one, else the calculation. */
export function spBuildSize(d: Pick<ShopPieceData, 'niche' | 'clearance'>, p: ShopPiece) {
  const f = spFabSize(d, p);
  if (!f.niche) return f;
  return { ...f, width: num(p.fabW) ?? f.width, height: num(p.fabH) ?? f.height, depth: num(p.fabD) ?? f.depth };
}

export function shopPieceDims(data: MeasureData): SceneDim[] {
  const s = data.shopPiece, out: SceneDim[] = [];
  if (!s?.pieces.length) return out;
  let x = 0;
  s.pieces.forEach(p => {
    const f = spBuildSize(s, p), calc = spFabSize(s, p);
    const w = f.width ?? TYP.w, h = f.height ?? TYP.h, d = f.depth ?? TYP.d, c = f.niche ? f.clearance : 0;
    const at = (k: string) => `sp.${p.id}.${k}`;
    const lin = (key: string, kind: string, slot: string, scope: SceneDim['scope'], value: number | null, cv: number | null, a: Point3, b: Point3, n: Point3, off: number) => {
      const dim = linearDim(a, b, n, off);
      out.push({ key: `sp:${p.id}:${key}`, kind, slots: [slot], scope, unit: 'len', value, calc: cv, state: state(value, cv), lines: dim.lines, anchor: dim.anchor });
    };
    if (f.niche) {
      const nw = f.open.w ?? w + 2 * c, nh = f.open.h ?? h + c, nd = f.open.d ?? d + c, X = x, X1 = x + nw;
      lin('wTop', 'spWidth', at('wTop'), 'context', num(p.wTop), null, P(X, 0, nh), P(X1, 0, nh), UP, 8);
      lin('wBottom', 'spWidth', at('wBottom'), 'context', num(p.wBottom), null, P(X, 0, 0), P(X1, 0, 0), DOWN, 8);
      lin('wFront', 'spWidth', at('wFront'), 'context', num(p.wFront), null, P(X, 0, nh / 2), P(X1, 0, nh / 2), FRONT, 6);
      lin('wBack', 'spWidth', at('wBack'), 'context', num(p.wBack), null, P(X, nd, nh / 2), P(X1, nd, nh / 2), BACK, 6);
      lin('hLeft', 'spHeight', at('hLeft'), 'context', num(p.hLeft), null, P(X, 0, 0), P(X, 0, nh), LEFT, 8);
      lin('hRight', 'spHeight', at('hRight'), 'context', num(p.hRight), null, P(X1, 0, 0), P(X1, 0, nh), RIGHT, 8);
      lin('hBack', 'spHeight', at('hBack'), 'context', num(p.hBack), null, P(X + nw / 2, nd, 0), P(X + nw / 2, nd, nh), BACK, 6);
      lin('dTop', 'spDepth', at('dTop'), 'context', num(p.dTop), null, P(X1, 0, nh), P(X1, nd, nh), UP, 8);
      lin('dBottom', 'spDepth', at('dBottom'), 'context', num(p.dBottom), null, P(X1, 0, 0), P(X1, nd, 0), DOWN, 8);
      const diag = (key: 'diagA' | 'diagB', a: Point3, b: Point3) => {
        const v = num(p[key]);
        out.push({ key: `sp:${p.id}:${key}`, kind: key, slots: [at(key)], scope: 'context', unit: 'len', value: v, calc: null, state: state(v, null),
          lines: [], dashed: [[a, b]], anchor: P((a.x + b.x) / 2 + (key === 'diagA' ? 5 : -5), -0.5, (a.z + b.z) / 2) });
      };
      diag('diagA', P(X, -0.5, nh), P(X1, -0.5, 0));
      diag('diagB', P(X, -0.5, 0), P(X1, -0.5, nh));
      // The frame the shop builds, at its fabricate-to size, inside the niche.
      const fx = x + c;
      lin('fabW', 'spFabW', at('fabW'), 'overall', num(p.fabW), calc.width, P(fx, 0, h), P(fx + w, 0, h), FRONT, 14);
      lin('fabH', 'spFabH', at('fabH'), 'overall', num(p.fabH), calc.height, P(fx, 0, 0), P(fx, 0, h), FRONT, 14);
      lin('fabD', 'spFabD', at('fabD'), 'overall', num(p.fabD), calc.depth, P(fx + w, 0, 0), P(fx + w, d, 0), DOWN, 14);
      x += nw + GAP;
    } else {
      lin('w', 'width', at('w'), 'overall', num(p.wFront), null, P(x, 0, h), P(x + w, 0, h), UP, 8);
      lin('h', 'spHeight', at('h'), 'overall', num(p.hLeft), null, P(x, 0, 0), P(x, 0, h), LEFT, 8);
      lin('d', 'spDepth', at('d'), 'overall', num(p.dTop), null, P(x + w, 0, 0), P(x + w, d, 0), DOWN, 8);
      x += w + GAP;
    }
  });
  return out;
}

/** Fabricate-to width / height / depth: the tightest niche reading less the clearance. */
export function shopPieceSlotCalc(slotId: string, data: MeasureData): CalcResult | null {
  const m = slotId.match(/^sp\.(.+)\.fab([WHD])$/), s = data.shopPiece;
  if (!m || !s?.niche) return null;
  const p = s.pieces.find(x => x.id === m[1]);
  if (!p) return null;
  const f = spFabSize(s, p), c = f.clearance;
  const [calc, open, times] = m[2] === 'W' ? [f.width, f.open.w, 2] : m[2] === 'H' ? [f.height, f.open.h, 1] : [f.depth, f.open.d, 1];
  return { calc, note: calc !== null && open !== null ? `${formatIn(open)} − ${times > 1 ? `2 × ` : ''}${formatIn(c)}` : undefined };
}
