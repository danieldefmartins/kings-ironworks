// Dimension lines for a fence run: each segment's length along the grade, the
// whole run end to end (straight runs only — a turning run has no one line),
// the height, the post spacing at the first bay and the footing below grade.
import type { MeasureData } from './measure';
import { linearDim, type SceneDim } from './measure-dims';
import { dim, leftOf, meas, UP, v3, vadd, vmul, vunit, vsub } from './measure-dims-kit';
import { fenceChain, fenceSpacing } from './measure-post-suggest-fence';
import { layoutRun } from './measure-post-suggest';

export function fenceDims(data: MeasureData): SceneDim[] {
  const f = data.fence, chain = fenceChain(data);
  if (!f || !chain) return [];
  const out: SceneDim[] = [];
  // Outside of the line is −Y for a run heading +X: the right of travel.
  chain.runs.forEach((r, n) => {
    const [a, b] = r.path, right = vmul(leftOf(a, b), -1);
    const d = linearDim(a, b, right, 16);
    out.push(dim({ key: `fenceSeg:${n}`, kind: 'fenceSeg', slots: [`fence.seg${n}`], scope: 'overall', unit: 'len', value: meas(f.segments[n]?.length), calc: null, lines: d.lines, anchor: d.anchor }));
  });
  const straight = chain.complete && f.segments.slice(0, -1).every((s) => !meas((s.turnDeg || '').replace(/^[-−–]/, '')));
  if (straight && chain.runs.length > 1) {
    const a = chain.runs[0].path[0], b = chain.runs[chain.runs.length - 1].path[1], right = vmul(leftOf(a, b), -1);
    const d = linearDim(v3(a.x, a.y, Math.min(a.z, b.z)), v3(b.x, b.y, Math.min(a.z, b.z)), right, 30);
    const sum = f.segments.reduce((s, g) => s + (meas(g.length) ?? 0), 0);
    out.push(dim({ key: 'fenceTotal', kind: 'fenceTotal', slots: ['fence.totalRun'], scope: 'overall', unit: 'len', value: meas(f.totalRun), calc: sum, lines: d.lines, anchor: d.anchor }));
  }
  const first = chain.runs[0], [a, b] = first.path, u = vunit(vsub(b, a));
  const H = meas(f.segments[0]?.height) ?? meas(f.height);
  const hd = linearDim(a, vadd(a, vmul(UP, H ?? 72)), vmul(u, -1), 8);
  out.push(dim({ key: 'fenceHeight', kind: 'fenceHeight', slots: ['fence.height'], scope: 'context', unit: 'len', value: meas(f.height), calc: null, lines: hd.lines, anchor: hd.anchor }));
  // Post spacing: the first bay of the first segment, as laid out.
  const panels = meas(f.segments[0]?.panels);
  const lay = layoutRun(first, { maxSpacing: fenceSpacing(data) }, panels ? Math.round(panels) + 1 : null);
  if (lay.posts.length > 1) {
    const at = (s: number) => { const t = s / (first.anchors[first.anchors.length - 1].at || 1); return vadd(a, vmul(vsub(b, a), t)); };
    const p0 = at(lay.posts[0].at), p1 = at(lay.posts[1].at), lift = (p: typeof p0) => vadd(p, vmul(UP, (H ?? 72) + 4));
    const sd = linearDim(lift(p0), lift(p1), UP, 5);
    out.push(dim({ key: 'fenceSpacing', kind: 'postSpacing', slots: ['fence.postSpacing'], scope: 'context', unit: 'len', value: meas(f.postSpacing), calc: lay.spans[0] ?? null, lines: sd.lines, anchor: sd.anchor }));
  }
  // Footing: below grade at the first post.
  const F = meas(f.footingDepth);
  const fd = linearDim(a, vadd(a, vmul(UP, -(F ?? 36))), vmul(u, -1), 8);
  out.push(dim({ key: 'fenceFooting', kind: 'footing', slots: ['fence.footingDepth'], scope: 'context', unit: 'len', value: F, calc: null, lines: fd.lines, anchor: fd.anchor }));
  return out;
}
