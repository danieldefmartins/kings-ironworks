// Where things sit on a window well, in plan. Shared by the 3D scene and its
// dimension lines so both put the gate, the ladder and the returns in the same
// place. Layout (scene-window-well.ts): the proud face of the house at y = 0,
// the well out toward −y, +x to the right seen from outside. Inches.
import type { WellAlong, WellRun, WellWall } from './measure';

export interface P2 { x: number; y: number }

/** Sizes drawn (as a preview) until the real ones are read. */
export const WELL_PREVIEW = {
  length: 60, projection: 36, wall: 6, depth: 36, guardHeight: 36, gateWidth: 30,
  ladderWidth: 16, ladderSpacing: 12, ladderStandoff: 4, sphere: 4, post: 1.5,
  /** A ladder "at the left / right" stands this far off the corner until its offset is read. */
  ladderCorner: 4,
} as const;

const EPS = 1e-6;
const add = (a: P2, d: P2, k: number): P2 => ({ x: a.x + d.x * k, y: a.y + d.y * k });
const dist = (a: P2, b: P2) => Math.hypot(b.x - a.x, b.y - a.y);
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/** Start of a span of `room` for something `size` long: at the start, centred, at the end, or a measured offset. */
export function alongStart(room: number, size: number, at: WellAlong | '', offset: number | null, endMargin = 0): number {
  const max = room - size;
  if (at === 'start') return clamp(endMargin, 0, max);
  if (at === 'end') return clamp(max - endMargin, 0, max);
  if (at === 'offset' && offset !== null) return clamp(offset, 0, max);
  return Math.max(0, max / 2);
}

export interface WellRunLine {
  key: WellRun;
  /** Start post centre (the house end of a side, the left end of the front). */
  a: P2;
  b: P2;
  /** Unit direction a → b. */
  u: P2;
  /** Unit normal pointing away from the well. */
  out: P2;
}
export interface WellGatePlace {
  run: WellRun;
  /** Gate post centres: `a` toward the run's start, `b` toward its end. */
  a: P2;
  b: P2;
  u: P2;
  out: P2;
  /** Post centre to post centre. */
  width: number;
  /** The run is shorter than the gate asked for: drawn the full run. */
  clamped: boolean;
}
export interface WellGuardLayout {
  runs: WellRunLine[];
  gate: WellGatePlace | null;
  /** Guard bays, post centre to post centre, with the gate opening left out. */
  bays: [P2, P2][];
  posts: P2[];
}

/**
 * The U-shaped guard on the wall top: a front run parallel to the house and a
 * return down each side, their end posts held off the proud face by the gap.
 * A gate takes its opening out of one run, anywhere along it — at an end the
 * corner (or end) post is its gate post.
 */
export function wellGuardLayout(o: {
  length: number; projection: number; wall: number; postWidth: number; gapToWall: number;
  gate?: { run: WellRun | ''; at: WellAlong | ''; offset: number | null; width: number } | null;
}): WellGuardLayout {
  const c = o.wall / 2, yEnd = -(o.gapToWall + o.postWidth / 2), yFront = -o.projection + c;
  const hl: P2 = { x: c, y: yEnd }, fl: P2 = { x: c, y: yFront }, fr: P2 = { x: o.length - c, y: yFront }, hr: P2 = { x: o.length - c, y: yEnd };
  const runs: WellRunLine[] = [
    { key: 'left', a: hl, b: fl, u: { x: 0, y: -1 }, out: { x: -1, y: 0 } },
    { key: 'front', a: fl, b: fr, u: { x: 1, y: 0 }, out: { x: 0, y: -1 } },
    { key: 'right', a: hr, b: fr, u: { x: 0, y: -1 }, out: { x: 1, y: 0 } },
  ];
  let gate: WellGatePlace | null = null;
  const bays: [P2, P2][] = [], posts: P2[] = [hl, fl, fr, hr];
  const g = o.gate && o.gate.width > 0 ? o.gate : null, gateRun = g ? g.run || 'front' : null;
  for (const r of runs) {
    const L = dist(r.a, r.b);
    if (!g || r.key !== gateRun || !(L > EPS)) { bays.push([r.a, r.b]); continue; }
    const width = Math.min(g.width, L), s = alongStart(L, width, g.at, g.offset);
    const a = add(r.a, r.u, s), b = add(r.a, r.u, s + width);
    gate = { run: r.key, a, b, u: r.u, out: r.out, width, clamped: g.width > L + EPS };
    if (s > EPS) { bays.push([r.a, a]); posts.push(a); }
    if (L - s - width > EPS) { bays.push([b, r.b]); posts.push(b); }
  }
  return { runs, gate, bays, posts };
}

/**
 * The gate's swing, seen from outside facing it: the hinge post, the angle of
 * the closed leaf and the angle it opens to (a quarter turn out of, or into,
 * the well).
 */
export function wellGateSwing(gate: WellGatePlace, hinge: 'left' | 'right' | '', swing: 'in' | 'out' | ''): { hinge: P2; latch: P2; from: number; to: number } {
  // Facing the gate from outside, the viewer's right hand is (−out.y, out.x).
  const right: P2 = { x: -gate.out.y, y: gate.out.x };
  const bIsRight = (gate.b.x - gate.a.x) * right.x + (gate.b.y - gate.a.y) * right.y > 0;
  const hingeAtB = hinge === 'right' ? bIsRight : !bIsRight;
  const h = hingeAtB ? gate.b : gate.a, latch = hingeAtB ? gate.a : gate.b;
  const open: P2 = swing === 'in' ? { x: -gate.out.x, y: -gate.out.y } : gate.out;
  const from = Math.atan2(latch.y - h.y, latch.x - h.x);
  let turn = Math.atan2(open.y, open.x) - from;
  while (turn > Math.PI) turn -= 2 * Math.PI;
  while (turn < -Math.PI) turn += 2 * Math.PI;
  return { hinge: h, latch, from, to: from + turn };
}

export interface WellInside { x0: number; x1: number; y0: number; y1: number }
export interface WellLadderPlace {
  wall: WellWall;
  /** Rail centres, standing off the wall. */
  railA: P2;
  railB: P2;
  /** The same two points on the wall face behind them. */
  wallA: P2;
  wallB: P2;
  /** Unit direction along the wall (start → end) and into the well. */
  along: P2;
  inward: P2;
  width: number;
}

/**
 * The egress ladder against one inside wall of the well: the far wall, a side
 * or the house side; at the wall's start, centre or end, or a measured offset
 * from its start corner to the ladder's near rail.
 */
export function wellLadderLayout(o: { inside: WellInside; wall: WellWall | ''; at: WellAlong | ''; offset: number | null; width: number; standoff: number }): WellLadderPlace {
  const { x0, x1, y0, y1 } = o.inside, wall = o.wall || 'far';
  const [start, along, inward, room]: [P2, P2, P2, number] =
    wall === 'far' ? [{ x: x0, y: y0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, x1 - x0]
      : wall === 'house' ? [{ x: x0, y: y1 }, { x: 1, y: 0 }, { x: 0, y: -1 }, x1 - x0]
        : wall === 'left' ? [{ x: x0, y: y1 }, { x: 0, y: -1 }, { x: 1, y: 0 }, y1 - y0]
          : [{ x: x1, y: y1 }, { x: 0, y: -1 }, { x: -1, y: 0 }, y1 - y0];
  const width = Math.min(o.width, Math.max(room, 0)), s = alongStart(room, width, o.at, o.offset, WELL_PREVIEW.ladderCorner);
  const wallA = add(start, along, s), wallB = add(start, along, s + width);
  return { wall, wallA, wallB, railA: add(wallA, inward, o.standoff), railB: add(wallB, inward, o.standoff), along, inward, width };
}
