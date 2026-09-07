"use client";
import type { MeasureData, PlatformSegment } from '@/lib/shop/measure';
import { mt } from '@/lib/shop/measure-i18n';
import { MInput } from './fields';

export default function AssemblyLayout({ data, lang, set }: { data: MeasureData; lang: string; set: (fn: (data: MeasureData) => void) => void }) {
  const landings = data.segments.flatMap((seg, index) => seg.kind === 'platform' ? [{ seg, index }] : []);
  if (!landings.length) return null;
  return <details className="mt-3 rounded-xl border border-sky-900 bg-sky-950/20 p-3" open>
    <summary className="cursor-pointer font-semibold text-sky-200">{mt(lang, 'assemblyLayout')}</summary>
    <p className="mt-2 text-sm text-neutral-300">{mt(lang, 'assemblyLayoutHint')}</p>
    {landings.map(({ seg, index }, number) => {
      const edit = (key: 'length' | 'depth' | 'entryOffset' | 'exitOffset', value: string) => set(d => { (d.segments[index] as PlatformSegment)[key] = value; });
      const next = data.segments[index + 1];
      const branched = next?.kind === 'flight' && next.branch;
      return <div key={index} className="mt-3 border-t border-neutral-700 pt-3">
        <h3 className="mb-2 font-semibold">{mt(lang, 'landing')} {number + 1}</h3>
        {next && !branched && <label className="mb-3 block text-sm">{mt(lang, 'assemblyTurn')}<select className="mt-1 min-h-12 w-full rounded-xl border border-neutral-600 bg-neutral-900 px-3" value={seg.turn} onChange={e=>set(d=>{(d.segments[index] as PlatformSegment).turn=e.target.value as PlatformSegment['turn'];})}>{(['none','left','right','u'] as const).map(turn=><option key={turn} value={turn}>{mt(lang,`assemblyTurn_${turn}`)}</option>)}</select></label>}
        <div className="grid gap-3 sm:grid-cols-2">
          <MInput label={mt(lang, 'assemblyLength')} value={seg.length} onChange={v=>edit('length',v)}/>
          <MInput label={mt(lang, 'assemblyWidth')} value={seg.depth} onChange={v=>edit('depth',v)}/>
          {index > 0 && <MInput label={mt(lang, 'assemblyEntry')} value={seg.entryOffset||''} onChange={v=>edit('entryOffset',v)}/>}
          {next && !branched && <MInput label={mt(lang, 'drawingExitOffset')} value={seg.exitOffset||''} onChange={v=>edit('exitOffset',v)}/>}
        </div>
      </div>;
    })}
  </details>;
}
