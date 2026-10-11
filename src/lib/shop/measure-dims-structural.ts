import type { MeasureData } from './measure';
import type { Point3 } from './measure-geometry';
import { parseMeas, formatIn } from './measure-parse';
import { linearDim, type SceneDim, type DimState } from './measure-dims';
import { heightReadings, isSpanning, isVertical, memberCut, memberQty, memberWeight, spanReadings, type StructMember, type StructuralData } from './measure-structural';
import { steelSection } from './scene-shapes/steel-sections';
import type { CalcResult } from './measure-calc-struct';

/**
 * Structural steel: dimension lines on the same 3D the member list draws
 * (scene-shapes/scene-structural.ts — same rows, same origin, viewed from −y).
 *
 *   moment frame   column c/c over the beam, the clear opening under the slab,
 *                  each column's height at its own side, both diagonals of the
 *                  opening (dashed), the frame beam's cut length
 *   beam / lintel  clear span at the top and at the bottom, bearing at each end,
 *                  the wall each end sits in, the cut length
 *   ledger / brace its two length readings
 *   column / post  every height reading, one per piece
 *
 * Approve: the cut length (span + bearings, c/c + column depth, height − plates
 * − shim) with its weight; diagonal B against diagonal A (a square opening has
 * equal diagonals).
 */
const P = (x: number, y: number, z: number): Point3 => ({ x, y, z });
const UP = P(0, 0, 1), DOWN = P(0, 0, -1), LEFT = P(-1, 0, 0), RIGHT = P(1, 0, 0), FRONT = P(0, -1, 0);
const ROW = 72;
const num = (s: string | undefined | null, zero = false) => {
  const n = parseMeas(s ?? '');
  return n !== null && Number.isFinite(n) && (zero ? n >= 0 : n > 0) && (s ?? '').trim() !== '' ? n : null;
};
const state = (v: number | null, c: number | null): DimState => (v !== null ? 'measured' : c !== null ? 'calculated' : 'unknown');

type Push = (d: Omit<SceneDim, 'state' | 'lines' | 'anchor'> & { a: Point3; b: Point3; n: Point3; off: number }) => void;

function cutDim(push: Push, s: StructuralData, m: StructMember, a: Point3, b: Point3, off: number, n: Point3 = UP) {
  push({ key: `st:cut:${m.id}`, kind: 'stCut', slots: [`st.${m.id}.cut`], scope: 'context', unit: 'len', value: num(m.cutLen), calc: memberCut(m, s).length, a, b, n, off });
}

/** Every dimension line the structural sketch can carry. */
export function structuralDims(data: MeasureData): SceneDim[] {
  const s = data.structural, out: SceneDim[] = [];
  if (!s || !s.members.length) return out;
  const push: Push = ({ a, b, n, off, ...d }) => {
    const dim = linearDim(a, b, n, off);
    out.push({ ...d, state: state(d.value, d.calc), lines: dim.lines, anchor: dim.anchor });
  };
  const used = new Set<string>();
  let row = 0;
  const frameBeam = s.frame.on ? s.members.find(m => m.role === 'beam') : undefined;
  const frameCols = s.frame.on ? s.members.filter(m => m.role === 'column' || m.role === 'post') : [];
  if (s.frame.on && frameBeam && frameCols.length) {
    // The same two column positions the scene stands up.
    const cols: { m: StructMember; h: number | null; slots: string[] }[] = [];
    for (const m of frameCols) {
      const hs = heightReadings(m), n = Math.min(memberQty(m), 2 - cols.length);
      for (let i = 0; i < n; i++) {
        const single = n > 1 && frameCols.length === 1;
        const reading = single ? m.heights.filter(r => num(r.value) !== null)[Math.min(i, hs.length - 1)] ?? m.heights[i] : undefined;
        cols.push({
          m, h: hs.length ? (single ? hs[Math.min(i, hs.length - 1)] : Math.min(...hs)) : null,
          slots: single ? (reading ? [`st.${m.id}.h.${reading.id}`] : []) : m.heights.map(r => `st.${m.id}.h.${r.id}`),
        });
      }
      used.add(m.id);
      if (cols.length >= 2) break;
    }
    while (cols.length < 2) cols.push({ ...cols[0], slots: [] });
    const cc = num(s.frame.cc), ccv = cc ?? 120;
    const underside = Math.max(...cols.map(c => c.h ?? 96));
    const bases = cols.map(c => underside - (c.h ?? 96)), xs = [0, ccv];
    const bd = steelSection(frameBeam.profile)?.depth ?? 8;
    used.add(frameBeam.id);
    cols.forEach((c, i) => {
      if (!c.slots.length) return;
      push({ key: `st:h:${c.m.id}:${i}`, kind: 'stHeight', slots: c.slots, scope: 'overall', unit: 'len', value: c.h, calc: null,
        a: P(xs[i], 0, bases[i]), b: P(xs[i], 0, underside), n: i === 0 ? LEFT : RIGHT, off: 16 });
    });
    push({ key: 'st:frame:cc', kind: 'stCc', slots: ['st.frame.cc'], scope: 'overall', unit: 'len', value: cc, calc: null,
      a: P(0, 0, underside + bd), b: P(ccv, 0, underside + bd), n: UP, off: 12 });
    const cut = memberCut(frameBeam, s).length, beamLen = cut ?? ccv + (steelSection(cols[0].m.profile)?.depth ?? 6), x0 = ccv / 2 - beamLen / 2;
    cutDim(push, s, frameBeam, P(x0, 0, underside + bd), P(x0 + beamLen, 0, underside + bd), 26);
    const open = num(s.frame.opening), half = (open ?? ccv + 24) / 2, c = ccv / 2, floor = Math.min(...bases) - 4;
    push({ key: 'st:frame:opening', kind: 'stOpening', slots: ['st.frame.opening'], scope: 'overall', unit: 'len', value: open, calc: null,
      a: P(c - half, 0, floor), b: P(c + half, 0, floor), n: DOWN, off: 12 });
    // The opening's diagonals, corner to corner under the beam: a square opening reads them equal.
    const A = num(s.frame.diagA), B = num(s.frame.diagB);
    const diag = (key: 'diagA' | 'diagB', p: Point3, q: Point3, value: number | null, calc: number | null) => {
      const lift = (r: Point3) => P(r.x, r.y - 1, r.z);
      out.push({ key: `st:frame:${key}`, kind: key === 'diagA' ? 'diagA' : 'diagB', slots: [`st.frame.${key}`], scope: 'context', unit: 'len', value, calc,
        state: state(value, calc), lines: [], dashed: [[lift(p), lift(q)]], anchor: P((p.x + q.x) / 2, -1, (p.z + q.z) / 2 + (key === 'diagA' ? 6 : -6)) });
    };
    // A ↘ from the top left, B ↙ from the top right, as the Next card names them.
    diag('diagA', P(c - half, 0, underside), P(c + half, 0, floor + 4), A, null);
    diag('diagB', P(c + half, 0, underside), P(c - half, 0, floor + 4), B, A);
    row = 1;
  }
  const verticals = s.members.filter(m => isVertical(m.role) && !used.has(m.id));
  const tallest = verticals.flatMap(m => heightReadings(m));
  const restOn = tallest.length ? Math.max(...tallest) : null;
  for (const m of s.members) {
    if (used.has(m.id)) continue;
    const y = row * ROW;
    row++;
    const sec = steelSection(m.profile);
    if (isSpanning(m.role)) {
      const spans = spanReadings(m), S = spans.length ? Math.max(...spans) : 120, depth = sec?.depth ?? 8;
      const bl = num(m.bearingL.length, true), br = num(m.bearingR.length, true);
      const L = bl ?? (m.role === 'lintel' ? 4 : 8), R = br ?? (m.role === 'lintel' ? 4 : 8);
      const elev = num(m.elevation, true), rest = restOn === null ? null : restOn + depth;
      const top = m.role === 'lintel' ? elev ?? rest ?? 84 + depth : m.role === 'ledger' ? elev ?? rest ?? 96 : m.role === 'brace' ? elev ?? rest ?? 60 : elev ?? rest ?? 96 + depth;
      const zb = top - depth;
      const word = m.role === 'beam' || m.role === 'lintel' ? 'stSpan' : 'stLength';
      push({ key: `st:spanA:${m.id}`, kind: word, slots: [`st.${m.id}.spanA`], scope: 'overall', unit: 'len', value: num(m.spanA), calc: null, a: P(0, y, top), b: P(S, y, top), n: UP, off: 10 });
      push({ key: `st:spanB:${m.id}`, kind: word, slots: [`st.${m.id}.spanB`], scope: 'context', unit: 'len', value: num(m.spanB), calc: null, a: P(0, y, zb), b: P(S, y, zb), n: DOWN, off: 10 });
      if (m.role === 'beam' || m.role === 'lintel') {
        push({ key: `st:bearingL:${m.id}`, kind: 'stBearing', slots: [`st.${m.id}.bearingL.length`], scope: 'context', unit: 'len', value: bl, calc: null, a: P(-L, y, top), b: P(0, y, top), n: UP, off: 20 });
        push({ key: `st:bearingR:${m.id}`, kind: 'stBearing', slots: [`st.${m.id}.bearingR.length`], scope: 'context', unit: 'len', value: br, calc: null, a: P(S, y, top), b: P(S + R, y, top), n: UP, off: 20 });
        const wl = num(m.bearingL.wall), wr = num(m.bearingR.wall);
        if (m.role === 'beam') {
          // Pocketed walls either side: thickness along the beam, under the pocket.
          const WL = wl ?? Math.max(8, L + 4), WR = wr ?? Math.max(8, R + 4);
          push({ key: `st:wallL:${m.id}`, kind: 'stWall', slots: [`st.${m.id}.bearingL.wall`], scope: 'context', unit: 'len', value: wl, calc: null, a: P(-WL, y, 0), b: P(0, y, 0), n: DOWN, off: 8 });
          push({ key: `st:wallR:${m.id}`, kind: 'stWall', slots: [`st.${m.id}.bearingR.wall`], scope: 'context', unit: 'len', value: wr, calc: null, a: P(S, y, 0), b: P(S + WR, y, 0), n: DOWN, off: 8 });
        } else {
          // A lintel sits in its wall: the thickness runs front to back.
          const W = Math.max(wl ?? Math.max(8, L + 4), wr ?? Math.max(8, R + 4)), head = top + 30;
          push({ key: `st:wallL:${m.id}`, kind: 'stWall', slots: [`st.${m.id}.bearingL.wall`], scope: 'context', unit: 'len', value: wl, calc: null, a: P(-L - 24, y, head), b: P(-L - 24, y + W, head), n: UP, off: 8 });
          push({ key: `st:wallR:${m.id}`, kind: 'stWall', slots: [`st.${m.id}.bearingR.wall`], scope: 'context', unit: 'len', value: wr, calc: null, a: P(S + R + 24, y, head), b: P(S + R + 24, y + W, head), n: UP, off: 8 });
        }
        cutDim(push, s, m, P(-L, y, top), P(S + R, y, top), 32);
      } else cutDim(push, s, m, P(0, y, top), P(S, y, top), 22);
      continue;
    }
    // Columns / posts / covers: a height line per reading, on the piece it was read at.
    const hs = heightReadings(m), n = Math.min(memberQty(m), 6), pitch = Math.max(36, (sec?.width ?? 4) + 30);
    const underside = restOn ?? (hs.length ? Math.max(...hs) : 96);
    m.heights.forEach((r, k) => {
      const piece = Math.min(k, n - 1), h = num(r.value), x = piece * pitch;
      const side = k % 2 === 0 ? LEFT : RIGHT;
      push({ key: `st:h:${m.id}:${r.id}`, kind: 'stHeight', slots: [`st.${m.id}.h.${r.id}`], scope: k === 0 ? 'overall' : 'context', unit: 'len', value: h, calc: null,
        a: P(x, y, underside - (h ?? (hs.length ? Math.min(...hs) : 96))), b: P(x, y, underside), n: side, off: 12 + 8 * Math.floor(k / 2) });
    });
    const base = underside - (hs.length ? Math.min(...hs) : 96);
    // The cut stands in front of the first piece, not over it.
    cutDim(push, s, m, P(0, y, base), P(0, y, underside), 14, FRONT);
  }
  return out;
}

const fmtLb = (n: number) => `${Math.round(n).toLocaleString('en-US')} lb`;

/** Cut length (with its weight) and the opening's diagonal B from A. */
export function structuralSlotCalc(slotId: string, data: MeasureData): CalcResult | null {
  const s = data.structural;
  if (!s) return null;
  const cut = slotId.match(/^st\.(.+)\.cut$/);
  if (cut) {
    const m = s.members.find(x => x.id === cut[1]);
    if (!m) return null;
    const c = memberCut(m, s), w = memberWeight(m, s);
    const terms = c.parts.map((p, i) => `${i === 0 ? '' : p.sign > 0 ? '+ ' : '− '}${formatIn(p.value)}`).join(' ');
    return { calc: c.length, note: c.length === null ? undefined : [terms, w.each !== null ? `${w.approx ? '≈ ' : ''}${fmtLb(w.each)}${memberQty(m) > 1 ? ` ×${memberQty(m)}` : ''}` : ''].filter(Boolean).join(' · ') };
  }
  if (slotId === 'st.frame.diagB') return { calc: num(s.frame.diagA), note: '= A' };
  return null;
}

/** Cut-length slot: asked once the steel's cut can be worked out. */
export function structuralCutReady(data: MeasureData, id: string): boolean {
  const s = data.structural, m = s?.members.find(x => x.id === id);
  return !!m && memberCut(m, s).length !== null;
}
