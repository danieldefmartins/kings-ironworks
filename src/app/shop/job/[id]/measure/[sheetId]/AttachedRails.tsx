"use client";
import AttachedFabrication from './AttachedFabrication';
import {useState} from 'react';
import type {MeasureData} from '@/lib/shop/measure';
import {newSiteModel} from '@/lib/shop/measure-site';
import {newSiteRail,reuseSiteRail,railHosts,siteRailLayout,siteRailProblems,siteRailSignature,siteRailVerified,type SiteRail,type SiteRailEnd} from '@/lib/shop/measure-site-rails';
import {siteRailLabels} from '@/lib/shop/measure-site-rails-i18n';
import {formatIn} from '@/lib/shop/measure-parse';
import {mt} from '@/lib/shop/measure-i18n';

const field='mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900';
const button='min-h-12 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm disabled:opacity-40';
export type PanelStage = 'design'|'members'|'review';
export default function AttachedRails({data,set,lang,stage:controlledStage,onStageChange,autoSelect=false}:{stage?:PanelStage;onStageChange?:(stage:PanelStage)=>void;autoSelect?:boolean;data:MeasureData;set:(fn:(d:MeasureData)=>void)=>void;lang:string}){
 const l=siteRailLabels(lang),site=data.site,rails=site?.rails||[],hosts=railHosts(site);
 const [localStage,setLocalStage]=useState<PanelStage>('design');
 const stage=controlledStage??localStage;
 const setStage=(next:PanelStage)=>{setLocalStage(next);onStageChange?.(next);};
 const [selected,select]=useState(autoSelect?rails[0]?.id||'':''),[removed,setRemoved]=useState<SiteRail|null>(null);
 const rail=rails.find(r=>r.id===selected),layout=rail?siteRailLayout(site,rail):null;
 function update(patch:Partial<SiteRail>){if(!rail)return;set(d=>{const item=d.site?.rails?.find(r=>r.id===rail.id);if(item)Object.assign(item,patch,{id:rail.id,checkedSignature:''});});}
 const text=(key:'label'|'height'|'bottomClearance',label:string)=><label className="block text-sm font-semibold text-slate-600">{label}<input className={field} value={rail?.[key]||''} maxLength={key==='label'?80:40} onChange={e=>update({[key]:e.target.value})}/></label>;
 function endpoint(which:'start'|'end'){
  if(!rail)return null;
  const end=rail[which],host=hosts.find(o=>o.id===end.objectId);
  const change=(patch:Partial<SiteRailEnd>)=>update({[which]:{...end,...patch}});
  return <fieldset className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3"><legend className="px-1 font-bold text-slate-900">{l[which]}</legend>
   <label className="block text-sm font-semibold text-slate-600">{l.host}<select className={field} value={end.objectId} onChange={e=>{const o=hosts.find(o=>o.id===e.target.value);change({objectId:e.target.value,face:o?.section==='round'?'radial':'near'});}}><option value="">{l.choose}</option>{end.objectId&&!host&&<option value={end.objectId}>{l.missing}</option>}{hosts.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
   <label className="mt-3 block text-sm font-semibold text-slate-600">{l.face}<select className={field} value={(host?.section==='round')===(end.face==='radial')?end.face:''} onChange={e=>change({face:e.target.value as SiteRailEnd['face']})}><option value="" disabled>—</option>{(host?.section==='round'?['radial'] as const:['left','right','near','far'] as const).map(f=><option key={f} value={f}>{l[f]}</option>)}</select></label>
   <label className="mt-3 block text-sm font-semibold text-slate-600">{host?.section==='round'?l.angle:l.along}<input className={field} type="number" min={host?.section==='round'?-360:0} max={host?.section==='round'?360:100} step="any" value={host?.section==='round'?end.angle:Math.round(end.along*10000)/100} onChange={e=>{if(e.target.value==='')return;const n=Number(e.target.value);if(!Number.isFinite(n))return;if(host?.section==='round'&&Math.abs(n)<=360)change({angle:n});else if(host?.section!=='round'&&n>=0&&n<=100)change({along:n/100});}}/></label>
   <label className="mt-3 block text-sm font-semibold text-slate-600">{l.elevation}<input className={field} value={end.elevation} maxLength={40} onChange={e=>change({elevation:e.target.value})}/><span className="mt-1 block text-xs font-normal">{l.elevationHint}</span></label>
   <label className="mt-3 block text-sm font-semibold text-slate-600">{l.connection}<textarea className={field} rows={3} value={end.connection} maxLength={1000} onChange={e=>change({connection:e.target.value})}/></label>
  </fieldset>;
 }
 return <section aria-label={l.title} className="mt-4 rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
  <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold text-slate-900">{l.title}</h3><button type="button" className={button} disabled={hosts.length===0||rails.length>=100} onClick={()=>{const item=newSiteRail(crypto.randomUUID(),`${l.title} ${rails.length+1}`);set(d=>{d.site??=newSiteModel();d.site.rails??=[];d.site.rails.push(item);});select(item.id);setStage('design');}}>＋ {l.add}</button></div>
  <p className="mt-2 text-sm text-slate-600">{l.hint}</p>{!hosts.length&&<p className="mt-2 text-sm text-amber-800">{l.empty}</p>}
  {rails.length>0&&<div className="my-3 grid gap-2 sm:grid-cols-2">{rails.map((r,i)=><button type="button" key={r.id} aria-pressed={r.id===selected} className={`rounded-xl border p-3 text-left ${r.id===selected?'border-indigo-400 bg-indigo-50':'border-slate-200'}`} onClick={()=>select(r.id)}><strong className="block text-slate-900">SR{i+1} · {r.label}</strong><span className={`text-xs ${siteRailVerified(site,r)?'text-emerald-700':'text-amber-800'}`}>{siteRailVerified(site,r)?l.verified:l.unverified}</span></button>)}</div>}
  {rail&&<div className="mt-4 space-y-4">
   <nav aria-label={l.flow} className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1">{(['design','members','review'] as const).map((step,i)=><button type="button" key={step} aria-pressed={stage===step} className={`min-h-14 rounded-xl px-2 py-2 text-sm font-bold ${stage===step?'bg-white text-indigo-700 shadow-sm':'text-slate-600'}`} onClick={()=>setStage(step)}>{i+1}. {l[step]}</button>)}</nav>
   <div hidden={stage!=='design'} className="space-y-4">{text('label',l.name)}<p className="text-xs text-slate-500">{l.units} {l.supportHint}</p><div className="grid gap-3 lg:grid-cols-2">{endpoint('start')}{endpoint('end')}</div><div className="grid gap-3 sm:grid-cols-2">{text('height',l.height)}{text('bottomClearance',l.bottom)}</div>
   <label className="block text-sm font-semibold text-slate-600">{l.infill}<select className={field} value={rail.infill} onChange={e=>update({infill:e.target.value as SiteRail['infill']})}><option value="">{l.optional}</option>{(['pickets','glass','cable','mesh','solid','custom'] as const).map(v=><option key={v} value={v}>{l[v]}</option>)}</select></label>
   <details className="rounded-xl border border-slate-200 p-3"><summary className="min-h-10 cursor-pointer font-semibold text-slate-700">{l.extras}{rail.profiles||rail.notes?' •':''}</summary>{(['profiles','notes'] as const).map(key=><label key={key} className="block text-sm font-semibold text-slate-600">{l[key]}<textarea className={field} rows={2} value={rail[key]} maxLength={1000} onChange={e=>update({[key]:e.target.value})}/></label>)}</details>
   </div>
   {layout&&<div className="rounded-2xl bg-indigo-50 p-3"><h4 className="mb-2 text-sm font-bold text-indigo-900">{l.dimensions}</h4><dl className="grid grid-cols-2 gap-3">{[[l.horizontal,formatIn(layout.horizontal)],[l.rise,`${layout.rise<0?'−':''}${formatIn(Math.abs(layout.rise))}`],[l.length,formatIn(layout.length)],[l.pitch,`${layout.pitch.toFixed(2)}°`]].map(([label,value])=><div key={label}><dt className="text-xs text-indigo-700">{label}</dt><dd className="text-lg font-bold text-indigo-950">{value}</dd></div>)}</dl></div>}
   <div hidden={stage!=='review'}><label className="flex gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700"><input className="mt-1 size-5 shrink-0" type="checkbox" checked={siteRailVerified(site,rail)} disabled={!layout||!site?.datum.trim()||[rail.start,rail.end].some(e=>{const h=hosts.find(o=>o.id===e.objectId);return !h?.verified||h.source==='unknown';})} onChange={e=>{const checked=e.target.checked;set(d=>{const r=d.site?.rails?.find(r=>r.id===rail.id);if(r)r.checkedSignature=checked?siteRailSignature(d.site,r):'';});}}/><span><strong className="block">{l.check}</strong>{l.checkHint}</span></label></div>
   <div hidden={stage==='design'}><AttachedFabrication mode={stage==='review'?'review':'members'} site={site} rail={rail} lang={lang} onChange={fabrication=>update({fabrication})} onReview={signature=>set(d=>{const r=d.site?.rails?.find(r=>r.id===rail.id);if(r?.fabrication)r.fabrication.reviewedSignature=signature;})}/></div>
   <ul hidden={stage!=='review'||!siteRailProblems(site,rail).length} className="space-y-1 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{siteRailProblems(site,rail).map(issue=><li key={issue}>{mt(lang,issue)}</li>)}</ul>
   {stage!=='review'&&<button type="button" className="min-h-12 w-full rounded-xl bg-indigo-600 px-4 font-bold text-white" onClick={()=>setStage(stage==='design'?'members':'review')}>{l.next}: {stage==='design'?l.members:l.review} →</button>}
   <button type="button" className={button} disabled={rails.length>=100} onClick={()=>{const copy=reuseSiteRail(rail,crypto.randomUUID(),`${rail.label} · ${l.copy}`);set(d=>{d.site?.rails?.push(copy);});select(copy.id);setStage('design');}}>{l.reuse}</button>
   <button type="button" className={`${button} !text-red-700`} onClick={()=>{if(!window.confirm(l.confirm))return;setRemoved(rail);set(d=>{if(d.site?.rails)d.site.rails=d.site.rails.filter(r=>r.id!==rail.id);});select('');}}>{l.remove}</button>
  </div>}
  {removed&&<button type="button" className={`${button} mt-3`} disabled={rails.length>=100} onClick={()=>{set(d=>{d.site??=newSiteModel();d.site.rails??=[];d.site.rails.push(removed);});select(removed.id);setRemoved(null);}}>{l.restore}: {removed.label}</button>}
  {rails.length>0&&<p className="mt-3 text-xs text-slate-600">{l.layout}</p>}
 </section>;
}
