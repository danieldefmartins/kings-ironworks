"use client";
import type { MeasureData, PlatformSegment } from '@/lib/shop/measure';
import { applyStandardReturn } from '@/lib/shop/measure-standard-layout';
import { mt } from '@/lib/shop/measure-i18n';
import { MInput } from './fields';

export default function AssemblyLayout({ data, lang, set }: { data: MeasureData; lang: string; set: (fn: (data: MeasureData) => void) => void }) {
  const landings = data.segments.flatMap((seg, index) => seg.kind === 'platform' ? [{ seg, index }] : []);
  const tx=(en:string,pt:string,es:string)=>lang==='pt'?pt:lang==='es'?es:en;
  if (!landings.length) return null;
  return <div>
    <div className="mt-3 rounded-xl border border-sky-900 bg-sky-950/20 p-3">
      <h3 className="mb-2 font-semibold text-sky-200">{mt(lang,'assemblyPath')}</h3>
      <p className="mb-2 text-sm text-neutral-300">{tx('Standard U layout: two parallel flights per floor.', 'Padrão em U: dois lances paralelos por pavimento.', 'Estándar en U: dos tramos paralelos por piso.')}</p>
      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        {(['right','left'] as const).map(wall=><button key={wall} type="button" className="min-h-12 rounded-xl border border-sky-700 p-3 text-sm" onClick={()=>set(d=>applyStandardReturn(d,wall))}>{wall==='right'?tx('Wall right · U-return left','Parede à direita · retorno à esquerda','Pared derecha · retorno izquierdo'):tx('Wall left · U-return right','Parede à esquerda · retorno à direita','Pared izquierda · retorno derecho')}</button>)}
      </div>
      <p className="mb-3 text-xs text-neutral-400">{tx('Aligns flights to opposite landing edges. Check the landing offsets below against the site measurements.', 'Alinha os lances às bordas opostas do patamar. Confira os deslocamentos abaixo com as medidas da obra.', 'Alinea los tramos a bordes opuestos del descanso. Verifique los desplazamientos con las medidas de obra.')}</p>
      <label className="text-sm">{mt(lang,'assemblyAllTurns')}<select className="mt-1 min-h-12 w-full rounded-xl border border-neutral-600 bg-neutral-900 px-3" value={landings[0].seg.turn} onChange={e=>{const turn=e.target.value as PlatformSegment['turn'];set(d=>{d.segments.forEach(seg=>{if(seg.kind==='platform')seg.turn=turn;});});}}>{(['left','right','u','none'] as const).map(turn=><option key={turn} value={turn}>{mt(lang,`assemblyTurn_${turn}`)}</option>)}</select></label>
    </div>
    <details className="mt-3 rounded-xl border border-sky-900 bg-sky-950/20 p-3">
    <summary className="cursor-pointer font-semibold text-sky-200">{mt(lang, 'assemblyLayout')}</summary>
    <p className="mt-2 text-sm text-neutral-300">{mt(lang, 'assemblyLayoutHint')}</p>
    {landings.map(({ seg, index }, number) => {
      const edit = (key: 'length' | 'depth' | 'entryOffset' | 'exitOffset', value: string) => set(d => { (d.segments[index] as PlatformSegment)[key] = value; });
      const next = data.segments[index + 1];
      const branched = next?.kind === 'flight' && next.branch;
      return <div key={index} className="mt-3 border-t border-neutral-700 pt-3">
        <h3 className="mb-2 font-semibold">{mt(lang, 'landing')} {number + 1}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <MInput label={mt(lang, 'assemblyLength')} value={seg.length} onChange={v=>edit('length',v)}/>
          <MInput label={mt(lang, 'assemblyWidth')} value={seg.depth} onChange={v=>edit('depth',v)}/>
          {index > 0 && <MInput label={mt(lang, 'assemblyEntry')} value={seg.entryOffset||''} onChange={v=>edit('entryOffset',v)}/>}
          {next && !branched && <MInput label={mt(lang, 'drawingExitOffset')} value={seg.exitOffset||''} onChange={v=>edit('exitOffset',v)}/>}
        </div>
      </div>;
    })}
  </details></div>;
}
