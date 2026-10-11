// Post suggestion — balcony and Juliet guards.
//
// A projecting balcony is railed along its front and back to the wall on both
// returns. Fixed posts: the two front corners and the two ends at the wall;
// intermediates are spread evenly on each line, and the two returns mirror
// each other (one stepper while linked). A Juliet or an edge with no returns
// is one line between its end posts. Counts live in rail.runPlan; the 3D draws
// the posts from this layout. Coordinates are the balcony scene's: wall face
// at Y = 0, the balcony out toward −Y.
import type { MeasureData } from "./measure";
import type { Point3 } from "./measure-geometry";
import { layoutRuns, type PostRun } from "./measure-post-suggest";
import { distinctPosts, num, planCounts, runMaxSpacing, storeCounts, upHint, type RunAdapter, type RunSuggestion } from "./measure-post-suggest-runs";
import { section } from "./scene-shapes/build-kit";

export interface BalconyLines {
  runs: PostRun[];
  slab: Point3[] | null;
  wall: [Point3, Point3];
  returns: boolean;
}

/** The guard lines of the balcony, as the 3D draws them. Null until the edge is measured. */
export function balconyLines(data: MeasureData): BalconyLines | null {
  const b = data.balcony;
  if (!b) return null;
  const juliet = b.kind === "juliet";
  const L = juliet ? num(b.doorOpening) ?? num(b.edgeLength) : num(b.edgeLength);
  if (L === null) return null;
  const pw = section(data.materials.post)?.width ?? 0;
  const p = (x: number, y: number): Point3 => ({ x, y, z: 0 });
  if (juliet) {
    const y = -(num(b.projection) ?? 0);
    return { runs: [{ id: "bal:front", path: [p(pw / 2, y), p(L - pw / 2, y)], anchors: [{ at: 0, role: "end" }, { at: L - pw, role: "end" }] }], slab: null, wall: [p(-12, 0), p(L + 12, 0)], returns: false };
  }
  const depth = num(b.projection) ?? 0, fascia = b.mount === "fascia";
  const set = fascia ? -pw / 2 : num(b.edgeDistance) ?? pw / 2;
  const front = -depth + set, x0 = set, x1 = L - set, returns = depth > 0 && (b.kind === "balcony" || b.kind === "");
  const line = (id: string, a: Point3, c: Point3, ra: string, rc: string, group?: string): PostRun =>
    ({ id, group, path: [a, c], anchors: [{ at: 0, role: ra }, { at: Math.hypot(c.x - a.x, c.y - a.y), role: rc }] });
  const runs = returns
    ? [line("bal:returnLeft", p(x0, 0), p(x0, front), "wall", "corner", "returns"), line("bal:front", p(x0, front), p(x1, front), "corner", "corner"), line("bal:returnRight", p(x1, front), p(x1, 0), "corner", "wall", "returns")]
    : [line("bal:front", p(x0, front), p(x1, front), "end", "end")];
  return { runs, slab: depth > 0 ? [p(0, 0), p(0, -depth), p(L, -depth), p(L, 0)] : null, wall: [p(-12, 0), p(L + 12, 0)], returns };
}

export function balconySuggestion(data: MeasureData, orgDefault?: string | null): RunSuggestion | null {
  const lines = balconyLines(data);
  if (!lines) return null;
  const maxSpacing = runMaxSpacing(data, orgDefault);
  const layouts = layoutRuns(lines.runs, { maxSpacing }, planCounts(data));
  const juliet = data.balcony?.kind === "juliet";
  const labels: RunSuggestion["labels"] = {
    "bal:front": { key: juliet ? "juliet" : "front" }, "bal:returnLeft": { key: "returnLeft" }, "bal:returnRight": { key: "returnRight" },
  };
  const slab = lines.slab ?? [lines.wall[0], lines.wall[1], { ...lines.wall[1], y: -6 }, { ...lines.wall[0], y: -6 }];
  return {
    layouts, labels, maxSpacing, linked: lines.returns,
    // The wall along the top of the preview.
    outlines: [upHint(slab[0], { x: 0, y: 1 }), slab], walls: [lines.wall],
    approved: !!data.rail.runPlan?.approved,
    total: distinctPosts(layouts).length,
  };
}

export const balconyAdapter: RunAdapter = {
  suggest: balconySuggestion,
  setCounts: (d, counts) => storeCounts(d, counts),
  approve: (d, org) => {
    const s = balconySuggestion(d, org);
    if (!s) return;
    storeCounts(d, Object.fromEntries(s.layouts.map((l) => [l.run.id, l.count])));
    d.rail.runPlan = { ...(d.rail.runPlan || {}), approved: true };
  },
};
