// Dimension lines for a deck: every side's length outside its edge, the height
// above grade at each side, the stair / gate opening, each corner's turn, the
// guard height and the post spacing. Same plan as the 3D (measure-deck-plan).
import type { MeasureData } from './measure';
import { arcDim, linearDim, type SceneDim } from './measure-dims';
import { dim, meas, UP, v3, vadd, vmul, vsub, vunit, type V } from './measure-dims-kit';
import { deckPlan, outwardOf } from './measure-deck-plan';
import { deckOpening, deckPostStations } from './measure-post-suggest-deck';
import { deckTurnCalc } from './measure-run-calc';

export function deckDims(data: MeasureData): SceneDim[] {
  const d = data.deck, plan = deckPlan(data);
  if (!d || !plan) return [];
  const out: SceneDim[] = [], top = plan.top;
  const at = (p: { x: number; y: number }, z = top): V => v3(p.x, p.y, z);
  const stations = deckPostStations(data);
  const sides = plan.edges.filter((e) => e.side);
  sides.forEach((e) => {
    const sd = e.side!, n = e.index, o = outwardOf(plan, e), out3 = v3(o.x, o.y, 0);
    const a = at(e.a), b = at(e.b), L = Math.hypot(b.x - a.x, b.y - a.y), u = vunit(vsub(b, a));
    const slot = (k: string) => [`deck.side${n}.${k}`];
    // Length: outside the edge, the way the tape went round.
    const len = linearDim(a, b, out3, sd.railed ? 20 : 14);
    out.push(dim({ key: `deckSide:${n}`, kind: 'deckSide', slots: slot('length'), scope: 'overall', unit: 'len', value: meas(sd.length), calc: null, lines: len.lines, anchor: len.anchor }));
    // Height above grade: mid side, deck edge down to this side's grade.
    const h = plan.heights[n];
    if (top > 0 || h !== null) {
      const m = vadd(a, vmul(vsub(b, a), 0.5)), foot = v3(m.x, m.y, top - (h ?? top));
      const hd = linearDim(foot, m, out3, 10);
      out.push(dim({ key: `deckHeight:${n}`, kind: 'deckHeight', slots: slot('heightAboveGrade'), scope: 'context', unit: 'len', value: h, calc: null, lines: hd.lines, anchor: hd.anchor }));
    }
    // The opening: centred on the side (where the 3D draws it).
    if (sd.opening && sd.opening !== 'none') {
      const op = deckOpening(L, sd) ?? [L * 0.35, L * 0.65];
      const od = linearDim(vadd(a, vmul(u, op[0])), vadd(a, vmul(u, op[1])), vadd(out3, vmul(UP, 0.6)), 8);
      out.push(dim({ key: `deckOpening:${n}`, kind: 'deckOpening', slots: slot('openingWidth'), scope: 'context', unit: 'len', value: meas(sd.openingWidth), calc: null, lines: od.lines, anchor: od.anchor }));
    }
    // The corner at the end of this side: the turn into the next one.
    const next = plan.edges[(plan.edges.indexOf(e) + 1) % plan.edges.length];
    if (next && next !== e && next.side && (plan.closed || n < d.sides.length - 1)) {
      const u2 = vunit(vsub(at(next.b), at(next.a)));
      const arc = arcDim(b, u, u2, 14);
      out.push(dim({ key: `deckCorner:${n}`, kind: 'deckCorner', slots: slot('turnDeg'), scope: 'context', unit: 'deg', value: meas((sd.turnDeg || '').replace(/^[-−–]/, '')), calc: (() => { const c = deckTurnCalc(data, n); return c === null ? null : Math.abs(c); })(), lines: arc.lines, anchor: arc.anchor }));
    }
  });
  // Guard height and post spacing on the first railed side, at its first posts.
  const first = sides.find((e) => e.side!.railed);
  if (first) {
    const a = at(first.a), b = at(first.b), u = vunit(vsub(b, a)), o = outwardOf(plan, first), out3 = v3(o.x, o.y, 0);
    const st = stations.get(first.side!.id)?.at ?? [];
    const p0 = vadd(a, vmul(u, st[0] ?? 0)), H = meas(d.guardHeight) ?? meas(data.rail.height);
    const gh = linearDim(p0, v3(p0.x, p0.y, top + (H ?? 36)), vmul(u, -1), 6);
    out.push(dim({ key: 'deckGuard', kind: 'guardHeight', slots: ['deck.guardHeight'], scope: 'context', unit: 'len', value: meas(d.guardHeight), calc: null, lines: gh.lines, anchor: gh.anchor }));
    if (st.length > 1) {
      const p1 = vadd(a, vmul(u, st[1])), sp = linearDim(v3(p0.x, p0.y, top + (H ?? 36)), v3(p1.x, p1.y, top + (H ?? 36)), vadd(UP, vmul(out3, 0.3)), 6);
      out.push(dim({ key: 'deckSpacing', kind: 'postSpacing', slots: ['deck.postSpacing'], scope: 'context', unit: 'len', value: meas(d.postSpacing), calc: st[1] - st[0], lines: sp.lines, anchor: sp.anchor }));
    }
  }
  return out;
}
