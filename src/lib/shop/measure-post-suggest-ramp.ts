// Post suggestion — ramps (and the landings between ramp runs).
//
// A ramp is railed on both sides unless one is a wall. Fixed posts per side:
// the bottom and the top of the ramp, and both ends of every landing (where
// the slope stops and starts). The rest are spread evenly along the straight
// run. The two sides mirror each other while linked. Posts are real post
// records (segment + distance along it + setback from the edge), placed with
// a `suggested` fingerprint like the stair's, and re-spaced while untouched.
import { newPost, newPostId, railSideSetback, type MeasureData, type PostMeasure } from "./measure";
import { inchesToField } from "./measure-derive";
import { stairGeometry, surfacePoint, type MeasuredTread, type Point3 } from "./measure-geometry";
import { DEFAULT_SIDE_SETBACK } from "./measure-post-layout";
import { layoutRuns, type PostRun } from "./measure-post-suggest";
import { isUntouchedSuggestion, postFingerprint, railedSides, SIDES, type RailSide } from "./measure-post-suggest-stair";
import { distinctPosts, num, runMaxSpacing, type RunAdapter, type RunSuggestion } from "./measure-post-suggest-runs";

const field = (n: number) => inchesToField(Math.max(0, Math.round(n * 16) / 16));

/** Straight ramp runs and landings only. */
export function rampCanSuggest(data: MeasureData): boolean {
  const segs = data.segments;
  return segs.some((s) => s.kind === "ramp")
    && segs.every((s) => s.kind === "ramp" || (s.kind === "platform" && s.turn === "none"));
}
export function rampReady(data: MeasureData): boolean {
  return rampCanSuggest(data) && data.segments.every((s) =>
    s.kind === "ramp" ? (num(s.runH) ?? 0) > 0 && (num(s.width) ?? 0) > 0
      : s.kind === "platform" ? (num(s.length) ?? 0) > 0 && (num(s.depth) ?? 0) > 0 : false);
}

interface Slot { segIdx: number; pos: number; role: string }

function setback(data: MeasureData): number {
  return num(railSideSetback(data) || DEFAULT_SIDE_SETBACK) ?? 1.5;
}

export function rampSuggestSig(data: MeasureData, orgDefault?: string | null): string {
  const plan = data.rail.postPlan || {};
  return JSON.stringify([data.segments.map((s) => s.kind === "ramp" ? ["r", s.runH, s.width, s.rise] : s.kind === "platform" ? ["p", s.length, s.depth] : [s.kind]),
    data.rail.side, data.rail.segSides || {}, data.datums.orientation, plan.left ?? null, plan.right ?? null, plan.linked ?? true,
    runMaxSpacing(data, orgDefault), railSideSetback(data)]);
}

export interface RampSuggestion extends RunSuggestion { posts: PostMeasure[]; sig: string }

export function rampSuggestion(data: MeasureData, orgDefault?: string | null): RampSuggestion | null {
  if (!rampReady(data)) return null;
  const model = stairGeometry(data);
  if (!model) return null;
  const segs = data.segments;
  const tread = (i: number): MeasuredTread | undefined => model.treads.find((t) => t.segIdx === i);
  const s = setback(data);
  // Anchor slots along the line: bottom, each landing's two ends, top.
  const slots: Slot[] = [];
  segs.forEach((sg, i) => {
    const t = tread(i);
    if (!t) return;
    const landing = sg.kind === "platform", prev = segs[i - 1];
    if (i === 0 || landing || prev?.kind === "ramp") slots.push({ segIdx: i, pos: s, role: i === 0 ? "bottom" : landing ? "landingStart" : "rampStart" });
    if (i === segs.length - 1 || landing) slots.push({ segIdx: i, pos: Math.max(s, t.run - s), role: i === segs.length - 1 ? "top" : "landingEnd" });
  });
  const segStart: number[] = [];
  let acc = 0;
  segs.forEach((_, i) => { segStart[i] = acc; acc += tread(i)?.run ?? 0; });
  const base = (side: RailSide, segIdx: number, pos: number): Point3 => {
    const t = tread(segIdx)!;
    return surfacePoint(t, Math.min(pos, t.run), side === "left" ? s : t.width - s);
  };
  const plan = data.rail.postPlan || {};
  const runs: PostRun[] = [];
  const sideSlots: Partial<Record<RailSide, Slot[]>> = {};
  for (const side of SIDES) {
    const list = slots.filter((sl) => railedSides(data, sl.segIdx)[side]);
    if (list.length < 2) continue;
    sideSlots[side] = list;
    const d0 = segStart[list[0].segIdx] + list[0].pos;
    runs.push({
      id: side, side, group: "ramp",
      path: [base(side, list[0].segIdx, list[0].pos), base(side, list[list.length - 1].segIdx, list[list.length - 1].pos)],
      anchors: list.map((sl) => ({ at: segStart[sl.segIdx] + sl.pos - d0, role: sl.role })),
    });
  }
  const maxSpacing = runMaxSpacing(data, orgDefault);
  const layouts = layoutRuns(runs, { maxSpacing }, { left: plan.left, right: plan.right });
  const posts: PostMeasure[] = [];
  for (const l of layouts) {
    const side = l.run.id as RailSide, list = sideSlots[side]!;
    const d0 = segStart[list[0].segIdx] + list[0].pos;
    l.posts.forEach((rp, n) => {
      const dist = d0 + rp.at;
      // The segment under this point (the last one that starts at or before it).
      let segIdx = 0;
      segs.forEach((_, i) => { if (segStart[i] <= dist + 1e-6) segIdx = i; });
      if (rp.anchor) segIdx = list[rp.interval].segIdx;
      const p = newPost(segIdx, null);
      p.id = `rg-${side}-${n}`;
      p.side = side;
      p.pos = field(dist - segStart[segIdx]);
      p.fromEdge = field(s);
      posts.push(p);
    });
  }
  const outlines = model.treads.map((t) => t.corners.map((c) => ({ ...c })));
  const labels: RunSuggestion["labels"] = { left: { key: "leftSide" }, right: { key: "rightSide" } };
  return {
    layouts, labels, maxSpacing, outlines, walls: [], linked: plan.linked !== false,
    approved: data.posts.some((p) => !p.pathId),
    total: distinctPosts(layouts).length, posts, sig: rampSuggestSig(data, orgDefault),
  };
}

function place(d: MeasureData, sugg: RampSuggestion) {
  const own = d.posts.filter((p) => !p.pathId && !isUntouchedSuggestion(p));
  d.posts = d.posts.filter((p) => p.pathId || !isUntouchedSuggestion(p));
  for (const p of sugg.posts) {
    if (own.some((o) => o.side === p.side && o.segIdx === p.segIdx && Math.abs((num(o.pos) ?? 0) - (num(p.pos) ?? 0)) < 6)) continue;
    const q = { ...p, id: newPostId() };
    q.suggested = postFingerprint(q);
    d.posts.push(q);
  }
  d.rail.postPlan = { ...(d.rail.postPlan || {}), sig: sugg.sig };
}

export const rampAdapter: RunAdapter = {
  suggest: rampSuggestion,
  setCounts: (d, counts) => { d.rail.postPlan = { ...(d.rail.postPlan || {}), ...counts }; },
  approve: (d, org) => {
    const s = rampSuggestion(d, org);
    if (s) place(d, s);
  },
  reconcile: (d, org) => {
    if (!d.posts.some((p) => !p.pathId && p.suggested && p.suggested !== "ghost")) return false;
    const sig = rampSuggestSig(d, org);
    if (d.rail.postPlan?.sig === sig) return false;
    const s = rampSuggestion(d, org);
    if (!s) return false;
    place(d, s);
    return true;
  },
  ghosts: (data, org) => {
    if (data.posts.some((p) => !p.pathId)) return data;
    const s = rampSuggestion(data, org);
    return s ? { ...data, posts: [...data.posts, ...s.posts.map((p) => ({ ...p, suggested: "ghost" }))] } : data;
  },
};
