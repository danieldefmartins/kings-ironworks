import type { GateData, MeasureData } from './measure';
import type { Point3 } from './measure-geometry';
import { linearDim, type SceneDim, type Seg3 } from './measure-dims';
import { parseMeas } from './measure-parse';
import { section } from './scene-shapes/build-kit';
import { siteNumber } from './measure-site';

/**
 * Gate dimension lines, on the same layout as scene-gate.ts: the opening runs
 * along +X from the left post face (x = 0), the outside (where the measurer
 * stands) toward −Y, grade at the closed leaf z = 0.
 *
 *   clear opening at the top and at the grade · hinge-post and latch-post
 *   heights · ground clearance under the closed leaf · grade rise at the
 *   leaf's open position, with the clearance left there (≈) · leaf widths
 *   (calculated from the opening and the gaps) · the diagonals once read.
 */

export type DimDraft = Omit<SceneDim, 'state' | 'slots' | 'scope'> & { slots?: string[]; scope?: SceneDim['scope'] };
/** Shared by the gate / opening / well / canopy adapters: state from value and calc. */
export function finishDim(d: DimDraft): SceneDim {
  return {
    scope: 'overall', slots: [], ...d,
    state: d.value !== null ? 'measured' : d.calc !== null ? 'calculated' : 'unknown',
  };
}
export const P3 = (x: number, y: number, z: number): Point3 => ({ x, y, z });
/** A positive measurement, or null. */
export const pos = (s: string | undefined | null): number | null => {
  const n = parseMeas(s ?? '');
  return n !== null && Number.isFinite(n) && n > 0 ? n : null;
};
/** Zero or more (a clearance of 0 is a reading). */
export const nonNeg = (s: string | undefined | null): number | null => {
  const t = (s ?? '').trim();
  if (!t) return null;
  const n = parseMeas(t);
  return n !== null && Number.isFinite(n) && n >= 0 ? n : null;
};
/** Signed: + rises, − falls. */
export const signedOf = (s: string | undefined | null): number | null => {
  const t = (s ?? '').trim().replace(/[−–]/g, '-');
  return t ? siteNumber(t) : null;
};
/** A dashed corner-to-corner line with a tick at each end. */
export function diagonal(a: Point3, b: Point3): { lines: Seg3[]; dashed: Seg3[]; anchor: Point3 } {
  const t = 2.2, dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, l = Math.hypot(dx, dy, dz) || 1;
  // A short slash across the line at each end, in the line's own plane.
  const nx = -dz / l, nz = dx / l;
  const tick = (p: Point3): Seg3 => [P3(p.x - nx * t + (dx / l) * t * 0.6, p.y + (dy / l) * t * 0.6, p.z - nz * t), P3(p.x + nx * t - (dx / l) * t * 0.6, p.y - (dy / l) * t * 0.6, p.z + nz * t)];
  return { lines: [tick(a), tick(b)], dashed: [[a, b]], anchor: P3(a.x + dx * 0.35, a.y + dy * 0.35, a.z + dz * 0.35) };
}

export const GATE_GAP_DEFAULT = 0.5;
const swinging = (g: GateData) => g.operation === 'single_swing' || g.operation === 'double_swing' || g.operation === 'bifold';

/** The clear opening the leaf has to pass: the tighter of the two widths. */
export function gateClearWidth(g: GateData): number | null {
  const t = pos(g.widthTop), b = pos(g.widthBottom);
  return t !== null && b !== null ? Math.min(t, b) : t ?? b;
}

/** The gaps the leaves leave, inches: blank means the shop's 1/2". */
export function gateGaps(g: GateData): { hinge: number; latch: number } {
  return { hinge: nonNeg(g.hingeGap) ?? GATE_GAP_DEFAULT, latch: nonNeg(g.latchGap) ?? GATE_GAP_DEFAULT };
}

/**
 * Leaf widths from the opening and the gaps. Single (or bifold, as one
 * folded width): opening − hinge gap − latch gap. Double: the two hinge gaps
 * and the meeting gap come off, the rest splits equally — unless leaf A has
 * been set to something else, then leaf B takes what is left (an unequal
 * split). A slide gate's leaf is not a split of the opening.
 */
export function gateLeafCalc(g: GateData): { a: number | null; b: number | null; double: boolean } {
  const W = gateClearWidth(g), { hinge, latch } = gateGaps(g);
  if (W === null || !swinging(g)) return { a: null, b: null, double: g.operation === 'double_swing' };
  if (g.operation !== 'double_swing') {
    const a = W - hinge - latch;
    return { a: a > 0 ? a : null, b: null, double: false };
  }
  const avail = W - 2 * hinge - latch;
  if (!(avail > 0)) return { a: null, b: null, double: true };
  const A = pos(g.leafA);
  const b = A !== null && A < avail ? avail - A : avail / 2;
  return { a: avail / 2, b, double: true };
}

export function gateDims(data: MeasureData): SceneDim[] {
  const g = data.gate;
  if (!g) return [];
  const out: SceneDim[] = [];
  const wTop = pos(g.widthTop), wBot = pos(g.widthBottom), W = gateClearWidth(g) ?? 48;
  const hH = pos(g.heightHinge), hL = pos(g.heightLatch);
  const right = g.hingeSide === 'right', slide = g.operation === 'slide';
  const xL = 0, xR = wBot ?? W;
  const hingeX = right ? xR : 0, latchX = right ? 0 : xR;
  const post = section(g.postSize), pw = post?.width ?? 0;
  const top = Math.max(hH ?? 0, hL ?? 0) || 60;
  const hLeft = (right ? hL : hH) ?? hH ?? hL ?? top, hRight = (right ? hH : hL) ?? hH ?? hL ?? top;
  const UP = P3(0, 0, 1), FRONT = P3(0, -1, 0);

  // Clear opening across the top and at the grade.
  const t = linearDim(P3(xL, 0, hLeft), P3(xL + (wTop ?? W), 0, hRight), UP, 10);
  out.push(finishDim({ key: 'gate:widthTop', kind: 'gateWidthTop', slots: ['gate.widthTop'], unit: 'len', value: wTop, calc: null, lines: t.lines, anchor: t.anchor }));
  const b = linearDim(P3(xL, 0, 0), P3(xL + (wBot ?? W), 0, 0), FRONT, 18);
  out.push(finishDim({ key: 'gate:widthBottom', kind: 'gateWidthBottom', slots: ['gate.widthBottom'], unit: 'len', value: wBot, calc: null, lines: b.lines, anchor: b.anchor }));

  // Post heights, on the outside of each post.
  const postDim = (x: number, out1: number, h: number | null, key: string, slot: string, kind: string) => {
    const d = linearDim(P3(x, 0, 0), P3(x, 0, h ?? top), P3(out1, 0, 0), pw + 9);
    out.push(finishDim({ key, kind, slots: [slot], unit: 'len', value: h, calc: null, lines: d.lines, anchor: d.anchor }));
  };
  postDim(hingeX, hingeX === 0 ? -1 : 1, hH, 'gate:heightHinge', 'gate.heightHinge', 'gateHeightHinge');
  postDim(latchX, latchX === 0 ? -1 : 1, hL, 'gate:heightLatch', 'gate.heightLatch', 'gateHeightLatch');

  // Ground clearance under the closed leaf, near the latch end where it is read.
  const clr = nonNeg(g.groundClearance), cx = latchX + (latchX === 0 ? 8 : -8);
  const c = linearDim(P3(cx, 0, 0), P3(cx, 0, clr ?? 2), FRONT, 6);
  out.push(finishDim({ key: 'gate:groundClearance', kind: 'gateClearance', slots: ['gate.groundClearance'], unit: 'len', value: clr, calc: null, lines: c.lines, anchor: c.anchor, scope: 'overall' }));

  // Leaf widths: along the bottom of the closed leaf.
  const leaf = gateLeafCalc(g), { hinge, latch } = gateGaps(g), z = (clr ?? 2) + 1;
  if (!slide && g.operation) {
    if (!leaf.double) {
      const a = pos(g.leafA), w = a ?? leaf.a ?? W - hinge - latch, dir = right ? -1 : 1;
      const x0 = hingeX + dir * hinge, d = linearDim(P3(x0, 0, z), P3(x0 + dir * w, 0, z), FRONT, 9);
      out.push(finishDim({ key: 'gate:leafA', kind: 'gateLeaf', slots: ['gate.leafA'], unit: 'len', value: a, calc: leaf.a, lines: d.lines, anchor: d.anchor, parts: ['gate-leaf'], scope: 'context' }));
    } else {
      const a = pos(g.leafA), bb = pos(g.leafB), wa = a ?? leaf.a ?? W / 2, wb = bb ?? leaf.b ?? W / 2;
      const da = linearDim(P3(hinge, 0, z), P3(hinge + wa, 0, z), FRONT, 9);
      out.push(finishDim({ key: 'gate:leafA', kind: 'gateLeafA', slots: ['gate.leafA'], unit: 'len', value: a, calc: leaf.a, lines: da.lines, anchor: da.anchor, parts: ['gate-leaf'], scope: 'context' }));
      const db = linearDim(P3(W - hinge - wb, 0, z), P3(W - hinge, 0, z), FRONT, 9);
      out.push(finishDim({ key: 'gate:leafB', kind: 'gateLeafB', slots: ['gate.leafB'], unit: 'len', value: bb, calc: leaf.b, lines: db.lines, anchor: db.anchor, parts: ['gate-leaf'], scope: 'context' }));
    }
  }

  // Grade rise across the swing: at the leaf tip, fully open — where it binds.
  if (swinging(g)) {
    const rise = signedOf(g.gradeRise), sy = g.swingDir === 'in' ? 1 : -1;
    const lw = leaf.double ? W / 2 : W, tip = P3(hingeX, sy * lw, 0), zr = rise ?? 3;
    if (Math.abs(zr) >= 1 / 16) {
      const d = linearDim(P3(tip.x, tip.y, 0), P3(tip.x, tip.y, zr), P3(hingeX === 0 ? -1 : 1, 0, 0), 8);
      out.push(finishDim({
        key: 'gate:gradeRise', kind: 'gateGradeRise', slots: ['gate.gradeRise'], unit: 'len', value: rise === null ? null : Math.abs(rise), calc: null,
        lines: d.lines, dashed: [[P3(hingeX, 0, 0), P3(tip.x, tip.y, 0)]], anchor: d.anchor,
      }));
      // What is left under the leaf at full open: the swing clearance (never asked, always shown).
      if (rise !== null && clr !== null && clr - rise > 0 && rise > 0) {
        const s = linearDim(P3(tip.x, tip.y, rise), P3(tip.x, tip.y, clr), P3(hingeX === 0 ? 1 : -1, 0, 0), 5);
        out.push(finishDim({ key: 'gate:swingClear', kind: 'gateSwingClear', unit: 'len', value: null, calc: clr - rise, lines: s.lines, anchor: s.anchor, scope: 'context', parts: ['gate-swing', 'gate-ground'] }));
      }
    }
  }

  // Diagonals: only once read (they are optional on a gate).
  const dA = pos(g.diagA), dB = pos(g.diagB), calcD = Math.hypot(W, (hLeft + hRight) / 2);
  if (dA !== null) {
    const d = diagonal(P3(xL, 0, hLeft), P3(xR, 0, 0));
    out.push(finishDim({ key: 'gate:diagA', kind: 'diagA', slots: ['gate.diagA'], unit: 'len', value: dA, calc: calcD, ...d, scope: 'context', parts: ['gate-leaf'] }));
  }
  if (dB !== null) {
    const d = diagonal(P3(xR, 0, hRight), P3(xL, 0, 0));
    out.push(finishDim({ key: 'gate:diagB', kind: 'diagB', slots: ['gate.diagB'], unit: 'len', value: dB, calc: calcD, ...d, scope: 'context', parts: ['gate-leaf'] }));
  }
  return out;
}
