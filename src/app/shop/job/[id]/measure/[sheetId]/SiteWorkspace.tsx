"use client";

import { useEffect, useRef, useState } from 'react';
import {BrickWall,Columns3,Square,DoorOpen,Box,Footprints,MoveUpRight,Layers,House,PanelTop,X,Settings2,Ruler} from 'lucide-react';
import type { MeasureData, Segment } from '@/lib/shop/measure';
import { insertSegment, newFlightSegment, newPlatformSegment, blankRamp } from '@/lib/shop/measure';
import { editSiteObject, newSiteModel, newSiteObject, pointDistance, siteIssues, siteObjectProblems, type SiteObject } from '@/lib/shop/measure-site';
import { formatIn } from '@/lib/shop/measure-parse';
import { mt } from '@/lib/shop/measure-i18n';
import { siteLabels } from '@/lib/shop/measure-site-i18n';
import AttachedRails from './AttachedRails';
import HouseLayout from './HouseLayout';
import {updateSceneSetup} from '@/lib/shop/measure-scene-setup';
import SketchZoom from './SketchZoom';
import { useDrawingPinch } from './useDrawingPinch';
import SiteDrawing, { siteAnchors, type SiteView } from './SiteDrawing';

const fieldClass='mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
const buttonClass='min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40';

export default function SiteWorkspace({data,set,lang,onContinue,onMeasure,onDetails,onPanels}:{data:MeasureData;set:(fn:(d:MeasureData)=>void)=>void;lang:string;onContinue:()=>void;onMeasure:(segment?:number,step?:number|null,flightIndex?:number)=>void;onDetails:()=>void;onPanels?:()=>void}) {
  const l=siteLabels(lang),site=data.site||newSiteModel();
  const tx=(en:string,pt:string,es:string)=>lang==='pt'?pt:lang==='es'?es:en;
  const [selected,select]=useState('');
  const [focusDimension,setFocusDimension]=useState<'length'|'depth'|'height'|null>(null);
  const [datumOpen,setDatumOpen]=useState(false),[houseOpen,setHouseOpen]=useState(false);
  const inspector=useRef<HTMLDivElement>(null),canvas=useRef<HTMLDivElement>(null),dimensionRefs=useRef<Partial<Record<string,HTMLInputElement|null>>>({});
  useEffect(()=>{if(selected&&focusDimension){dimensionRefs.current[focusDimension]?.focus();dimensionRefs.current[focusDimension]?.select();setFocusDimension(null);}},[selected,focusDimension]);
  const [view,setView]=useState<SiteView>('iso'),[zoom,setZoom]=useState(1);
  const viewport=useRef<HTMLDivElement>(null),drawing=useRef<HTMLDivElement>(null);
  useDrawingPinch(viewport,drawing,zoom,setZoom);
  const [measure,setMeasure]=useState(false),[move,setMove]=useState(false),[ends,setEnds]=useState<string[]>([]);
  const [removed,setRemoved]=useState<SiteObject|null>(null);
  const [piece,setPiece]=useState<'flight'|'platform'|'ramp'|null>(null),[at,setAt]=useState(data.segments.length),[count,setCount]=useState(3);
  const object=site.objects.find(o=>o.id===selected),anchors=siteAnchors(data);
  const endpointA=anchors.find(a=>a.id===ends[0]),endpointB=anchors.find(a=>a.id===ends[1]);
  const distance=endpointA&&endpointB?pointDistance(endpointA.point,endpointB.point):null;
  const update=(patch:Partial<SiteObject>)=>set(d=>{if(!d.site)return;d.site.objects=d.site.objects.map(o=>o.id===selected?editSiteObject(o,patch):o);});
  function add(kind:SiteObject['kind'],name?:string) {
    if(site.objects.length>=100)return;
    const o=newSiteObject(kind,crypto.randomUUID(),name||`${l[kind]} ${site.objects.filter(o=>o.kind===kind).length+1}`);
    set(d=>{d.site??=newSiteModel();d.site.objects.push(o);});select(o.id);setMove(false);
  }
  function addPiece() {
    if(!piece||data.segments.length>=12)return;
    const segment:Segment=piece==='flight'?newFlightSegment(count):piece==='platform'?newPlatformSegment('none'):blankRamp();
    const index=Math.min(at,data.segments.length);
    const flightIndex=Math.max(0,data.segments.slice(0,index).filter(s=>s.kind==='flight').length+(piece==='flight'?0:-1));
    set(d=>insertSegment(d,index,segment));setPiece(null);onMeasure(index,null,flightIndex);
  }
  const input=(key:'x'|'y'|'z'|'length'|'depth'|'height'|'riseX'|'riseY',label:string)=><label className="block text-sm font-semibold text-slate-600">{label}<input className={fieldClass} ref={node=>{dimensionRefs.current[key]=node;}} value={object?.[key]||''} maxLength={40} placeholder='0' data-m="1" onChange={e=>update({[key]:e.target.value})}/></label>;
  return <section className="relative rounded-3xl border border-slate-200 bg-slate-100 p-3 text-slate-900 shadow-xl sm:p-5" aria-label={l.title}>
    <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-xl font-bold tracking-tight">{l.title}</h2><button type="button" className={buttonClass} onClick={onDetails} aria-label={l.advanced}><Settings2 className="size-5"/></button></div>
    <div className="mb-3 flex gap-2 overflow-x-auto rounded-2xl bg-white p-2 shadow-sm" aria-label={l.add}>
      <button type="button" className={`${buttonClass} flex min-w-20 shrink-0 flex-col items-center gap-1 !border-transparent !shadow-none`} onClick={()=>{set(d=>updateSceneSetup(d,{house:d.sceneSetup?.house||{side:'back'}}));setHouseOpen(true);select('');}}><House className="size-5" aria-hidden/><span className="text-xs">{tx('House','Casa','Casa')}</span></button>
      {([{kind:'wall',icon:BrickWall,label:l.wall},{kind:'column',icon:Columns3,label:l.column},{kind:'post',icon:PanelTop,label:tx('Post','Poste','Poste')},{kind:'slab',icon:Square,label:tx('Floor','Piso','Piso')},{kind:'opening',icon:DoorOpen,label:tx('Opening','Abertura','Abertura')},{kind:'obstruction',icon:Box,label:tx('Trim / obstacle','Acabamento / obstáculo','Moldura / obstáculo'),name:tx('Trim / obstacle','Acabamento / obstáculo','Moldura / obstáculo')}] as const).map(({kind,icon:Icon,label,...extra},i)=><button key={i} type="button" className={`${buttonClass} flex min-w-20 shrink-0 flex-col items-center gap-1 !border-transparent !shadow-none`} disabled={site.objects.length>=100} onClick={()=>add(kind,'name' in extra?extra.name:undefined)}><Icon className="size-5" aria-hidden/><span className="whitespace-nowrap text-xs">{label}</span></button>)}
      {([{kind:'flight',icon:Footprints,label:l.stairs},{kind:'platform',icon:Layers,label:l.landing},{kind:'ramp',icon:MoveUpRight,label:l.ramp}] as const).map(({kind,icon:Icon,label})=><button key={kind} className={`${buttonClass} flex min-w-20 shrink-0 flex-col items-center gap-1 !border-transparent !shadow-none`} type="button" disabled={data.segments.length>=12} onClick={()=>{setPiece(kind);setAt(data.segments.length);}}><Icon className="size-5" aria-hidden/><span className="text-xs">{label}</span></button>)}
    </div>
    {houseOpen&&<div className="fixed inset-x-3 bottom-[88px] z-30 max-h-[38dvh] overflow-y-auto rounded-2xl shadow-2xl xl:absolute xl:inset-x-auto xl:bottom-auto xl:right-5 xl:top-[180px] xl:max-h-[62dvh] xl:w-[420px]"><HouseLayout data={data} set={set} lang={lang} onClose={()=>setHouseOpen(false)} onAddWall={()=>{add('wall');setHouseOpen(false);}}/></div>}
    {piece&&<div className="mb-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-4"><h3 className="font-bold">{l.addPiece}</h3><div className="my-3 grid gap-3 sm:grid-cols-2"><label>{l.after}<select className={fieldClass} value={at} onChange={e=>setAt(Number(e.target.value))}><option value={0}>{l.start}</option>{data.segments.map((s,i)=><option key={i} value={i+1}>{i+1} · {s.kind==='flight'?l.stairs:s.kind==='platform'?l.landing:s.kind==='ramp'?l.ramp:s.kind}</option>)}</select></label>{piece==='flight'&&<label>{l.count}<input className={fieldClass} type="number" min={1} max={40} value={count} onChange={e=>setCount(Math.max(1,Math.min(40,Number(e.target.value)||1)))}/></label>}</div><div className="flex gap-2"><button className={buttonClass} onClick={addPiece}>{l.placePiece}</button><button className={buttonClass} onClick={()=>setPiece(null)}>{l.cancel}</button></div></div>}
    <div className="relative">
      <div className="min-w-0" ref={canvas}>
        <div className="rounded-2xl bg-white p-2 shadow-sm">
          <div className="mb-2 flex flex-wrap items-center gap-2">{(['plan','front','iso'] as const).map(v=><button key={v} type="button" aria-pressed={view===v} className={`${buttonClass} ${view===v?'!border-indigo-400 !bg-indigo-50 !text-indigo-700':''}`} onClick={()=>{setView(v);setMove(false);}}>{l[v]}</button>)}<button className={buttonClass} aria-label={l.measure} title={l.measure} aria-pressed={measure} onClick={()=>{setMeasure(!measure);setMove(false);setEnds([]);}}><Ruler className="size-5"/></button></div>
          <SketchZoom zoom={zoom} onChange={setZoom} lang={lang} light onFit={()=>{if(viewport.current){viewport.current.scrollLeft=0;viewport.current.scrollTop=0;}}}/>
          {move&&<p role="status" className="mb-2 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800">{l.moveHint}<button type="button" className={`${buttonClass} ml-2`} onClick={()=>setMove(false)}>{l.cancel}</button></p>}
          <div ref={viewport} data-site-viewport style={{touchAction:"pan-x pan-y"}} className="max-h-[72dvh] min-h-[45dvh] overflow-auto overscroll-contain"><div ref={drawing} style={{width:`${zoom*100}%`}}><SiteDrawing data={data} draftObjects lang={lang} view={view} selected={selected} onSelect={id=>{select(id);setMove(false);}} onDimension={(id,key)=>{select(id);setFocusDimension(key);}} onSurface={measure?undefined:onMeasure} measure={measure} anchorIds={ends} onAnchor={id=>setEnds(prev=>prev.length>=2?[id]:[...prev,id])} move={move} onMove={(x,y)=>{update({x:String(x),y:String(y)});setMove(false);}}/></div></div>

        </div>
        {onPanels?<button type="button" className={`${buttonClass} mt-4 w-full !border-indigo-200 !bg-indigo-50 !text-indigo-800`} onClick={onPanels}>{l.editPanels} · {site.rails?.length||0} →</button>:<AttachedRails data={data} set={set} lang={lang}/>}
        {measure&&<div className="mt-3 rounded-2xl bg-white p-4 shadow-sm"><div className="grid gap-2 sm:grid-cols-2">{[0,1].map(i=><label key={i} className="text-sm">{l.endpoint} {i+1}<select className={fieldClass} value={ends[i]||''} onChange={e=>{const next=[...ends];next[i]=e.target.value;setEnds(next);}}><option value="">{l.choose}</option>{anchors.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}</select></label>)}</div>{distance&&<div className="mt-3 grid grid-cols-3 gap-2">{[[l.horizontal,distance.horizontal],[l.vertical,distance.vertical],[l.distance,distance.distance]].map(([label,value])=><div key={label} className="rounded-xl bg-indigo-50 p-2"><span className="block text-xs text-indigo-700">{label}</span><strong className="text-base">{Number(value)<0?'−':''}{formatIn(Math.abs(Number(value)))}</strong></div>)}</div>}<p className="mt-2 text-xs text-slate-500">{l.calculated}</p></div>}
        <details className="mt-3 rounded-2xl bg-white p-3 shadow-sm"><summary className="min-h-11 cursor-pointer font-semibold">{l.objects} · {site.objects.length}</summary>{!site.objects.length&&<p className="text-sm text-slate-500">{l.empty}</p>}<div className="grid gap-2 sm:grid-cols-2">{site.objects.map(o=><button key={o.id} type="button" className={`rounded-xl border p-3 text-left ${selected===o.id?'border-indigo-400 bg-indigo-50':'border-slate-200'}`} onClick={()=>{select(o.id);setMove(false);}}><span className="block font-semibold">{o.label}</span><span className={`text-xs ${o.verified&&!siteObjectProblems(o).length?'text-emerald-700':'text-amber-700'}`}>{o.verified&&!siteObjectProblems(o).length?l.checked:l.needs}</span></button>)}</div>{removed&&<button className={`${buttonClass} mt-3`} disabled={site.objects.length>=100} onClick={()=>{set(d=>{d.site??=newSiteModel();d.site.objects.push(removed);});select(removed.id);setRemoved(null);}}>{l.restore}: {removed.label}</button>}</details>
        {siteIssues(site).length>0&&<details className="mt-3"><summary className="min-h-11 cursor-pointer text-sm font-semibold text-amber-800">{tx('Site checks','Conferir local','Revisar sitio')} · {siteIssues(site).length}</summary><ul className="mt-2 space-y-1 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{siteIssues(site).map(issue=><li key={issue}>{mt(lang,issue)}</li>)}</ul></details>}
      </div>
      {object&&!move&&<div role="region" aria-label={tx('Selected site object','Objeto selecionado','Objeto seleccionado')} className="fixed inset-x-3 bottom-[88px] z-40 max-h-[48dvh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl xl:absolute xl:inset-x-auto xl:bottom-auto xl:right-4 xl:top-24 xl:max-h-[62dvh] xl:w-[340px]" key={object.id} ref={inspector}>
        <div className="mb-3 flex items-center justify-between gap-2"><strong className="truncate">{object.label}</strong><button type="button" className={buttonClass} aria-label={tx('Close object inspector','Fechar objeto','Cerrar objeto')} onClick={()=>{select('');setMove(false);}}><X className="size-5"/></button></div>
        <div className="grid grid-cols-3 gap-2">{input('length',object.section==='round'?l.diameter:l.length)}{object.section!=='round'&&input('depth',tx('Depth','Profundidade','Profundidad'))}{input('height',object.kind==='slab'?l.slabHeight:l.height)}</div>
        <div className="mt-3 flex gap-2"><button className={`${buttonClass} flex-1`} aria-pressed={move} onClick={()=>{setView('plan');setMove(!move);setMeasure(false);}}>{l.move}</button><button className={buttonClass} disabled={site.objects.length>=100} onClick={()=>{const copy={...object,id:crypto.randomUUID(),label:`${object.label} +`.slice(0,80),verified:false};set(d=>d.site?.objects.push(copy));select(copy.id);}}>{l.copy}</button></div>
        <details className="mt-3"><summary className="min-h-11 cursor-pointer text-sm font-semibold">{tx('Position & more details','Posição e detalhes','Posición y detalles')}</summary>
        <label className="block text-sm font-semibold text-slate-600">{l.name}<input className={fieldClass} value={object.label} maxLength={80} onChange={e=>update({label:e.target.value})}/></label>
        {(object.kind==='column'||object.kind==='post')&&<label className="mt-3 block text-sm font-semibold text-slate-600">{l.section}<select className={fieldClass} value={object.section} onChange={e=>update({section:e.target.value as SiteObject['section']})}><option value="rectangular">{l.rectangular}</option><option value="round">{l.round}</option></select></label>}
        <h3 className="mb-2 mt-5 text-sm font-bold">{l.axis}</h3><div className="grid grid-cols-2 gap-3">{input('x',l.x)}{input('y',l.y)}{input('z',l.z)}<label className="text-sm font-semibold text-slate-600">{l.rotation}<input className={fieldClass} type="number" min={-360} max={360} step="any" value={object.rotation} onChange={e=>{const n=Number(e.target.value);if(Number.isFinite(n)&&Math.abs(n)<=360)update({rotation:n});}}/></label></div>
        <label className="mt-3 block text-sm text-slate-600">{l.snap}<select className={fieldClass} value="" onChange={e=>{const a=anchors.find(a=>a.id===e.target.value);if(a)update({x:String(a.point.x),y:String(a.point.y),z:String(a.point.z)});}}><option value="">{l.choose}</option>{anchors.filter(a=>!a.id.startsWith(object.id+':')).map(a=><option key={a.id} value={a.id}>{a.label}</option>)}</select><span className="mt-1 block text-xs">{l.snapHint}</span></label>
        {object.kind==='slab'&&<div className="mt-4"><h3 className="mb-2 text-sm font-semibold">{l.slope}</h3><div className="grid grid-cols-2 gap-3">{input('riseX',l.riseX)}{input('riseY',l.riseY)}</div></div>}
        {object.kind==='opening'&&<p className="mt-3 rounded-xl bg-sky-50 p-3 text-xs text-sky-800">{l.noCut}</p>}
        <label className="mt-4 block text-sm font-semibold text-slate-600">{l.source}<select className={fieldClass} value={object.source} onChange={e=>update({source:e.target.value as SiteObject['source']})}>{(['unknown','tape','laser','drawing','scan'] as const).map(s=><option key={s} value={s}>{l[s]}</option>)}</select></label>
        <p className="mt-1 text-xs text-slate-500">{l.sourceHint}</p>
        <label className="mt-4 block text-sm font-semibold text-slate-600">{l.notes}<textarea className={fieldClass} rows={3} value={object.notes} maxLength={1000} onChange={e=>update({notes:e.target.value})}/></label>
        <details className="mt-4 text-sm"><summary className="min-h-10 cursor-pointer font-semibold">{l.photos}</summary>{!data.photos.length&&<p className="text-slate-500">{l.noPhotos}</p>}{data.photos.map(p=><label key={p.path} className="flex min-h-10 items-center gap-2"><input type="checkbox" checked={object.photoPaths.includes(p.path)} onChange={e=>update({photoPaths:e.target.checked?[...object.photoPaths,p.path].slice(0,20):object.photoPaths.filter(path=>path!==p.path)})}/>{p.slot||p.path.split('/').at(-1)}</label>)}</details>
        {siteObjectProblems(object).length>0&&<p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{l.missing}</p>}
        <label className="mt-4 flex items-start gap-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900"><input className="mt-1 h-5 w-5" type="checkbox" checked={object.verified} disabled={!!siteObjectProblems(object).length||object.source==='unknown'||!site.datum.trim()} onChange={e=>{const verified=e.target.checked;set(d=>{const o=d.site?.objects.find(o=>o.id===selected);if(o)o.verified=verified;});}}/><span>{l.verified}<span className="mt-1 block text-xs font-normal">{l.verifyHint}</span></span></label>
        <div className="mt-4 flex flex-wrap gap-2"><button className={`${buttonClass} !text-red-700`} onClick={()=>{if(!window.confirm(l.confirmRemove))return;setRemoved(object);set(d=>{if(d.site)d.site.objects=d.site.objects.filter(o=>o.id!==selected);});select('');}}>{l.remove}</button></div>
        </details>
      </div>}
    </div>
    <details open={datumOpen} onToggle={e=>setDatumOpen(e.currentTarget.open)} className="mb-4 rounded-2xl bg-white p-4 shadow-sm"><summary className="cursor-pointer font-semibold">{l.datum}<span className="ml-2 text-xs font-normal text-slate-500">{site.datum?'✓':l.needs}</span></summary><label className="mt-3 block"><span className="sr-only">{l.datum}</span><input className={fieldClass} value={site.datum} maxLength={300} placeholder={l.datumPlaceholder} onChange={e=>{const value=e.target.value;set(d=>{d.site??=newSiteModel();d.site.datum=value;d.site.objects=d.site.objects.map(o=>({...o,verified:false}));});}}/><span className="mt-2 block text-xs leading-relaxed text-slate-500">{l.datumHint}</span></label></details>
    <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-4"><button className="min-h-12 rounded-xl bg-indigo-600 px-5 font-semibold text-white shadow-md" onClick={onContinue}>{tx('Measure the sketch','Medir o desenho','Medir el dibujo')} →</button><button className={buttonClass} onClick={onDetails}>{l.advanced}</button></div>
  </section>;
}
