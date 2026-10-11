"use client";

import {useRef,useState} from 'react';
import type {MeasureData} from '@/lib/shop/measure';
import {siteLabels} from '@/lib/shop/measure-site-i18n';
import {mt} from '@/lib/shop/measure-i18n';
import AttachedRails,{type PanelStage} from './AttachedRails';
import SiteDrawing,{type SiteView} from './SiteDrawing';
import {WorkspaceScene} from './ProWorkspace';
import type {SceneSelection} from './SceneViewport';
import SketchZoom from './SketchZoom';
import {useDrawingPinch} from './useDrawingPinch';

export default function PanelWorkspace({data,set,lang,stage,onStageChange,onSite,onReview,embedded=false,selectedRailId:controlledRailId,onSelectRail,onSceneSelect}:{onSceneSelect?:(selection:SceneSelection)=>void;selectedRailId?:string;onSelectRail?:(id:string)=>void;embedded?:boolean;data:MeasureData;set:(fn:(d:MeasureData)=>void)=>void;lang:string;stage:PanelStage;onStageChange:(stage:PanelStage)=>void;onSite:()=>void;onReview:()=>void}){
 const l=siteLabels(lang),[view,setView]=useState<SiteView>('iso'),[zoom,setZoom]=useState(1);
 const viewport=useRef<HTMLDivElement>(null),drawing=useRef<HTMLDivElement>(null),editor=useRef<HTMLDivElement>(null),sketch=useRef<HTMLDivElement>(null);
 useDrawingPinch(viewport,drawing,zoom,setZoom);
 const [localRailId,setLocalRailId]=useState(data.site?.rails?.[0]?.id||'');
 const selectedRailId=controlledRailId??localRailId;
 const setSelectedRailId=(id:string)=>{setLocalRailId(id);onSelectRail?.(id);};
 const button='min-h-12 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm';
 if(embedded)return <section aria-label={l.panels}><WorkspaceScene data={data} lang={lang} selectedId={selectedRailId} onSelect={target=>{if(target.railId)setSelectedRailId(target.railId);else onSceneSelect?.(target);}}/><AttachedRails embedded selectedRailId={selectedRailId} onSelectRail={setSelectedRailId} data={data} set={set} lang={lang} autoSelect/></section>;
 return <section aria-label={l.panels} className="rounded-3xl border border-slate-200 bg-slate-100 p-3 text-slate-900 shadow-xl sm:p-5">
  <h2 className="text-xl font-bold">{l.panels}</h2><p className="mb-4 mt-1 text-sm text-slate-600">{l.panelHint}</p>
  <button type="button" className={`${button} mb-3 w-full xl:hidden`} onClick={()=>editor.current?.scrollIntoView({behavior:'smooth',block:'start'})}>{l.panelDetails} ↓</button>
  <div className="grid items-start gap-4 xl:grid-cols-2">
   <div ref={sketch} className="scroll-mt-4 min-w-0 rounded-2xl bg-white p-3 shadow-sm xl:sticky xl:top-4">
    <div className="mb-3 flex flex-wrap gap-2">{(['plan','front','iso'] as const).map(v=><button type="button" key={v} className={`${button} ${view===v?'!border-indigo-400 !bg-indigo-50 !text-indigo-800':''}`} aria-pressed={view===v} onClick={()=>setView(v)}>{l[v]}</button>)}</div>
    <SketchZoom zoom={zoom} onChange={setZoom} lang={lang} light onFit={()=>{if(viewport.current){viewport.current.scrollLeft=0;viewport.current.scrollTop=0;}}}/>
    <div ref={viewport} style={{touchAction:'pan-x pan-y'}} className="max-h-[55dvh] overflow-auto overscroll-contain"><div ref={drawing} style={{width:`${zoom*100}%`}}><SiteDrawing data={data} view={view}/></div></div>
    <p className="my-2 text-xs text-slate-500">{mt(lang,'drawingPanHint')}</p>
    <button type="button" className={`${button} w-full`} onClick={onSite}>{l.editSite} →</button>
   </div>
   <div ref={editor} className="scroll-mt-4 min-w-0"><button type="button" className={`${button} w-full xl:hidden`} onClick={()=>sketch.current?.scrollIntoView({behavior:'smooth',block:'start'})}>↑ {l.backSketch}</button><AttachedRails data={data} set={set} lang={lang} stage={stage} onStageChange={onStageChange} autoSelect/>
    {stage==='review'&&<button type="button" className="mt-4 min-h-12 w-full rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white" onClick={onReview}>{l.drawingReview} →</button>}
   </div>
  </div>
 </section>;
}
