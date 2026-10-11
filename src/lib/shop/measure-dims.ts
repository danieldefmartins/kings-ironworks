import type { FlightSegment, MeasureData, MeasureShape, PlatformSegment } from './measure';
import { stairGeometry, type MeasuredTread, type Point3 } from './measure-geometry';
import { flightTotals, measuredAssemblyRise } from './measure-derive';
import { flightAngleCalc, jointAngleCalc } from './measure-angle';
import { platformEntryRise } from './measure-platform-rise';
import { drawingPosts } from './measure-drawing';
import { parseMeas } from './measure-parse';
import { gateDims } from './measure-dims-gate';
import { openingDims } from './measure-dims-opening';
import { wellDims } from './measure-dims-well';
import { canopyDims } from './measure-dims-canopy';
import { structuralDims } from './measure-dims-structural';
import { fireDims } from './measure-dims-fire';
import { spiralDims } from './measure-dims-spiral';
import { wallRailDims } from './measure-dims-wall-rail';
import { shopPieceDims } from './measure-dims-shop-piece';

/**
 * Architectural dimension lines for the sketch — every length, height or angle
 * the sheet asks the measurer for gets a place on the drawing, so the number on
 * the Next card ("Floor to floor") is also a line on the 3D that lights up.
 *
 * ── Interface (for every work type) ─────────────────────────────────────────
 * A shape plugs in with ONE pure function, `(data) => SceneDim[]`, registered
 * in DIM_ADAPTERS under its MeasureShape. Each SceneDim is a descriptor:
 *
 *   key      stable id ('f2f', 'platDiag:1', 'gate:widthTop')
 *   kind     short-name key for the label (dimName in measure-dims-i18n.ts;
 *            unknown kinds fall back to `label`)
 *   slots    Next-card slot ids this line answers (measure-next.ts ids). When
 *            the card is on one of them the line is drawn in the accent,
 *            thicker, with "<name> ?" — no other wiring needed.
 *   scope    'overall' = always shown while Layers › Dimensions is on;
 *            'context' = shown when its piece is selected (segs / postIds) or
 *            when the card asks it.
 *   value    the measured number (null when not entered)
 *   calc     what the other numbers imply (null when they cannot) — shown as
 *            "≈ …" in grey when there is no measured value; "?" in amber when
 *            neither exists. `state` is derived from the two.
 *   lines    the drawing as line pairs, inches, Z up. Build them with
 *            linearDim(from, to, offsetDirection, offset) for a length and
 *            arcDim(vertex, dir1, dir2, radius) for an angle.
 *   dashed   optional dashed pairs (a diagonal, a reference floor line)
 *   anchor   where the value pill sits
 *
 * Rules: placement is never invented — no honest place on the drawing, no
 * line. A number that does not apply to this sheet gets no line.
 * The stair family (stairDims) is the first adapter.
 */
/** Stair dimension kinds; other shapes may use their own strings (see `label`). */
export type DimKind =
  | 'f2f' | 'totalRun' | 'rake'
  | 'flightRise' | 'flightRun' | 'flightRake' | 'width' | 'angle'
  | 'platLength' | 'platDepth' | 'platDiag' | 'entryRise'
  | 'jointGap' | 'jointAngle' | 'railHeight' | 'span';
export type DimState = 'measured' | 'calculated' | 'unknown';
export type Seg3 = [Point3, Point3];
/** @deprecated name kept for the first adapter. */
export type StairDim = SceneDim;
export interface SceneDim {
  /** Stable key: 'f2f', 'flightRake:2' (segment index), 'jointGap:0' (joint index), 'span:<id>'. */
  key: string;
  kind: DimKind | (string & {});
  /** Fallback name when `kind` has no short name (other shapes). */
  label?: string;
  /** Next-card slot ids this dimension answers (highlighted while the card is on one). */
  slots: string[];
  /** Overall dimensions show whenever Dimensions is on; the rest when their piece is selected or asked. */
  scope: 'overall' | 'context';
  /** Segments whose selection reveals this dimension. */
  segs?: number[];
  /** Posts whose selection reveals it (rail spans). */
  postIds?: string[];
  /** Scene parts (entity.part) whose selection reveals it: an opening, a gate leaf. */
  parts?: string[];
  unit: 'len' | 'deg';
  state: DimState;
  /** The measured number, when entered. */
  value: number | null;
  /** What the other measurements imply, when they can. */
  calc: number | null;
  /** Dimension line, extension lines and ticks, as line pairs. */
  lines: Seg3[];
  /** Drawn dashed (a platform diagonal, the reference floor line). */
  dashed?: Seg3[];
  /** Where the value pill sits. */
  anchor: Point3;
  /** Joint offsets, when measured: shown after the gap. */
  offsets?: { v: number | null; h: number | null };
}

type V = Point3;
const v = (x: number, y: number, z: number): V => ({ x, y, z });
const add = (a: V, b: V): V => v(a.x + b.x, a.y + b.y, a.z + b.z);
const sub = (a: V, b: V): V => v(a.x - b.x, a.y - b.y, a.z - b.z);
const mul = (a: V, k: number): V => v(a.x * k, a.y * k, a.z * k);
const dot = (a: V, b: V) => a.x * b.x + a.y * b.y + a.z * b.z;
const len = (a: V) => Math.hypot(a.x, a.y, a.z);
const unit = (a: V): V => { const l = len(a); return l > 1e-9 ? mul(a, 1 / l) : v(0, 0, 0); };
const mid = (a: V, b: V): V => mul(add(a, b), 0.5);
const UP = v(0, 0, 1);
const flat = (a: V): V => unit(v(a.x, a.y, 0));
const num = (s: string | undefined | null) => {
  const n = parseMeas(s ?? undefined);
  return n !== null && Number.isFinite(n) && n >= 0 && (s ?? '').trim() !== '' ? n : null;
};

/** Drawing sizes, inches. */
const TICK = 2.2, EXT_GAP = 1.5, EXT_OVER = 2.5;

/**
 * A linear dimension between two feature points a and b, pushed off by `off`
 * along `n`: extension lines from each feature, the dimension line between
 * them, and an architectural 45° tick at each end.
 */
export function linearDim(a: V, b: V, n: V, off: number): { lines: Seg3[]; anchor: V } {
  const nn = unit(n), a2 = add(a, mul(nn, off)), b2 = add(b, mul(nn, off));
  const along = unit(sub(b2, a2)), slash = mul(unit(add(along, nn)), TICK);
  const lines: Seg3[] = [
    [add(a, mul(nn, Math.min(EXT_GAP, off / 3))), add(a2, mul(nn, EXT_OVER))],
    [add(b, mul(nn, Math.min(EXT_GAP, off / 3))), add(b2, mul(nn, EXT_OVER))],
    [a2, b2],
    [sub(a2, slash), add(a2, slash)],
    [sub(b2, slash), add(b2, slash)],
  ];
  return { lines, anchor: mid(a2, b2) };
}

/** An angle arc at p from direction d1 to d2 (both unit), radius r, with its two legs. */
export function arcDim(p: V, d1: V, d2: V, r: number): { lines: Seg3[]; anchor: V } {
  const a = unit(d1), b = unit(d2), cos = Math.max(-1, Math.min(1, dot(a, b))), th = Math.acos(cos);
  const lines: Seg3[] = [[p, add(p, mul(a, r * 1.25))], [p, add(p, mul(b, r * 1.25))]];
  const at = (t: number): V => {
    if (th < 1e-6) return add(p, mul(a, r));
    const s = Math.sin(th), k1 = Math.sin((1 - t) * th) / s, k2 = Math.sin(t * th) / s;
    return add(p, mul(add(mul(a, k1), mul(b, k2)), r));
  };
  const steps = 14;
  for (let i = 0; i < steps; i++) lines.push([at(i / steps), at((i + 1) / steps)]);
  return { lines, anchor: add(p, mul(unit(add(a, b)), r * 2.6)) };
}

const stateOf = (value: number | null, calc: number | null): DimState =>
  value !== null ? 'measured' : calc !== null ? 'calculated' : 'unknown';

/** One flight, no landing, no turn: the multi-flight questions do not exist here. */
export function isSingleFlight(data: MeasureData): boolean {
  return data.segments.length === 1 && data.segments[0].kind === 'flight' && !data.segments[0].branch;
}

/** The stair turns somewhere (a turning landing, a curve, a winder turn) — as the checks read it. */
export function stairTurns(data: MeasureData): boolean {
  return data.segments.some(s =>
    (s.kind === 'platform' && s.turn !== 'none') || s.kind === 'curve'
    || (s.kind === 'flight' && s.steps.some(st => st.winder && (st.turnDeg || '').trim() !== '')));
}

/** Overall run and rake apply to one straight rail line; turning or multi-flight stairs check each flight instead. */
export function straightLine(data: MeasureData): boolean {
  return !stairTurns(data) && data.segments.filter(s => s.kind === 'flight').length <= 1;
}

/** Per-flight control dimensions (rise, run, rake): only where one overall rake cannot verify the stair. */
export function perFlightControls(data: MeasureData): boolean {
  return stairTurns(data) || data.segments.filter(s => s.kind === 'flight').length > 1;
}

const sumRuns = (data: MeasureData): number | null => {
  let total = 0;
  for (const s of data.segments) {
    if (s.kind === 'flight') { const t = flightTotals(s); if (!t) return null; total += t.run; }
    else if (s.kind === 'platform') { const l = num(s.length); if (l === null) return null; total += l; }
    else if (s.kind === 'ramp') { const l = num(s.runH); if (l === null) return null; total += l; }
  }
  return total;
};

/** Every dimension line the sketch can carry for this stair. */
export function stairDims(data: MeasureData, model = stairGeometry(data)): SceneDim[] {
  if (!model || !data.segments.length) return [];
  const out: SceneDim[] = [];
  const treads = model.treads;
  const flights = data.segments.map((s, i) => ({ s, i })).filter(x => x.s.kind === 'flight') as { s: FlightSegment; i: number }[];
  const of = (segIdx: number) => treads.filter(t => t.segIdx === segIdx);
  const frame = (t: MeasuredTread) => {
    const along = flat(sub(t.corners[1], t.corners[0])), across = flat(sub(t.corners[3], t.corners[0]));
    return { along, left: mul(across, -1), across };
  };
  const base = (t: MeasuredTread): V => v(t.corners[0].x, t.corners[0].y, t.corners[0].z - t.rise);
  const push = (d: Omit<SceneDim, 'state' | 'slots'>) => out.push({ ...d, slots: stairSlotsForKey(d.key), state: stateOf(d.value, d.calc) });
  const single = isSingleFlight(data);

  // ---- Overall: floor to floor, beside the top of the stair; the floor line runs back to the bottom riser.
  const first = treads[0], top = treads.reduce((a, t) => (t.corners[1].z >= a.corners[1].z ? t : a), treads[0]);
  if (flights.length) {
    const bottom = base(first), { left } = frame(top);
    const T = top.corners[1], foot = v(T.x, T.y, bottom.z);
    const dim = linearDim(foot, T, left, 18);
    push({
      key: 'f2f', kind: 'f2f', scope: 'overall', unit: 'len',
      value: num(data.overall.floorToFloor) ?? num(data.overall.totalRise), calc: measuredAssemblyRise(data),
      lines: dim.lines, dashed: len(sub(foot, bottom)) > 1 ? [[bottom, foot]] : undefined, anchor: dim.anchor,
    });
  }
  // ---- Overall run and rake: one straight rail line only (the checks read them the same way).
  if (flights.length && straightLine(data)) {
    const bottom = base(first), last = treads[treads.length - 1], { left } = frame(first);
    const end = v(last.corners[1].x, last.corners[1].y, bottom.z);
    const run = linearDim(bottom, end, add(mul(left, 0.55), mul(UP, -0.83)), 14);
    push({ key: 'totalRun', kind: 'totalRun', scope: 'overall', unit: 'len', value: num(data.overall.totalRun), calc: sumRuns(data), lines: run.lines, anchor: run.anchor });
    if (flights.length === 1 && data.segments.length === 1) {
      const fl = flights[0].s, t = flightTotals(fl);
      out.push(rakeDim(data, 'rake', 'rake', 'overall', of(flights[0].i), num(data.overall.rakeLength), t ? t.rake : null));
    }
  }

  // ---- Each flight.
  flights.forEach(({ s: fl, i }) => {
    const ft = of(i).filter(t => t.stepIdx !== null);
    if (!ft.length) return;
    const f0 = ft[0], fl1 = ft[ft.length - 1], { along, left } = frame(f0), b = base(f0), T = fl1.corners[1];
    const totals = flightTotals(fl);
    if (perFlightControls(data)) {
      const foot = v(T.x, T.y, b.z), rise = linearDim(foot, T, frame(fl1).left, 14);
      push({ key: `flightRise:${i}`, kind: 'flightRise', scope: 'context', segs: [i], unit: 'len', value: num(fl.ctrlRise), calc: totals?.rise ?? null, lines: rise.lines, anchor: rise.anchor });
      const run = linearDim(b, foot, add(mul(left, 0.55), mul(UP, -0.83)), 12);
      push({ key: `flightRun:${i}`, kind: 'flightRun', scope: 'context', segs: [i], unit: 'len', value: num(fl.ctrlRun), calc: totals?.run ?? null, lines: run.lines, anchor: run.anchor });
      out.push(rakeDim(data, `flightRake:${i}`, 'flightRake', 'context', ft, num(fl.rake), totals ? totals.rake : null, [i]));
    }
    const w = linearDim(f0.corners[0], f0.corners[3], mul(along, -1), 9);
    push({ key: `width:${i}`, kind: 'width', scope: 'context', segs: [i], unit: 'len', value: num(fl.width), calc: null, lines: w.lines, anchor: w.anchor });
    // Pitch: at the foot of the flight, between the floor and the pitch line.
    const pitch = unit(sub(T, b));
    if (len(sub(T, b)) > 1) {
      const arc = arcDim(add(b, mul(left, 0.5)), along, pitch, 16);
      push({ key: `angle:${i}`, kind: 'angle', scope: 'context', segs: [i], unit: 'deg', value: num(fl.angleDeg), calc: flightAngleCalc(fl), lines: arc.lines, anchor: arc.anchor });
    }
  });

  // ---- Each platform: length, depth, corner-to-corner diagonal, and the step up onto it.
  data.segments.forEach((sg, i) => {
    if (sg.kind !== 'platform' || single) return;
    const t = of(i)[0];
    if (!t) return;
    const p = sg as PlatformSegment, c = t.corners, { along, left } = frame(t);
    const L = num(p.length), D = num(p.depth);
    const length = linearDim(c[0], c[1], left, 12);
    push({ key: `platLength:${i}`, kind: 'platLength', scope: 'context', segs: [i], unit: 'len', value: L, calc: null, lines: length.lines, anchor: length.anchor });
    const depth = linearDim(c[1], c[2], along, 12);
    push({ key: `platDepth:${i}`, kind: 'platDepth', scope: 'context', segs: [i], unit: 'len', value: D, calc: null, lines: depth.lines, anchor: depth.anchor });
    const lift = (q: V) => v(q.x, q.y, q.z + 0.4);
    const a = lift(c[0]), d = lift(c[2]), slash = mul(unit(add(unit(sub(d, a)), UP)), TICK);
    push({
      key: `platDiag:${i}`, kind: 'platDiag', scope: 'context', segs: [i], unit: 'len', value: num(p.diag), calc: L !== null && D !== null ? Math.hypot(L, D) : null,
      lines: [[sub(a, slash), add(a, slash)], [sub(d, slash), add(d, slash)]], dashed: [[a, d]], anchor: mid(a, d),
    });
    const prev = data.segments[i - 1];
    if (prev) {
      const er = platformEntryRise(p, prev);
      if (er.rise > 0 || er.provisional) {
        const foot = v(c[0].x, c[0].y, c[0].z - t.rise), dim = linearDim(foot, c[0], mul(left, 1), 8);
        push({ key: `entryRise:${i}`, kind: 'entryRise', scope: 'context', segs: [i], unit: 'len', value: er.measured ? er.rise : null, calc: null, lines: dim.lines, anchor: dim.anchor });
      }
    }
  });

  // ---- Joints: the gap between two fabricated pieces, on the rail line, and the change of angle across it.
  if (!single) {
    const rh = num(data.rail.height) ?? 36, right = /right/i.test(data.rail.side || '') && !/both/i.test(data.rail.side || '');
    (data.joints || []).forEach((j, n) => {
      if (j.method === 'one_piece') return;
      const lo = of(j.afterSegment), up = of(j.afterSegment + 1);
      if (!lo.length || !up.length) return;
      const lt = lo[lo.length - 1], ut = up[0], { along, left } = frame(ut);
      const p = right ? ut.corners[3] : ut.corners[0];
      const rail = v(p.x, p.y, p.z + rh), h = 2.5, w = 1.6;
      const a = sub(rail, mul(along, w)), b = add(rail, mul(along, w));
      push({
        key: `jointGap:${n}`, kind: 'jointGap', scope: 'context', segs: [j.afterSegment, j.afterSegment + 1], unit: 'len', value: num(j.gap), calc: null,
        lines: [[v(a.x, a.y, a.z - h), v(a.x, a.y, a.z + h)], [v(b.x, b.y, b.z - h), v(b.x, b.y, b.z + h)], [v(a.x, a.y, a.z + h), v(b.x, b.y, b.z + h)]],
        anchor: add(v(rail.x, rail.y, rail.z + 14), mul(right ? mul(left, -1) : left, 4)),
        // A faint leader down to the walking surface: the joint sits on the rail line above this edge.
        dashed: [[v(p.x, p.y, p.z + 0.5), v(rail.x, rail.y, rail.z - h)]],
        offsets: { v: num(j.offsetV), h: num(j.offsetH) },
      });
      const dir = (t: MeasuredTread, seg: MeasureData['segments'][number] | undefined) => {
        const f = frame(t);
        return seg?.kind === 'flight' && t.stepIdx !== null ? unit(add(mul(f.along, t.run), mul(UP, t.rise))) : f.along;
      };
      const d1 = dir(lt, data.segments[j.afterSegment]), d2 = dir(ut, data.segments[j.afterSegment + 1]);
      const knee = right ? ut.corners[3] : ut.corners[0];
      const arc = arcDim(add(knee, mul(right ? mul(left, -1) : left, 0.5)), d1, d2, 14);
      push({ key: `jointAngle:${n}`, kind: 'jointAngle', scope: 'context', segs: [j.afterSegment, j.afterSegment + 1], unit: 'deg', value: num(j.angleChange), calc: jointAngleCalc(data, j), lines: arc.lines, anchor: arc.anchor });
    });
  }

  // ---- Rail height: nosing line to top of rail, on the rail side, mid first flight.
  if (flights.length) {
    const ft = of(flights[0].i).filter(t => t.stepIdx !== null), t = ft[Math.floor((ft.length - 1) / 2)];
    if (t) {
      const right = /right/i.test(data.rail.side || '') && !/both/i.test(data.rail.side || '');
      const p = right ? t.corners[3] : t.corners[0], H = num(data.rail.height), { along } = frame(t);
      const dim = linearDim(p, v(p.x, p.y, p.z + (H ?? 36)), mul(along, -1), 5);
      push({ key: 'railHeight', kind: 'railHeight', scope: 'context', segs: [], unit: 'len', value: H, calc: null, lines: dim.lines, anchor: dim.anchor });
    }
  }

  // ---- Rail spans between two drawn posts: the fabrication length, along the rail line.
  if ((data.spans || []).some(s => s.start.postId && s.end.postId)) {
    const posts = new Map(drawingPosts(data, model).filter(p => p.top).map(p => [p.post.id, p.top!]));
    for (const s of data.spans || []) {
      const a = posts.get(s.start.postId), b = posts.get(s.end.postId);
      if (!a || !b || s.start.postId === s.end.postId) continue;
      const dim = linearDim(a, b, UP, 6);
      push({ key: `span:${s.id}`, kind: 'span', scope: 'context', postIds: [s.start.postId, s.end.postId], unit: 'len', value: num(s.topSpan), calc: null, lines: dim.lines, anchor: dim.anchor });
    }
  }
  return out;
}

/**
 * Rake: nose to nose along the pitch, drawn parallel to the nosing line and
 * just above it. Its length is the flight's rise and run in a right triangle —
 * the same number the rake check holds the tape against.
 */
function rakeDim(data: MeasureData, key: string, kind: DimKind, scope: SceneDim['scope'], ft: MeasuredTread[], value: number | null, calc: number | null, segs?: number[]): SceneDim {
  const steps = ft.filter(t => t.stepIdx !== null), f0 = steps[0] ?? ft[0], fl = steps[steps.length - 1] ?? ft[ft.length - 1];
  const b = v(f0.corners[0].x, f0.corners[0].y, f0.corners[0].z - f0.rise), T = fl.corners[1];
  const s = unit(sub(T, b)), n = unit(sub(UP, mul(s, dot(UP, s))));
  const cos = Math.sqrt(Math.max(0, 1 - s.z * s.z));
  const dim = linearDim(b, T, n, f0.rise * cos + 7);
  return { key, kind, scope, segs, slots: stairSlotsForKey(key), unit: 'len', value, calc, state: stateOf(value, calc), lines: dim.lines, anchor: dim.anchor };
}

const SEG_SLOT: Record<string, string> = {
  flightRake: 'rake', flightRise: 'ctrlRise', flightRun: 'ctrlRun', width: 'width', angle: 'angle',
  entryRise: 'entryRise', platLength: 'length', platDepth: 'depth', platDiag: 'diag',
};
/** The Next-card slot ids (measure-next.ts) a stair dimension answers. */
export function stairSlotsForKey(key: string): string[] {
  const whole: Record<string, string> = { f2f: 'overall.f2f', totalRun: 'overall.totalRun', rake: 'overall.rake', railHeight: 'rail.height' };
  if (whole[key]) return [whole[key]];
  const [kind, at] = key.split(':');
  if (kind in SEG_SLOT) return [`s${at}.${SEG_SLOT[kind]}`];
  if (kind === 'jointGap') return [`j${at}.gap`];
  if (kind === 'jointAngle') return [`j${at}.angle`];
  return [];
}

/**
 * Per-shape dimension adapters. Stairs first; a new work type adds one entry.
 * Shapes without an adapter simply draw no dimension lines.
 */
export const DIM_ADAPTERS: Partial<Record<MeasureShape, (data: MeasureData) => SceneDim[]>> = {
  straight: d => stairDims(d), stair_platform: d => stairDims(d), l_shape: d => stairDims(d),
  u_shape: d => stairDims(d), builder: d => stairDims(d),
  gate: d => gateDims(d),
  opening: d => openingDims(d),
  window_well: d => wellDims(d),
  canopy: d => canopyDims(d),
  structural: d => structuralDims(d), fire_escape: d => fireDims(d), spiral: d => spiralDims(d), wall_rail: d => wallRailDims(d), shop_piece: d => shopPieceDims(d),
};

/** The dimension lines for a sheet of this shape (none for a shape with no adapter yet). */
export function sceneDims(data: MeasureData, shape: MeasureShape | null | undefined): SceneDim[] {
  const adapter = shape ? DIM_ADAPTERS[shape] : DIM_ADAPTERS.straight;
  return adapter ? adapter(data) : [];
}

/** The dimension a Next-card slot lights, if any. */
export function dimForSlot(dims: readonly SceneDim[], slotId: string | null | undefined): SceneDim | null {
  return slotId ? dims.find(d => d.slots.includes(slotId)) ?? null : null;
}

/** Inches as the shop writes them; feet-and-inches once it is long enough to read that way. */
export function dimText(n: number, unitKind: 'len' | 'deg'): string {
  if (unitKind === 'deg') return `${(Math.round(n * 10) / 10).toFixed(1)}°`;
  const sixteenths = Math.round(n * 16);
  const fmt = (s: number) => {
    const whole = Math.floor(s / 16); let num = s % 16, den = 16;
    if (!num) return `${whole}"`;
    while (num % 2 === 0) { num /= 2; den /= 2; }
    return `${whole ? `${whole}-` : ''}${num}/${den}"`;
  };
  if (sixteenths >= 60 * 16) {
    const ft = Math.floor(sixteenths / 192);
    return `${ft}' ${fmt(sixteenths - ft * 192)}`;
  }
  return fmt(sixteenths);
}
