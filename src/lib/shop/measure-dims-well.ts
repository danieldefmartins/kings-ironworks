import type { MeasureData } from './measure';
import { linearDim, type SceneDim } from './measure-dims';
import { finishDim, nonNeg, P3, pos, signedOf } from './measure-dims-gate';
import { section } from './scene-shapes/build-kit';
import { codeLimits, effectiveCodeSettings, effectiveOccupancy } from './measure-code';

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
 *   KIW supplies: guard height, post off the wall, gate width, ladder width,
 *   rung spacing and standoff.
 */
export function wellDims(data: MeasureData): SceneDim[] {
  const w = data.well;
  if (!w) return [];
  const out: SceneDim[] = [];
  const Lh = pos(w.lengthAtHouse), Pj = pos(w.projection);
  const L = Lh ?? 60, Pr = Pj ?? 36;
  const t = pos(w.wallThickness), tw = t ?? 6, depth = pos(w.depth), rise = signedOf(w.topToGrade);
  const top = rise ?? 0, floor = top - (depth ?? 36);
  const X = P3(1, 0, 0), NX = P3(-1, 0, 0), FRONT = P3(0, -1, 0), UP = P3(0, 0, 1);
  const push = (key: string, slot: string | null, kind: string, a: ReturnType<typeof P3>, b: ReturnType<typeof P3>, n: ReturnType<typeof P3>, off: number, value: number | null, calc: number | null = null, scope: SceneDim['scope'] = 'overall', parts?: string[]) => {
    const d = linearDim(a, b, n, off);
    out.push(finishDim({ key: `well:${key}`, kind, slots: slot ? [slot] : [], unit: 'len', value, calc, lines: d.lines, anchor: d.anchor, scope, parts }));
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
    const post = section(data.materials.post), pw = post?.width ?? 0, gh = pos(w.guardHeight), gap = nonNeg(w.postToWall);
    const c = tw / 2, yFront = -Pr + c;
    push('guardHeight', 'well.guardHeight', 'wellGuardHeight', P3(c, yFront, top), P3(c, yFront, top + (gh ?? 36)), NX, 8 + pw, gh, wellGuardCalc(data), 'overall', ['well-guard']);
    const zg = top + (gh ?? 36) * 0.5;
    push('postToWall', 'well.postToWall', 'wellPostToWall', P3(c, 0, zg), P3(c, -(gap ?? 2), zg), NX, 6 + pw, gap, null, 'context', ['well-guard']);
    if (has('gate')) {
      const gw = pos(w.gateWidth), frontL = L - tw, x0 = c + (frontL - (gw ?? 30)) / 2;
      push('gateWidth', 'well.gateWidth', 'wellGateWidth', P3(x0, yFront, top + (gh ?? 36)), P3(x0 + (gw ?? 30), yFront, top + (gh ?? 36)), UP, 6, gw, null, 'context', ['well-gate', 'well-guard']);
    }
  }
  if (has('ladder')) {
    const lw = pos(w.ladderWidth), sp = pos(w.ladderSpacing), so = nonNeg(w.ladderStandoff), cx = L / 2, y = -Pr + tw + (so ?? 3), parts = ['well-ladder'];
    push('ladderWidth', 'well.ladderWidth', 'wellLadderWidth', P3(cx - (lw ?? 16) / 2, y, top), P3(cx + (lw ?? 16) / 2, y, top), UP, 6, lw, null, 'context', parts);
    const z1 = floor + (sp ?? 12);
    push('ladderSpacing', 'well.ladderSpacing', 'wellLadderSpacing', P3(cx + (lw ?? 16) / 2, y, floor + (sp ?? 12)), P3(cx + (lw ?? 16) / 2, y, z1 + (sp ?? 12)), X, 6, sp, null, 'context', parts);
    push('ladderStandoff', 'well.ladderStandoff', 'wellLadderStandoff', P3(cx - (lw ?? 16) / 2, -Pr + tw, z1), P3(cx - (lw ?? 16) / 2, y, z1), NX, 6, so, null, 'context', parts);
  }
  return out;
}
