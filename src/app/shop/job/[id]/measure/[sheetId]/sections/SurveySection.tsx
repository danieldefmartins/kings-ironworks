'use client';
import {useEffect,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import type {MeasureData} from '@/lib/shop/measure';
import {ACTIONS,DEFECTS,JOB_TYPES,ROUTES,actionTotals,deliveryWarnings,newCondition,setSurveyJobType,secondResult,surveyDimensions,surveyFor,verifiedBy,type ConditionItem,type MeasureSurvey,type SecondMeasure} from '@/lib/shop/measure-survey';
import {surveyText} from '@/lib/shop/measure-survey-i18n';
import {formatIn,showMeas} from '@/lib/shop/measure-parse';
import {InfoHint} from '../fields';
import {useShowMeas} from '../MeasUnits';

// Condition survey, install access and second measure, shared by every shape.
// Lists stay compact — one row per item — and each item edits in a bottom
// sheet with big tappable choices, so a porch survey is taps, not typing.

function dimensionLabel(row:SecondMeasure,data:MeasureData,lang:string){
  const dimension=row.source?surveyDimensions(data).find(d=>d.source===row.source):null;
  return dimension?dimension.keys.map(k=>surveyText(lang,k)).join(' · '):row.label||surveyText(lang,'dimension');
}
const tone:Record<string,string>={green:'bg-green-50 text-green-800',yellow:'bg-amber-50 text-amber-900',red:'bg-red-50 text-red-700',stale:'bg-amber-50 text-amber-900',pending:'bg-slate-100 text-slate-600'};
const SEVERITY_DOT:Record<ConditionItem['severity'],string>={minor:'bg-yellow-400',major:'bg-orange-500',unsafe:'bg-red-600'};
const SEVERITY_ON:Record<ConditionItem['severity'],string>={minor:'bg-yellow-400 text-yellow-950',major:'bg-orange-500 text-white',unsafe:'bg-red-600 text-white'};
const input='min-h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100';
const caption='px-1 pb-2 pt-1 text-[13px] font-semibold uppercase tracking-wide text-slate-500';
const dateFmt=(lang:string,iso:string)=>new Date(iso).toLocaleString(lang==='pt'?'pt-BR':lang==='es'?'es':'en-US');

// Upload completion precedes the sheet autosave. Retry the authorized sheet-photo
// endpoint briefly so a newly attached photo is not left broken until reload.
function SurveyPhoto({src,alt,style,className='max-h-48 rounded-lg object-contain'}:{src:string;alt:string;style?:CSSProperties;className?:string}){
  const [attempt,setAttempt]=useState(0),[failed,setFailed]=useState(false);
  useEffect(()=>{
    if(!failed||attempt>=4)return;
    const timer=setTimeout(()=>{setFailed(false);setAttempt(n=>n+1);},1500);
    return()=>clearTimeout(timer);
  },[failed,attempt]);
  return <img style={style} className={className} src={`${src}&attempt=${attempt}`} alt={alt} onError={()=>setFailed(true)}/>;
}
const Chevron=()=><svg aria-hidden viewBox="0 0 8 14" className="h-3.5 w-2 shrink-0 text-slate-300"><path d="M1 1l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const Camera=()=><svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5"><path d="M4 8h3l2-3h6l2 3h3v11H4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.8"/></svg>;

/** iOS-style segmented control. */
function Segmented<T extends string>({label,value,options,onChange,allowClear=false}:{label:string;value:T|'';options:readonly [T,string][];onChange:(v:T|'')=>void;allowClear?:boolean}){
  return <div role="radiogroup" aria-label={label} className="grid gap-1 rounded-xl bg-slate-100 p-1" style={{gridTemplateColumns:`repeat(${options.length},minmax(0,1fr))`}}>
    {options.map(([v,l])=><button key={v} type="button" role="radio" aria-checked={value===v} onClick={()=>onChange(allowClear&&value===v?'':v)}
      className={`min-h-11 min-w-0 rounded-lg px-1 text-[15px] font-semibold leading-tight transition-colors ${value===v?'bg-white text-slate-900 shadow-sm':'text-slate-500'}`}>{l}</button>)}
  </div>;
}
/** Big tappable choices; the selected one fills. */
function Chips<T extends string>({label,value,options,onChange,cols=2,on}:{label:string;value:T;options:readonly [T,string][];onChange:(v:T)=>void;cols?:number;on?:(v:T)=>string}){
  return <div role="radiogroup" aria-label={label} className="grid gap-2" style={{gridTemplateColumns:`repeat(${cols},minmax(0,1fr))`}}>
    {options.map(([v,l])=><button key={v} type="button" role="radio" aria-checked={value===v} onClick={()=>onChange(v)}
      className={`min-h-12 min-w-0 rounded-xl px-3 py-2 text-left text-[15px] font-semibold leading-tight transition-colors ${value===v?(on?.(v)||'bg-indigo-600 text-white'):'bg-slate-100 text-slate-700'}`}>{l}</button>)}
  </div>;
}
function Switch({label,checked,onChange}:{label:string;checked:boolean;onChange:(v:boolean)=>void}){
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={()=>onChange(!checked)}
    className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors ${checked?'bg-green-500':'bg-slate-300'}`}>
    <span className={`absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-all ${checked?'left-[22px]':'left-[2px]'}`}/>
  </button>;
}
/** One settings row: label left, control right, hairline under. */
function Row({label,children,htmlFor}:{label:ReactNode;children:ReactNode;htmlFor?:string}){
  return <div className="flex min-h-[52px] items-center justify-between gap-3 border-b border-slate-100 px-4 py-1.5 last:border-b-0">
    {htmlFor?<label htmlFor={htmlFor} className="min-w-0 text-[15px] text-slate-900">{label}</label>:<span className="min-w-0 text-[15px] text-slate-900">{label}</span>}
    {children}
  </div>;
}
function Group({children}:{children:ReactNode}){return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">{children}</div>;}
function Collapsible({title,badge,open=false,children,below,flush=false}:{title:string;badge?:ReactNode;open?:boolean;children:ReactNode;below?:ReactNode;flush?:boolean}){
  return <details open={open||undefined} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[17px] font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
      <span className="min-w-0">{title}</span>
      <span className="flex min-w-0 items-center gap-2">{badge}<span className="text-slate-400 transition-transform group-open:rotate-90" aria-hidden><Chevron/></span></span>
    </summary>
    {below}
    <div className={flush?'border-t border-slate-100':'space-y-4 border-t border-slate-100 p-4'}>{children}</div>
  </details>;
}

/** Bottom sheet on a phone, centred card on a tablet; portalled like every sheet here. */
function Sheet({title,done,onClose,anchor,children,footer}:{title:string;done:string;onClose:()=>void;anchor:React.RefObject<HTMLElement|null>;children:ReactNode;footer?:ReactNode}){
  const theme=anchor.current?.closest('[data-shop-theme]')?.getAttribute('data-shop-theme')||'light';
  useEffect(()=>{const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',esc);return()=>window.removeEventListener('keydown',esc);},[onClose]);
  if(typeof document==='undefined')return null;
  return createPortal(<div data-shop-theme={theme} className="shop-ui fixed inset-0 z-[90] flex items-end justify-center bg-black/40 sm:items-center sm:p-6" onClick={onClose}>
    <div data-measure-ui role="dialog" aria-modal="true" aria-label={title} onClick={e=>e.stopPropagation()}
      className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white text-slate-900 shadow-2xl sm:rounded-3xl">
      <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-slate-300 sm:hidden" aria-hidden/>
      <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-2 pt-3">
        <h3 className="min-w-0 truncate text-[19px] font-bold">{title}</h3>
        <button type="button" onClick={onClose} className="min-h-11 shrink-0 rounded-full px-4 text-[17px] font-semibold text-indigo-600">{done}</button>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 pb-4 pt-1">{children}</div>
      {footer&&<div className="shrink-0 border-t border-slate-100 px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">{footer}</div>}
    </div>
  </div>,document.body);
}
function Stepper({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){
  const n=Number(value),valid=value.trim()!==''&&Number.isInteger(n)&&n>0;
  const btn='flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl font-semibold text-slate-700 disabled:opacity-40';
  return <div className="flex items-center gap-2">
    <button type="button" className={btn} aria-label={`${label} −`} disabled={!valid||n<=1} onClick={()=>onChange(String(n-1))}>−</button>
    <input aria-label={label} inputMode="numeric" className={`${input.replace('w-full ','')} w-20 text-center text-lg font-semibold tabular-nums`} value={value} maxLength={60} onChange={e=>onChange(e.target.value)}/>
    <button type="button" className={btn} aria-label={`${label} +`} onClick={()=>onChange(String(valid?n+1:1))}>+</button>
  </div>;
}

type Editing={kind:'condition';id:string}|{kind:'verify';id:string}|{kind:'addVerify'}|null;

export default function SurveySection({data,lang,set,sheetId,directSlotPhoto,slotBusy,slotErr}:{data:MeasureData;lang:string;set:(fn:(d:MeasureData)=>void)=>void;sheetId:string;directSlotPhoto:(slot:string,label:string,file:File)=>Promise<void>;slotBusy:string|null;slotErr:string|null}){
  const t=(key:string)=>surveyText(lang,key),s=surveyFor(data),a=s.access,show=useShowMeas();
  const anchor=useRef<HTMLElement>(null);
  const [editing,setEditing]=useState<Editing>(null);
  const [custom,setCustom]=useState('');
  const close=()=>setEditing(null);
  const update=(fn:(draft:MeasureSurvey)=>void)=>set(d=>{d.survey ||= surveyFor(d);fn(d.survey);});
  const dimensions=surveyDimensions(data),warnings=deliveryWarnings(data),verified=verifiedBy(data);
  const totals=actionTotals(s.conditions);
  const photoSrc=(slot:string)=>{const photo=data.photos.find(p=>p.slot===slot);return photo?`/shop/api/measure-photo?sheetId=${encodeURIComponent(sheetId)}&index=${data.photos.indexOf(photo)}&expectedPath=${encodeURIComponent(photo.path)}`:null;};
  const jobTypes=(data.fire?[...JOB_TYPES,'inspect'] as const:JOB_TYPES).map(v=>[v,t(`short_${v}`)] as [MeasureSurvey['jobType'],string]);
  const condition=editing?.kind==='condition'?s.conditions.find(c=>c.id===editing.id):undefined;
  const ci=condition?s.conditions.indexOf(condition):-1;
  const editCondition=(fn:(c:ConditionItem)=>void)=>condition&&update(d=>{const c=d.conditions.find(x=>x.id===condition.id);if(c)fn(c);});
  const row=editing?.kind==='verify'?s.verify.find(r=>r.id===editing.id):undefined;
  const editRow=(patch:Partial<SecondMeasure>)=>row&&update(d=>{const r=d.verify.find(x=>x.id===row.id);if(r)Object.assign(r,patch);});
  const addVerify=(dim?:{source:string;keys:string[];value:string},label='')=>{const id=crypto.randomUUID();update(d=>{d.verify.push({id,label:dim?dim.keys.map(t).join(' · '):label,source:dim?.source||'',original:dim?.value||'',value:'',who:'',when:'',tolerance:'widthVar'});});setCustom('');setEditing({kind:'verify',id});};
  const qtyLen=(c:ConditionItem)=>{const len=show(c.length);return c.quantity.trim()&&len?`${c.quantity} × ${len}`:c.quantity.trim()?`× ${c.quantity}`:len;};
  const warnChips=warnings.length>0&&<div role="status" className="flex flex-wrap gap-2 px-4 pb-3">{warnings.map(w=><span key={w.id} className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-sm font-semibold ${w.overweight?'bg-red-50 text-red-700':'bg-amber-50 text-amber-900'}`}><span aria-hidden className={`h-2 w-2 rounded-full ${w.overweight?'bg-red-600':'bg-amber-500'}`}/>{w.label||t('piece')} · {w.splice?`${t('splice')} (${formatIn(w.length!)})`:''}{w.splice&&w.overweight?' · ':''}{w.overweight?t('overweight'):''}</span>)}</div>;
  const numberRow=(k:'doorWidth'|'stairWidth'|'maxLength'|'maxWeight')=><Row key={k} label={t(k)} htmlFor={`survey-${k}`}><input id={`survey-${k}`} className="min-h-11 w-28 shrink-0 rounded-lg bg-transparent px-2 text-right text-[17px] tabular-nums text-slate-900 placeholder:text-slate-400 focus:bg-slate-100 focus:outline-none" placeholder={k==='maxWeight'?'lb':'0"'} value={a[k]} maxLength={60} onChange={e=>update(d=>{d.access[k]=e.target.value;})}/></Row>;
  const textRow=(k:'turningRoom'|'parking')=><div key={k} className="border-b border-slate-100 px-4 py-2 last:border-b-0"><label className="block text-[13px] text-slate-500" htmlFor={`survey-${k}`}>{t(k)}</label><input id={`survey-${k}`} className="min-h-10 w-full bg-transparent text-[17px] text-slate-900 focus:outline-none" value={a[k]} maxLength={300} onChange={e=>update(d=>{d.access[k]=e.target.value;})}/></div>;

  return <section ref={anchor} aria-label={t('condition')} className="mb-5 space-y-4 text-slate-900" data-survey>
    <div>
      <div className={caption}>{t('jobType')}</div>
      <Segmented label={t('jobType')} value={s.jobType} options={jobTypes} onChange={v=>v&&set(d=>setSurveyJobType(d,v))}/>
    </div>

    {(s.jobType==='repair'||s.jobType==='restore'||s.conditions.length>0||data.fire?.purpose==='inspect')&&<div>
      <div className="flex items-baseline justify-between px-1 pb-2 pt-1"><h3 className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">{t('condition')}</h3>{s.conditions.length>0&&<span className="text-[13px] font-semibold tabular-nums text-slate-500">{s.conditions.length}</span>}</div>
      {totals.length>0&&<div className="mb-3 rounded-2xl border border-slate-200 bg-white px-4 py-3" aria-label={t('totals')}>
        <div className="mb-1 text-[13px] font-semibold text-slate-500">{t('totals')}</div>
        {totals.map(r=><div key={r.action} className="flex min-h-9 items-center justify-between gap-3 border-b border-slate-100 last:border-b-0">
          <span className="min-w-0 text-[15px]">{t(r.action)}</span>
          <span className="shrink-0 text-right text-[15px] font-semibold tabular-nums">{r.incomplete&&<span title={t('incomplete')} aria-label={t('incomplete')} className="mr-2 inline-block h-2 w-2 rounded-full bg-amber-500 align-middle"/>}{r.quantity} {t(r.quantity===1?'item':'items')}{r.length>0?` · ${formatIn(r.length)} ${t('total')}`:''}</span>
        </div>)}
      </div>}
      <Group>
        {s.conditions.map((item,i)=>{const src=photoSrc(item.photoSlot);return <button key={item.id} type="button" data-condition-row={item.id} onClick={()=>setEditing({kind:'condition',id:item.id})}
          className="flex min-h-16 w-full items-center gap-3 border-b border-slate-100 px-4 py-2.5 text-left last:border-b-0 active:bg-slate-50">
          <span aria-label={t(item.severity)} className={`h-3 w-3 shrink-0 rounded-full ${SEVERITY_DOT[item.severity]}`}/>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2"><span className={`min-w-0 flex-1 truncate text-[16px] font-semibold ${item.severity==='unsafe'?'text-red-700':'text-slate-900'}`}>{item.location||`${t('conditionOne')} ${String(i+1).padStart(2,'0')}`}</span>{qtyLen(item)&&<span className="shrink-0 text-[15px] font-semibold tabular-nums text-slate-600">{qtyLen(item)}</span>}</span>
            <span className="block truncate text-sm text-slate-500">{t(item.defect)}{item.defect==='section_loss'&&item.sectionLoss?` ${item.sectionLoss}%`:''} → {t(item.action)}</span>
          </span>
          {src?<SurveyPhoto key={src} src={src} alt={`${t('photo')} · ${item.location||i+1}`} className="h-11 w-11 shrink-0 rounded-lg object-cover"/>:<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><Camera/></span>}
          <Chevron/>
        </button>;})}
        <button type="button" className="flex min-h-14 w-full items-center gap-3 px-4 text-left text-[16px] font-semibold text-indigo-600 disabled:opacity-40" disabled={s.conditions.length>=100}
          onClick={()=>{const id=crypto.randomUUID();update(d=>{d.conditions.push(newCondition(id));});setEditing({kind:'condition',id});}}>
          <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-lg leading-none text-white">+</span>{t('addDefect')}
        </button>
      </Group>
      {slotErr&&!condition&&<p role="alert" className="px-1 pt-2 text-sm text-red-700">{slotErr}</p>}
    </div>}

    <Collapsible title={t('access')} below={warnChips} badge={warnings.length?<span className="rounded-full bg-amber-100 px-2 py-0.5 text-sm font-semibold text-amber-900">{warnings.length}</span>:undefined}>
      <div><div className={caption}>{t('route')}</div><Chips label={t('route')} value={a.route as typeof ROUTES[number]} cols={3} options={ROUTES.map(v=>[v,t(v)] as [typeof ROUTES[number],string])} onChange={v=>update(d=>{d.access.route=d.access.route===v?'':v;})}/></div>
      <div><div className={caption}>{t('limits')}</div><Group>{(['doorWidth','stairWidth','maxLength','maxWeight'] as const).map(numberRow)}{textRow('turningRoom')}</Group></div>
      <div><div className={caption}>{t('equipment')}</div><Group>{(['lift','crane','scaffold','generator'] as const).map(k=><Row key={k} label={t(k)}><Switch label={t(k)} checked={a[k]} onChange={v=>update(d=>{d.access[k]=v;})}/></Row>)}</Group></div>
      <div><div className={caption}>{t('siteGroup')}</div><Group>
        <div className="space-y-2 border-b border-slate-100 px-4 py-3"><div className="text-[15px]">{t('permit')}</div><Segmented allowClear label={t('permit')} value={a.permit} options={(['yes','no','unknown'] as const).map(v=>[v,t(v)] as ['yes'|'no'|'unknown',string])} onChange={v=>update(d=>{d.access.permit=v;})}/></div>
        <div className="space-y-2 border-b border-slate-100 px-4 py-3"><div className="text-[15px]">{t('power')}</div><Segmented allowClear label={t('power')} value={a.power} options={(['120','240','both','none'] as const).map(v=>[v,v==='120'||v==='240'?`${v} V`:v==='both'?'120+240':t(v)] as ['120'|'240'|'both'|'none',string])} onChange={v=>update(d=>{d.access.power=v;})}/></div>
        {textRow('parking')}
      </Group></div>
      <div><div className={caption}>{t('pieces')}</div><Group>
        {a.pieces.map((p,i)=><div key={p.id} className="flex items-center gap-2 border-b border-slate-100 px-4 py-2">
          <input aria-label={t('piece')} placeholder={t('piece')} className="min-h-11 min-w-0 flex-1 bg-transparent text-[16px] font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none" value={p.label} maxLength={300} onChange={e=>update(d=>{d.access.pieces[i].label=e.target.value;})}/>
          <input aria-label={t('length')} placeholder='0"' className="min-h-11 w-20 shrink-0 rounded-lg bg-slate-100 px-2 text-right text-[16px] tabular-nums text-slate-900 focus:outline-none" value={p.length} maxLength={60} onChange={e=>update(d=>{d.access.pieces[i].length=e.target.value;})}/>
          <input aria-label={t('weight')} placeholder="lb" className="min-h-11 w-16 shrink-0 rounded-lg bg-slate-100 px-2 text-right text-[16px] tabular-nums text-slate-900 focus:outline-none" value={p.weight} maxLength={60} onChange={e=>update(d=>{d.access.pieces[i].weight=e.target.value;})}/>
          <button type="button" aria-label={`${t('remove')} ${p.label||i+1}`} className="flex h-11 w-9 shrink-0 items-center justify-center text-2xl leading-none text-slate-400" onClick={()=>update(d=>{d.access.pieces.splice(i,1);})}>×</button>
        </div>)}
        <button type="button" className="flex min-h-12 w-full items-center gap-3 px-4 text-left text-[16px] font-semibold text-indigo-600 disabled:opacity-40" disabled={a.pieces.length>=100} onClick={()=>update(d=>{d.access.pieces.push({id:crypto.randomUUID(),label:'',length:'',weight:''});})}>
          <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-lg leading-none text-white">+</span>{t('addPiece')}
        </button>
      </Group></div>
    </Collapsible>

    <Collapsible flush title={t('verify')} badge={<>{<InfoHint label={t('verify')} text={t('verifyHint')}/>}<span className={`max-w-48 truncate rounded-full px-2.5 py-1 text-sm font-semibold ${verified?tone.green:tone.pending}`}>{verified?`✓ ${t('verified')} ${verified}`:`${s.verify.length} / 5`}</span></>}>
      {s.verify.map(r=>{const result=secondResult(data,r);return <button key={r.id} type="button" data-verify-row={r.id} onClick={()=>setEditing({kind:'verify',id:r.id})} className="flex min-h-16 w-full items-center gap-3 border-b border-slate-100 px-4 py-2.5 text-left last:border-b-0 active:bg-slate-50">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-semibold">{dimensionLabel(r,data,lang)}</span>
          <span className="block truncate text-sm tabular-nums text-slate-500">{show(r.original)||'—'} → {show(r.value)||'—'}</span>
        </span>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums ${tone[result.level]}`}>{result.level==='stale'?'!':result.delta!==null?`Δ ${formatIn(result.delta)}`:'—'}</span>
        <Chevron/>
      </button>;})}
      {s.verify.length<5&&<button type="button" className="flex min-h-14 w-full items-center gap-3 px-4 text-left text-[16px] font-semibold text-indigo-600" onClick={()=>setEditing({kind:'addVerify'})}>
        <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-lg leading-none text-white">+</span>{t('addDimension')}
      </button>}
    </Collapsible>

    {condition&&<Sheet anchor={anchor} done={t('done')} onClose={close} title={condition.location.trim()||`${t('conditionOne')} ${String(ci+1).padStart(2,'0')}`}
      footer={<button type="button" className="min-h-12 w-full rounded-xl text-[17px] font-semibold text-red-600" onClick={()=>{update(d=>{d.conditions=d.conditions.filter(c=>c.id!==condition.id);});close();}}>{t('remove')}</button>}>
      <label className="block space-y-1.5"><span className="block text-[13px] font-semibold text-slate-500">{t('location')}</span><input className={input} value={condition.location} maxLength={300} onChange={e=>editCondition(c=>{c.location=e.target.value;})}/></label>
      <div className="space-y-2"><div className="text-[13px] font-semibold text-slate-500">{t('severity')}</div><Chips label={t('severity')} cols={3} value={condition.severity} options={(['minor','major','unsafe'] as const).map(v=>[v,t(v)] as [ConditionItem['severity'],string])} on={v=>SEVERITY_ON[v]} onChange={v=>editCondition(c=>{c.severity=v;})}/></div>
      <div className="space-y-2"><div className="text-[13px] font-semibold text-slate-500">{t('defect')}</div><Chips label={t('defect')} value={condition.defect} options={DEFECTS.map(v=>[v,t(v)] as [ConditionItem['defect'],string])} onChange={v=>editCondition(c=>{c.defect=v;})}/></div>
      {condition.defect==='section_loss'&&<label className="block space-y-1.5"><span className="block text-[13px] font-semibold text-slate-500">{t('sectionLoss')}</span><input inputMode="decimal" className={input} value={condition.sectionLoss} maxLength={60} onChange={e=>editCondition(c=>{c.sectionLoss=e.target.value;})}/></label>}
      <div className="space-y-2"><div className="text-[13px] font-semibold text-slate-500">{t('action')}</div><Chips label={t('action')} value={condition.action} options={ACTIONS.map(v=>[v,t(v)] as [ConditionItem['action'],string])} onChange={v=>editCondition(c=>{c.action=v;})}/></div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5"><div className="text-[13px] font-semibold text-slate-500">{t('quantity')}</div><Stepper label={t('quantity')} value={condition.quantity} onChange={v=>editCondition(c=>{c.quantity=v;})}/></div>
        <label className="block min-w-32 flex-1 space-y-1.5"><span className="block text-[13px] font-semibold text-slate-500">{t('length')}</span><input className={`${input} tabular-nums`} placeholder='0"' value={condition.length} maxLength={60} onChange={e=>editCondition(c=>{c.length=e.target.value;})}/></label>
      </div>
      <div className="space-y-2">
        {(()=>{const src=photoSrc(condition.photoSlot);return src?<SurveyPhoto key={src} src={src} alt={`${t('photo')} · ${condition.location||ci+1}`} className="max-h-56 w-full rounded-xl bg-slate-100 object-contain"/>:null;})()}
        <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-100 text-[16px] font-semibold text-indigo-600"><Camera/>{slotBusy===condition.photoSlot?t('uploading'):photoSrc(condition.photoSlot)?t('retake'):t('addPhoto')}<input type="file" accept="image/*" className="sr-only" disabled={slotBusy!==null} onChange={e=>{const f=e.target.files?.[0];if(f)void directSlotPhoto(condition.photoSlot,condition.location||t('condition'),f);e.target.value='';}}/></label>
        {slotErr&&<p role="alert" className="text-sm text-red-700">{slotErr}</p>}
      </div>
    </Sheet>}

    {row&&(()=>{const result=secondResult(data,row);return <Sheet anchor={anchor} done={t('done')} onClose={close} title={dimensionLabel(row,data,lang)}
      footer={<button type="button" className="min-h-12 w-full rounded-xl text-[17px] font-semibold text-red-600" onClick={()=>{update(d=>{d.verify=d.verify.filter(r=>r.id!==row.id);});close();}}>{t('remove')}</button>}>
      {!row.source&&<label className="block space-y-1.5"><span className="block text-[13px] font-semibold text-slate-500">{t('dimension')}</span><input className={input} value={row.label} maxLength={300} onChange={e=>editRow({label:e.target.value})}/></label>}
      <div className="grid grid-cols-2 gap-3">
        <label className="block min-w-0 space-y-1.5"><span className="block text-[13px] font-semibold text-slate-500">{t('original')}</span>{row.source?<div className="flex min-h-12 items-center rounded-xl bg-slate-100 px-3 text-lg font-semibold tabular-nums">{show(row.original)||'—'}</div>:<input className={`${input} tabular-nums`} value={row.original} maxLength={60} onChange={e=>editRow({original:e.target.value,value:'',when:''})}/>}</label>
        <label className="block min-w-0 space-y-1.5"><span className="block text-[13px] font-semibold text-slate-500">{t('second')}</span><input autoFocus={!row.value} className={`${input} text-lg font-semibold tabular-nums`} placeholder='0"' value={row.value} maxLength={60} onChange={e=>{const v=e.target.value;editRow({value:v,when:v.trim()?new Date().toISOString():''});}}/></label>
      </div>
      <p role="status" className={`flex min-h-12 items-center justify-between gap-3 rounded-xl px-4 text-[15px] font-semibold ${tone[result.level]}`}><span>{t(result.level)}</span>{result.delta!==null&&<span className="tabular-nums">Δ {formatIn(result.delta)}</span>}</p>
      {result.level==='stale'&&result.current!==undefined&&<button type="button" className="min-h-12 w-full rounded-xl bg-slate-100 text-[16px] font-semibold text-indigo-600" onClick={()=>editRow({original:result.current!,value:'',who:'',when:''})}>{t('rebase')} · {show(result.current)}</button>}
      <div className="space-y-1.5"><label className="block space-y-1.5"><span className="block text-[13px] font-semibold text-slate-500">{t('who')}</span><input className={input} value={row.who} maxLength={120} onChange={e=>editRow({who:e.target.value.slice(0,120)})}/></label>{row.when&&<p className="px-1 text-sm text-slate-500">{t('when')}: {dateFmt(lang,row.when)}</p>}</div>
      <div className="space-y-2"><div className="text-[13px] font-semibold text-slate-500">{t('tolerance')}</div><Chips label={t('tolerance')} value={row.tolerance} options={(['widthVar','riseSum','runSum','rake'] as const).map(v=>[v,t(v)] as [SecondMeasure['tolerance'],string])} onChange={v=>editRow({tolerance:v})}/></div>
    </Sheet>;})()}

    {editing?.kind==='addVerify'&&<Sheet anchor={anchor} done={t('done')} onClose={close} title={t('addDimension')}>
      {(()=>{const free=dimensions.filter(d=>!s.verify.some(r=>r.source===d.source));return free.length>0&&<div><div className={caption}>{t('available')}</div><Group>{free.map(d=><button key={d.source} type="button" onClick={()=>addVerify(d)} className="flex min-h-14 w-full items-center gap-3 border-b border-slate-100 px-4 py-2 text-left last:border-b-0 active:bg-slate-50">
        <span className="min-w-0 flex-1 truncate text-[16px]">{d.keys.map(t).join(' · ')}</span>
        <span className="shrink-0 text-[16px] font-semibold tabular-nums">{show(d.value)}</span><Chevron/>
      </button>)}</Group></div>;})()}
      <div><div className={caption}>{t('custom')}</div><div className="flex gap-2"><input aria-label={t('custom')} className={input} value={custom} maxLength={300} onChange={e=>setCustom(e.target.value)}/><button type="button" aria-label={t('addDimension')} disabled={!custom.trim()} className="min-h-12 shrink-0 rounded-xl bg-indigo-600 px-4 text-[16px] font-semibold text-white disabled:opacity-40" onClick={()=>addVerify(undefined,custom.trim())}>+</button></div></div>
    </Sheet>}
  </section>;
}

/** Same model in live print and immutable revision print; never editable. */
export function SurveyPrint({data,lang,sheetId,rev}:{data:MeasureData;lang:string;sheetId:string;rev?:number}){
  const t=(key:string)=>surveyText(lang,key),s=surveyFor(data),a=s.access,verified=verifiedBy(data);
  const m=(v:string)=>showMeas(v,data.units||'in')||'—';
  return <section style={{marginTop:20}} data-survey-print><h3 style={{fontWeight:800,borderBottom:'1px solid #b8860b',paddingBottom:5}}>{t('jobType')}: {t(s.jobType)}</h3>
    {s.conditions.length>0&&<><h4 style={{fontWeight:700,marginTop:12}}>{t('condition')}</h4>{s.conditions.map((r,i)=>{const index=data.photos.findIndex(p=>p.slot===r.photoSlot);return <div key={r.id} style={{breakInside:'avoid',marginTop:8,padding:8,border:'1px solid #ddd',color:r.severity==='unsafe'?'#b91c1c':undefined}}><strong>{i+1}. {r.location||'—'} · {t(r.severity)}</strong><p>{t(r.defect)}{r.defect==='section_loss'?` ${r.sectionLoss||'—'}%`:''} · {t(r.action)} · {t('quantity')}: {r.quantity||'—'} · {t('length')}: {m(r.length)}</p>{index>=0?<SurveyPhoto key={data.photos[index].path} alt={`${t('photo')} ${i+1}`} style={{maxHeight:120,maxWidth:200,marginTop:6}} src={`/shop/api/measure-photo?sheetId=${encodeURIComponent(sheetId)}&index=${index}&expectedPath=${encodeURIComponent(data.photos[index].path)}${rev?`&rev=${rev}`:''}`}/>:<p>{t('photo')}: {t('notRecorded')}</p>}</div>;})}<h4 style={{fontWeight:700,marginTop:10}}>{t('totals')}</h4>{actionTotals(s.conditions).map(r=><p key={r.action}>{t(r.action)}: {r.quantity} {t('items')}{r.length?` · ${formatIn(r.length)} ${t('total')}`:''}{r.incomplete?` · ${t('incomplete')}`:''}</p>)}</>}
    <div style={{marginTop:12,breakInside:'avoid'}}><h4 style={{fontWeight:700}}>{t('access')}</h4><p>{t('route')}: {a.route?t(a.route):'—'} · {t('permit')}: {a.permit?t(a.permit):'—'} · {t('power')}: {a.power?(a.power==='120'||a.power==='240'?`${a.power} V`:t(a.power)):'—'}</p>{(['doorWidth','stairWidth','turningRoom','maxLength','maxWeight','parking'] as const).map(k=><p key={k}>{t(k)}: {k==='doorWidth'||k==='stairWidth'||k==='maxLength'?m(a[k]):a[k]||'—'}</p>)}<p>{(['lift','crane','scaffold','generator'] as const).map(k=>`${t(k)}: ${a[k]?t('yes'):'—'}`).join(' · ')}</p>{a.pieces.map(p=><p key={p.id}>{p.label||t('piece')} · {t('length')}: {m(p.length)} · {t('weight')}: {p.weight||'—'}</p>)}{deliveryWarnings(data).map(w=><p key={w.id} style={{color:'#92400e',fontWeight:700}}>{w.label||t('piece')} · {w.splice?t('splice'):''}{w.overweight?` · ${t('overweight')}`:''}</p>)}</div>
    {!!s.verify.length&&<div style={{marginTop:12}}><h4 style={{fontWeight:700}}>{t('verify')} {verified?`· ${t('verified')} ${verified}`:''}</h4>{s.verify.map(r=>{const result=secondResult(data,r);return <p key={r.id} style={{breakInside:'avoid',color:result.level==='green'?'#166534':result.level==='red'?'#b91c1c':'#92400e'}}><strong>{dimensionLabel(r,data,lang)}</strong>: {m(r.original)} → {m(r.value)} · {t(result.level)}{result.delta!==null?` · Δ ${formatIn(result.delta)}`:''} · {t(r.tolerance)} · {r.who||'—'} · {r.when?dateFmt(lang,r.when):'—'}</p>;})}</div>}
  </section>;
}
