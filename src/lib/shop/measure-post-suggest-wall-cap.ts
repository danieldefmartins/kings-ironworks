// Post suggestion — railing on a wall cap.
//
// Each wall run is one line. Fixed posts: the two ends of the wall and every
// corner (a corner post belongs to the run before it, so a later run starts on
// it). The rest are spread so every span is equal and within the limit. A run's
// count is its number of post rows (each row is read for cap width, top of cap
// and, cored, the edge distance to both faces). A run whose posts already hold
// readings is never re-spaced: its count is locked until they are cleared.
import type { MeasureData } from "./measure";
import { layoutRuns, type PostRun } from "./measure-post-suggest";
import { distinctPosts, planCounts, runMaxSpacing, storeCounts, upHint, type RunAdapter, type RunSuggestion } from "./measure-post-suggest-runs";
import { newWallCapPost, runTag, type WallCapPost, type WallCapRun } from "./measure-wall-cap";
import { wallCapLayout } from "./scene-shapes/scene-wall-cap";
import { parseMeas } from "./measure-parse";

export const wallCapRunId = (runId: string) => `wc:${runId}`;

/** A post row nobody has measured yet (it can be re-spaced or removed). */
export function blankWallCapPost(p: WallCapPost): boolean {
  return ![p.at, p.capWidth, p.top, p.edgeHigh, p.edgeLow, p.material].some((v) => (v || "").trim() !== "") && !p.sub;
}
const locked = (r: WallCapRun) => r.posts.some((p) => !blankWallCapPost(p));
/** Posts drawn on the run, counting the corner it starts on. */
const runCount = (r: WallCapRun, i: number) => r.posts.length + (i > 0 ? 1 : 0);

export function wallCapSuggestion(data: MeasureData, orgDefault?: string | null): RunSuggestion | null {
  const w = data.wallCap;
  if (!w || !w.runs.length || w.runs.some((r) => (parseMeas(r.length) ?? 0) <= 0)) return null;
  const lay = wallCapLayout(w);
  const runs: PostRun[] = w.runs.map((r, i) => {
    const g = lay.runs[i], L = parseMeas(r.length)!;
    return {
      id: wallCapRunId(r.id),
      path: [{ ...g.from }, { ...g.to }],
      anchors: [{ at: 0, role: i === 0 ? "end" : "corner" }, { at: L, role: i === w.runs.length - 1 ? "end" : "corner" }],
    };
  });
  const approved = !!data.rail.runPlan?.approved;
  // Before approval the suggestion stands; after it, the rows on the wall are the count.
  const counts: Record<string, number> = approved ? {} : planCounts(data);
  w.runs.forEach((r, i) => { if (approved || locked(r)) counts[wallCapRunId(r.id)] = runCount(r, i); });
  const layouts = layoutRuns(runs, { maxSpacing: runMaxSpacing(data, orgDefault) }, counts);
  w.runs.forEach((r, i) => {
    if (!locked(r)) return;
    const l = layouts[i];
    l.minCount = l.maxCount = l.count;
  });
  const labels: RunSuggestion["labels"] = {};
  w.runs.forEach((r, i) => { labels[wallCapRunId(r.id)] = { key: "run", n: runTag(i) }; });
  const first = lay.runs[0];
  return {
    layouts, labels, maxSpacing: runMaxSpacing(data, orgDefault), linked: false, approved,
    outlines: [upHint({ ...first.from, z: 0 }, { x: 0, y: 1 }), ...lay.runs.map((g) => {
      const nx = -g.dir.y * 4, ny = g.dir.x * 4;
      return [{ x: g.from.x - nx, y: g.from.y - ny, z: 0 }, { x: g.from.x + nx, y: g.from.y + ny, z: 0 }, { x: g.to.x + nx, y: g.to.y + ny, z: 0 }, { x: g.to.x - nx, y: g.to.y - ny, z: 0 }];
    })],
    walls: [],
    total: distinctPosts(layouts).length,
  };
}

/** Set each run's rows to its count: blank rows added at the end, blank rows removed from the end. */
function writeRows(d: MeasureData, counts: Record<string, number>) {
  d.wallCap?.runs.forEach((r, i) => {
    const c = counts[wallCapRunId(r.id)];
    if (c === undefined || locked(r)) return;
    const want = Math.max(1, c - (i > 0 ? 1 : 0));
    while (r.posts.length < want) r.posts.push(newWallCapPost());
    while (r.posts.length > want && blankWallCapPost(r.posts[r.posts.length - 1])) r.posts.pop();
  });
}

export const wallCapAdapter: RunAdapter = {
  suggest: wallCapSuggestion,
  setCounts: (d, counts) => {
    if (d.rail.runPlan?.approved) writeRows(d, counts);
    else storeCounts(d, counts);
  },
  approve: (d, org) => {
    const s = wallCapSuggestion(d, org);
    if (!s) return;
    writeRows(d, Object.fromEntries(s.layouts.map((l) => [l.run.id, l.count])));
    d.rail.runPlan = { ...(d.rail.runPlan || {}), approved: true };
  },
};
