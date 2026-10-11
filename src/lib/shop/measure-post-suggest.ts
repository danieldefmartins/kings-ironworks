// Post suggestion — the generic engine.
//
// Daniel: "the app should already include the posts needed per project … we
// usually want it as symmetrical as possible." And: "On larger projects, we just
// ask how many posts and the system splits it symmetrically, just asking us for
// approval. If we edit the number of posts, the system recalculates and
// repositions them again."
//
// Every railed thing the shop builds — a stair side, a deck edge, a fence line,
// a balcony front, a ramp, a fire-escape landing, a drawn custom run — comes
// down to the same question: along this line, where do the posts go? Some
// posts are FIXED by the work (the bottom of a stair, where a flight meets a
// landing, a corner, a gate opening, the end of the line). The rest are spread
// evenly between them so every span is equal and none is longer than the shop
// allows. This module answers that question for any shape; each shape only has
// to describe its lines as runs.
//
// ─── Plugging a new shape in ────────────────────────────────────────────────
// Write an adapter that turns the sheet into `PostRun[]`, then call
// `layoutRuns(runs, settings, counts)`. Nothing in this file needs to change.
//
//   PostRun
//     id        Stable key for this run ("left", "right", "edge-2", "fence-A").
//               Counts the measurer picks are stored against it.
//     side      Optional "left" | "right" for stair-like runs (UI label only).
//     group     Runs sharing a group mirror each other: the count stepper moves
//               them together while the sides are linked (stair left/right,
//               the two returns of a balcony). Omit for runs that stand alone.
//     path      Plan polyline the rail follows, in inches, Z = elevation of the
//               surface it stands on (used for the preview and nothing else —
//               spacing is always measured in plan along this path).
//     anchors   The fixed posts, as distances ALONG `path` from its start,
//               ascending. The first and last are usually 0 and the path length.
//               `role` is free text the adapter uses to map a post back to its
//               own fields ("bottom", "corner", "platformEnd", "gate"…).
//     blocked   Indices i of anchor intervals (anchor i → i+1) where no
//               intermediate post may go: across a turn the adapter cannot
//               address, through a gate opening, over a wall return.
//
//   layoutRun(run, settings, count?) → RunLayout
//     posts     Every post on the run, in order: anchors plus intermediates,
//               each with `at` (distance along path) and the interval it fell
//               in, so the adapter can turn it into a real post record.
//     count     Total posts on the run (anchors + intermediates).
//     defaultCount  The suggestion: fewest posts that keep every span within
//               `maxSpacing`. minCount = number of anchors.
//     spans     Plan length of every span, in order; `spanEach` when they are
//               all equal (within 1/16"), for "span 5' 2-3/8" each".
//     overMax / underMin  Any span longer than maxSpacing / an intermediate
//               span shorter than minSpacing — the UI shows these in red.
//
// Intermediates are shared out so spans are as equal as possible: with the
// suggested count each interval gets the fewest posts that keep it within the
// limit; extra posts (or fewer) go one at a time to whichever interval has the
// longest span at that moment. Inside an interval posts sit at equal fractions.
// The stair adapter is measure-post-suggest-stair.ts.

import type { Point3 } from "./measure-geometry";

export interface RunAnchor {
  at: number;
  role: string;
}

export interface PostRun {
  id: string;
  side?: "left" | "right";
  group?: string;
  path: Point3[];
  anchors: RunAnchor[];
  blocked?: number[];
}

export interface RunPost {
  at: number;
  /** Anchor role, or "between" for an evenly spaced intermediate. */
  role: string;
  /** Anchor interval it sits in (anchor i → i+1); for an anchor, its own index. */
  interval: number;
  /** Fraction across that interval, 0 = anchor i, 1 = anchor i+1. */
  t: number;
  anchor: boolean;
}

export interface SuggestSettings {
  /** Most allowed between post centres, plan inches. */
  maxSpacing: number;
  /** Fewest sensible between an intermediate and its neighbour, plan inches. */
  minSpacing?: number;
}

export interface RunLayout {
  run: PostRun;
  posts: RunPost[];
  count: number;
  defaultCount: number;
  minCount: number;
  maxCount: number;
  spans: number[];
  spanEach: number | null;
  longest: number;
  overMax: boolean;
  underMin: boolean;
}

/** Shop default when neither the sheet nor the org says otherwise: 6'. */
export const DEFAULT_MAX_POST_SPACING = 72;
/** Closer than this and an intermediate post is in the way, not helping. */
export const MIN_POST_SPACING = 12;
/** How many intermediates the stepper will add beyond the anchors. */
export const MAX_EXTRA_POSTS = 40;
const EPS = 1 / 16;

export function pathLength(path: Point3[]): number {
  let l = 0;
  for (let i = 1; i < path.length; i++) l += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
  return l;
}

/** Point on the plan polyline `at` inches from its start (Z interpolated). */
export function pointAlong(path: Point3[], at: number): Point3 {
  if (!path.length) return { x: 0, y: 0, z: 0 };
  let left = Math.max(0, at);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], l = Math.hypot(b.x - a.x, b.y - a.y);
    if (left <= l || i === path.length - 1) {
      const f = l > 0 ? Math.min(1, left / l) : 0;
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f };
    }
    left -= l;
  }
  return { ...path[path.length - 1] };
}

/** Intermediates per interval for a total count: suggested split first, then one at a time to the longest span. */
export function allocate(lengths: number[], open: boolean[], extra: number, maxSpacing: number): number[] {
  const need = lengths.map((l, i) => (open[i] ? Math.max(0, Math.ceil(l / maxSpacing - 1e-6) - 1) : 0));
  const suggested = need.reduce((s, n) => s + n, 0);
  const k = extra >= suggested ? need.slice() : lengths.map(() => 0);
  let left = extra - k.reduce((s, n) => s + n, 0);
  while (left > 0) {
    let best = -1, span = -1;
    for (let i = 0; i < lengths.length; i++) {
      if (!open[i]) continue;
      const s = lengths[i] / (k[i] + 1);
      if (s > span + 1e-9) { span = s; best = i; }
    }
    if (best < 0) break;
    k[best]++;
    left--;
  }
  return k;
}

/** One run: anchors fixed, the rest spread evenly. `count` is total posts (absent = suggested). */
export function layoutRun(run: PostRun, settings: SuggestSettings, count?: number | null): RunLayout {
  const max = settings.maxSpacing > 0 ? settings.maxSpacing : DEFAULT_MAX_POST_SPACING;
  const min = settings.minSpacing ?? MIN_POST_SPACING;
  const anchors = run.anchors;
  const blocked = new Set(run.blocked ?? []);
  const lengths = anchors.slice(1).map((a, i) => Math.max(0, a.at - anchors[i].at));
  const open = lengths.map((l, i) => !blocked.has(i) && l > EPS);
  const minCount = anchors.length;
  const maxExtra = open.some(Boolean) ? MAX_EXTRA_POSTS : 0;
  const defaultCount = Math.min(minCount + maxExtra,
    minCount + lengths.reduce((s, l, i) => s + (open[i] ? Math.max(0, Math.ceil(l / max - 1e-6) - 1) : 0), 0));
  const want = count === undefined || count === null || !Number.isFinite(count) ? defaultCount : Math.round(count);
  const total = Math.min(minCount + maxExtra, Math.max(minCount, want));
  const k = allocate(lengths, open, total - minCount, max);
  const posts: RunPost[] = [];
  anchors.forEach((a, i) => {
    posts.push({ at: a.at, role: a.role, interval: i, t: 0, anchor: true });
    if (i < lengths.length) for (let j = 1; j <= k[i]; j++) {
      const t = j / (k[i] + 1);
      posts.push({ at: a.at + lengths[i] * t, role: "between", interval: i, t, anchor: false });
    }
  });
  const spans: number[] = [];
  let underMin = false;
  for (let i = 1; i < posts.length; i++) {
    const s = posts[i].at - posts[i - 1].at;
    spans.push(s);
    if ((!posts[i].anchor || !posts[i - 1].anchor) && s < min - EPS) underMin = true;
  }
  const longest = spans.length ? Math.max(...spans) : 0;
  const shortest = spans.length ? Math.min(...spans) : 0;
  return {
    run, posts, count: posts.length, defaultCount, minCount, maxCount: minCount + maxExtra, spans,
    spanEach: spans.length && longest - shortest <= EPS ? longest : null,
    longest, overMax: longest > max + EPS, underMin,
  };
}

/** Every run, with the measurer's counts by run id. */
export function layoutRuns(runs: PostRun[], settings: SuggestSettings, counts: Record<string, number | undefined> = {}): RunLayout[] {
  return runs.map((r) => layoutRun(r, settings, counts[r.id]));
}

/**
 * The stepper: change one run's count. While linked, every run in the same
 * group moves by the same amount, so mirrored sides stay mirrored.
 */
export function stepCounts(layouts: RunLayout[], runId: string, delta: number, linked: boolean): Record<string, number> {
  const target = layouts.find((l) => l.run.id === runId);
  const out: Record<string, number> = {};
  if (!target) return out;
  const moving = linked && target.run.group ? layouts.filter((l) => l.run.group === target.run.group) : [target];
  for (const l of moving) out[l.run.id] = Math.min(l.maxCount, Math.max(l.minCount, l.count + delta));
  return out;
}
