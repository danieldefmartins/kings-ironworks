import type {MeasureData, PlatformSegment} from './measure';
import {parseMeas} from './measure-parse';

/**
 * Where a flight meets a platform, measured along ONE platform edge.
 *
 * Daniel, on a real stair: "each platform is different and needs to be
 * adjusted, like 3' offset from the stairs". So every platform edge a flight
 * touches carries its own placement: flush left, centered, flush right, or a
 * taped offset from a named edge.
 *
 * Left/right is always as seen WALKING UP that flight — the incoming flight
 * for the entry edge, the next flight for the exit edge.
 *
 * Migration: sheets saved before `entryAlign`/`exitAlign` existed carry only
 * `entryOffset`/`exitOffset`. A non-blank legacy offset is read exactly as it
 * always was (custom, from its historic edge), so explicit measurements never
 * move. A blank one now means centered — the owner's call: right/left-aligned
 * by accident was wrong. 180° returns keep their flush outer-edge default,
 * because a centered return would sit on top of the incoming flight.
 */
export type PlatformAlign = 'left' | 'center' | 'right' | 'custom';
export type PlatformEdgeFrom = 'left' | 'right';
export type PlatformEnd = 'entry' | 'exit';

export interface EdgePlacement {
  /** Left edge of the flight, measured from the edge's left end (as seen walking up the flight). */
  start: number;
  /** Edge length the flight sits on. */
  edge: number;
  width: number;
  align: Exclude<PlatformAlign, 'custom'> | 'custom';
  from: PlatformEdgeFrom;
  /** False when nothing was chosen or measured and the edge is wider than the flight. */
  known: boolean;
  /** Inches the flight hangs past the platform (0 when it fits). */
  overhang: number;
  /** True when the user chose or measured the placement (not a blank default). */
  explicit: boolean;
}

const EPS = 1 / 64;
const num = (s: string | undefined) => {
  const n = parseMeas(s);
  return n !== null && Number.isFinite(n) && n >= 0 ? n : null;
};
const positive = (s: string | undefined) => {
  const n = parseMeas(s);
  return n !== null && Number.isFinite(n) && n > 0 ? n : null;
};

/** The edge a legacy offset was always measured from. Only a left U-return differs. */
export function legacyFrom(seg: Pick<PlatformSegment, 'turn' | 'uDirection'>, end: PlatformEnd): PlatformEdgeFrom {
  return end === 'exit' && seg.turn === 'u' && seg.uDirection === 'left' ? 'right' : 'left';
}

/** What a blank placement means for this edge. */
export function defaultAlign(seg: Pick<PlatformSegment, 'turn' | 'uDirection'>, _end: PlatformEnd): Exclude<PlatformAlign, 'custom'> {
  if (seg.turn !== 'u') return 'center';
  // A right return comes down the right-hand side: the incoming flight hugs the
  // left edge, the return hugs its own left (the right edge looking up).
  // A left return mirrors it.
  return seg.uDirection === 'left' ? 'right' : 'left';
}

export function placementFields(seg: PlatformSegment, end: PlatformEnd) {
  return end === 'entry'
    ? {align: seg.entryAlign, from: seg.entryFrom, offset: seg.entryOffset}
    : {align: seg.exitAlign, from: seg.exitFrom, offset: seg.exitOffset};
}

/** Effective mode shown in the picker: legacy non-blank offsets read as custom. */
export function effectiveAlign(seg: PlatformSegment, end: PlatformEnd): PlatformAlign {
  const f = placementFields(seg, end);
  if (f.align) return f.align;
  return f.offset?.trim() ? 'custom' : defaultAlign(seg, end);
}

export function effectiveFrom(seg: PlatformSegment, end: PlatformEnd): PlatformEdgeFrom {
  return placementFields(seg, end).from ?? legacyFrom(seg, end);
}

/** Pure placement of a flight of `width` on an edge of `edge` inches. */
export function placeOnEdge(seg: PlatformSegment, end: PlatformEnd, edge: number, width: number): EdgePlacement {
  const f = placementFields(seg, end);
  const from = effectiveFrom(seg, end);
  const offset = num(f.offset);
  const flush = (a: Exclude<PlatformAlign, 'custom'>) => a === 'left' ? 0 : a === 'right' ? edge - width : (edge - width) / 2;
  let start: number, align: EdgePlacement['align'], known: boolean, explicit: boolean;
  if (f.align && f.align !== 'custom') {
    start = flush(f.align); align = f.align; known = true; explicit = true;
  } else if (offset !== null) {
    start = from === 'left' ? offset : edge - offset - width; align = 'custom'; known = true; explicit = true;
  } else {
    align = defaultAlign(seg, end); start = flush(align); explicit = false;
    // An edge exactly as wide as the flight leaves nothing to measure.
    known = Math.abs(edge - width) <= EPS;
  }
  const overhang = Math.max(0, -start, start + width - edge);
  return {start, edge, width, align, from, known, overhang: overhang > EPS ? overhang : 0, explicit};
}

/** The offset to type for a given flight left-edge position (for drag + flush → custom). */
export function offsetFor(start: number, edge: number, width: number, from: PlatformEdgeFrom) {
  const raw = from === 'left' ? start : edge - start - width;
  return Math.round(raw * 8) / 8;
}

const widthOf = (data: MeasureData, index: number) => {
  const s = data.segments[index];
  return s && 'width' in s ? positive(s.width) ?? 36 : 36;
};

export interface PlatformLayout {
  /** Platform size in plan: run = along incoming travel, across = side to side. */
  run: number; across: number;
  runKnown: boolean; acrossKnown: boolean;
  entry: EdgePlacement | null;
  exit: EdgePlacement | null;
  incomingWidth: number; outgoingWidth: number;
  /** Incoming and returning flights collide on a U landing. */
  overlap: boolean;
}

/** Everything the geometry, checks and the placement editor need for one platform. */
export function platformLayout(data: MeasureData, segIdx: number): PlatformLayout | null {
  const seg = data.segments[segIdx];
  if (!seg || seg.kind !== 'platform') return null;
  const incomingWidth = widthOf(data, segIdx - 1), outgoingWidth = widthOf(data, segIdx + 1);
  const runV = positive(seg.length), acrossV = positive(seg.depth);
  const run = runV ?? 36;
  const across = acrossV ?? (seg.turn === 'u' ? incomingWidth + outgoingWidth : Math.max(incomingWidth, outgoingWidth));
  const prev = data.segments[segIdx - 1], next = data.segments[segIdx + 1];
  const entry = segIdx > 0 && prev ? placeOnEdge(seg, 'entry', across, incomingWidth) : null;
  const exitEdge = seg.turn === 'left' || seg.turn === 'right' ? run : across;
  const exit = next && !(next.kind === 'flight' && next.branch) ? placeOnEdge(seg, 'exit', exitEdge, outgoingWidth) : null;
  let overlap = false;
  if (seg.turn === 'u' && entry && exit) {
    // Exit edge is the entry edge seen from the other side: left ends swap.
    const outMin = across - exit.start - outgoingWidth, outMax = across - exit.start;
    overlap = Math.min(entry.start + incomingWidth, outMax) - Math.max(entry.start, outMin) > .001;
  }
  return {run, across, runKnown: runV !== null, acrossKnown: acrossV !== null, entry, exit, incomingWidth, outgoingWidth, overlap};
}
