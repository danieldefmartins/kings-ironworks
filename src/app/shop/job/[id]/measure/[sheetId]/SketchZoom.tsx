"use client";

import { mt } from '@/lib/shop/measure-i18n';

/** Keep the same, visible controls on every editable sketch. Zoom is view-only. */
export default function SketchZoom({ zoom, onChange, onFit, lang, light = false }: {
  zoom: number; onChange: (value: number) => void; onFit?: () => void; lang: string; light?: boolean;
}) {
  const fit = lang === 'pt' ? 'Ajustar' : lang === 'es' ? 'Ajustar' : 'Fit';
  return <div role="group" aria-label={lang === 'pt' ? "Ampliação" : lang === 'es' ? "Ampliación" : "Zoom"} className={`mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl border p-2 shadow-sm ${light ? 'border-indigo-200 bg-indigo-50 text-slate-900' : 'border-neutral-600 bg-neutral-800 text-white'}`}>
    <span className="px-1 text-sm font-bold">{lang === 'pt' ? "Ampliação" : lang === 'es' ? "Ampliación" : "Zoom"}</span>
    <div className="flex items-center gap-1">
      <button type="button" aria-label={mt(lang, 'drawingZoomOut')} disabled={zoom <= 1} onClick={() => onChange(Math.max(1, zoom - .5))} className="h-12 w-12 rounded-xl border border-slate-300 bg-white text-2xl font-bold text-slate-900 shadow-sm disabled:opacity-40">−</button>
      <output aria-live="polite" className="w-14 text-center text-base font-bold tabular-nums">{Math.round(zoom * 100)}%</output>
      <button type="button" aria-label={mt(lang, 'drawingZoomIn')} disabled={zoom >= 4} onClick={() => onChange(Math.min(4, zoom + .5))} className="h-12 w-12 rounded-xl bg-indigo-600 text-2xl font-bold text-white shadow-sm disabled:opacity-40">+</button>
      <button type="button" aria-label={`${fit} — ${mt(lang, 'drawingReset')}`} onClick={() => { onChange(1); onFit?.(); }} className={`ml-1 h-12 rounded-xl border px-3 text-sm font-bold ${light ? 'border-indigo-200 bg-white text-indigo-700' : 'border-neutral-500 bg-neutral-700 text-white'}`}>{fit}</button>
    </div>
  </div>;
}
