"use client";
import {useRef, useState, type PointerEvent as ReactPointerEvent} from 'react';
import type {MeasureData, PlatformSegment} from '@/lib/shop/measure';
import {formatIn, formatMeas} from '@/lib/shop/measure-parse';
import {
  effectiveAlign, effectiveFrom, offsetFor, platformLayout,
  type EdgePlacement, type PlatformAlign, type PlatformEdgeFrom, type PlatformEnd, type PlatformLayout,
} from '@/lib/shop/measure-platform-placement';
import {placementText, type PlacementText} from '@/lib/shop/measure-platform-placement-i18n';

type Set = (fn: (d: MeasureData) => void) => void;
type Rect = {x0: number; x1: number; y0: number; y1: number};
const STUB = 33; // inches of flight drawn beyond the platform edge
const snap = (n: number) => Math.round(n * 8) / 8;
/** Inches in the sheet's own notation, without the inch mark (what a person would type). */
const typed = (n: number) => formatIn(Math.max(0, n)).replace(/"$/, '');

function write(d: MeasureData, segIdx: number, end: PlatformEnd, patch: {align?: PlatformAlign; from?: PlatformEdgeFrom; offset?: string}) {
  const s = d.segments[segIdx] as PlatformSegment;
  if (!s || s.kind !== 'platform') return;
  if (end === 'entry') {
    if (patch.align) s.entryAlign = patch.align;
    if (patch.from) s.entryFrom = patch.from;
    if (patch.offset !== undefined) s.entryOffset = patch.offset;
  } else {
    if (patch.align) s.exitAlign = patch.align;
    if (patch.from) s.exitFrom = patch.from;
    if (patch.offset !== undefined) s.exitOffset = patch.offset;
  }
}

/** Plan geometry of one edge: t (from the edge's left end, walking up that flight) → plan point. */
function edgeFrame(seg: PlatformSegment, end: PlatformEnd, L: PlatformLayout) {
  const {run, across} = L;
  if (end === 'entry') return {at: (t: number) => ({x: 0, y: t}), t: (_x: number, y: number) => y, inward: {x: 1, y: 0}};
  if (seg.turn === 'left') return {at: (t: number) => ({x: t, y: 0}), t: (x: number) => x, inward: {x: 0, y: 1}};
  if (seg.turn === 'right') return {at: (t: number) => ({x: run - t, y: across}), t: (x: number) => run - x, inward: {x: 0, y: -1}};
  if (seg.turn === 'u') return {at: (t: number) => ({x: 0, y: across - t}), t: (_x: number, y: number) => across - y, inward: {x: 1, y: 0}};
  return {at: (t: number) => ({x: run, y: t}), t: (_x: number, y: number) => y, inward: {x: -1, y: 0}};
}

/** Flight footprint in plan + the direction it climbs. */
function footprint(seg: PlatformSegment, end: PlatformEnd, L: PlatformLayout, p: EdgePlacement): {rect: Rect; dir: {x: number; y: number}} {
  const {run, across} = L, s = p.start, w = p.width;
  if (end === 'entry') return {rect: {x0: -STUB, x1: 0, y0: s, y1: s + w}, dir: {x: 1, y: 0}};
  if (seg.turn === 'left') return {rect: {x0: s, x1: s + w, y0: -STUB, y1: 0}, dir: {x: 0, y: -1}};
  if (seg.turn === 'right') return {rect: {x0: run - s - w, x1: run - s, y0: across, y1: across + STUB}, dir: {x: 0, y: 1}};
  if (seg.turn === 'u') return {rect: {x0: -STUB, x1: 0, y0: across - s - w, y1: across - s}, dir: {x: -1, y: 0}};
  return {rect: {x0: run, x1: run + STUB, y0: s, y1: s + w}, dir: {x: 1, y: 0}};
}

function summary(t: PlacementText, p: EdgePlacement, units: 'in' | 'ftin') {
  if (!p.explicit) return `${p.align === 'left' ? t.flushLeft : p.align === 'right' ? t.flushRight : t.centered} · ${t.notSet}`;
  if (p.align === 'left') return t.flushLeft;
  if (p.align === 'right') return t.flushRight;
  if (p.align === 'center') return t.centered;
  const gap = p.from === 'left' ? p.start : p.edge - p.start - p.width;
  return (p.from === 'left' ? t.fromLeft : t.fromRight)(formatMeas(Math.max(0, gap), units));
}

function AlignIcon({align}: {align: PlatformAlign}) {
  const x = align === 'left' ? 3 : align === 'center' ? 8 : align === 'right' ? 13 : 6;
  return <svg aria-hidden viewBox="0 0 24 16" className="h-4 w-6 shrink-0">
    <rect x="1" y="1" width="22" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    <rect x={x} y="10" width="8" height="5" rx="1" fill="currentColor"/>
    {align === 'custom' && <path d="M1 13.5h4" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1.5 1.5"/>}
  </svg>;
}

function Segmented<T extends string>({options, value, onChange, label, attr}: {options: [T, string, React.ReactNode?][]; value: T; onChange: (v: T) => void; label: string; attr: string}) {
  return <div role="radiogroup" aria-label={label} className={`grid gap-1 rounded-xl bg-slate-100 p-1`} style={{gridTemplateColumns: `repeat(${options.length},minmax(0,1fr))`}}>
    {options.map(([v, text, icon]) => <button key={v} type="button" role="radio" aria-checked={value === v} {...{[attr]: v}}
      onClick={() => onChange(v)}
      className={`flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[13px] font-semibold transition-colors ${value === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}>
      {icon}<span className="max-w-full truncate">{text}</span>
    </button>)}
  </div>;
}

function EdgeControl({data, segIdx, end, p, set, t}: {data: MeasureData; segIdx: number; end: PlatformEnd; p: EdgePlacement; set: Set; t: PlacementText}) {
  const seg = data.segments[segIdx] as PlatformSegment;
  const units = data.units || 'in';
  const align = effectiveAlign(seg, end), from = effectiveFrom(seg, end);
  const raw = (end === 'entry' ? seg.entryOffset : seg.exitOffset) || '';
  const choose = (a: PlatformAlign) => set(d => {
    if (a !== 'custom') return write(d, segIdx, end, {align: a});
    // Keep the drawing where it is: the measured offset starts as the current gap.
    write(d, segIdx, end, {align: 'custom', from, offset: raw.trim() && align === 'custom' ? raw : typed(offsetFor(p.start, p.edge, p.width, from))});
  });
  const flip = (f: PlatformEdgeFrom) => set(d => write(d, segIdx, end, {from: f, offset: raw.trim() ? typed(offsetFor(p.start, p.edge, p.width, f)) : ''}));
  const usedOffset = formatMeas(Math.max(0, p.from === 'left' || p.align !== 'custom' ? p.start : p.edge - p.start - p.width), units);
  return <section data-placement-edge={end} className="space-y-2">
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
      <h4 className="text-[15px] font-semibold text-slate-900">{end === 'entry' ? t.stairsIn : t.stairsOut}</h4>
      <span data-placement-summary={end} className={`text-sm ${p.overhang > 0 ? 'font-semibold text-red-600' : 'text-slate-500'}`}>{summary(t, p, units)}</span>
    </div>
    <Segmented label={end === 'entry' ? t.stairsIn : t.stairsOut} attr="data-align" value={align} onChange={choose}
      options={(['left', 'center', 'right', 'custom'] as const).map(a => [a, t[a], <AlignIcon key={a} align={a}/>])}/>
    {align === 'custom' && <div className="grid items-end gap-2 sm:grid-cols-2">
      <Segmented label={t.from} attr="data-from" value={from} onChange={flip}
        options={[['left', t.leftEdge], ['right', t.rightEdge]]}/>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-600">{t.offset}</span>
        <input data-m="1" data-laser-unit="len" data-placement-offset={end} aria-label={`${end === 'entry' ? t.stairsIn : t.stairsOut} · ${t.offset}`}
          inputMode="decimal" autoComplete="off" maxLength={60} placeholder={t.offset} value={raw}
          onChange={e => {const v = e.target.value; set(d => write(d, segIdx, end, {align: 'custom', from, offset: v}));}}
          className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900"/>
      </label>
    </div>}
    {p.overhang > 0 && <p role="alert" data-placement-overhang={end} className="text-sm font-semibold text-red-600">
      {t.overhang(formatMeas(p.overhang, units), usedOffset, formatMeas(p.width, units), formatMeas(p.edge, units))}
    </p>}
  </section>;
}

function Diagram({data, segIdx, L, set, t}: {data: MeasureData; segIdx: number; L: PlatformLayout; set: Set; t: PlacementText}) {
  const seg = data.segments[segIdx] as PlatformSegment;
  const units = data.units || 'in';
  const svg = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{end: PlatformEnd; grab: number} | null>(null);
  const edges = (['entry', 'exit'] as const).flatMap(end => {
    const p = L[end];
    return p ? [{end, p, frame: edgeFrame(seg, end, L), foot: footprint(seg, end, L, p)}] : [];
  });
  // Plan → screen: walking up the incoming flight is "up" the screen.
  const rects: Rect[] = [{x0: 0, x1: L.run, y0: 0, y1: L.across}, ...edges.map(e => e.foot.rect)];
  const minX = Math.min(...rects.map(r => r.x0)), maxX = Math.max(...rects.map(r => r.x1));
  const minY = Math.min(...rects.map(r => r.y0)), maxY = Math.max(...rects.map(r => r.y1));
  const W = 320, pad = 34, padY = 20, k = Math.min((W - 2 * pad) / Math.max(1, maxY - minY), 260 / Math.max(1, maxX - minX));
  const H = (maxX - minX) * k + 2 * padY;
  const sx = (y: number) => pad + (y - minY) * k + (W - 2 * pad - (maxY - minY) * k) / 2;
  const sy = (x: number) => padY + (maxX - x) * k;
  const toPlan = (e: ReactPointerEvent) => {
    const el = svg.current, m = el?.getScreenCTM();
    if (!el || !m) return null;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    const offsetX = (W - 2 * pad - (maxY - minY) * k) / 2;
    return {y: (pt.x - pad - offsetX) / k + minY, x: maxX - (pt.y - padY) / k};
  };
  const move = (e: ReactPointerEvent) => {
    if (!drag) return;
    const at = toPlan(e), edge = edges.find(x => x.end === drag.end);
    if (!at || !edge) return;
    const {p} = edge, lo = Math.min(0, p.edge - p.width), hi = Math.max(0, p.edge - p.width);
    const start = Math.min(hi, Math.max(lo, snap(edge.frame.t(at.x, at.y) - drag.grab)));
    const from = effectiveFrom(seg, drag.end);
    set(d => write(d, segIdx, drag.end, {align: 'custom', from, offset: typed(offsetFor(start, p.edge, p.width, from))}));
  };
  const fg = 'var(--shop-fg, #0f172a)', muted = 'var(--shop-secondary, #64748b)';
  const accent = '#4f46e5', bad = '#dc2626';
  const poly = (r: Rect) => `${sx(r.y0)},${sy(r.x0)} ${sx(r.y1)},${sy(r.x0)} ${sx(r.y1)},${sy(r.x1)} ${sx(r.y0)},${sy(r.x1)}`;
  return <svg ref={svg} role="img" aria-label={t.diagram} viewBox={`0 0 ${W} ${H}`} className="block w-full select-none" style={{maxHeight: 340}}
    onPointerMove={move} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}>
    <title>{t.diagram}</title>
    <polygon points={poly(rects[0])} fill="var(--shop-inset, #f1f5f9)" stroke={fg} strokeWidth={1.5} strokeDasharray={L.runKnown && L.acrossKnown ? undefined : '5 4'}/>
    <text x={sx(L.across / 2)} y={sy(L.run / 2) + 4} textAnchor="middle" fontSize={11} fontWeight={600} fill={muted} letterSpacing=".06em">{t.platform.toUpperCase()}</text>
    {edges.map(({end, p, foot, frame}) => {
      const r = foot.rect, red = p.overhang > 0, active = drag?.end === end;
      const stroke = red ? bad : accent;
      const treads: number[] = [];
      const along = foot.dir.x !== 0 ? [r.x0, r.x1] : [r.y0, r.y1];
      for (let v = along[0] + 11; v < along[1] - 1; v += 11) treads.push(v);
      // Dimension along the edge, from the measured-from end to the flight.
      const gapFromLeft = p.from === 'left' || p.align !== 'custom';
      const [t0, t1] = gapFromLeft ? [0, p.start] : [p.start + p.width, p.edge];
      // The dimension sits outside the edge, in the gap it measures (never on the
      // flight); a return shares the entry edge, so its dimension goes inside.
      const inset = (seg.turn === 'u' && end === 'exit' ? 16 : -14) / k;
      const label = formatMeas(Math.max(0, t1 - t0), units);
      const pillW = label.length * 7 + 14;
      const a = frame.at(t0), b = frame.at(t1);
      const off = (q: {x: number; y: number}) => ({x: q.x + frame.inward.x * inset, y: q.y + frame.inward.y * inset});
      const A = off(a), B = off(b);
      // A gap too short for its pill: the pill moves past the edge end, away from the flight.
      const room = (t1 - t0) * k > pillW + 6;
      const pillAt = room ? (t0 + t1) / 2 : gapFromLeft ? t0 - (pillW / 2 + 4) / k : t1 + (pillW / 2 + 4) / k;
      const mid = off(frame.at(pillAt));
      const cx = (r.y0 + r.y1) / 2, cxx = (r.x0 + r.x1) / 2;
      const arrow = foot.dir;
      const tip = {x: cxx + arrow.x * 10, y: cx + arrow.y * 10}, tail = {x: cxx - arrow.x * 10, y: cx - arrow.y * 10};
      return <g key={end} data-placement-flight={end}>
        <polygon points={poly(r)} fill={red ? '#fee2e2' : '#e0e7ff'} fillOpacity={.85} stroke={stroke} strokeWidth={active ? 2.5 : 1.5}
          style={{cursor: 'grab', touchAction: 'none'}}
          onPointerDown={e => {const at = toPlan(e); if (!at) return; (e.target as Element).setPointerCapture?.(e.pointerId); setDrag({end, grab: frame.t(at.x, at.y) - p.start});}}>
          <title>{t.drag}</title>
        </polygon>
        {treads.map(v => foot.dir.x !== 0
          ? <line key={v} x1={sx(r.y0)} x2={sx(r.y1)} y1={sy(v)} y2={sy(v)} stroke={stroke} strokeOpacity={.35} pointerEvents="none"/>
          : <line key={v} x1={sx(v)} x2={sx(v)} y1={sy(r.x0)} y2={sy(r.x1)} stroke={stroke} strokeOpacity={.35} pointerEvents="none"/>)}
        <line x1={sx(tail.y)} y1={sy(tail.x)} x2={sx(tip.y)} y2={sy(tip.x)} stroke={stroke} strokeWidth={2} markerEnd={`url(#pp-arrow-${end})`} pointerEvents="none"/>
        <defs><marker id={`pp-arrow-${end}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill={stroke}/></marker></defs>
        {(t1 - t0 > .01 || active) && <line x1={sx(A.y)} y1={sy(A.x)} x2={sx(B.y)} y2={sy(B.x)} stroke={red ? bad : fg} strokeWidth={1.2} markerStart="url(#pp-tick)" markerEnd="url(#pp-tick)" pointerEvents="none"/>}
        {(t1 - t0 > 1 / 32 || active) && <g data-placement-pill={end} pointerEvents="none">
          <rect x={sx(mid.y) - pillW / 2} y={sy(mid.x) - 10} width={pillW} height={20} rx={10} fill={red ? bad : active ? accent : fg}/>
          <text x={sx(mid.y)} y={sy(mid.x) + 4} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--shop-card, #fff)">{label}</text>
        </g>}
      </g>;
    })}
    <defs><marker id="pp-tick" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M5 0V10" stroke={fg} strokeWidth="2"/></marker></defs>
  </svg>;
}

/**
 * Where the stairs meet each platform edge — the measured offset from a named
 * edge, as seen walking up the stairs. Typed values are the source of truth;
 * the top-view drag writes the same field in 1/8" steps.
 */
export default function PlatformPlacement({data, segIdx, set, lang}: {data: MeasureData; segIdx: number; set: Set; lang: string}) {
  const t = placementText(lang);
  const L = platformLayout(data, segIdx);
  if (!L || (!L.entry && !L.exit)) return null;
  return <div data-platform-placement={segIdx} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
    <h3 className="text-base font-semibold text-slate-900">{t.title}</h3>
    <Diagram data={data} segIdx={segIdx} L={L} set={set} t={t}/>
    {L.entry && <EdgeControl data={data} segIdx={segIdx} end="entry" p={L.entry} set={set} t={t}/>}
    {L.exit && <EdgeControl data={data} segIdx={segIdx} end="exit" p={L.exit} set={set} t={t}/>}
    {L.overlap && <p role="alert" data-placement-overlap className="text-sm font-semibold text-red-600">{t.overlap}</p>}
  </div>;
}
