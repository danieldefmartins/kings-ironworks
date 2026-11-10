// Dimension lines for a fence run: each segment's length along the grade, the
// whole run end to end (one line when it runs straight, a line beside every
// segment when it turns), the height, the post spacing at the first bay and
// the footing below grade. Drawn on the sketch's run (fenceSketch), so a
// segment not measured yet still has its line.
import type { MeasureData } from './measure';
import { linearDim, type SceneDim } from './measure-dims';
import { dim, leftOf, meas, UP, v3, vadd, vmul, vunit, vsub } from './measure-dims-kit';
import { FENCE_SKETCH, fenceChain, fenceSketch, fenceSpacing } from './measure-post-suggest-fence';
import { layoutRun } from './measure-post-suggest';

export function fenceDims(data: MeasureData): SceneDim[] {
  const f = data.fence, runs = fenceSketch(data);
  if (!f || !runs.length) return [];
  const out: SceneDim[] = [];
  // Outside of the line is −Y for a run heading +X: the right of travel.
  runs.forEach((r) => {
    const right = vmul(leftOf(r.a, r.b), -1), d = linearDim(r.a, r.b, right, 16);
    out.push(dim({ key: `fenceSeg:${r.index}`, kind: 'fenceSeg', slots: [`fence.seg${r.index}`], scope: 'overall', unit: 'len', value: meas(f.segments[r.index]?.length), calc: null, lines: d.lines, anchor: d.anchor }));
  });
  const complete = runs.every((r) => !r.nominal);
  const straight = f.segments.slice(0, -1).every((s) => !meas((s.turnDeg || '').replace(/^[-−–]/, '')));
  // The sum is offered as a cross-check only where the run has one line to hold a tape to.
  const plain = straight && complete && runs.length > 1;
  const total = { key: 'fenceTotal', kind: 'fenceTotal', slots: ['fence.totalRun'], unit: 'len' as const, value: meas(f.totalRun), calc: plain ? f.segments.reduce((s, g) => s + (meas(g.length) ?? 0), 0) : null };
  if (straight) {
    const a = runs[0].a, b = runs[runs.length - 1].b, right = vmul(leftOf(a, b), -1);
    const d = linearDim(v3(a.x, a.y, Math.min(a.z, b.z)), v3(b.x, b.y, Math.min(a.z, b.z)), right, 30);
    // One segment is its own total: the line is there for the question, not twice on the drawing.
    out.push(dim({ ...total, scope: 'overall', ...(plain ? {} : { mark: 'number' as const }), lines: d.lines, anchor: d.anchor }));
  } else {
    // A turning run has no one line: the tape follows every segment.
    const each = runs.map((r) => linearDim(r.a, r.b, vmul(leftOf(r.a, r.b), -1), 30));
    out.push(dim({ ...total, scope: 'context', mark: 'number', lines: each.flatMap((d) => d.lines), anchor: each[Math.floor((each.length - 1) / 2)].anchor }));
  }
  const first = runs[0], a = first.a, b = first.b, u = vunit(vsub(b, a));
  const H = meas(f.segments[0]?.height) ?? meas(f.height);
  const hd = linearDim(a, vadd(a, vmul(UP, H ?? FENCE_SKETCH.height)), vmul(u, -1), 8);
  out.push(dim({ key: 'fenceHeight', kind: 'fenceHeight', slots: ['fence.height'], scope: 'context', unit: 'len', value: meas(f.height), calc: null, lines: hd.lines, anchor: hd.anchor }));
  // Post spacing: the first bay of the first segment, as laid out.
  const run = fenceChain(data)?.runs[0], panels = meas(f.segments[0]?.panels);
  const lay = run ? layoutRun(run, { maxSpacing: fenceSpacing(data) }, panels ? Math.round(panels) + 1 : null) : null;
  const lift = (p: typeof a) => vadd(p, vmul(UP, (H ?? FENCE_SKETCH.height) + 4));
  if (run && lay && lay.posts.length > 1) {
    const at = (s: number) => { const t = s / (run.anchors[run.anchors.length - 1].at || 1); return vadd(a, vmul(vsub(b, a), t)); };
    const sd = linearDim(lift(at(lay.posts[0].at)), lift(at(lay.posts[1].at)), UP, 5);
    out.push(dim({ key: 'fenceSpacing', kind: 'postSpacing', slots: ['fence.postSpacing'], scope: 'context', unit: 'len', value: meas(f.postSpacing), calc: lay.spans[0] ?? null, lines: sd.lines, anchor: sd.anchor }));
  } else {
    // First segment not measured yet: the bay it is drawn with.
    const sd = linearDim(lift(a), lift(b), UP, 5);
    out.push(dim({ key: 'fenceSpacing', kind: 'postSpacing', slots: ['fence.postSpacing'], scope: 'context', unit: 'len', value: meas(f.postSpacing), calc: null, lines: sd.lines, anchor: sd.anchor }));
  }
  // Footing: below grade at the first post.
  const F = meas(f.footingDepth);
  const fd = linearDim(a, vadd(a, vmul(UP, -(F ?? FENCE_SKETCH.footing))), vmul(u, -1), 8);
  out.push(dim({ key: 'fenceFooting', kind: 'footing', slots: ['fence.footingDepth'], scope: 'context', unit: 'len', value: F, calc: null, lines: fd.lines, anchor: fd.anchor }));
  return out;
}
