"use client";
import type { MeasureData } from '@/lib/shop/measure';
import { measurementProgress } from '@/lib/shop/measure-progress';
import { mt } from '@/lib/shop/measure-i18n';
import type { EditorStage } from './fields';

export default function MeasurementProgress({ data, lang, stage }: { data: MeasureData; lang: string; stage: EditorStage }) {
  const p = measurementProgress(data);
  return <div className="mb-3 rounded-xl border border-emerald-800/60 bg-emerald-950/20 p-3">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <span className="text-sm font-semibold text-emerald-200">{mt(lang, 'progressTitle')}</span>
      {p.total > 0 && <span className="text-sm tabular-nums text-neutral-200">{p.recorded} / {p.total} {mt(lang, 'progressSteps')}</span>}
    </div>
    {p.total > 0 && <div role="progressbar" aria-label={mt(lang, 'progressSteps')} aria-valuemin={0} aria-valuemax={p.total} aria-valuenow={p.recorded} className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-800"><div className="h-full rounded-full bg-emerald-400 transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${100 * p.recorded / p.total}%` }}/></div>}
    <p className="mt-2 text-xs text-neutral-400">{p.flights > 0 && `${p.widths}/${p.flights} ${mt(lang, 'progressWidths')} · `}{p.posts} {mt(lang, 'progressPosts')} · {p.photos} {mt(lang, 'progressPhotos')}</p>
    {p.flights > 0 && <p className="mt-2 text-sm text-neutral-200">{mt(lang, `progressGoal_${stage}`)}</p>}
  </div>;
}
