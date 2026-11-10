// What a question that is not a number is about, marked on the sketch.
//
// The Next card also asks things answered with a tap or in a panel: what a rail
// end attaches to, which side the wall is on, the post material, how a deck's
// posts mount. Someone who does not know the word has to see the thing, so
// every such question about a PLACE on the piece gets a highlight here (a
// SceneDim with mark: 'place' — drawn only while asked, in the accent, with
// the question on its pill and no value).
//
//   askSlot(gap)   the slot id the drawing lights for a question, or null for
//                  one that is about no place (the largest piece that fits, a
//                  photo, the job's use)
//   askDims(data)  the highlights themselves, built from the same geometry the
//                  3D draws: the rail line of the piece (its posts, top rail,
//                  infill, ends and base) and, on a stair, its two sides and
//                  its two floors
import type { MeasureData, MeasureShape } from './measure';
import type { SceneDim, Seg3 } from './measure-dims';
import type { Gap } from './measure-checks';
import { stairGeometry } from './measure-geometry';
import { drawingPosts } from './measure-drawing';
import { planPaths } from './measure';
import { meas, v3, type V } from './measure-dims-kit';
import { FENCE_SKETCH, fenceSketch } from './measure-post-suggest-fence';
import { DECK_SKETCH, deckPlan } from './measure-deck-plan';
import { BALCONY_SKETCH, balconyLines } from './measure-post-suggest-balcony';
import { CUSTOM_SKETCH, drawingScale, walkPath } from './scene-shapes/scene-custom';
import { fireHeights } from './scene-shapes/scene-fire-escape';
import { wallCapLayout } from './scene-shapes/scene-wall-cap';
import { gateClearWidth, pos, signedOf } from './measure-dims-gate';
import { WELL_PREVIEW } from './measure-well-layout';
import { section } from './scene-shapes/build-kit';

/** A rail line of the piece: where it stands (base points, in order) and how high. */
interface Run { path: V[]; h: number }
interface Piece {
  runs: Run[];
  /** Post bases, when they are not simply the ends and corners of the runs. */
  posts?: { base: V; top: V }[];
  /** Outline of the walking surface (deck, slab). */
  surface?: V[];
  /** Stair only: both edges of the walk, and the floor at its foot and its head. */
  sides?: Seg3[];
  floors?: Seg3[];
}

const STAIR = new Set<MeasureShape>(['straight', 'stair_platform', 'l_shape', 'u_shape', 'level_run', 'ramp', 'wall_rail', 'builder']);
// Shapes modelled in true plan: flipped like their dimension lines (scene-shapes/pre-mirror.ts).
const TRUE_PLAN = new Set<MeasureShape>(['gate', 'window_well', 'fire_escape', 'spiral', 'deck', 'fence', 'wall_cap', 'balcony', 'custom']);

const up = (p: V, dz: number): V => v3(p.x, p.y, p.z + dz);
const lerp = (a: V, b: V, t: number): V => v3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
const dist = (a: V, b: V) => Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
const strip = (pts: V[]): Seg3[] => pts.slice(1).map((p, i) => [pts[i], p] as Seg3);
/** A small ball of three rings: a spot on the piece that reads from any side. */
function ball(c: V, r = 3.2): Seg3[] {
  const n = 12, out: Seg3[] = [];
  const ring = (f: (a: number) => V) => { for (let i = 0; i < n; i++) out.push([f((i / n) * 2 * Math.PI), f(((i + 1) / n) * 2 * Math.PI)]); };
  ring((a) => v3(c.x + r * Math.cos(a), c.y + r * Math.sin(a), c.z));
  ring((a) => v3(c.x + r * Math.cos(a), c.y, c.z + r * Math.sin(a)));
  ring((a) => v3(c.x, c.y + r * Math.cos(a), c.z + r * Math.sin(a)));
  return out;
}

function stairPiece(data: MeasureData): Piece | null {
  const model = stairGeometry(data);
  if (!model?.treads.length) return null;
  const treads = model.treads, right = /right/i.test(data.rail.side || '') && !/both/i.test(data.rail.side || '');
  const h = meas(data.rail.height) || 36, path: V[] = [];
  treads.forEach((t, i) => {
    path.push(right ? t.corners[3] : t.corners[0]);
    if (t.stepIdx === null || i === treads.length - 1) path.push(right ? t.corners[2] : t.corners[1]);
  });
  const drawn = drawingPosts(data, model).flatMap((p) => ('base' in p && p.base && p.top ? [{ base: p.base, top: p.top }] : []));
  const first = treads[0], last = treads[treads.length - 1], foot = (p: V): V => v3(p.x, p.y, p.z - first.rise);
  return {
    runs: [{ path, h }],
    posts: drawn.length ? drawn : undefined,
    // Each side as one line up the walk: along every tread and up every riser.
    sides: [...strip(treads.flatMap((t) => [t.corners[0], t.corners[1]])), ...strip(treads.flatMap((t) => [t.corners[3], t.corners[2]]))],
    floors: [[foot(first.corners[0]), foot(first.corners[3])], [last.corners[1], last.corners[2]]],
  };
}

function piece(data: MeasureData, shape: MeasureShape): Piece | null {
  if (STAIR.has(shape)) return stairPiece(data);
  const rail = meas(data.rail.height);
  if (shape === 'fence' && data.fence) {
    const runs = fenceSketch(data), f = data.fence;
    if (!runs.length) return null;
    return { runs: [{ path: [runs[0].a, ...runs.map((r) => r.b)], h: meas(f.segments[0]?.height) ?? meas(f.height) ?? FENCE_SKETCH.height }] };
  }
  if (shape === 'deck' && data.deck) {
    const plan = deckPlan(data, true);
    if (!plan) return null;
    const at = (p: { x: number; y: number }) => v3(p.x, p.y, plan.top), h = meas(data.deck.guardHeight) ?? rail ?? DECK_SKETCH.guard;
    // Railed sides that follow one another are one rail line round the corner.
    const runs: Run[] = [];
    for (const e of plan.edges) {
      if (!e.side?.railed) continue;
      const lastRun = runs[runs.length - 1], end = lastRun?.path[lastRun.path.length - 1];
      if (end && Math.hypot(end.x - e.a.x, end.y - e.a.y) < 0.01) lastRun.path.push(at(e.b));
      else runs.push({ path: [at(e.a), at(e.b)], h });
    }
    return { runs, surface: plan.plan.map(at) };
  }
  if (shape === 'balcony' && data.balcony) {
    const lines = balconyLines(data, true);
    if (!lines) return null;
    const path = lines.runs.reduce<V[]>((acc, r) => (acc.length ? [...acc, ...r.path.slice(1)] : [...r.path]), []);
    return { runs: [{ path, h: meas(data.balcony.guardHeight) ?? rail ?? BALCONY_SKETCH.guard }], surface: lines.slab ?? undefined };
  }
  if (shape === 'custom') {
    const paths = planPaths(data.plan).filter((p) => p.points.length > 1), h = rail ?? CUSTOM_SKETCH.height;
    if (!paths.length) return { runs: [{ path: [v3(0, 0, 0), v3(CUSTOM_SKETCH.length, 0, 0)], h }] };
    const scale = drawingScale(paths) ?? 1.2, first = paths[0].points[0];
    return { runs: paths.map((p) => { const o = p.points[0]; return { path: walkPath(p, scale, { x: (o.x - first.x) * scale, y: -(o.y - first.y) * scale, z: 0 }).points, h }; }) };
  }
  if (shape === 'gate' && data.gate) {
    const g = data.gate, W = pos(g.widthBottom) ?? gateClearWidth(g) ?? 48;
    return { runs: [{ path: [v3(0, 0, 0), v3(W, 0, 0)], h: Math.max(pos(g.heightHinge) ?? 0, pos(g.heightLatch) ?? 0) || 60 }] };
  }
  if (shape === 'window_well' && data.well?.deliverables.includes('guard')) {
    const w = data.well, L = pos(w.lengthAtHouse) ?? WELL_PREVIEW.length, Pr = pos(w.projection) ?? WELL_PREVIEW.projection;
    const c = (pos(w.wallThickness) ?? WELL_PREVIEW.wall) / 2, top = signedOf(w.topToGrade) ?? 0, y = -Pr + c;
    return { runs: [{ path: [v3(c, 0, top), v3(c, y, top), v3(L - c, y, top), v3(L - c, 0, top)], h: pos(w.guardHeight) ?? WELL_PREVIEW.guardHeight }] };
  }
  if (shape === 'fire_escape' && data.fire?.levels.length) {
    const l = data.fire.levels[0], z = fireHeights(data.fire.levels)[0].z, L = pos(l.platLength) ?? 120, W = pos(l.platWidth) ?? 42;
    return { runs: [{ path: [v3(0, 0, z), v3(0, -W, z), v3(L, -W, z), v3(L, 0, z)], h: pos(l.guardHeight) ?? rail ?? 42 }] };
  }
  if (shape === 'wall_cap' && data.wallCap?.runs.length) {
    const lay = wallCapLayout(data.wallCap), h = meas(data.wallCap.railHeight) ?? 36;
    return { runs: [{ path: lay.runs.length ? [lay.runs[0].from, ...lay.runs.map((r) => r.to)] : [], h }].filter((r) => r.path.length > 1), posts: lay.posts.map((p) => ({ base: v3(p.at.x, p.at.y, p.top), top: v3(p.at.x, p.at.y, p.top + h) })) };
  }
  if (shape === 'spiral' && data.spiral) {
    // The handrail helix at the outside of the treads, as scene-spiral draws it.
    const s = data.spiral, count = pos(s.treads), n = Math.max(2, Math.min(40, count !== null ? Math.round(count) : 12));
    const H = pos(s.floorToFloor) ?? n * 8.5, R = (pos(s.diameter) ?? 60) / 2, turn = ((pos(s.rotationDeg) ?? 360) * Math.PI) / 180;
    const riser = H / n, step = turn / n, sign = s.direction === 'cw' ? -1 : 1, start = -Math.PI / 2, h = rail ?? 36;
    const path = Array.from({ length: n }, (_, i) => { const a = start + sign * step * (i + 0.5); return v3((R - 1.25) * Math.cos(a), (R - 1.25) * Math.sin(a), riser * (i + 1)); });
    const col = section(s.columnSize)?.width ?? 4;
    return { runs: [{ path, h }], posts: [{ base: v3(0, 0, 0), top: v3(0, 0, H + h) }, { base: v3(col / 2, 0, 0), top: v3(col / 2, 0, H + h) }, { base: v3(-col / 2, 0, 0), top: v3(-col / 2, 0, H + h) }] };
  }
  return null;
}

const flip = (p: V): V => v3(p.x, -p.y, p.z);
const centre = (lines: Seg3[]): V => {
  const pts = lines.flat(), n = pts.length || 1;
  return v3(pts.reduce((s, p) => s + p.x, 0) / n, pts.reduce((s, p) => s + p.y, 0) / n, Math.max(...pts.map((p) => p.z)));
};

/** The highlights for this sheet's tap and panel questions (see the header). */
export function askDims(data: MeasureData, shape: MeasureShape | null | undefined): SceneDim[] {
  const pc = shape ? piece(data, shape) : null;
  if (!pc || !pc.runs.length) return [];
  const out: SceneDim[] = [], mirror = TRUE_PLAN.has(shape!);
  const add = (id: string, lines: Seg3[], dashed?: Seg3[], anchor?: V) => {
    if (!lines.length) return;
    const m = (s: Seg3[]) => (mirror ? s.map(([a, b]) => [flip(a), flip(b)] as Seg3) : s), at = anchor ?? centre(lines);
    out.push({ key: id, kind: id, slots: [id], scope: 'context', mark: 'place', unit: 'len', state: 'unknown', value: null, calc: null, lines: m(lines), ...(dashed?.length ? { dashed: m(dashed) } : {}), anchor: mirror ? flip(at) : at });
  };
  const runs = pc.runs, first = runs[0], last = runs[runs.length - 1];
  const start = first.path[0], end = last.path[last.path.length - 1];
  const posts = pc.posts ?? runs.flatMap((r) => r.path.map((p) => ({ base: p, top: up(p, r.h) }))).filter((p, i, all) => all.findIndex((q) => dist(q.base, p.base) < 0.01) === i);
  add('ask:post', posts.map((p) => [p.base, p.top] as Seg3));
  add('ask:toprail', runs.flatMap((r) => strip(r.path.map((p) => up(p, r.h)))));
  // Infill: plumb members between the rails, a few to each stretch.
  add('ask:picket', runs.flatMap((r) => strip(r.path).flatMap(([a, b]) => {
    const k = Math.max(1, Math.min(6, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 16)));
    return Array.from({ length: k }, (_, j) => { const p = lerp(a, b, (j + 0.5) / k); return [up(p, 3), up(p, r.h - 2)] as Seg3; });
  })));
  // A rail end: the ball on the rail line, its leader down to where it stands and the last of the rail running into it.
  const endMark = (p: V, r: Run, toward: V): { lines: Seg3[]; dashed: Seg3[]; at: V } => {
    const c = up(p, r.h), t = lerp(c, up(toward, r.h), Math.min(1, 14 / (dist(p, toward) || 1)));
    return { lines: [...ball(c), [c, t]], dashed: [[p, up(p, r.h - 3.2)]], at: up(c, 3.2) };
  };
  const s0 = endMark(start, first, first.path[1]), e0 = endMark(end, last, last.path[last.path.length - 2]);
  add('ask:end:start', s0.lines, s0.dashed, s0.at);
  add('ask:end:end', e0.lines, e0.dashed, e0.at);
  add('ask:ends', [...s0.lines, ...e0.lines], [...s0.dashed, ...e0.dashed], start.z >= end.z ? s0.at : e0.at);
  // Where it fastens: the line the posts stand on, and each post's foot.
  add('ask:base', [...runs.flatMap((r) => strip(r.path)), ...posts.flatMap((p) => ball(p.base, 2))]);
  const corners = runs.flatMap((r) => r.path.slice(1, -1).map((p) => up(p, r.h)));
  add('ask:corners', corners.flatMap((c) => ball(c)));
  if (pc.surface && pc.surface.length > 2) add('ask:surface', strip([...pc.surface, pc.surface[0]].map((p) => up(p, 0.3))));
  if (pc.sides) add('ask:sides', pc.sides);
  if (pc.floors) add('ask:floors', pc.floors.map(([a, b]) => { const w = lerp(a, b, -0.35), e = lerp(a, b, 1.35); return [w, e] as Seg3; }));
  return out;
}

/**
 * The slot id the sketch lights while this requirement is asked: one of the
 * highlights above, or the dimension line that already stands on the thing
 * (a gate's hinge post, a joint, the drop side of a wall). Null when the
 * question is about no place on the piece.
 */
export function askSlot(gap: Pick<Gap, 'key' | 'detail'>, data: MeasureData): string | null {
  const end = /^#\d+ (start|end)$/.exec(gap.detail || '');
  switch (gap.key) {
    case 'term_target': case 'term_material': return end ? `ask:end:${end[1]}` : null;
    case 'fence_start_term': return 'ask:end:start';
    case 'fence_end_term': return 'ask:end:end';
    case 'returns': case 'bal_returns': return 'ask:ends';
    case 'orientation': return 'ask:sides';
    case 'floor_change': return 'ask:floors';
    case 'mat_post': case 'fence_post_size': case 'gate_post_size': case 'gate_footing': return 'ask:post';
    case 'mat_toprail': case 'span_top': case 'brackets': case 'sub_bracket': return 'ask:toprail';
    case 'mat_picket': case 'gate_infill': return 'ask:picket';
    case 'bal_mount': case 'bal_anchor_type': case 'sub_balcony': case 'deck_mount': case 'sub_deck': case 'wc_mount': case 'sub_fence': return 'ask:base';
    case 'deck_corners': return 'ask:corners';
    case 'deck_surface': case 'bal_slab_material': return 'ask:surface';
    case 'gate_hinges': return 'gate.heightHinge';
    case 'gate_latch': return 'gate.heightLatch';
    case 'sub_gate': return gap.detail === 'gate:latch' ? 'gate.heightLatch' : 'gate.heightHinge';
    case 'gate_surface': return 'gate.widthBottom';
    case 'wc_drop_side': return 'wc.drop';
    case 'sub_wallcap': return gap.detail ? `wc.${gap.detail.replace(/^wallcap:/, '')}.capWidth` : null;
    case 'fire_ladder_type': case 'fire_ladder_landing': case 'fire_ladder_operates': return 'fire.ladder.length';
    case 'joint_method': {
      const n = (data.joints || []).findIndex((j) => `J${j.afterSegment + 1}` === gap.detail);
      return n >= 0 ? `j${n}.gap` : null;
    }
    default: return null;
  }
}
