// Post suggestion — drawn (custom) runs.
//
// Every drawn run is one line of posts. Fixed posts: its start, every corner
// where two drawn lines meet, and its end (a closed outline's start and end are
// the same post). The rest are spread evenly within the limit. A run is
// suggested once all its lines have a length. Posts are real post records on
// the run (line + distance along it), placed with a `suggested` fingerprint and
// re-spaced while nobody has touched them.
import { newPost, newPostId, planPaths, type MeasureData, type PlanPath, type PostMeasure } from "./measure";
import { inchesToField } from "./measure-derive";
import { parseMeas } from "./measure-parse";
import type { Point3 } from "./measure-geometry";
import { layoutRuns, type PostRun } from "./measure-post-suggest";
import { isUntouchedSuggestion, postFingerprint } from "./measure-post-suggest-stair";
import { distinctPosts, num, planCounts, runMaxSpacing, storeCounts, upHint, type RunAdapter, type RunSuggestion } from "./measure-post-suggest-runs";
import { drawingScale, walkPath } from "./scene-shapes/scene-custom";

export const customRunId = (pathId: string) => `plan:${pathId}`;
const field = (n: number) => inchesToField(Math.max(0, Math.round(n * 16) / 16));
const lineCount = (p: PlanPath) => (p.closed && p.points.length > 2 ? p.points.length : p.points.length - 1);
/** Every line of the run has its length. */
const measured = (p: PlanPath) => p.points.length > 1 && Array.from({ length: lineCount(p) }, (_, i) => num(p.segs[i]?.len)).every((n) => n !== null);

export function customSuggestSig(data: MeasureData, orgDefault?: string | null): string {
  return JSON.stringify([planPaths(data.plan).map((p) => [p.id, p.closed, p.points, p.segs.map((s) => [s.len, s.kind, s.rise, s.steps])]),
    data.rail.runPlan?.counts || {}, runMaxSpacing(data, orgDefault)]);
}

export interface CustomSuggestion extends RunSuggestion { posts: PostMeasure[]; sig: string }

export function customSuggestion(data: MeasureData, orgDefault?: string | null): CustomSuggestion | null {
  const all = planPaths(data.plan).filter((p) => p.points.length > 1);
  const ready = all.filter(measured);
  if (!ready.length) return null;
  const scale = drawingScale(all) ?? 1.2, first = all[0].points[0];
  const runs: PostRun[] = [], walks = new Map<string, Point3[]>();
  for (const path of ready) {
    const o = path.points[0];
    const walk = walkPath(path, scale, { x: (o.x - first.x) * scale, y: -(o.y - first.y) * scale, z: 0 });
    walks.set(path.id, walk.points);
    let at = 0;
    const anchors = [{ at: 0, role: "start" }];
    for (let i = 0; i < lineCount(path); i++) {
      at += num(path.segs[i].len)!;
      anchors.push({ at, role: i === lineCount(path) - 1 ? (path.closed ? "start" : "end") : "corner" });
    }
    runs.push({ id: customRunId(path.id), path: walk.points, anchors });
  }
  const maxSpacing = runMaxSpacing(data, orgDefault);
  const layouts = layoutRuns(runs, { maxSpacing }, planCounts(data));
  const posts: PostMeasure[] = [];
  for (const l of layouts) {
    const path = ready.find((p) => customRunId(p.id) === l.run.id)!;
    const n = lineCount(path);
    l.posts.forEach((rp, k) => {
      // A closed outline ends on the post it started from.
      if (path.closed && rp.anchor && rp.interval === n) return;
      const line = Math.min(rp.interval, n - 1);
      const lineLen = num(path.segs[line].len)!;
      const along = rp.anchor ? (rp.interval === n ? lineLen : 0) : rp.t * lineLen;
      const p = newPost(0, null);
      p.id = `cg-${path.id}-${k}`;
      p.pathId = path.id;
      p.planSegIdx = line;
      p.pos = field(along);
      posts.push(p);
    });
  }
  const labels: RunSuggestion["labels"] = {};
  all.forEach((p, i) => { labels[customRunId(p.id)] = { key: "drawn", n: p.label || i + 1 }; });
  const outlines = ready.map((p) => walks.get(p.id)!.map((q) => ({ ...q, z: 0 })));
  return {
    layouts, labels, maxSpacing, linked: false, walls: [],
    // A drawing reads as drawn: the screen's up is the drawing's up.
    outlines: [upHint(outlines[0][0], { x: 0, y: 1 }), ...outlines],
    approved: !!data.rail.runPlan?.approved,
    total: distinctPosts(layouts).length, posts, sig: customSuggestSig(data, orgDefault),
  };
}

function place(d: MeasureData, sugg: CustomSuggestion) {
  const own = d.posts.filter((p) => p.pathId && !isUntouchedSuggestion(p));
  d.posts = d.posts.filter((p) => !p.pathId || !isUntouchedSuggestion(p));
  // Distance along the whole run, so the end of one line and the start of the next are the same place.
  const paths = planPaths(d.plan);
  const along = (p: PostMeasure) => {
    const path = paths.find((x) => x.id === p.pathId);
    if (!path) return 0;
    let s = 0;
    for (let i = 0; i < (p.planSegIdx ?? 0); i++) s += num(path.segs[i]?.len) ?? 0;
    return s + (parseMeas(p.pos) ?? 0);
  };
  for (const p of sugg.posts) {
    if (own.some((o) => o.pathId === p.pathId && Math.abs(along(o) - along(p)) < 6)) continue;
    const q = { ...p, id: newPostId() };
    q.suggested = postFingerprint(q);
    d.posts.push(q);
  }
  d.rail.runPlan = { ...(d.rail.runPlan || {}), approved: true, sig: sugg.sig };
}

export const customAdapter: RunAdapter = {
  suggest: customSuggestion,
  setCounts: (d, counts) => storeCounts(d, counts),
  approve: (d, org) => {
    const s = customSuggestion(d, org);
    if (s) place(d, s);
  },
  reconcile: (d, org) => {
    if (!d.rail.runPlan?.approved || !d.posts.some((p) => p.pathId && isUntouchedSuggestion(p))) return false;
    const sig = customSuggestSig(d, org);
    if (d.rail.runPlan.sig === sig) return false;
    const s = customSuggestion(d, org);
    if (!s) return false;
    place(d, s);
    return true;
  },
  ghosts: (data, org) => {
    if (data.rail.runPlan?.approved || data.posts.some((p) => !!p.pathId)) return data;
    const s = customSuggestion(data, org);
    return s ? { ...data, posts: [...data.posts, ...s.posts.map((p) => ({ ...p, suggested: "ghost" }))] } : data;
  },
};
