// The deck in plan — one reading shared by the 3D, the dimension lines and the
// post suggestion, so a post, a dimension and the deck edge it belongs to all
// sit in the same place.
//
// Sides are chained in plan (each turning at its end by the measured angle,
// + = left); the closing edge of an open outline is the house. The plan is
// turned so the house sits at the back (+Y). Stops at the first side without a
// length (`complete` false).
import type { DeckSide, MeasureData } from "./measure";
import { parseMeas } from "./measure-parse";
import { siteNumber } from "./measure-site";

export type XY = { x: number; y: number };
export interface DeckEdge {
  side: DeckSide | null;
  /** Index into deck.sides (or sides.length for the house closing edge). */
  index: number;
  a: XY;
  b: XY;
}
export interface DeckPlan {
  edges: DeckEdge[];
  plan: XY[];
  /** Every side has a length. */
  complete: boolean;
  closed: boolean;
  ccw: boolean;
  /** Deck surface elevation (highest side height above grade, 0 when none). */
  top: number;
  /** Height above grade per side index (null when not measured). */
  heights: (number | null)[];
  /** Turn applied at the end of each used side, degrees (+ left). */
  turns: number[];
  /** Closing gap of a closed outline, inches. */
  closeGap: number;
}

const len = (s: string | undefined | null) => {
  const n = parseMeas(s ?? "");
  return n !== null && Number.isFinite(n) && n > 0 ? n : null;
};
const signed = (s: string | undefined | null) => {
  const t = (s ?? "").trim().replace(/[−–]/g, "-");
  return t ? siteNumber(t) : null;
};

export function outwardOf(plan: Pick<DeckPlan, "ccw">, e: Pick<DeckEdge, "a" | "b">): XY {
  const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y, l = Math.hypot(dx, dy) || 1;
  return plan.ccw ? { x: dy / l, y: -dx / l } : { x: -dy / l, y: dx / l };
}

export function deckPlan(data: MeasureData): DeckPlan | null {
  const d = data.deck;
  if (!d) return null;
  const pts: XY[] = [{ x: 0, y: 0 }], used: DeckSide[] = [], turns: number[] = [];
  let heading = 0;
  for (const sd of d.sides) {
    const L = len(sd.length);
    if (L === null) break;
    const last = pts[pts.length - 1];
    pts.push({ x: last.x + Math.cos(heading) * L, y: last.y + Math.sin(heading) * L });
    used.push(sd);
    const t = signed(sd.turnDeg) ?? 0;
    turns.push(t);
    heading += (t * Math.PI) / 180;
  }
  if (!used.length) return null;
  const complete = used.length === d.sides.length;
  const closeGap = Math.hypot(pts[pts.length - 1].x - pts[0].x, pts[pts.length - 1].y - pts[0].y);
  const closed = d.closedLoop && complete && closeGap <= 1;
  if (closed) pts.pop();
  const edges: DeckEdge[] = used.map((side, i) => ({ side, a: pts[i], b: pts[(i + 1) % pts.length], index: i }));
  if (!closed && pts.length > 2) edges.push({ side: null, a: pts[pts.length - 1], b: pts[0], index: edges.length });
  let area = 0;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; area += a.x * b.y - b.x * a.y; }
  const ccw = area >= 0;
  // Turn the plan so the house (unrailed edges) faces +Y.
  const house = edges.filter((e) => !e.side || !e.side.railed);
  let rot = 0;
  if (house.length) {
    const n = house.reduce((s, e) => {
      const o = outwardOf({ ccw }, e), l = Math.hypot(e.b.x - e.a.x, e.b.y - e.a.y);
      return { x: s.x + o.x * l, y: s.y + o.y * l };
    }, { x: 0, y: 0 });
    if (Math.hypot(n.x, n.y) > 1e-6) rot = Math.PI / 2 - Math.atan2(n.y, n.x);
  }
  const c = Math.cos(rot), s = Math.sin(rot), R = (p: XY) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c });
  for (const e of edges) { e.a = R(e.a); e.b = R(e.b); }
  const heights = d.sides.map((sd) => len(sd.heightAboveGrade));
  const known = heights.slice(0, used.length).filter((h): h is number => h !== null);
  return {
    edges, plan: pts.map(R), complete, closed, ccw, top: known.length ? Math.max(...known) : 0,
    heights, turns, closeGap,
  };
}
