// Post suggestion — the stair adapter.
//
// Turns a measured stair (flights, landings, turns, walls) into the generic
// runs of measure-post-suggest.ts, one per railed side, and turns the laid-out
// runs back into real PostMeasure records.
//
// Fixed posts per railed side, walking up the stair:
// - bottom: first tread of the first railed flight;
// - platform start: on the landing, just past where the flight arrives;
// - platform end: the far edge of a straight-through landing, or — after a
//   turn — the first tread of the next flight;
// - turn corners: each outer corner of an L / U landing (outer side only);
// - top: last tread of the last railed flight.
// Both sides mirror each other (same tread, same setbacks). A side recorded as
// a wall, or switched off in "Railing sides", gets no posts.
//
// Placed posts carry `suggested` = a fingerprint of the fields they were placed
// with. While that still matches, the post is an untouched suggestion and is
// re-spaced whenever the stair changes (reconcileSuggestedPosts, run inside
// every edit so undo stays one step). The moment anyone edits it, it is the
// measurer's own and is never moved again.

import { flightWalls, newPost, newPostId, railSideSetback, type MeasureData, type PostMeasure, type Segment } from "./measure";
import { parseMeas } from "./measure-parse";
import { inchesToField } from "./measure-derive";
import { stairGeometry, type Point3 } from "./measure-geometry";
import { postLayout, sectionWidth, DEFAULT_SIDE_SETBACK } from "./measure-post-layout";
import { layoutRuns, DEFAULT_MAX_POST_SPACING, type PostRun, type RunLayout } from "./measure-post-suggest";

export type RailSide = "left" | "right";
export const SIDES: RailSide[] = ["left", "right"];

interface Slot {
  segIdx: number;
  stepIdx: number | null;
  side: RailSide;
  /** Field values (what the post card shows): tread setback or landing position, and side setback. */
  along: number;
  edge: number;
  role: string;
}

/** How an anchor interval is filled: along one straight line, across one landing, or not at all. */
type Interval = { kind: "axis" } | { kind: "landing" } | { kind: "blocked" };

export interface StairSuggestion {
  layouts: RunLayout[];
  /** The posts this suggestion would place (ids are stable per position, for previews). */
  posts: PostMeasure[];
  maxSpacing: number;
  /** Plan outlines of treads and landings, and the walled edges, for the preview. */
  outlines: Point3[][];
  walls: [Point3, Point3][];
  /** Sides that carry railing anywhere on the stair. */
  railed: Record<RailSide, boolean>;
  /** Sides that are a wall on every piece. */
  walled: Record<RailSide, boolean>;
  sig: string;
}

const num = (s: string | undefined | null) => {
  const n = parseMeas(s ?? "");
  return n !== null && Number.isFinite(n) ? n : null;
};
/** Nearest an intermediate post centre may sit to a nosing or riser. */
const EDGE_CLEAR = 1.5;
const round16 = (n: number) => Math.round(n * 16) / 16;
const field = (n: number) => inchesToField(Math.max(0, round16(n)));

/** Shapes the stair adapter speaks for. */
export function stairCanSuggest(data: MeasureData): boolean {
  const segs = data.segments;
  if (!segs.length || data.spiral) return false;
  return segs.every((s) => (s.kind === "flight" && !s.branch) || s.kind === "platform");
}

/** Measured enough that a post can be placed on every piece: every tread run, every flight width, every landing length. */
export function stairReadyForPosts(data: MeasureData): boolean {
  if (!stairCanSuggest(data)) return false;
  return data.segments.every((s) =>
    s.kind === "flight"
      ? s.steps.length > 0 && (num(s.width) ?? 0) > 0 && s.steps.every((st) => (num(st.run) ?? 0) > 0)
      : s.kind === "platform" ? (num(s.length) ?? 0) > 0 : false);
}

export function segKey(seg: Segment, i: number): string {
  return seg.id || String(i);
}

/** Which sides the measurer wants railed on this piece, before walls. */
export function wantedSides(data: MeasureData, segIdx: number): Record<RailSide, boolean> {
  const seg = data.segments[segIdx];
  const own = seg ? data.rail.segSides?.[segKey(seg, segIdx)] : undefined;
  const v = own ?? (/^left$/i.test(data.rail.side) ? "left" : /^right$/i.test(data.rail.side) ? "right" : "both");
  return { left: v !== "right", right: v !== "left" };
}

/** Railed = wanted and not a wall. */
export function railedSides(data: MeasureData, segIdx: number): Record<RailSide, boolean> {
  const want = wantedSides(data, segIdx);
  const walls = flightWalls(data.segments[segIdx], data.datums.orientation);
  return { left: want.left && !walls.left, right: want.right && !walls.right };
}

export function maxPostSpacing(data: MeasureData, orgDefault?: string | null): number {
  const own = num(data.rail.maxPostSpacing);
  if (own && own > 0) return own;
  const org = num(orgDefault ?? "");
  return org && org > 0 ? org : DEFAULT_MAX_POST_SPACING;
}

/** Everything the suggestion depends on. Same string → same suggestion. */
export function stairSuggestSig(data: MeasureData, orgDefault?: string | null): string {
  const segs = data.segments.map((s) =>
    s.kind === "flight"
      ? ["f", s.width, s.wallSide, s.steps.map((st) => [st.run, st.rise, st.winder ? 1 : 0, st.wallSide ?? ""])]
      : s.kind === "platform"
        ? ["p", s.length, s.depth, s.turn, s.uDirection ?? "", s.entryOffset ?? "", s.exitOffset ?? "", s.entryRise ?? "", s.wallSide ?? ""]
        : [s.kind]);
  const plan = data.rail.postPlan || {};
  return JSON.stringify([segs, data.datums.orientation, data.datums.postRef, data.rail.side, data.rail.segSides || {},
    plan.left ?? null, plan.right ?? null, plan.linked ?? true, maxPostSpacing(data, orgDefault), railSideSetback(data),
    data.rail.postCentered ?? null, frontSetback(data), data.materials.post]);
}

/** Front setback for tread posts: null = centred on the tread. */
function frontSetback(data: MeasureData): number | null {
  if (data.rail.postCentered !== false) return null;
  const ref = data.posts.find((p) => !p.pathId && p.stepIdx !== null && p.pointType === "railing_post" && p.fromNosing.trim());
  return ref ? num(ref.fromNosing) : null;
}

/** Untouched-suggestion fingerprint: every field a person would change when they take a post over. */
export function postFingerprint(p: PostMeasure): string {
  return [p.stepIdx ?? "L", p.side, p.pos, p.fromNosing, p.fromEdge, p.pointType, p.mount, p.anchor, p.plate, p.anchors,
    p.firstStepToPostEdge, p.supportAttachment ? 1 : 0].join("|");
}
export function isUntouchedSuggestion(p: PostMeasure): boolean {
  return !!p.suggested && p.suggested !== "ghost" && p.suggested === postFingerprint(p);
}

function makePost(s: Slot, id: string): PostMeasure {
  const p = newPost(s.segIdx, s.stepIdx);
  p.id = id;
  p.side = s.side;
  p.fromEdge = field(s.edge);
  if (s.stepIdx === null) p.pos = field(s.along);
  else p.fromNosing = field(s.along);
  return p;
}

/**
 * The full suggestion for the sheet as it stands, honouring the measurer's
 * counts and railing sides. Null until the stair is measured enough.
 */
export function stairSuggestion(data: MeasureData, orgDefault?: string | null): StairSuggestion | null {
  if (!stairReadyForPosts(data)) return null;
  const model = stairGeometry(data);
  if (!model) return null;
  const segs = data.segments;
  const postSize = sectionWidth(data.materials?.post || "") ?? 1.5;
  const half = data.datums.postRef === "face" ? postSize / 2 : 0;
  const s = num(railSideSetback(data) || DEFAULT_SIDE_SETBACK) ?? 1.5;
  const front = frontSetback(data);
  const railed = segs.map((_, i) => railedSides(data, i));
  const width = (i: number) => {
    const seg = segs[i];
    return seg && seg.kind === "flight" ? num(seg.width) ?? 36 : null;
  };
  const landingTread = (i: number) => model.treads.find((t) => t.segIdx === i && t.stepIdx === null)!;
  const tread = (i: number, step: number) => model.treads.find((t) => t.segIdx === i && t.stepIdx === step)!;
  const treadAlong = (i: number, step: number) => (front !== null ? front : tread(i, step).run / 2 - half);
  // Side setback on a landing, in line with the flight that arrives on it.
  const landingEdge = (i: number, side: RailSide) => {
    const pl = segs[i];
    const w = landingTread(i).width;
    const entry = pl.kind === "platform" ? num(pl.entryOffset) ?? 0 : 0;
    const w1 = width(i - 1) ?? w;
    return side === "left" ? entry + s : Math.max(0, w - entry - w1) + s;
  };
  const outer = (pl: Extract<Segment, { kind: "platform" }>): RailSide | null =>
    pl.turn === "left" ? "right" : pl.turn === "right" ? "left" : pl.turn === "u" ? (pl.uDirection === "left" ? "right" : "left") : null;

  const slots: Record<RailSide, Slot[]> = { left: [], right: [] };
  for (const side of SIDES) {
    const out = slots[side];
    const add = (sl: Omit<Slot, "side">) => {
      if (out.some((o) => o.segIdx === sl.segIdx && o.stepIdx === sl.stepIdx && (sl.stepIdx !== null || (Math.abs(o.along - sl.along) < 0.5 && Math.abs(o.edge - sl.edge) < 0.5)))) return;
      out.push({ ...sl, side });
    };
    segs.forEach((seg, i) => {
      if (!railed[i][side]) return;
      const prevRailed = i > 0 && railed[i - 1][side];
      const next = segs[i + 1];
      const nextRailed = !!next && railed[i + 1][side];
      if (seg.kind === "flight") {
        const last = seg.steps.length - 1;
        if (!prevRailed) add({ segIdx: i, stepIdx: 0, along: treadAlong(i, 0), edge: s, role: "bottom" });
        if (!nextRailed) add({ segIdx: i, stepIdx: last, along: treadAlong(i, last), edge: s, role: "top" });
        else if (next.kind === "flight") add({ segIdx: i, stepIdx: last, along: treadAlong(i, last), edge: s, role: "joint" });
        return;
      }
      if (seg.kind !== "platform") return;
      const t = landingTread(i);
      const edge = landingEdge(i, side);
      const farAlong = t.run - s - 2 * half;
      add({ segIdx: i, stepIdx: null, along: s, edge, role: prevRailed ? "platformStart" : "start" });
      const o = outer(seg);
      if (!o) {
        add({ segIdx: i, stepIdx: null, along: farAlong, edge, role: nextRailed ? "platformEnd" : "end" });
        return;
      }
      if (side === o) {
        add({ segIdx: i, stepIdx: null, along: farAlong, edge, role: "corner" });
        if (seg.turn === "u") add({ segIdx: i, stepIdx: null, along: farAlong, edge: Math.max(0, t.width - edge - 2 * half), role: "corner" });
      }
      if (nextRailed && next.kind === "flight" && (side === o || seg.turn === "u"))
        add({ segIdx: i + 1, stepIdx: 0, along: treadAlong(i + 1, 0), edge: s, role: "platformEnd" });
    });
  }

  // Where each fixed post actually stands, from the same layout the Posts card uses.
  const anchorPosts = SIDES.flatMap((side) => slots[side].map((sl, n) => makePost(sl, `a-${side}-${n}`)));
  const anchorLayout = postLayout({ ...data, posts: anchorPosts });
  const baseOf = (id: string) => anchorLayout?.posts.find((p) => p.post.id === id) ?? null;
  const hasWinder = (a: number, b: number) => segs.slice(a, b + 1).some((g) => g.kind === "flight" && g.steps.some((st) => st.winder));

  const runs: PostRun[] = [];
  const intervals: Record<string, Interval[]> = {};
  for (const side of SIDES) {
    const list = slots[side];
    if (!list.length) continue;
    const lps = list.map((_, n) => baseOf(`a-${side}-${n}`));
    if (lps.some((p) => !p)) return null;
    const path: Point3[] = lps.map((p) => ({ ...p!.base }));
    const anchors = [{ at: 0, role: list[0].role }];
    const kinds: Interval[] = [];
    const blocked: number[] = [];
    let at = 0;
    for (let n = 1; n < list.length; n++) {
      const a = lps[n - 1]!, b = lps[n]!;
      at += Math.hypot(b.base.x - a.base.x, b.base.y - a.base.y);
      anchors.push({ at, role: list[n].role });
      const sameLanding = list[n - 1].stepIdx === null && list[n].stepIdx === null && list[n - 1].segIdx === list[n].segIdx;
      const straight = a.heading.x * b.heading.x + a.heading.y * b.heading.y > 0.9999
        && Math.abs((b.base.x - a.base.x) * a.heading.y - (b.base.y - a.base.y) * a.heading.x) < 1
        && !hasWinder(list[n - 1].segIdx, list[n].segIdx);
      const k: Interval = sameLanding ? { kind: "landing" } : straight ? { kind: "axis" } : { kind: "blocked" };
      kinds.push(k);
      if (k.kind === "blocked") blocked.push(n - 1);
    }
    intervals[side] = kinds;
    runs.push({ id: side, side, group: "stair", path, anchors, blocked });
  }

  const maxSpacing = maxPostSpacing(data, orgDefault);
  const plan = data.rail.postPlan || {};
  const layouts = layoutRuns(runs, { maxSpacing }, { left: plan.left, right: plan.right });

  const posts: PostMeasure[] = [];
  for (const lay of layouts) {
    const side = lay.run.id as RailSide;
    const list = slots[side];
    lay.posts.forEach((rp, n) => {
      const id = `sg-${side}-${n}`;
      if (rp.anchor) { posts.push(makePost(list[rp.interval], id)); return; }
      const a = list[rp.interval], b = list[rp.interval + 1];
      const kind = intervals[side][rp.interval];
      if (kind.kind === "landing") {
        posts.push(makePost({ ...a, along: a.along + (b.along - a.along) * rp.t, edge: a.edge + (b.edge - a.edge) * rp.t, role: "between" }, id));
        return;
      }
      // Along one straight line: find the tread (or landing) under the point.
      const from = baseOf(`a-${side}-${list.indexOf(a)}`)!;
      const target = rp.at - lay.run.anchors[rp.interval].at;
      const h = from.heading;
      let placed: Slot | null = null;
      for (const t of model.treads) {
        if (t.segIdx < a.segIdx || t.segIdx > b.segIdx) continue;
        const start = (t.corners[0].x - from.base.x) * h.x + (t.corners[0].y - from.base.y) * h.y;
        if (target < start - 1e-6 || target >= start + t.run) continue;
        const raw = target - start - half;
        // Keep clear of the nosing and the riser: a post right on an edge cannot be drilled.
        const along = Math.min(Math.max(raw, EDGE_CLEAR), Math.max(EDGE_CLEAR, t.run - 2 * half - EDGE_CLEAR));
        placed = t.stepIdx === null
          ? { segIdx: t.segIdx, stepIdx: null, side, along, edge: landingEdge(t.segIdx, side), role: "between" }
          : { segIdx: t.segIdx, stepIdx: t.stepIdx, side, along, edge: s, role: "between" };
        if (t.stepIdx !== null) break;
      }
      if (placed) posts.push(makePost(placed, id));
    });
  }

  // Preview: tread / landing outlines, walls drawn on the walled edges.
  const outlines = model.treads.map((t) => t.corners.map((c) => ({ ...c })));
  const walls: [Point3, Point3][] = [];
  for (const t of model.treads) {
    const w = flightWalls(segs[t.segIdx], data.datums.orientation);
    if (w.left) walls.push([{ ...t.corners[0] }, { ...t.corners[1] }]);
    if (w.right) walls.push([{ ...t.corners[3] }, { ...t.corners[2] }]);
  }
  const anyRailed = (side: RailSide) => railed.some((r) => r[side]);
  const allWalled = (side: RailSide) => segs.every((g) => flightWalls(g, data.datums.orientation)[side]);
  return {
    layouts, posts, maxSpacing, outlines, walls,
    railed: { left: anyRailed("left"), right: anyRailed("right") },
    walled: { left: allWalled("left"), right: allWalled("right") },
    sig: stairSuggestSig(data, orgDefault),
  };
}

/** Stair posts that are the measurer's own (placed by hand, or a suggestion they changed). */
function ownPosts(data: MeasureData) {
  return data.posts.filter((p) => !p.pathId && !isUntouchedSuggestion(p));
}

/** A suggested post lands where the measurer already has one of their own. */
function collides(p: PostMeasure, own: PostMeasure[]) {
  return own.some((o) => o.side === p.side && o.segIdx === p.segIdx && o.stepIdx === p.stepIdx
    && (p.stepIdx !== null || Math.abs((num(o.pos) ?? 0) - (num(p.pos) ?? 0)) < 6));
}

function place(d: MeasureData, sugg: StairSuggestion) {
  const own = ownPosts(d);
  d.posts = d.posts.filter((p) => p.pathId || !isUntouchedSuggestion(p));
  for (const p of sugg.posts) {
    if (collides(p, own)) continue;
    const q = { ...p, id: newPostId() };
    q.suggested = postFingerprint(q);
    d.posts.push(q);
  }
  d.rail.postPlan = { ...(d.rail.postPlan || {}), sig: sugg.sig };
}

/**
 * "Use these posts": the suggestion becomes real posts. `replaceOwn` also
 * clears the measurer's own railing posts first (asked for in the UI).
 * Returns how many posts were placed.
 */
export function applyStairSuggestion(d: MeasureData, orgDefault?: string | null, replaceOwn = false): number {
  const sugg = stairSuggestion(d, orgDefault);
  if (!sugg) return 0;
  if (replaceOwn) d.posts = d.posts.filter((p) => p.pathId || p.pointType !== "railing_post" || !!p.supportAttachment);
  place(d, sugg);
  return d.posts.filter(isUntouchedSuggestion).length;
}

/**
 * Run inside every edit. When the stair (or the sides, counts, setbacks or
 * spacing) changed since the suggestion was placed, the untouched suggested
 * posts are re-spaced to the new suggestion. Posts anyone edited stay put.
 * Idempotent; a no-op on sheets that never accepted a suggestion.
 */
export function reconcileSuggestedPosts(d: MeasureData, orgDefault?: string | null): boolean {
  if (!d.posts.some((p) => !p.pathId && p.suggested && p.suggested !== "ghost")) return false;
  const sig = stairSuggestSig(d, orgDefault);
  if (d.rail.postPlan?.sig === sig) return false;
  const sugg = stairSuggestion(d, orgDefault);
  if (!sugg) return false;
  place(d, sugg);
  return true;
}

/** The 3D preview before accepting: the sheet with the suggested posts added as ghosts. */
export function withSuggestionGhosts(data: MeasureData, sugg: StairSuggestion | null): MeasureData {
  if (!sugg || !sugg.posts.length) return data;
  return { ...data, posts: [...data.posts, ...sugg.posts.map((p) => ({ ...p, suggested: "ghost" }))] };
}

/**
 * The measurer's own posts on a side that a count change would re-space.
 * The UI asks before handing them back to the suggestion (adoptOwnPosts).
 */
export function ownPostsOnSides(data: MeasureData, sides: RailSide[]): PostMeasure[] {
  return data.posts.filter((p) => !p.pathId && p.pointType === "railing_post" && !p.supportAttachment
    && sides.includes(p.side as RailSide) && p.suggested && !isUntouchedSuggestion(p));
}
export function adoptOwnPosts(d: MeasureData, ids: string[]) {
  for (const p of d.posts) if (ids.includes(p.id)) p.suggested = postFingerprint(p);
}
