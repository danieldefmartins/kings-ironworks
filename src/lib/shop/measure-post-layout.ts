// Post layout from the measured stair.
//
// Daniel: "it should also auto calculate the angle and the run and measurement
// of posts based on where it's located and how much the posts will run from
// edges (front and side)."
//
// Once the treads are measured, a post is fully described by WHERE it stands:
// which tread (or landing), how far back from that tread's nosing and how far
// in from the open side edge. Everything else — where it is in space, what it
// stands on, how tall it is to the rail, the rake to the next post, the run,
// the sloped rail length and the pickets that fit — follows from geometry the
// measurer already gave us. This module works that out. It is a pure read of
// MeasureData: it never writes defaults back to the sheet.
//
// Conventions (same inch, Z-up coordinates as stairGeometry):
// - A tread's front edge (corners[0]→corners[3]) is its nosing.
// - Rail height is vertical from the nosing line on a flight, from the floor on
//   a landing (see measure-help railHeight). So a post standing `a` behind a
//   nosing is `railHeight + a·slope` tall to the rail line. Sheets whose
//   fab.railHeightDatum is "finished_top_at_post" measured it at each post from
//   the surface under it instead: then the post is simply `railHeight` tall.
// - This is the ONE source of post tops: drawingPosts (3D, 2D drawings, the
//   Blender payload and therefore its post cuts) and the landing connections
//   all read their tops from here.
// - Setbacks are to the post centre, or to its face when datums.postRef is
//   "face" (then half the post is added).

import type { MeasureData, PostMeasure } from "./measure";
import { parseMeas } from "./measure-parse";
import { inchesToField } from "./measure-derive";
import { stairGeometry, surfacePoint, type MeasuredTread, type Point3 } from "./measure-geometry";
import { codeLimits, effectiveCodeSettings, effectiveOccupancy } from "./measure-code";

/** Measured-vs-calculated tolerance for a typed post distance. */
export const POST_CHECK_TOL = 0.25;
/** Design gap below the code sphere, so a picket spacing never sits exactly on it. */
export const PICKET_GAP_MARGIN = 0.125;

export interface LayoutPost {
  post: PostMeasure;
  /** P1, P2… in run order (same numbering as the Posts card). */
  label: string;
  index: number;
  side: "left" | "right";
  /** Post centre on the surface it stands on. */
  base: Point3;
  /** Rail line (top of rail) directly above the post centre. */
  top: Point3;
  /** Vertical: standing surface → rail line. */
  height: number;
  /** Unit travel direction of the tread / landing it stands on, in plan. */
  heading: { x: number; y: number };
  /** Rail-line slope at the post (rise per horizontal inch); 0 on a landing. */
  slope: number;
  onLanding: boolean;
  /** First-step nosing → near post face, horizontal along the first flight. Null after a turn. */
  fromFirstStep: number | null;
  /** What the measurer typed in "first-step edge → post edge", if anything. */
  measuredFromFirst: number | null;
  /** Typed distance disagrees with the calculated one by more than 1/4". */
  mismatch: boolean;
  provisional: boolean;
}

export interface SpanPiece {
  kind: "rake" | "level";
  /** Horizontal length of this piece. */
  run: number;
  rise: number;
  /** Degrees above horizontal (signed: negative going down the run). */
  angle: number;
  /** Along the rail. */
  length: number;
}

export interface PicketLayout {
  count: number;
  /** Clear opening between pickets (and picket ↔ post face), horizontal. */
  gap: number;
  /** Picket centre-to-centre, horizontal. */
  oc: number;
  /** Same spacing measured along a raked rail. */
  ocSloped: number;
  /** Post face → first picket centre, horizontal. */
  firstAt: number;
  picket: number;
  maxOpening: number;
}

export interface LayoutSpan {
  from: LayoutPost;
  to: LayoutPost;
  side: "left" | "right";
  /** Straight rake, level run, or rake + level through a landing knee. */
  kind: "rake" | "level" | "transition";
  pieces: SpanPiece[];
  /** Rail polyline, post top → knee(s) → post top. */
  path: Point3[];
  /** Horizontal centre-to-centre, along the rail path. */
  run: number;
  /** Rail-line rise from → to. */
  rise: number;
  /** Rake of the sloped piece (0 when level). */
  angle: number;
  /** Centre-to-centre along the rail (sum of pieces). */
  length: number;
  /** Clear between post faces, horizontal / along the rail. */
  clearRun: number;
  clearLength: number;
  pickets: PicketLayout | null;
  provisional: boolean;
}

export interface PostLayout {
  posts: LayoutPost[];
  spans: LayoutSpan[];
  postSize: number;
  postSizeKnown: boolean;
  picket: number | null;
  maxOpening: number;
  railHeight: number;
  railHeightKnown: boolean;
  /** Bottom floor the stair starts from (first tread minus its riser). */
  floorZ: number;
}

const num = (s: string | undefined | null, zero = true) => {
  const n = parseMeas(s ?? "");
  return n !== null && Number.isFinite(n) && (zero ? n >= 0 : n > 0) ? n : null;
};

/** Nominal pipe size → actual OD. */
const PIPE_OD: Record<string, number> = { "1": 1.315, "1.25": 1.66, "1.5": 1.9, "2": 2.375, "2.5": 2.875, "3": 3.5 };

/**
 * Plan width of a post or picket section from a material line such as
 * `1-1/2" sq tube`, `2" flat bar`, `1-1/4" Sch40 pipe`, `2x2 HSS`.
 */
export function sectionWidth(spec: string): number | null {
  const s = (spec || "").trim();
  if (!s) return null;
  const m = s.match(/^\s*(\d+(?:\s*[- ]\s*\d+\/\d+|\.\d+|\/\d+)?)\s*(?:["″]|in\b)?/i);
  if (!m) return null;
  const n = parseMeas(m[1].replace(/\s*-\s*/, " "));
  if (n === null || !(n > 0) || n > 12) return null;
  if (/sch|pipe/i.test(s)) return PIPE_OD[String(n)] ?? n;
  return n;
}

const unit = (a: Point3, b: Point3) => {
  const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
  return { x: dx / l, y: dy / l };
};
const deg = (r: number) => (r * 180) / Math.PI;
const planDist = (a: Point3, b: Point3) => Math.hypot(b.x - a.x, b.y - a.y);

/** Rail-line slope over a tread: toward the next nosing (or landing edge). */
function treadSlope(treads: MeasuredTread[], i: number): number {
  const t = treads[i];
  const next = treads[i + 1];
  if (t.stepIdx === null) return 0;
  if (next && (next.segIdx === t.segIdx || next.stepIdx === null) && t.run > 0) {
    const z = next.corners[0].z;
    return (z - t.corners[0].z) / t.run;
  }
  const prev = treads[i - 1];
  if (prev && prev.segIdx === t.segIdx && prev.run > 0) return (t.corners[0].z - prev.corners[0].z) / prev.run;
  return t.run > 0 ? t.rise / t.run : 0;
}

/** Most fabricators' answer: as many pickets as it takes to keep every gap under the sphere. */
export function picketLayout(clearRun: number, picket: number, maxOpening: number, angle = 0): PicketLayout | null {
  if (!(clearRun > 0) || !(picket > 0) || !(maxOpening > PICKET_GAP_MARGIN)) return null;
  const target = maxOpening - PICKET_GAP_MARGIN;
  const count = Math.max(0, Math.ceil((clearRun - target) / (target + picket) - 1e-9));
  const gap = (clearRun - count * picket) / (count + 1);
  const oc = gap + picket;
  return { count, gap, oc, ocSloped: oc / Math.cos((angle * Math.PI) / 180), firstAt: gap + picket / 2, picket, maxOpening };
}

/**
 * Every stair post located from tread + setbacks, and every span between
 * neighbouring posts on the same side. Null when there is no stair geometry.
 */
export function postLayout(data: MeasureData, numbered?: PostMeasure[]): PostLayout | null {
  const model = stairGeometry(data);
  if (!model) return null;
  const { treads } = model;
  const sizeRaw = sectionWidth(data.materials?.post || "");
  const postSize = sizeRaw ?? 1.5;
  const picket = sectionWidth(data.materials?.picket || "");
  const hRaw = num(data.rail?.height, false);
  const railHeight = hRaw ?? 36;
  let maxOpening = 4;
  try {
    const s = effectiveCodeSettings(data);
    maxOpening = codeLimits(s, effectiveOccupancy(data, s)).sphere || 4;
  } catch { /* defaults */ }
  const face = data.datums?.postRef === "face";
  const atPost = data.fab?.railHeightDatum === "finished_top_at_post";
  const half = face ? postSize / 2 : 0;
  const first = treads.find((t) => t.stepIdx !== null) ?? treads[0];
  const firstHeading = unit(first.corners[0], first.corners[1]);
  const firstNose = first.corners[0];

  // Run order: segment, then tread, then how far back on it.
  const stairPosts = data.posts.filter((p) => !p.pathId);
  const orderKey = (p: PostMeasure) => {
    const i = treads.findIndex((t) => t.segIdx === p.segIdx && t.stepIdx === p.stepIdx);
    const along = num(p.stepIdx === null ? p.pos : p.fromNosing) ?? 0;
    return [i < 0 ? 1e6 : i, along] as const;
  };
  // Labels follow whatever numbering the caller shows (the Posts card and print use orderedPosts).
  const labelOf = new Map<string, number>();
  (numbered ?? data.posts).forEach((p, i) => labelOf.set(p.id, i));

  const posts: LayoutPost[] = [];
  for (const post of stairPosts) {
    if (post.supportAttachment && post.pointType !== "railing_post") continue;
    const ti = treads.findIndex((t) => t.segIdx === post.segIdx && t.stepIdx === post.stepIdx);
    const t = treads[ti];
    if (!t) continue;
    const seg = data.segments[post.segIdx];
    if (!seg || (seg.kind !== "flight" && seg.kind !== "platform")) continue;
    const alongRaw = num(post.stepIdx === null ? post.pos : post.fromNosing);
    const edgeRaw = num(post.fromEdge);
    const side: "left" | "right" = post.side === "left" ? "left" : "right";
    const along = Math.min(t.run, (alongRaw ?? 0) + half);
    const edge = Math.min(t.width, (edgeRaw ?? 0) + half);
    const across = side === "right" ? t.width - edge : edge;
    const base = surfacePoint(t, along, across);
    const onLanding = t.stepIdx === null;
    const slope = onLanding ? 0 : treadSlope(treads, ti);
    const nosing = surfacePoint(t, 0, across);
    // Rail height datum: the code convention (and the default) measures from the
    // nosing line; a sheet that records "finished top at each post" measures it
    // from the surface under that post instead.
    const railZ = onLanding || atPost ? base.z + railHeight : nosing.z + along * slope + railHeight;
    const top = { ...base, z: railZ };
    const heading = unit(t.corners[0], t.corners[1]);
    const sameLine = Math.abs(heading.x * firstHeading.x + heading.y * firstHeading.y - 1) < 1e-4;
    const fromFirstStep = sameLine
      ? (base.x - firstNose.x) * firstHeading.x + (base.y - firstNose.y) * firstHeading.y - postSize / 2
      : null;
    const measuredFromFirst = post.stepIdx !== null ? num(post.firstStepToPostEdge) : null;
    const mismatch = fromFirstStep !== null && measuredFromFirst !== null && Math.abs(fromFirstStep - measuredFromFirst) > POST_CHECK_TOL;
    const index = labelOf.get(post.id) ?? posts.length;
    posts.push({
      post, label: `P${index + 1}`, index, side, base, top, height: railZ - base.z, heading, slope, onLanding,
      fromFirstStep, measuredFromFirst, mismatch,
      provisional: t.provisional || alongRaw === null || edgeRaw === null || !post.side || hRaw === null
        || (alongRaw ?? 0) + half > t.run || (edgeRaw ?? 0) + half > t.width,
    });
  }
  posts.sort((a, b) => {
    const [ia, aa] = orderKey(a.post), [ib, ab] = orderKey(b.post);
    return ia - ib || aa - ab;
  });

  const spans: LayoutSpan[] = [];
  for (const side of ["left", "right"] as const) {
    const line = posts.filter((p) => p.side === side);
    for (let i = 1; i < line.length; i++) spans.push(span(line[i - 1], line[i]));
  }
  spans.sort((a, b) => posts.indexOf(a.from) - posts.indexOf(b.from));

  function landingStart(segIdx: number) {
    return treads.find((t) => t.segIdx === segIdx && t.stepIdx === null) ?? null;
  }
  function firstTread(segIdx: number) {
    return treads.find((t) => t.segIdx === segIdx && t.stepIdx === 0) ?? null;
  }
  function lineIntersect(p: Point3, d: { x: number; y: number }, q: Point3, e: { x: number; y: number }) {
    const den = d.x * e.y - d.y * e.x;
    if (Math.abs(den) < 1e-6) return null;
    const s = ((q.x - p.x) * e.y - (q.y - p.y) * e.x) / den;
    return { x: p.x + d.x * s, y: p.y + d.y * s };
  }

  function span(a: LayoutPost, b: LayoutPost): LayoutSpan {
    const path: Point3[] = [a.top];
    // Knees where the rail meets a landing between (or at) the two posts.
    if (a.post.segIdx !== b.post.segIdx) {
      // Leaving a flight onto the landing that follows it.
      if (!a.onLanding) {
        const landing = landingStart(a.post.segIdx + 1);
        if (landing && landing.segIdx <= b.post.segIdx) {
          const d = (landing.corners[0].x - a.base.x) * a.heading.x + (landing.corners[0].y - a.base.y) * a.heading.y;
          if (d > 0) path.push({ x: a.base.x + a.heading.x * d, y: a.base.y + a.heading.y * d, z: atPost ? a.top.z + a.slope * d : landing.corners[0].z + railHeight });
        }
      }
      // Leaving the landing up the next flight: the nosing line meets the landing one tread back.
      if (!b.onLanding) {
        const upper = firstTread(b.post.segIdx);
        const landing = landingStart(b.post.segIdx - 1);
        if (upper && landing && landing.segIdx >= a.post.segIdx) {
          const back = (b.base.x - upper.corners[0].x) * b.heading.x + (b.base.y - upper.corners[0].y) * b.heading.y + upper.run;
          const knee = { x: b.base.x - b.heading.x * back, y: b.base.y - b.heading.y * back, z: atPost ? b.top.z - b.slope * back : upper.corners[0].z - upper.rise + railHeight };
          const prev = path[path.length - 1];
          const prevDir = a.heading;
          // A turn on the landing: the rail runs on to the corner of the two rail lines.
          if (Math.abs(prevDir.x * b.heading.x + prevDir.y * b.heading.y) < 0.999) {
            const c = lineIntersect(prev, prevDir, knee, b.heading);
            if (c) path.push({ ...c, z: knee.z });
          }
          if (planDist(path[path.length - 1], knee) > 1e-3 || Math.abs(path[path.length - 1].z - knee.z) > 1e-3) path.push(knee);
        }
      }
    }
    path.push(b.top);
    const pieces: SpanPiece[] = [];
    for (let i = 1; i < path.length; i++) {
      const run = planDist(path[i - 1], path[i]), rise = path[i].z - path[i - 1].z;
      if (run < 1e-6 && Math.abs(rise) < 1e-6) continue;
      const angle = deg(Math.atan2(rise, run));
      const kind: SpanPiece["kind"] = Math.abs(angle) < 0.05 ? "level" : "rake";
      const piece = { kind, run, rise, angle, length: Math.hypot(run, rise) };
      const last = pieces[pieces.length - 1];
      if (last && last.kind === kind && Math.abs(last.angle - angle) < 0.05) {
        last.run += run; last.rise += rise; last.length += piece.length;
      } else pieces.push(piece);
    }
    const run = pieces.reduce((s, p) => s + p.run, 0);
    const rise = b.top.z - a.top.z;
    const length = pieces.reduce((s, p) => s + p.length, 0);
    const rake = pieces.filter((p) => p.kind === "rake").sort((p, q) => q.run - p.run)[0];
    const angle = rake ? rake.angle : 0;
    const kind: LayoutSpan["kind"] = pieces.length > 1 ? "transition" : rake ? "rake" : "level";
    // Half a post comes off each end; along the rail that half is measured on the end piece's slope.
    const endCos = (p: SpanPiece | undefined) => (p && p.length > 0 ? p.run / p.length : 1);
    const clearRun = Math.max(0, run - postSize);
    const clearLength = Math.max(0, length - postSize / 2 / endCos(pieces[0]) - postSize / 2 / endCos(pieces[pieces.length - 1]));
    const pickets = picket ? picketLayout(clearRun, picket, maxOpening, angle) : null;
    return {
      from: a, to: b, side: a.side, kind, pieces, path, run, rise, angle, length, clearRun, clearLength, pickets,
      provisional: a.provisional || b.provisional || sizeRaw === null,
    };
  }

  return { posts, spans, postSize, postSizeKnown: sizeRaw !== null, picket, maxOpening, railHeight, railHeightKnown: hRaw !== null, floorZ: treads[0].corners[0].z - treads[0].rise };
}

/** The span that leaves this post (toward the top of the stair), if any. */
export function spanAfter(layout: PostLayout | null, postId: string): LayoutSpan | null {
  return layout?.spans.find((s) => s.from.post.id === postId) ?? null;
}

/** Calculated first-step distance for one post, for prefilling / comparing the typed field. */
export function calculatedFromFirst(layout: PostLayout | null, postId: string): number | null {
  const p = layout?.posts.find((p) => p.post.id === postId);
  return p && !p.provisional ? p.fromFirstStep : null;
}

/** Usual side setback when the sheet has none yet: 1-1/2" in from the open edge. */
export const DEFAULT_SIDE_SETBACK = "1 1/2";

/** Half the tread (or landing) the post stands on, as a field value; null while that run is unmeasured. */
export function centeredSetback(data: MeasureData, post: Pick<PostMeasure, "segIdx" | "stepIdx">): string | null {
  const seg = data.segments[post.segIdx];
  if (!seg || seg.kind !== "flight" || post.stepIdx === null) return null;
  const run = num(seg.steps[post.stepIdx]?.run, false);
  return run === null ? null : inchesToField(run / 2);
}

/**
 * Setbacks a new stair post starts with, so placing a post is one tap: the
 * sheet's remembered front setback (or centred on its tread), the sheet's side
 * setback (or the usual 1-1/2"). Only fills what is empty.
 */
export function applyDefaultSetbacks(data: MeasureData, post: PostMeasure, sideSetback: string): void {
  if (post.pathId) return;
  if (!post.fromEdge.trim()) post.fromEdge = sideSetback.trim() || DEFAULT_SIDE_SETBACK;
  if (post.stepIdx === null || post.fromNosing.trim()) return;
  const centred = centeredSetback(data, post);
  const remembered = data.posts.find((p) => p.id !== post.id && !p.pathId && p.stepIdx !== null && p.fromNosing.trim())?.fromNosing;
  post.fromNosing = (data.rail.postCentered ? centred || remembered : remembered || centred) || "";
}
