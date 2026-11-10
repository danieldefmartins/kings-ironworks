import type { MeasureData } from './measure';
import { linearDim, type SceneDim } from './measure-dims';
import { finishDim, nonNeg, P3, pos, signedOf } from './measure-dims-gate';
import { section } from './scene-shapes/build-kit';
import { codeLimits, effectiveCodeSettings, effectiveOccupancy } from './measure-code';
import { WELL_PREVIEW as PV, wellGuardLayout, wellLadderLayout } from './measure-well-layout';

// One-tap questions the Next card asks about the gate and the ladder: not
// numbers, but the drawing lights the same line while each is asked.
export const WELL_GATE_ASKS = ['well.gateRun', 'well.gateAt', 'well.gateHinge', 'well.gateSwing'];
export const WELL_LADDER_ASKS = ['well.ladderWall', 'well.ladderAt'];

/**
 * Guard height above the top of the well wall that reaches the code guard
 * height above grade: less when the wall already stands above grade, more
 * when it sits below. Null until the wall's height to grade is read.
 */
export function wellGuardCalc(data: MeasureData): number | null {
  const w = data.well;
  if (!w || !w.deliverables.includes('guard')) return null;
  const rise = signedOf(w.topToGrade);
  if (rise === null) return null;
  const s = effectiveCodeSettings(data), lim = codeLimits(s, effectiveOccupancy(data, s));
  const h = lim.guardHeight - rise;
  return h >= 1 ? h : null;
}

/**
 * Window-well dimension lines, on scene-window-well.ts's layout: the proud face
 * of the house at y = 0, the well out toward −y, grade at z = 0.
 *
 *   length along the house · projection · depth · wall thickness · top of
 *   wall above (or below) grade · each wall band: its setback from the proud
 *   face and its top / bottom down from the top of the wall · and, for what
 *   KIW supplies: guard height, post off the wall at each return, gate width
 *   (on whichever run the gate is in), ladder width, rung spacing and standoff
 *   (on whichever wall the ladder is on).
 */
export function wellDims(data: MeasureData): SceneDim[] {
  const w = data.well;
  if (!w) return [];
  const out: SceneDim[] = [];
  const Lh = pos(w.lengthAtHouse), Pj = pos(w.projection);
  const L = Lh ?? PV.length, Pr = Pj ?? PV.projection;
  const t = pos(w.wallThickness), tw = t ?? PV.wall, depth = pos(w.depth), rise = signedOf(w.topToGrade);
  const top = rise ?? 0, floor = top - (depth ?? PV.depth);
  const X = P3(1, 0, 0), NX = P3(-1, 0, 0), FRONT = P3(0, -1, 0), UP = P3(0, 0, 1);
  const push = (key: string, slot: string | string[] | null, kind: string, a: ReturnType<typeof P3>, b: ReturnType<typeof P3>, n: ReturnType<typeof P3>, off: number, value: number | null, calc: number | null = null, scope: SceneDim['scope'] = 'overall', parts?: string[]) => {
    const d = linearDim(a, b, n, off);
    out.push(finishDim({ key: `well:${key}`, kind, slots: slot ? [slot].flat() : [], unit: 'len', value, calc, lines: d.lines, anchor: d.anchor, scope, parts }));
  };
  const has = (k: string) => w.deliverables.includes(k as never);

  push('length', 'well.lengthAtHouse', 'wellLength', P3(0, -Pr, top), P3(L, -Pr, top), FRONT, 14, Lh);
  push('projection', 'well.projection', 'wellProjection', P3(L, 0, top), P3(L, -Pr, top), X, 14, Pj);
  // Depth: down the inside face of the far wall, to the well floor.
  push('depth', 'well.depth', 'wellDepth', P3(L - tw, -Pr + tw, top), P3(L - tw, -Pr + tw, floor), P3(-1, 1, 0), 8, depth, null, 'overall', ['well-liner']);
  push('thickness', 'well.wallThickness', 'wellThickness', P3(L / 2, -Pr, top), P3(L / 2, -Pr + tw, top), UP, 5, t, null, 'context', ['well-liner']);
  // Top of wall to grade, at the outside corner (none drawn when it sits flush).
  if (rise === null || Math.abs(rise) >= 1 / 16) {
    push('topToGrade', 'well.topToGrade', 'wellTopToGrade', P3(0, -Pr, 0), P3(0, -Pr, rise ?? 4), NX, 10, rise === null ? null : Math.abs(rise));
  }

  // Wall bands: set back from the proud face, top and bottom down from the top of the wall.
  w.bands.forEach((b, i) => {
    const set = nonNeg(b.setback), from = signedOf(b.fromTop), to = signedOf(b.toTop), x = -10 - i * 8;
    const zTop = top - (from ?? 0), zBot = top - (to ?? (from ?? 0) + 8), parts = ['well-band'];
    // A band that IS the proud face (setback 0) has no line to draw; an unread one gets a short stand-in.
    if (set !== 0) push(`band:${b.id}:setback`, `well.band.${b.id}.setback`, 'wellBandSetback', P3(x, 0, zTop), P3(x, set ?? 3, zTop), UP, 4, set, null, 'context', parts);
    if (from === null || from > 0) push(`band:${b.id}:fromTop`, `well.band.${b.id}.fromTop`, 'wellBandFromTop', P3(x, set ?? 0, top), P3(x, set ?? 0, zTop === top ? top - 4 : zTop), NX, 4, from === null ? null : Math.abs(from), null, 'context', parts);
    push(`band:${b.id}:toTop`, `well.band.${b.id}.toTop`, 'wellBandToTop', P3(x - 4, set ?? 0, top), P3(x - 4, set ?? 0, zBot), NX, 4, to === null ? null : Math.abs(to), null, 'context', parts);
  });

  if (has('guard')) {
    const pw = section(data.materials.post)?.width ?? PV.post, gh = pos(w.guardHeight), gap = nonNeg(w.postToWall), H = gh ?? PV.guardHeight;
    const c = tw / 2, yFront = -Pr + c;
    push('guardHeight', 'well.guardHeight', 'wellGuardHeight', P3(c, yFront, top), P3(c, yFront, top + H), NX, 8 + pw, gh, wellGuardCalc(data), 'overall', ['well-guard']);
    // Post face to the house, at the house end of each side run: where a return is clipped, posted or stops.
    const zg = top + H * 0.5;
    push('postToWall', ['well.postToWall', 'well.returnLeft'], 'wellPostToWall', P3(c, 0, zg), P3(c, -(gap ?? 2), zg), NX, 6 + pw, gap, null, 'context', ['well-guard', 'well-return']);
    push('postToWallRight', ['well.postToWall', 'well.returnRight'], 'wellPostToWall', P3(L - c, 0, zg), P3(L - c, -(gap ?? 2), zg), X, 6 + pw, gap, null, 'context', ['well-return']);
    if (has('gate')) {
      const gw = pos(w.gateWidth);
      const gate = wellGuardLayout({ length: L, projection: Pr, wall: tw, postWidth: pw, gapToWall: gap ?? 0, gate: { run: w.gateRun, at: w.gateAt, offset: pos(w.gateOffset), width: gw ?? PV.gateWidth } }).gate;
      // Across the top of the gate, wherever it sits; the same line answers where it is and how it swings.
      // No run picked yet: the gate is drawn where the layout puts one by default, the middle of the front run.
      const fallback = { a: { x: L / 2 - (gw ?? PV.gateWidth) / 2, y: yFront }, b: { x: L / 2 + (gw ?? PV.gateWidth) / 2, y: yFront } };
      if (!gate) push('gateWidth', ['well.gateWidth', ...WELL_GATE_ASKS], 'wellGateWidth', P3(fallback.a.x, fallback.a.y, top + H), P3(fallback.b.x, fallback.b.y, top + H), UP, 6, gw, null, 'context', ['well-gate', 'well-guard']);
      if (gate) push('gateWidth', ['well.gateWidth', ...WELL_GATE_ASKS], 'wellGateWidth', P3(gate.a.x, gate.a.y, top + H), P3(gate.b.x, gate.b.y, top + H), UP, 6, gw, null, 'context', ['well-gate', 'well-guard']);
    }
  }
  if (has('ladder')) {
    const lw = pos(w.ladderWidth), sp = pos(w.ladderSpacing), so = nonNeg(w.ladderStandoff), S = sp ?? PV.ladderSpacing, parts = ['well-ladder'];
    const lp = wellLadderLayout({ inside: { x0: tw, x1: L - tw, y0: -(Pr - tw), y1: 0 }, wall: w.ladderWall, at: w.ladderAt, offset: pos(w.ladderOffset), width: lw ?? PV.ladderWidth, standoff: so ?? PV.ladderStandoff });
    const along = P3(lp.along.x, lp.along.y, 0), back = P3(-lp.along.x, -lp.along.y, 0), at = (p: { x: number; y: number }, z: number) => P3(p.x, p.y, z);
    push('ladderWidth', ['well.ladderWidth', ...WELL_LADDER_ASKS], 'wellLadderWidth', at(lp.railA, top), at(lp.railB, top), UP, 6, lw, null, 'context', parts);
    const z1 = floor + S;
    push('ladderSpacing', 'well.ladderSpacing', 'wellLadderSpacing', at(lp.railB, z1), at(lp.railB, z1 + S), along, 6, sp, null, 'context', parts);
    push('ladderStandoff', 'well.ladderStandoff', 'wellLadderStandoff', at(lp.wallA, z1), at(lp.railA, z1), back, 6, so, null, 'context', parts);
  }
  return out;
}
