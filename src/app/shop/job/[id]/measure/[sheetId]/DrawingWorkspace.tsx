"use client";

import { useEffect, useRef, useState } from 'react';
import type { MeasureData } from '@/lib/shop/measure';
import { stairGeometry } from '@/lib/shop/measure-geometry';
import { mt } from '@/lib/shop/measure-i18n';

type View = 'side' | 'plan' | 'iso';

export default function DrawingWorkspace({ data, lang, focusSeg, onMeasureStep }: {
  data: MeasureData; lang: string; focusSeg?: number;
  onMeasureStep: (segIdx: number, stepIdx: number) => void;
}) {
  const [view, setView] = useState<View>('side');
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const expandButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!expanded) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const trigger = expandButton.current;
    trigger?.focus();
    const escape = (e: KeyboardEvent) => {
      // Let a measurement input's own overlay handle keyboard interactions.
      if (e.key === 'Escape' && !document.querySelector('[data-step-editor]')) setExpanded(false);
    };
    window.addEventListener('keydown', escape);
    return () => { document.body.style.overflow = before; window.removeEventListener('keydown', escape); trigger?.focus(); };
  }, [expanded]);
  const model = stairGeometry(data, focusSeg);
  if (!model) return null;
  const scale = 6;
  const project = (x: number, y: number, z: number): [number, number] => view === 'side' ? [x * scale, -z * scale]
    : view === 'plan' ? [x * scale, y * scale]
    : [(x * 0.866 + y * 0.866) * scale, (-x * 0.5 + y * 0.5 - z) * scale];
  const corners = model.treads.flatMap(t => [project(t.x, 0, t.z), project(t.x + t.run, 0, t.z), project(t.x, t.width, t.z), project(t.x + t.run, t.width, t.z), project(t.x, 0, t.z - t.rise)]);
  const minX = Math.min(...corners.map(p => p[0])) - 64, minY = Math.min(...corners.map(p => p[1])) - 64;
  const width = Math.max(...corners.map(p => p[0])) - minX + 64, height = Math.max(...corners.map(p => p[1])) - minY + 72;
  const points = (coords: [number, number][]) => coords.map(p => p.join(',')).join(' ');
  const labels: [View, string][] = [['side', 'sideView'], ['plan', 'planView'], ['iso', 'drawing3d']];
  return (
    <section aria-label={mt(lang, 'drawingWorkspace')} className={expanded
      ? 'fixed inset-0 z-40 flex flex-col bg-neutral-950 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] print:hidden'
      : 'mb-4 overflow-hidden rounded-2xl border border-neutral-700 bg-neutral-950 p-3 sm:p-4'}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div><h2 className="font-bold text-white">{mt(lang, 'drawingWorkspace')}</h2><p className="text-xs text-neutral-300">{mt(lang, 'tapStepToMeasure')}</p></div>
        <button ref={expandButton} type="button" aria-expanded={expanded} onClick={() => setExpanded(v => !v)} className="min-h-11 rounded-xl border border-neutral-600 px-3 text-sm font-semibold">{mt(lang, expanded ? 'drawingClose' : 'drawingExpand')}</button>
      </div>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {labels.map(([v, key]) => <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`min-h-11 rounded-xl border text-sm font-semibold ${view === v ? 'border-amber-400 bg-amber-400 text-black' : 'border-neutral-700 bg-neutral-900 text-neutral-200'}`}>{mt(lang, key)}</button>)}
      </div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={`text-xs ${model.provisional ? 'text-amber-200' : 'text-emerald-300'}`}>{mt(lang, model.provisional ? 'drawingProvisional' : 'drawingMeasured')}</span>
        <div className="flex shrink-0 items-center rounded-xl border border-neutral-700">
          <button type="button" aria-label={mt(lang, 'drawingZoomOut')} onClick={() => setZoom(z => Math.max(1, z - 0.5))} disabled={zoom === 1} className="h-11 w-11 text-xl disabled:opacity-30">−</button>
          <button type="button" aria-label={mt(lang, 'drawingReset')} onClick={() => setZoom(1)} className="h-11 min-w-12 text-xs">{Math.round(zoom * 100)}%</button>
          <button type="button" aria-label={mt(lang, 'drawingZoomIn')} onClick={() => setZoom(z => Math.min(4, z + 0.5))} disabled={zoom === 4} className="h-11 w-11 text-xl disabled:opacity-30">+</button>
        </div>
      </div>
      <div className={`overflow-auto overscroll-contain rounded-xl border border-neutral-800 bg-neutral-900 ${expanded ? 'min-h-0 flex-1' : 'max-h-[65dvh]'}`}>
        <svg role="group" aria-label={mt(lang, labels.find(([v]) => v === view)![1])} viewBox={`${minX} ${minY} ${width} ${height}`} style={{ width: `${zoom * 100}%`, minWidth: view === 'iso' && zoom === 1 ? 0 : Math.max(340, width) * zoom, height: view === 'iso' && zoom === 1 && expanded ? '100%' : 'auto', display: 'block' }}>
          <title>{mt(lang, 'drawingFieldOnly')}</title>
          {model.treads.map(t => {
            const a = project(t.x, 0, t.z), b = project(t.x + t.run, 0, t.z), c = project(t.x + t.run, t.width, t.z), d = project(t.x, t.width, t.z);
            const low = project(t.x, 0, t.z - t.rise), farLow = project(t.x, t.width, t.z - t.rise);
            const mid = view === 'side' ? [(a[0] + b[0]) / 2 + 7, a[1] + 22] : project(t.x + t.run / 2, t.width / 2, t.z);
            const action = t.stepIdx === null ? undefined : () => onMeasureStep(t.segIdx, t.stepIdx!);
            return <g key={`${t.segIdx}-${t.stepIdx}`}>
              {view !== 'side' && <polygon points={points([a, b, c, d])} fill={t.provisional ? '#292524' : '#25362f'} stroke={t.provisional ? '#fcd34d' : '#a7f3d0'} strokeWidth={1.5} strokeDasharray={t.provisional ? '5 4' : undefined} />}
              {view === 'iso' && t.rise > 0 && <polygon points={points([low, a, d, farLow])} fill="#404040" stroke="#a3a3a3" strokeWidth={1.2} />}
              {view === 'side' && <polyline points={points([low, a, b])} fill="none" stroke={t.provisional ? '#fcd34d' : '#e5e5e5'} strokeWidth={2.5} strokeDasharray={t.provisional ? '5 4' : undefined} />}
              <text x={(a[0] + b[0]) / 2} y={(a[1] + b[1]) / 2 - 10} textAnchor="middle" fontSize={12} fontWeight={600} fill="#fcd34d">{t.runLabel}</text>
              {view === 'side' && t.rise > 0 && <text x={a[0] + 13} y={(a[1] + low[1]) / 2} transform={`rotate(-90 ${a[0] + 13} ${(a[1] + low[1]) / 2})`} textAnchor="middle" fontSize={11} fill="#fcd34d">{t.riseLabel}</text>}
              {view !== 'side' && <text x={(a[0] + d[0]) / 2 - 8} y={(a[1] + d[1]) / 2} textAnchor="end" fontSize={11} fill="#d4d4d4">{t.widthLabel}</text>}
              <circle cx={mid[0]} cy={mid[1]} r={12} fill="#171717" stroke="#a3a3a3" />
              <text x={mid[0]} y={mid[1] + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff">{t.number ?? 'L'}</text>
              {action && <rect x={view === 'side' ? a[0] : mid[0] - 20} y={view === 'side' ? a[1] - 22 : mid[1] - 20} width={view === 'side' ? t.run * scale : 40} height={view === 'side' ? t.rise * scale + 44 : 40} fill="transparent" style={{ cursor: 'pointer' }} role="button" tabIndex={0} aria-label={`${mt(lang, 'step')} ${t.number}`} onClick={action} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); action(); } }} />}
            </g>;
          })}
        </svg>
      </div>
      <p className="mt-2 text-xs text-neutral-400">{mt(lang, 'drawingPanHint')}</p>
      <p className="mt-2 text-xs leading-relaxed text-neutral-300">{mt(lang, 'drawingFieldOnly')}{model.provisional && ` ${mt(lang, 'drawingMissingHint')}`}</p>
    </section>
  );
}
