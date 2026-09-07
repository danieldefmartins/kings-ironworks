"use client";

import { useEffect, useRef, useState } from 'react';
import type { MeasureData } from '@/lib/shop/measure';
import { stairGeometry } from '@/lib/shop/measure-geometry';
import DrawingSvg from './DrawingSvg';
import DrawingDetails from './DrawingDetails';
import { mt } from '@/lib/shop/measure-i18n';

type View = 'side' | 'plan' | 'iso';

export default function DrawingWorkspace({ data, lang, focusSeg, onMeasureStep, onTapPost }: {
  data: MeasureData; lang: string; focusSeg?: number;
  onTapPost?: (id: string) => void;
  onMeasureStep: (segIdx: number, stepIdx: number) => void;
}) {
  const [view, setView] = useState<View>('iso');
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [assembly, setAssembly] = useState(false);
  const [details, setDetails] = useState(false);
  const drawingRef = useRef<HTMLDivElement>(null);
  const selected = assembly ? undefined : focusSeg;
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
  const model = stairGeometry(data, selected);
  if (!model) return null;
  function download() {
    const svg = drawingRef.current?.querySelector('svg')?.cloneNode(true) as SVGSVGElement | undefined;
    if (!svg) return;
    svg.removeAttribute('style');
    svg.querySelectorAll('[role="button"]').forEach(el => el.remove());
    const title = document.createElementNS('http://www.w3.org/2000/svg','text');
    const box = svg.getAttribute('viewBox')!.split(' ').map(Number);
    title.setAttribute('x',String(box[0]+10));title.setAttribute('y',String(box[1]+22));
    title.setAttribute('fill','#fcd34d');title.setAttribute('font-size','14');
    title.textContent = mt(lang,'drawingDraft');svg.appendChild(title);
    const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}));
    const a=document.createElement('a');a.href=url;a.download=`measure-${view}-draft.svg`;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const labels: [View, string][] = [['side', 'sideView'], ['plan', 'planView'], ['iso', 'drawing3d']];
  return (
    <section aria-label={mt(lang, 'drawingWorkspace')} role={expanded?'dialog':undefined} aria-modal={expanded||undefined}
      onKeyDown={e=>{
        if(!expanded||e.key!=='Tab')return;
        const items=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]'));
        const first=items[0],last=items[items.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      }} className={expanded
      ? 'fixed inset-0 z-40 flex flex-col bg-neutral-950 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] print:hidden'
      : 'mb-4 overflow-hidden rounded-2xl border border-neutral-700 bg-neutral-950 p-3 sm:p-4'}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div><h2 className="font-bold text-white">{mt(lang, 'drawingWorkspace')}</h2><p className="text-xs text-neutral-300">{mt(lang, 'tapStepToMeasure')}</p></div>
        <button ref={expandButton} type="button" aria-expanded={expanded} onClick={() => setExpanded(v => !v)} className="min-h-11 rounded-xl border border-neutral-600 px-3 text-sm font-semibold">{mt(lang, expanded ? 'drawingClose' : 'drawingExpand')}</button>
      </div>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {labels.map(([v, key]) => <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`min-h-11 rounded-xl border text-sm font-semibold ${view === v ? 'border-amber-400 bg-amber-400 text-black' : 'border-neutral-700 bg-neutral-900 text-neutral-200'}`}>{mt(lang, key)}</button>)}
      </div>
      <details className="mb-3"><summary className="min-h-11 cursor-pointer rounded-xl border border-neutral-700 px-3 py-3 text-sm text-neutral-300">{mt(lang,"progressDrawingOptions")}</summary><div className="mt-2 flex flex-wrap gap-2">
        {focusSeg !== undefined && <button type="button" aria-pressed={assembly} onClick={()=>{setAssembly(v=>!v);if(!assembly)setView('iso');}} className="min-h-11 rounded-xl border border-neutral-600 px-3 text-sm">{mt(lang,assembly?'drawingFlightOnly':'drawingAssembly')}</button>}
        <button type="button" aria-pressed={details} onClick={()=>setDetails(v=>!v)} className="min-h-11 rounded-xl border border-neutral-600 px-3 text-sm">{mt(lang,'progressSchedules')}</button>
        <button type="button" onClick={download} className="min-h-11 rounded-xl border border-neutral-600 px-3 text-sm">{mt(lang,'drawingExportSvg')}</button>
      </div></details>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={`text-xs ${model.provisional ? 'text-amber-200' : 'text-emerald-300'}`}>{mt(lang, model.provisional ? 'drawingProvisional' : 'drawingMeasured')}</span>
        <div className="flex shrink-0 items-center rounded-xl border border-neutral-700">
          <button type="button" aria-label={mt(lang, 'drawingZoomOut')} onClick={() => setZoom(z => Math.max(1, z - 0.5))} disabled={zoom === 1} className="h-11 w-11 text-xl disabled:opacity-30">−</button>
          <button type="button" aria-label={mt(lang, 'drawingReset')} onClick={() => setZoom(1)} className="h-11 min-w-12 text-xs">{Math.round(zoom * 100)}%</button>
          <button type="button" aria-label={mt(lang, 'drawingZoomIn')} onClick={() => setZoom(z => Math.min(4, z + 0.5))} disabled={zoom === 4} className="h-11 w-11 text-xl disabled:opacity-30">+</button>
        </div>
      </div>
      <div className={`overflow-auto overscroll-contain rounded-xl border border-neutral-800 bg-neutral-900 ${expanded ? 'min-h-0 flex-1' : 'max-h-[65dvh]'}`}>
        <div ref={drawingRef} style={{width:`${zoom*100}%`,height:expanded&&view==='iso'&&zoom===1?'100%':undefined,minWidth:view==='iso'?0:Math.max(340,model.treads.length*64)*zoom}}>
          <DrawingSvg data={data} lang={lang} focusSeg={selected} view={view} details={true} style={{height:expanded&&view==='iso'&&zoom===1?'100%':undefined}} onMeasureStep={onMeasureStep} onTapPost={onTapPost}/>
        </div>
      </div>
      <p className="mt-2 text-xs text-neutral-400">{mt(lang, 'drawingPanHint')}</p>
      {!expanded && details && <DrawingDetails data={data} lang={lang}/>}
      <p className="mt-2 text-xs leading-relaxed text-neutral-300">{mt(lang, 'drawingFieldOnly')}{model.provisional && ` ${mt(lang, 'drawingMissingHint')}`}</p>
    </section>
  );
}
