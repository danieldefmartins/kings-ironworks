"use client";

import { useEffect, useRef, useState } from 'react';
import type { MeasureData, Segment } from '@/lib/shop/measure';
import { insertSegment, newFlightSegment, newPlatformSegment, blankRamp } from '@/lib/shop/measure';
import { editSiteObject, newSiteModel, newSiteObject, pointDistance, siteIssues, siteObjectProblems, type SiteObject } from '@/lib/shop/measure-site';
import { formatIn } from '@/lib/shop/measure-parse';
import { mt } from '@/lib/shop/measure-i18n';
import { siteLabels } from '@/lib/shop/measure-site-i18n';
import SiteDrawing, { siteAnchors, type SiteView } from './SiteDrawing';

const fieldClass='mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
const buttonClass='min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40';

export default function SiteWorkspace({data,set,lang,onContinue,onMeasure,onDetails}:{data:MeasureData;set:(fn:(d:MeasureData)=>void)=>void;lang:string;onContinue:()=>void;onMeasure:(segment?:number,step?:number|null,flightIndex?:number)=>void;onDetails:()=>void}) {
  const l=siteLabels(lang),site=data.site||newSiteModel();
  const [selected,select]=useState(site.objects[0]?.id||'');
  const [datumOpen,setDatumOpen]=useState(!site.datum);
  const [toolsOpen,setToolsOpen]=useState(!site.objects.length);
  const inspector=useRef<HTMLDivElement>(null),canvas=useRef<HTMLDivElement>(null),previousSelection=useRef(selected);
  useEffect(()=>{if(previousSelection.current!==selected&&selected&&window.matchMedia?.('(max-width: 1279px)')?.matches)inspector.current?.scrollIntoView({behavior:'smooth',block:'start'});previousSelection.current=selected;},[selected]);
  const [view,setView]=useState<SiteView>('iso'),[zoom,setZoom]=useState(1);
  const [measure,setMeasure]=useState(false),[move,setMove]=useState(false),[ends,setEnds]=useState<string[]>([]);
  const [removed,setRemoved]=useState<SiteObject|null>(null);
  const [piece,setPiece]=useState<'flight'|'platform'|'ramp'|null>(null),[at,setAt]=useState(data.segments.length),[count,setCount]=useState(3);
  const object=site.objects.find(o=>o.id===selected),anchors=siteAnchors(data);
  const endpointA=anchors.find(a=>a.id===ends[0]),endpointB=anchors.find(a=>a.id===ends[1]);
  const distance=endpointA&&endpointB?pointDistance(endpointA.point,endpointB.point):null;
  const update=(patch:Partial<SiteObject>)=>set(d=>{if(!d.site)return;d.site.objects=d.site.objects.map(o=>o.id===selected?editSiteObject(o,patch):o);});
  function add(kind:SiteObject['kind']) {
    if(site.objects.length>=100)return;
    const o=newSiteObject(kind,crypto.randomUUID(),`${l[kind]} ${site.objects.filter(o=>o.kind===kind).length+1}`);
    set(d=>{d.site??=newSiteModel();d.site.objects.push(o);});select(o.id);setMove(false);setToolsOpen(false);
  }
  function addPiece() {
    if(!piece||data.segments.length>=12)return;
    const segment:Segment=piece==='flight'?newFlightSegment(count):piece==='platform'?newPlatformSegment('none'):blankRamp();
    const index=Math.min(at,data.segments.length);
    const flightIndex=Math.max(0,data.segments.slice(0,index).filter(s=>s.kind==='flight').length+(piece==='flight'?0:-1));
    set(d=>insertSegment(d,index,segment));setPiece(null);onMeasure(index,null,flightIndex);
  }
  const input=(key:'x'|'y'|'z'|'length'|'depth'|'height'|'riseX'|'riseY',label:string)=><label className="block text-sm font-semibold text-slate-600">{label}<input className={fieldClass} value={object?.[key]||''} maxLength={40} placeholder='0' data-m="1" onChange={e=>update({[key]:e.target.value})}/></label>;
  return <section className="rounded-3xl border border-slate-200 bg-slate-100 p-3 text-slate-900 shadow-xl sm:p-5" aria-label={l.title}>
    <div className="mb-5"><h2 className="text-xl font-bold tracking-tight sm:text-2xl">{l.title}</h2><p className="mt-1 text-sm text-slate-600">{l.hint}</p></div>
    <details open={datumOpen} onToggle={e=>setDatumOpen(e.currentTarget.open)} className="mb-4 rounded-2xl bg-white p-4 shadow-sm"><summary className="cursor-pointer font-semibold">{l.datum}<span className="ml-2 text-xs font-normal text-slate-500">{site.datum?'✓':l.needs}</span></summary><label className="mt-3 block"><span className="sr-only">{l.datum}</span><input className={fieldClass} value={site.datum} maxLength={300} placeholder={l.datumPlaceholder} onChange={e=>{const value=e.target.value;set(d=>{d.site??=newSiteModel();d.site.datum=value;d.site.objects=d.site.objects.map(o=>({...o,verified:false}));});}}/><span className="mt-2 block text-xs leading-relaxed text-slate-500">{l.datumHint}</span></label></details>
    <details open={toolsOpen} onToggle={e=>setToolsOpen(e.currentTarget.open)} className="mb-3 rounded-2xl bg-white p-3 shadow-sm"><summary className="min-h-8 cursor-pointer font-semibold">＋ {l.add}</summary><div className="mt-3 flex flex-wrap gap-2" aria-label={l.add}>{(['wall','column','post','slab','opening','obstruction'] as const).map(kind=><button className={buttonClass} key={kind} type="button" disabled={site.objects.length>=100} onClick={()=>add(kind)}>＋ {l[kind]}</button>)}{(['flight','platform','ramp'] as const).map(kind=><button className={buttonClass} key={kind} type="button" disabled={data.segments.length>=12} onClick={()=>{setPiece(kind);setAt(data.segments.length);}}>＋ {kind==='flight'?l.stairs:kind==='platform'?l.landing:l.ramp}</button>)}</div></details>
    {piece&&<div className="mb-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-4"><h3 className="font-bold">{l.addPiece}</h3><div className="my-3 grid gap-3 sm:grid-cols-2"><label>{l.after}<select className={fieldClass} value={at} onChange={e=>setAt(Number(e.target.value))}><option value={0}>{l.start}</option>{data.segments.map((s,i)=><option key={i} value={i+1}>{i+1} · {s.kind==='flight'?l.stairs:s.kind==='platform'?l.landing:s.kind==='ramp'?l.ramp:s.kind}</option>)}</select></label>{piece==='flight'&&<label>{l.count}<input className={fieldClass} type="number" min={1} max={40} value={count} onChange={e=>setCount(Math.max(1,Math.min(40,Number(e.target.value)||1)))}/></label>}</div><div className="flex gap-2"><button className={buttonClass} onClick={addPiece}>{l.placePiece}</button><button className={buttonClass} onClick={()=>setPiece(null)}>{l.cancel}</button></div></div>}
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0" ref={canvas}>
        <div className="rounded-2xl bg-white p-2 shadow-sm">
          <div className="mb-2 flex flex-wrap items-center gap-2">{(['plan','front','iso'] as const).map(v=><button key={v} type="button" aria-pressed={view===v} className={`${buttonClass} ${view===v?'!border-indigo-400 !bg-indigo-50 !text-indigo-700':''}`} onClick={()=>{setView(v);setMove(false);}}>{l[v]}</button>)}<button className={buttonClass} aria-pressed={measure} onClick={()=>{setMeasure(!measure);setMove(false);setEnds([]);}}>{l.measure}</button><button className={buttonClass} onClick={()=>setZoom(1)}>{l.fit}</button><label className="ml-auto flex items-center gap-2 text-xs text-slate-500">Zoom<input aria-label="Zoom" type="range" min={1} max={3} step={.25} value={zoom} onChange={e=>setZoom(Number(e.target.value))}/></label></div>
          {move&&<p role="status" className="mb-2 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800">{l.moveHint}</p>}
          <div className="max-h-[65vh] overflow-auto"><SiteDrawing data={data} view={view} selected={selected} zoom={zoom} onSelect={id=>{select(id);setMove(false);}} onSurface={measure?undefined:onMeasure} measure={measure} anchorIds={ends} onAnchor={id=>setEnds(prev=>prev.length>=2?[id]:[...prev,id])} move={move} onMove={(x,y)=>{update({x:String(x),y:String(y)});setMove(false);}}/></div>
          <p className="px-2 py-2 text-xs text-slate-500">{l.existing}</p>
        </div>
        {measure&&<div className="mt-3 rounded-2xl bg-white p-4 shadow-sm"><div className="grid gap-2 sm:grid-cols-2">{[0,1].map(i=><label key={i} className="text-sm">{l.endpoint} {i+1}<select className={fieldClass} value={ends[i]||''} onChange={e=>{const next=[...ends];next[i]=e.target.value;setEnds(next);}}><option value="">{l.choose}</option>{anchors.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}</select></label>)}</div>{distance&&<div className="mt-3 grid grid-cols-3 gap-2">{[[l.horizontal,distance.horizontal],[l.vertical,distance.vertical],[l.distance,distance.distance]].map(([label,value])=><div key={label} className="rounded-xl bg-indigo-50 p-2"><span className="block text-xs text-indigo-700">{label}</span><strong className="text-base">{Number(value)<0?'−':''}{formatIn(Math.abs(Number(value)))}</strong></div>)}</div>}<p className="mt-2 text-xs text-slate-500">{l.calculated}</p></div>}
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm"><h3 className="mb-3 font-bold">{l.objects} <span className="text-slate-400">{site.objects.length}</span></h3>{!site.objects.length&&<p className="text-sm text-slate-500">{l.empty}</p>}<div className="grid gap-2 sm:grid-cols-2">{site.objects.map(o=><button key={o.id} type="button" className={`rounded-xl border p-3 text-left ${selected===o.id?'border-indigo-400 bg-indigo-50':'border-slate-200'}`} onClick={()=>{select(o.id);setMove(false);}}><span className="block font-semibold">{o.label}</span><span className={`text-xs ${o.verified&&!siteObjectProblems(o).length?'text-emerald-700':'text-amber-700'}`}>{o.verified&&!siteObjectProblems(o).length?l.checked:l.needs}</span></button>)}</div>{removed&&<button className={`${buttonClass} mt-3`} disabled={site.objects.length>=100} onClick={()=>{set(d=>{d.site??=newSiteModel();d.site.objects.push(removed);});select(removed.id);setRemoved(null);}}>{l.restore}: {removed.label}</button>}</div>
        {siteIssues(site).length>0&&<ul className="mt-4 space-y-1 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{siteIssues(site).map(issue=><li key={issue}>{mt(lang,issue)}</li>)}</ul>}
      </div>
      {object&&<div className="scroll-mt-4 rounded-2xl bg-white p-4 shadow-sm" key={object.id} ref={inspector}><button className={`${buttonClass} mb-3 xl:hidden`} onClick={()=>canvas.current?.scrollIntoView({behavior:'smooth',block:'start'})}>↑ {l.site}</button>
        <label className="block text-sm font-semibold text-slate-600">{l.name}<input className={fieldClass} value={object.label} maxLength={80} onChange={e=>update({label:e.target.value})}/></label>
        {(object.kind==='column'||object.kind==='post')&&<label className="mt-3 block text-sm font-semibold text-slate-600">{l.section}<select className={fieldClass} value={object.section} onChange={e=>update({section:e.target.value as SiteObject['section']})}><option value="rectangular">{l.rectangular}</option><option value="round">{l.round}</option></select></label>}
        <h3 className="mb-2 mt-5 text-sm font-bold">{l.axis}</h3><div className="grid grid-cols-2 gap-3">{input('x',l.x)}{input('y',l.y)}{input('z',l.z)}<label className="text-sm font-semibold text-slate-600">{l.rotation}<input className={fieldClass} type="number" min={-360} max={360} step="any" value={object.rotation} onChange={e=>{const n=Number(e.target.value);if(Number.isFinite(n)&&Math.abs(n)<=360)update({rotation:n});}}/></label></div>
        <label className="mt-3 block text-sm text-slate-600">{l.snap}<select className={fieldClass} value="" onChange={e=>{const a=anchors.find(a=>a.id===e.target.value);if(a)update({x:String(a.point.x),y:String(a.point.y),z:String(a.point.z)});}}><option value="">{l.choose}</option>{anchors.filter(a=>!a.id.startsWith(object.id+':')).map(a=><option key={a.id} value={a.id}>{a.label}</option>)}</select><span className="mt-1 block text-xs">{l.snapHint}</span></label>
        <button className={`${buttonClass} mt-3 w-full`} aria-pressed={move} onClick={()=>{setView('plan');setMove(!move);setMeasure(false);}}>{l.move}</button>
        <h3 className="mb-2 mt-5 text-sm font-bold">{l.size}</h3><div className="grid grid-cols-2 gap-3">{input('length',object.section==='round'?l.diameter:l.length)}{object.section!=='round'&&input('depth',l.depth)}{input('height',object.kind==='slab'?l.slabHeight:l.height)}</div><p className="mt-2 text-xs text-slate-500">{l.units}</p>
        {object.kind==='slab'&&<div className="mt-4"><h3 className="mb-2 text-sm font-semibold">{l.slope}</h3><div className="grid grid-cols-2 gap-3">{input('riseX',l.riseX)}{input('riseY',l.riseY)}</div></div>}
        {object.kind==='opening'&&<p className="mt-3 rounded-xl bg-sky-50 p-3 text-xs text-sky-800">{l.noCut}</p>}
        <label className="mt-4 block text-sm font-semibold text-slate-600">{l.source}<select className={fieldClass} value={object.source} onChange={e=>update({source:e.target.value as SiteObject['source']})}>{(['unknown','tape','laser','drawing','scan'] as const).map(s=><option key={s} value={s}>{l[s]}</option>)}</select></label>
        <p className="mt-1 text-xs text-slate-500">{l.sourceHint}</p>
        <label className="mt-4 block text-sm font-semibold text-slate-600">{l.notes}<textarea className={fieldClass} rows={3} value={object.notes} maxLength={1000} onChange={e=>update({notes:e.target.value})}/></label>
        <details className="mt-4 text-sm"><summary className="min-h-10 cursor-pointer font-semibold">{l.photos}</summary>{!data.photos.length&&<p className="text-slate-500">{l.noPhotos}</p>}{data.photos.map(p=><label key={p.path} className="flex min-h-10 items-center gap-2"><input type="checkbox" checked={object.photoPaths.includes(p.path)} onChange={e=>update({photoPaths:e.target.checked?[...object.photoPaths,p.path].slice(0,20):object.photoPaths.filter(path=>path!==p.path)})}/>{p.slot||p.path.split('/').at(-1)}</label>)}</details>
        {siteObjectProblems(object).length>0&&<p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{l.missing}</p>}
        <label className="mt-4 flex items-start gap-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900"><input className="mt-1 h-5 w-5" type="checkbox" checked={object.verified} disabled={!!siteObjectProblems(object).length||object.source==='unknown'||!site.datum.trim()} onChange={e=>{const verified=e.target.checked;set(d=>{const o=d.site?.objects.find(o=>o.id===selected);if(o)o.verified=verified;});}}/><span>{l.verified}<span className="mt-1 block text-xs font-normal">{l.verifyHint}</span></span></label>
        <div className="mt-4 flex flex-wrap gap-2"><button className={buttonClass} disabled={site.objects.length>=100} onClick={()=>{const copy={...object,id:crypto.randomUUID(),label:`${object.label} +`.slice(0,80),verified:false};set(d=>d.site?.objects.push(copy));select(copy.id);}}>{l.copy}</button><button className={`${buttonClass} !text-red-700`} onClick={()=>{if(!window.confirm(l.confirmRemove))return;setRemoved(object);set(d=>{if(d.site)d.site.objects=d.site.objects.filter(o=>o.id!==selected);});select('');}}>{l.remove}</button></div>
      </div>}
    </div>
    <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-4"><button className="min-h-12 rounded-xl bg-indigo-600 px-5 font-semibold text-white shadow-md" onClick={onContinue}>{l.continue} →</button><button className={buttonClass} onClick={()=>onMeasure()}>{l.editSteps}</button><button className={buttonClass} onClick={onDetails}>{l.advanced}</button></div>
  </section>;
}
