'use client';
import {useEffect,useState, type CSSProperties,type ReactNode} from 'react';
import type {MeasureData} from '@/lib/shop/measure';
import {ACTIONS,DEFECTS,JOB_TYPES,ROUTES,actionTotals,deliveryWarnings,newCondition,setSurveyJobType,secondResult,surveyDimensions,surveyFor,verifiedBy,type MeasureSurvey,type SecondMeasure} from '@/lib/shop/measure-survey';
import {surveyText} from '@/lib/shop/measure-survey-i18n';
import {formatIn} from '@/lib/shop/measure-parse';

const input='min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100';
const button='min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40';
function dimensionLabel(row:SecondMeasure,data:MeasureData,lang:string){
  const dimension=row.source?surveyDimensions(data).find(d=>d.source===row.source):null;
  return dimension?dimension.keys.map(k=>surveyText(lang,k)).join(' · '):row.label||surveyText(lang,'dimension');
}
const tone:Record<string,string>={green:'bg-green-50 text-green-800',yellow:'bg-amber-50 text-amber-900',red:'bg-red-50 text-red-700',stale:'bg-amber-50 text-amber-900',pending:'bg-slate-100 text-slate-600'};
// Upload completion precedes the sheet autosave. Retry the authorized sheet-photo
// endpoint briefly so a newly attached photo is not left broken until reload.
function SurveyPhoto({src,alt,style}:{src:string;alt:string;style?:CSSProperties}){
  const [attempt,setAttempt]=useState(0),[failed,setFailed]=useState(false);
  useEffect(()=>{
    if(!failed||attempt>=4)return;
    const timer=setTimeout(()=>{setFailed(false);setAttempt(n=>n+1);},1500);
    return()=>clearTimeout(timer);
  },[failed,attempt]);
  return <img style={style} className="max-h-48 rounded-lg object-contain" src={`${src}&attempt=${attempt}`} alt={alt} onError={()=>setFailed(true)}/>;
}
function Field({label,children}:{label:string;children:ReactNode}){return <label className="block min-w-0 space-y-1.5"><span className="block text-sm font-medium text-slate-600">{label}</span>{children}</label>;}
function Group({title,children,badge,open=false}:{title:string;children:ReactNode;badge?:ReactNode;open?:boolean}){return <details open={open||undefined} className="group rounded-2xl border border-slate-200 bg-white"><summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 p-4 text-base font-semibold text-slate-900"><span>{title}</span><span className="flex min-w-0 items-center gap-2">{badge}<span className="text-slate-400 group-open:rotate-90" aria-hidden>›</span></span></summary><div className="space-y-4 border-t border-slate-100 p-4">{children}</div></details>;}

export default function SurveySection({data,lang,set,sheetId,directSlotPhoto,slotBusy,slotErr}:{data:MeasureData;lang:string;set:(fn:(d:MeasureData)=>void)=>void;sheetId:string;directSlotPhoto:(slot:string,label:string,file:File)=>Promise<void>;slotBusy:string|null;slotErr:string|null}){
  const t=(key:string)=>surveyText(lang,key),s=surveyFor(data),a=s.access;
  const [source,setSource]=useState('');
  const update=(fn:(draft:MeasureSurvey)=>void)=>set(d=>{d.survey ||= surveyFor(d);fn(d.survey);});
  const dimensions=surveyDimensions(data),warnings=deliveryWarnings(data),verified=verifiedBy(data);
  const field=(label:string,value:string,onChange:(v:string)=>void,numeric=false)=><Field label={label}><input className={input} value={value} maxLength={numeric?60:300} onChange={e=>onChange(e.target.value)}/></Field>;
  const select=(label:string,value:string,options:readonly string[],onChange:(v:string)=>void,blank=false)=><Field label={label}><select aria-label={label} className={input} value={value} onChange={e=>onChange(e.target.value)}>{blank&&<option value="">—</option>}{options.map(v=><option key={v} value={v}>{v==='120'||v==='240'?`${v} V`:t(v)}</option>)}</select></Field>;
  const totals=actionTotals(s.conditions);
  const verification=(i:number,patch:Partial<SecondMeasure>)=>update(d=>{Object.assign(d.verify[i],patch);});
  return <section aria-label={t('condition')} className="mb-5 space-y-3 text-slate-900" data-survey>
    <div className="rounded-2xl border border-slate-200 bg-white p-4">{select(t('jobType'),s.jobType,data.fire?[...JOB_TYPES,'inspect']:JOB_TYPES,v=>set(d=>setSurveyJobType(d,v as MeasureSurvey['jobType'])))}</div>
    {(s.jobType==='repair'||s.jobType==='restore'||s.conditions.length>0||data.fire?.purpose==='inspect')&&<Group title={t('condition')} open badge={<span className="text-sm text-slate-500">{s.conditions.length||''}</span>}>
      {s.conditions.map((item,i)=>{const photo=data.photos.find(p=>p.slot===item.photoSlot);return <div key={item.id} className={`space-y-3 rounded-xl border p-3 ${item.severity==='unsafe'?'border-red-300 bg-red-50':'border-slate-200 bg-slate-50'}`}>
        <div className="flex items-center justify-between gap-2"><strong className={item.severity==='unsafe'?'text-red-700':''}>{String(i+1).padStart(2,'0')} · {t(item.severity)}</strong><button type="button" className={button} aria-label={`${t('remove')} ${i+1}`} onClick={()=>update(d=>{d.conditions.splice(i,1);})}>{t('remove')}</button></div>
        {field(t('location'),item.location,v=>update(d=>{d.conditions[i].location=v;}))}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{select(t('defect'),item.defect,DEFECTS,v=>update(d=>{d.conditions[i].defect=v as typeof item.defect;}))}{select(t('severity'),item.severity,['minor','major','unsafe'],v=>update(d=>{d.conditions[i].severity=v as typeof item.severity;}))}</div>
        {item.defect==='section_loss'&&field(t('sectionLoss'),item.sectionLoss,v=>update(d=>{d.conditions[i].sectionLoss=v;}),true)}
        {select(t('action'),item.action,ACTIONS,v=>update(d=>{d.conditions[i].action=v as typeof item.action;}))}
        <div className="grid grid-cols-2 gap-3">{field(t('quantity'),item.quantity,v=>update(d=>{d.conditions[i].quantity=v;}),true)}{field(t('length'),item.length,v=>update(d=>{d.conditions[i].length=v;}),true)}</div>
        {photo&&<SurveyPhoto key={photo.path} src={`/shop/api/measure-photo?sheetId=${encodeURIComponent(sheetId)}&index=${data.photos.indexOf(photo)}&expectedPath=${encodeURIComponent(photo.path)}`} alt={`${t('photo')} · ${item.location||i+1}`}/>}
        <label className={`${button} inline-flex cursor-pointer items-center gap-2`}>{slotBusy===item.photoSlot?t('uploading'):photo?t('retake'):t('addPhoto')}<input type="file" accept="image/*" className="sr-only" disabled={slotBusy!==null} onChange={e=>{const f=e.target.files?.[0];if(f)void directSlotPhoto(item.photoSlot,item.location||t('condition'),f);e.target.value='';}}/></label>
      </div>;})}
      {slotErr&&<p role="alert" className="text-sm text-red-700">{slotErr}</p>}
      <button type="button" className={button} disabled={s.conditions.length>=100} onClick={()=>update(d=>{d.conditions.push(newCondition(crypto.randomUUID()));})}>+ {t('addDefect')}</button>
      {totals.length>0&&<div className="space-y-2 border-t border-slate-200 pt-4"><h4 className="text-sm font-semibold">{t('totals')}</h4>{totals.map(r=><div key={r.action} className="text-sm"><div className="flex justify-between gap-3"><span>{t(r.action)}</span><strong className="text-right tabular-nums">{r.quantity} {t('items')}{r.length>0?` · ${formatIn(r.length)} ${t('total')}`:''}</strong></div>{r.incomplete&&<p className="text-amber-900">{t('incomplete')}</p>}</div>)}</div>}
    </Group>}
    <Group title={t('access')} badge={warnings.length?<span className="rounded-full bg-amber-100 px-2 py-0.5 text-sm text-amber-900">{warnings.length}</span>:undefined}>
      {select(t('route'),a.route,ROUTES,v=>update(d=>{d.access.route=v as typeof a.route;}),true)}
      <div className="grid grid-cols-2 gap-3">{(['doorWidth','stairWidth','maxLength','maxWeight'] as const).map(k=><div key={k}>{field(t(k),a[k],v=>update(d=>{d.access[k]=v;}),true)}</div>)}</div>
      {field(t('turningRoom'),a.turningRoom,v=>update(d=>{d.access.turningRoom=v;}))}
      <div className="flex flex-wrap gap-x-5 gap-y-1">{(['lift','crane','scaffold','generator'] as const).map(k=><label key={k} className="flex min-h-11 items-center gap-2 text-sm font-medium"><input type="checkbox" className="h-5 w-5 accent-indigo-600" checked={a[k]} onChange={e=>update(d=>{d.access[k]=e.target.checked;})}/>{t(k)}</label>)}</div>
      {field(t('parking'),a.parking,v=>update(d=>{d.access.parking=v;}))}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{select(t('permit'),a.permit,['yes','no','unknown'],v=>update(d=>{d.access.permit=v as typeof a.permit;}),true)}{select(t('power'),a.power,['120','240','both','none'],v=>update(d=>{d.access.power=v as typeof a.power;}),true)}</div>
      <h4 className="pt-2 text-sm font-semibold">{t('pieces')}</h4>
      {a.pieces.map((p,i)=><div key={p.id} className="space-y-3 rounded-xl bg-slate-50 p-3">{field(t('piece'),p.label,v=>update(d=>{d.access.pieces[i].label=v;}))}<div className="grid grid-cols-2 gap-3">{field(t('length'),p.length,v=>update(d=>{d.access.pieces[i].length=v;}),true)}{field(t('weight'),p.weight,v=>update(d=>{d.access.pieces[i].weight=v;}),true)}</div><button type="button" className={button} onClick={()=>update(d=>{d.access.pieces.splice(i,1);})}>{t('remove')}</button></div>)}
      <button type="button" className={button} disabled={a.pieces.length>=100} onClick={()=>update(d=>{d.access.pieces.push({id:crypto.randomUUID(),label:'',length:'',weight:''});})}>+ {t('addPiece')}</button>
    </Group>
    {warnings.map(w=><div role="status" key={w.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><strong>{w.label||t('piece')}</strong> · {w.splice?`${t('splice')} (${formatIn(w.length!)})`:''}{w.splice&&w.overweight?' · ':''}{w.overweight?t('overweight'):''}</div>)}
    <Group title={t('verify')} badge={<span className={`max-w-48 truncate rounded-full px-2 py-1 text-sm ${verified?tone.green:tone.pending}`}>{verified?`${t('verified')} ${verified}`:`${s.verify.length} / 5`}</span>}>
      <details className="text-sm text-slate-600"><summary className="min-h-11 cursor-pointer py-3">ⓘ {t('verify')}</summary>{t('verifyHint')}</details>
      {s.verify.map((row,i)=>{const result=secondResult(data,row);return <div key={row.id} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-start justify-between gap-2"><strong className="min-w-0 break-words text-sm">{dimensionLabel(row,data,lang)}</strong><button type="button" className={button} onClick={()=>update(d=>{d.verify.splice(i,1);})}>{t('remove')}</button></div>
        {!row.source&&field(t('dimension'),row.label,v=>verification(i,{label:v}))}
        <div className="grid grid-cols-2 gap-3"><Field label={t('original')}><input className={input} readOnly={!!row.source} value={row.original} maxLength={60} onChange={e=>verification(i,{original:e.target.value,value:'',when:''})}/></Field>{field(t('second'),row.value,v=>verification(i,{value:v,when:v.trim()?new Date().toISOString():''}),true)}</div>
        {field(t('who'),row.who,v=>verification(i,{who:v.slice(0,120)}))}
        {row.when&&<p className="text-sm text-slate-500">{t('when')}: {new Date(row.when).toLocaleString(lang==='pt'?'pt-BR':lang==='es'?'es':'en-US')}</p>}
        {select(t('tolerance'),row.tolerance,['riseSum','runSum','rake','widthVar'],v=>verification(i,{tolerance:v as SecondMeasure['tolerance']}))}
        <p role="status" className={`rounded-lg p-3 text-sm font-semibold ${tone[result.level]}`}>{t(result.level)}{result.delta!==null?` · Δ ${formatIn(result.delta)}`:''}</p>
        {result.level==='stale'&&result.current!==undefined&&<button type="button" className={button} onClick={()=>verification(i,{original:result.current!,value:'',who:'',when:''})}>{t('rebase')}</button>}
      </div>;})}
      {s.verify.length<5&&<div className="space-y-3"><Field label={t('choose')}><select className={input} value={source} onChange={e=>setSource(e.target.value)}><option value="">{t('custom')}</option>{dimensions.filter(d=>!s.verify.some(r=>r.source===d.source)).map(d=><option key={d.source} value={d.source}>{d.keys.map(t).join(' · ')}: {d.value}</option>)}</select></Field><button type="button" className={button} onClick={()=>{const d=dimensions.find(d=>d.source===source);update(s=>{s.verify.push({id:crypto.randomUUID(),label:d?d.keys.map(t).join(' · '):'',source:d?.source||'',original:d?.value||'',value:'',who:'',when:'',tolerance:'widthVar'});});setSource('');}}>+ {t('addDimension')}</button></div>}
    </Group>
  </section>;
}

/** Same model in live print and immutable revision print; never editable. */
export function SurveyPrint({data,lang,sheetId,rev}:{data:MeasureData;lang:string;sheetId:string;rev?:number}){
  const t=(key:string)=>surveyText(lang,key),s=surveyFor(data),a=s.access,verified=verifiedBy(data);
  return <section style={{marginTop:20}} data-survey-print><h3 style={{fontWeight:800,borderBottom:'1px solid #b8860b',paddingBottom:5}}>{t('jobType')}: {t(s.jobType)}</h3>
    {s.conditions.length>0&&<><h4 style={{fontWeight:700,marginTop:12}}>{t('condition')}</h4>{s.conditions.map((r,i)=>{const index=data.photos.findIndex(p=>p.slot===r.photoSlot);return <div key={r.id} style={{breakInside:'avoid',marginTop:8,padding:8,border:'1px solid #ddd',color:r.severity==='unsafe'?'#b91c1c':undefined}}><strong>{i+1}. {r.location||'—'} · {t(r.severity)}</strong><p>{t(r.defect)}{r.defect==='section_loss'?` ${r.sectionLoss||'—'}%`:''} · {t(r.action)} · {t('quantity')}: {r.quantity||'—'} · {t('length')}: {r.length||'—'}</p>{index>=0?<SurveyPhoto key={data.photos[index].path} alt={`${t('photo')} ${i+1}`} style={{maxHeight:120,maxWidth:200,marginTop:6}} src={`/shop/api/measure-photo?sheetId=${encodeURIComponent(sheetId)}&index=${index}&expectedPath=${encodeURIComponent(data.photos[index].path)}${rev?`&rev=${rev}`:''}`}/>:<p>{t('photo')}: {t('notRecorded')}</p>}</div>;})}<h4 style={{fontWeight:700,marginTop:10}}>{t('totals')}</h4>{actionTotals(s.conditions).map(r=><p key={r.action}>{t(r.action)}: {r.quantity} {t('items')}{r.length?` · ${formatIn(r.length)} ${t('total')}`:''}{r.incomplete?` · ${t('incomplete')}`:''}</p>)}</>}
    <div style={{marginTop:12,breakInside:'avoid'}}><h4 style={{fontWeight:700}}>{t('access')}</h4><p>{t('route')}: {a.route?t(a.route):'—'} · {t('permit')}: {a.permit?t(a.permit):'—'} · {t('power')}: {a.power?(a.power==='120'||a.power==='240'?`${a.power} V`:t(a.power)):'—'}</p>{(['doorWidth','stairWidth','turningRoom','maxLength','maxWeight','parking'] as const).map(k=><p key={k}>{t(k)}: {a[k]||'—'}</p>)}<p>{(['lift','crane','scaffold','generator'] as const).map(k=>`${t(k)}: ${a[k]?t('yes'):'—'}`).join(' · ')}</p>{a.pieces.map(p=><p key={p.id}>{p.label||t('piece')} · {t('length')}: {p.length||'—'} · {t('weight')}: {p.weight||'—'}</p>)}{deliveryWarnings(data).map(w=><p key={w.id} style={{color:'#92400e',fontWeight:700}}>{w.label||t('piece')} · {w.splice?t('splice'):''}{w.overweight?` · ${t('overweight')}`:''}</p>)}</div>
    {!!s.verify.length&&<div style={{marginTop:12}}><h4 style={{fontWeight:700}}>{t('verify')} {verified?`· ${t('verified')} ${verified}`:''}</h4>{s.verify.map(r=>{const result=secondResult(data,r);return <p key={r.id} style={{breakInside:'avoid',color:result.level==='green'?'#166534':result.level==='red'?'#b91c1c':'#92400e'}}><strong>{dimensionLabel(r,data,lang)}</strong>: {r.original||'—'} → {r.value||'—'} · {t(result.level)}{result.delta!==null?` · Δ ${formatIn(result.delta)}`:''} · {t(r.tolerance)} · {r.who||'—'} · {r.when?new Date(r.when).toLocaleString(lang==='pt'?'pt-BR':lang==='es'?'es':'en-US'):'—'}</p>;})}</div>}
  </section>;
}
