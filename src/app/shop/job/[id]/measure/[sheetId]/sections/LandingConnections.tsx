"use client";
import type {LandingTransition,MeasureData} from '@/lib/shop/measure';
import {landingConnections,landingConnectionGeometry,transitionKey} from '@/lib/shop/measure-landings';
import {formatIn} from '@/lib/shop/measure-parse';
import {orderedPosts} from '@/lib/shop/measure-checks';
import {mt} from '@/lib/shop/measure-i18n';
import {Card,Grid,MInput,ChipRow} from '../fields';

export default function LandingConnections({data,lang,set}:{data:MeasureData;lang:string;set:(fn:(d:MeasureData)=>void)=>void}){
  const posts=orderedPosts(data);
  return <>{landingConnections(data).map((t,index)=>{
    const elbow=t.verticalAt==='lower'?110:285;
    const key=transitionKey(t),geometry=landingConnectionGeometry(data,t),joins=t.kind==='drop'||t.kind==='level';
    const edit=(field:keyof LandingTransition,value:string)=>set(d=>{
      d.landingTransitions??=[];
      let saved=d.landingTransitions.find(x=>transitionKey(x)===key);
      if(!saved){saved={...t};d.landingTransitions.push(saved);}
      Object.assign(saved,{[field]:value});
    });
    const postSelect=(field:'lowerPostId'|'upperPostId',segIdx:number,label:string)=><label className="block text-sm"><span className="mb-1 block font-semibold">{label}</span><select className="min-h-12 w-full rounded-xl border border-neutral-600 bg-neutral-950 px-3" value={t[field]} onChange={e=>edit(field,e.target.value)}><option value="">—</option>{posts.map((p,i)=>p.segIdx===segIdx&&p.pointType==='railing_post'&&p.stepIdx!==null&&(field!=='lowerPostId'||p.side===t.side)?<option key={p.id} value={p.id}>P{i+1} · {mt(lang,'step')} {p.stepIdx+1} · {p.side?mt(lang,p.side==='left'?'turnLeft':'turnRight'):'?'}</option>:null)}</select></label>;
    return <Card key={key} stage="locations" title={`${mt(lang,'landingTransitionTitle')} T${index+1} · S${t.lowerFlightIdx+1} → S${t.upperFlightIdx+1} · ${mt(lang,t.side==='left'?'turnLeft':'turnRight')}`}>
      <p className="mb-3 text-sm text-neutral-300">{mt(lang,'landingTransitionHint')}</p>
      <ChipRow label={mt(lang,'landingConnectionKind')} value={t.kind} options={['drop','level','separate','landing_posts'].map(k=>[k,mt(lang,`landingKind_${k}`)])} onChange={v=>edit('kind',v)}/>
      {joins&&<>
        <Grid>{postSelect('lowerPostId',t.lowerFlightIdx,mt(lang,'landingLowerPost'))}{postSelect('upperPostId',t.upperFlightIdx,mt(lang,'landingUpperPost'))}</Grid>
        <Grid><MInput label={mt(lang,'landingLowerReach')} hint={mt(lang,'landingReachHint')} value={t.lowerReach} onChange={v=>edit('lowerReach',v)}/><MInput label={mt(lang,'landingUpperReach')} hint={mt(lang,'landingReachHint')} value={t.upperReach} onChange={v=>edit('upperReach',v)}/></Grid>
        <ChipRow label={mt(lang,'landingHigherEnd')} value={t.higherEnd} options={['lower','upper','level'].map(k=>[k,mt(lang,`landingEnd_${k}`)])} onChange={v=>edit('higherEnd',v)}/>
        <Grid><MInput label={mt(lang,'landingHeightDifference')} hint={mt(lang,'landingHeightHint')} value={t.heightDifference} onChange={v=>edit('heightDifference',v)}/><MInput label={mt(lang,'landingHorizontalSpan')} hint={mt(lang,'landingSpanHint')} value={t.horizontalSpan} onChange={v=>edit('horizontalSpan',v)}/></Grid>
        {t.kind==='drop'&&<ChipRow label={mt(lang,'landingVerticalAt')} value={t.verticalAt} options={['lower','upper'].map(k=>[k,mt(lang,`landingEnd_${k}`)])} onChange={v=>edit('verticalAt',v)}/>}
        <svg viewBox="0 0 400 140" className="my-3 w-full max-w-md" role="img" aria-label={mt(lang,'landingTransitionDiagram')}>
          <path d={t.kind==='level'?'M 30 70 L 365 70':t.higherEnd==='lower'?`M 30 35 L ${elbow} 35 L ${elbow} 105 L 365 105`:`M 30 105 L ${elbow} 105 L ${elbow} 35 L 365 35`} fill="none" stroke="#fbbf24" strokeWidth="6"/>
          <text x={elbow+12} y="76" fill="#fff" fontSize="14">{t.heightDifference||'?'}</text><text x="145" y="132" fill="#d4d4d4" fontSize="13">{t.horizontalSpan||'?'}</text>
          <text x="25" y="20" fill="#d4d4d4" fontSize="12">S{t.lowerFlightIdx+1}</text><text x="345" y="20" fill="#d4d4d4" fontSize="12">S{t.upperFlightIdx+1}</text>
        </svg>
        {geometry&&<div className={`my-3 rounded-xl border p-3 text-sm ${geometry.provisional?'border-amber-800 text-amber-200':'border-emerald-800 text-emerald-200'}`}><strong>{mt(lang,'landingCalculated')}</strong><p>{mt(lang,'landingHeightDifference')}: {formatIn(geometry.heightDifference)} · {mt(lang,`landingEnd_${geometry.higherEnd}`)}<br/>{mt(lang,'landingHorizontalSpan')}: {formatIn(geometry.horizontalSpan)}</p>{geometry.provisional&&<p>{mt(lang,'landingMismatch')}</p>}</div>}
      </>}
      <MInput label={mt(lang,'jointNote')} hint={!joins?mt(lang,'landingSeparateHint'):undefined} value={t.note} onChange={v=>edit('note',v)}/>
    </Card>;
  })}</>;
}
