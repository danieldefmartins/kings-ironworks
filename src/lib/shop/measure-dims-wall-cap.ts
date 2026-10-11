// Dimension lines for a wall-cap railing: each run's length along the high
// side, the turn at each corner, the drop on the low side and the rail height
// at the first post, and at every post the cap width and — cored — the edge
// distance from the core to each face. Coordinates are the wall-cap scene's.
import type { MeasureData } from './measure';
import { arcDim, linearDim, type SceneDim } from './measure-dims';
import { dim, meas, UP, v3, vadd, vmul, type V } from './measure-dims-kit';
import { postsOf } from './measure-wall-cap';
import { wallCapLayout } from './scene-shapes/scene-wall-cap';

export function wallCapDims(data: MeasureData): SceneDim[] {
  const w = data.wallCap;
  if (!w || !w.runs.length) return [];
  const lay = wallCapLayout(w), out: SceneDim[] = [];
  const caps = postsOf(w).map((x) => meas(x.p.capWidth)).filter((n): n is number => n !== null);
  const capW = caps.length ? caps.reduce((a, b) => a + b, 0) / caps.length : 8;
  // Left of travel along run 1; the drop side stays on the same hand round the wall.
  const dropLeft = w.dropSide !== 'right';
  w.runs.forEach((r, i) => {
    const g = lay.runs[i];
    if (!g) return;
    const left = v3(-g.dir.y, g.dir.x, 0), high = vmul(left, dropLeft ? -1 : 1);
    const lift = (p: V) => v3(p.x, p.y, Math.max(g.from.z, g.to.z));
    const d = linearDim(vadd(lift(g.from), vmul(high, capW / 2)), vadd(lift(g.to), vmul(high, capW / 2)), high, 14);
    out.push(dim({ key: `wcRun:${r.id}`, kind: 'wcRun', slots: [`wc.${r.id}.length`], scope: 'overall', unit: 'len', value: meas(r.length), calc: null, lines: d.lines, anchor: d.anchor }));
    if (i > 0) {
      const prev = lay.runs[i - 1];
      const arc = arcDim(lift(g.from), v3(prev.dir.x, prev.dir.y, 0), v3(g.dir.x, g.dir.y, 0), 14);
      out.push(dim({ key: `wcTurn:${r.id}`, kind: 'wcTurn', slots: [`wc.${r.id}.turn`], scope: 'context', unit: 'deg', value: meas(r.turn), calc: null, lines: arc.lines, anchor: arc.anchor }));
    }
  });
  const marks = postsOf(w);
  lay.posts.forEach((lp, k) => {
    const m = marks[k];
    if (!m) return;
    const g = lay.runs[lp.run], left = v3(-g.dir.y, g.dir.x, 0), high = vmul(left, dropLeft ? -1 : 1);
    const c = v3(lp.at.x, lp.at.y, lp.top + 0.3), cw = meas(m.p.capWidth) ?? capW;
    const hiFace = vadd(c, vmul(high, cw / 2)), loFace = vadd(c, vmul(high, -cw / 2));
    const along = v3(g.dir.x, g.dir.y, 0);
    const width = linearDim(hiFace, loFace, along, 6);
    out.push(dim({ key: `wcCap:${m.p.id}`, kind: 'capWidth', slots: [`wc.${m.p.id}.capWidth`], scope: 'context', unit: 'len', value: meas(m.p.capWidth), calc: null, lines: width.lines, anchor: width.anchor }));
    if (w.mount === 'core') {
      const eh = meas(m.p.edgeHigh), el = meas(m.p.edgeLow);
      const hi = linearDim(hiFace, vadd(hiFace, vmul(high, -(eh ?? cw / 2))), vmul(along, -1), 4);
      out.push(dim({ key: `wcEdgeHigh:${m.p.id}`, kind: 'edgeHigh', slots: [`wc.${m.p.id}.edgeHigh`], scope: 'context', unit: 'len', value: eh, calc: el !== null && meas(m.p.capWidth) !== null ? Math.max(0, meas(m.p.capWidth)! - el) : null, lines: hi.lines, anchor: hi.anchor }));
      const lo = linearDim(loFace, vadd(loFace, vmul(high, el ?? cw / 2)), vmul(along, -1), 4);
      out.push(dim({ key: `wcEdgeLow:${m.p.id}`, kind: 'edgeLow', slots: [`wc.${m.p.id}.edgeLow`], scope: 'context', unit: 'len', value: el, calc: eh !== null && meas(m.p.capWidth) !== null ? Math.max(0, meas(m.p.capWidth)! - eh) : null, lines: lo.lines, anchor: lo.anchor }));
    }
    if (k === 0) {
      const railH = meas(w.railHeight), dropH = meas(w.drop);
      const rh = linearDim(c, vadd(c, vmul(UP, railH ?? 36)), vmul(along, -1), 6);
      out.push(dim({ key: 'wcRail', kind: 'railHeight', slots: ['wc.railHeight'], scope: 'context', unit: 'len', value: railH, calc: null, lines: rh.lines, anchor: rh.anchor }));
      const dd = linearDim(loFace, vadd(loFace, vmul(UP, -(dropH ?? 36))), vmul(high, -1), 10);
      out.push(dim({ key: 'wcDrop', kind: 'drop', slots: ['wc.drop'], scope: 'context', unit: 'len', value: dropH, calc: null, lines: dd.lines, anchor: dd.anchor }));
    }
  });
  return out;
}
