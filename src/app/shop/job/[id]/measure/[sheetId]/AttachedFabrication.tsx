"use client";
import type {SiteModel} from '@/lib/shop/measure-site';
import type {SiteRail,AttachedFab,AttachedProfile} from '@/lib/shop/measure-site-rails-schema';
import {attachedCuts,attachedCutCsv,newAttachedFab} from '@/lib/shop/measure-attached-fab';
import {siteRailLayout,siteRailSignature,siteRailVerified,siteRailFabReviewed} from '@/lib/shop/measure-site-rails';
import {attachedFabLabels} from '@/lib/shop/measure-attached-fab-i18n';
import {mt} from '@/lib/shop/measure-i18n';
const field='mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900';
export default function AttachedFabrication({site,rail,lang,mode,onChange,onReview}:{mode:'members'|'review';site:SiteModel|undefined;rail:SiteRail;lang:string;onChange:(f:AttachedFab)=>void;onReview:(signature:string)=>void}){
 const l=attachedFabLabels(lang),f=rail.fabrication,cuts=attachedCuts(site,rail,siteRailLayout(site,rail));
 const update=(patch:Partial<AttachedFab>)=>onChange({...f!,...patch,reviewedSignature:''});
 const input=(key:'startGap'|'endGap'|'picketGap'|'maxClear')=><label className="text-sm font-semibold text-slate-600">{l[key]}<input className={field} value={f![key]} maxLength={40} onChange={e=>update({[key]:e.target.value})}/></label>;
 function section(key:'top'|'secondTop'|'bottom'|'picket'){
  const p=key==='secondTop'?f!.secondTop!.profile:f![key];const change=(patch:Partial<AttachedProfile>)=>update(key==='secondTop'?{secondTop:{...f!.secondTop!,profile:{...p,...patch}}}:{[key]:{...p,...patch}});
  return <fieldset key={key} className="min-w-0 rounded-xl border border-slate-200 p-3"><legend className="px-1 font-bold text-slate-800">{l[key]}</legend><div className="grid gap-3 sm:grid-cols-2">
   {(['width','depth'] as const).map(k=><label key={k} className="text-sm text-slate-600">{key==='picket'?l[k==='width'?'picketWidth':'picketDepth']:l[k]}<input className={field} value={p[k]} maxLength={40} onChange={e=>change({[k]:e.target.value})}/></label>)}
   <label className="text-sm text-slate-600">{l.section}<select className={field} value={p.section} onChange={e=>change({section:e.target.value as AttachedProfile['section']})}><option value="">—</option><option value="solid">{l.solid}</option><option value="tube">{l.tube}</option></select></label>
   {p.section==='tube'&&<label className="text-sm text-slate-600">{l.wall}<input className={field} value={p.wall} maxLength={40} onChange={e=>change({wall:e.target.value})}/></label>}
  </div></fieldset>;
 }
 return <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><h4 className="py-2 font-bold text-slate-900">{l.title}</h4><p className="mb-3 text-sm text-slate-600">{l.hint}</p>{!f?<button type="button" className="min-h-12 rounded-xl bg-indigo-600 px-4 font-bold text-white" onClick={()=>onChange(newAttachedFab())}>{l.add}</button>:<div className="space-y-3">
  <div hidden={mode!=='members'} className="space-y-3">{section('top')}
  {f.secondTop?<div className="space-y-3 rounded-xl border border-indigo-200 p-3">{section('secondTop')}<label className="block text-sm font-semibold text-slate-600">{l.secondDrop}<input className={field} value={f.secondTop.drop} maxLength={40} onChange={e=>update({secondTop:{...f.secondTop!,drop:e.target.value}})}/></label><p className="text-sm text-slate-600">{l.secondHint}</p><button type="button" className="min-h-12 text-sm font-semibold text-red-600" onClick={()=>update({secondTop:null})}>{l.removeSecond}</button></div>:<button type="button" className="min-h-12 rounded-xl border border-slate-300 px-4 font-semibold text-slate-700" onClick={()=>update({secondTop:{profile:{width:'',depth:'',section:'',wall:''},drop:''}})}>{l.addSecond}</button>}
  {section('bottom')}{section('picket')}
  <div className="grid gap-3 sm:grid-cols-2">{(['startGap','endGap','picketGap','maxClear'] as const).map(key=><div key={key}>{input(key)}</div>)}</div>
  <label className="block text-sm font-semibold text-slate-600">{l.material}<input className={field} value={f.material} maxLength={120} onChange={e=>update({material:e.target.value})}/></label>
  <label className="block text-sm font-semibold text-slate-600">{l.welds}<textarea className={field} rows={3} value={f.welds} maxLength={1000} onChange={e=>update({welds:e.target.value})}/></label></div><div hidden={mode!=='review'} className="space-y-3">
  {cuts.issues.length?<ul className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{cuts.issues.map(i=><li key={i}>{mt(lang,i)}</li>)}</ul>:<>
   <h4 className="font-bold text-slate-800">{l.parts}</h4><p className="text-sm text-slate-700">{l.gap}: {cuts.clearGap!.toFixed(4)}″ · {cuts.stations.length} {l.picket.toLowerCase()}</p>
   <div className="max-h-80 overflow-auto rounded-xl border border-slate-200 bg-white"><table className="w-full text-left text-sm text-slate-800"><thead><tr>{[l.mark,l.edge,l.stock,l.angle].map(h=><th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{cuts.parts.map(p=><tr key={p.mark} className="border-t border-slate-100"><td className="p-2 font-semibold">{p.mark}</td><td className="p-2 tabular-nums">{p.edgeLength.toFixed(4)}″</td><td className="p-2 tabular-nums">{p.stockLength.toFixed(4)}″</td><td className="p-2 tabular-nums">{p.angle.toFixed(3)}°</td></tr>)}</tbody></table></div>
   <p className="text-xs text-slate-600">{l.draft}</p><button type="button" className="min-h-12 rounded-xl bg-indigo-600 px-4 font-bold text-white" onClick={()=>{const url=URL.createObjectURL(new Blob([attachedCutCsv(cuts.parts)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='attached-railing-cuts-draft.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>{l.download}</button>
  </>}
  <label className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700"><input type="checkbox" className="mt-1 size-5 shrink-0" checked={siteRailFabReviewed(site,rail)} disabled={!!cuts.issues.length||!siteRailVerified(site,rail)||!f.material.trim()||!f.welds.trim()||!rail.start.connection.trim()||!rail.end.connection.trim()} onChange={e=>onReview(e.target.checked?siteRailSignature(site,rail):'')}/><span><strong className="block">{l.review}</strong>{l.reviewHint}</span></label>
 </div></div>}</section>;
}
