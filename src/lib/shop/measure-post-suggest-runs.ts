// Post suggestion for railed runs that are not stair sides — the contract the
// deck, fence, wall-cap, balcony, ramp and drawn (custom) adapters share.
//
// Each adapter turns its sheet into generic PostRuns (measure-post-suggest.ts),
// lays them out with the measurer's counts, and knows how to write a count
// back to its own fields:
//   - deck / balcony: posts are drawn from the plan, so only the count per run
//     is stored (rail.runPlan.counts) and the 3D places them from the layout;
//   - fence: the count IS the segment's panel count (panels = posts − 1);
//   - wall cap: the count is the number of post rows on the wall run;
//   - ramp / custom: real post records, placed with a `suggested` fingerprint
//     and re-spaced while nobody has touched them (like the stair).
// Nothing here knows a shape; the registry is measure-post-suggest-registry.ts.

import type { MeasureData, MeasureShape } from "./measure";
import type { Point3 } from "./measure-geometry";
import { parseMeas } from "./measure-parse";
import { DEFAULT_MAX_POST_SPACING, pointAlong, stepCounts, type RunLayout } from "./measure-post-suggest";

/** How a run row is named (translated in measure-post-suggest-runs-i18n.ts). */
export interface RunLabel {
  key: "side" | "segment" | "run" | "front" | "returnLeft" | "returnRight" | "leftSide" | "rightSide" | "juliet" | "drawn";
  n?: number | string;
}
/** A short fact under a run (fence grade per bay). */
export interface RunNote {
  key: "gradePerBay";
  value: number;
}

export interface RunSuggestion {
  layouts: RunLayout[];
  labels: Record<string, RunLabel>;
  notes?: Record<string, RunNote>;
  maxSpacing: number;
  /** Preview: plan outlines (the first one's first edge points up the screen) and walls. */
  outlines: Point3[][];
  walls: [Point3, Point3][];
  /** The measurer said "use these posts" (or the counts are their own). */
  approved: boolean;
  /** Distinct posts across all runs (a corner shared by two runs counts once). */
  total: number;
  /** Runs share a group → "same count" stepping (balcony returns, ramp sides). */
  linked: boolean;
}

export interface RunAdapter {
  suggest(data: MeasureData, orgDefault?: string | null): RunSuggestion | null;
  /** Write new counts (run id → total posts on that run). */
  setCounts(d: MeasureData, counts: Record<string, number>, orgDefault?: string | null): void;
  /** "Use these posts". */
  approve(d: MeasureData, orgDefault?: string | null): void;
  /** Re-space untouched suggested post records after an edit (record-based shapes). */
  reconcile?(d: MeasureData, orgDefault?: string | null): boolean;
  /** The 3D before approval: suggested posts as amber ghosts (record-based shapes). */
  ghosts?(data: MeasureData, orgDefault?: string | null): MeasureData;
}

export const num = (s: string | undefined | null): number | null => {
  const n = parseMeas(s ?? "");
  return n !== null && Number.isFinite(n) && n > 0 ? n : null;
};

/** The sheet's own limit, else the shape's, else the org default, else 6'. */
export function runMaxSpacing(data: MeasureData, orgDefault?: string | null, own?: number | null): number {
  if (own && own > 0) return own;
  const sheet = num(data.rail.maxPostSpacing);
  if (sheet) return sheet;
  const org = num(orgDefault ?? "");
  return org ?? DEFAULT_MAX_POST_SPACING;
}

/** Counts the measurer chose (run id → posts), from rail.runPlan. */
export function planCounts(data: MeasureData): Record<string, number> {
  return { ...(data.rail.runPlan?.counts || {}) };
}

/** Store counts in rail.runPlan, keeping the rest of the plan. */
export function storeCounts(d: MeasureData, counts: Record<string, number>) {
  d.rail.runPlan = { ...(d.rail.runPlan || {}), counts: { ...(d.rail.runPlan?.counts || {}), ...counts } };
}

/** Every post position in plan, deduplicated within 1" (shared corners count once). */
export function distinctPosts(layouts: RunLayout[]): Point3[] {
  const out: Point3[] = [];
  for (const l of layouts) for (const p of l.posts) {
    const q = pointAlong(l.run.path, p.at);
    if (!out.some((o) => Math.hypot(o.x - q.x, o.y - q.y) < 1)) out.push(q);
  }
  return out;
}

/** The stepper for any run shape: new counts for the run (and its linked group). */
export function stepRun(sugg: RunSuggestion, runId: string, delta: number, linked = true): Record<string, number> {
  return stepCounts(sugg.layouts, runId, delta, linked && sugg.linked);
}

/** A degenerate first outline that only sets which way is "up" in the preview. */
export function upHint(at: Point3, dir: { x: number; y: number }): Point3[] {
  return [{ ...at }, { x: at.x + dir.x * 1e-3, y: at.y + dir.y * 1e-3, z: at.z }, { ...at }];
}
