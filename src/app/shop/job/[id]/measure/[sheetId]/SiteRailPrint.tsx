import {attachedCuts} from '@/lib/shop/measure-attached-fab';
import {attachedFabLabels} from '@/lib/shop/measure-attached-fab-i18n';
import type {SiteModel} from '@/lib/shop/measure-site';
import {siteRailLayout,siteRailProblems,siteRailVerified} from '@/lib/shop/measure-site-rails';
import {siteRailLabels} from '@/lib/shop/measure-site-rails-i18n';
import {mt} from '@/lib/shop/measure-i18n';
import {formatIn} from '@/lib/shop/measure-parse';
export default function SiteRailPrint({site,lang}:{site:SiteModel;lang:string}){
 const l=siteRailLabels(lang),f=attachedFabLabels(lang);
 if(!site.rails?.length)return null;
 return <section style={{breakBefore:'page'}}><h3 style={{fontSize:18,fontWeight:800}}>{l.title}</h3><p>{l.layout}</p>{site.rails.map((r,i)=>{const g=siteRailLayout(site,r),cuts=attachedCuts(site,r,g);return <article key={r.id} style={{border:'1px solid #cbd5e1',padding:12,marginTop:12,overflowWrap:'anywhere'}}>
  <h4 style={{fontWeight:800}}>SR{i+1} · {r.label} · {siteRailVerified(site,r)?l.verified:l.unverified}</h4>
  {(['start','end'] as const).map(which=>{const e=r[which],h=site.objects.find(o=>o.id===e.objectId);return <p key={which}><strong>{l[which]}: </strong>{h?.label||l.missing} · {l[e.face]} · {e.face==='radial'?`${e.angle}°`:`${e.along*100}%`} · {l.elevation}: {e.elevation||'?'} · {l.connection}: {e.connection||l.unknown}</p>;})}
  <p>{l.height}: {r.height||'?'} · {l.bottom}: {r.bottomClearance||'?'}</p>
  {g&&<p>{l.horizontal}: {formatIn(g.horizontal)} · {l.rise}: {g.rise<0?'−':''}{formatIn(Math.abs(g.rise))} · {l.length}: {formatIn(g.length)} · {l.pitch}: {g.pitch.toFixed(2)}°</p>}
  <p>{l.infill}: {r.infill?l[r.infill]:l.unknown} · {l.profiles}: {r.profiles||l.unknown}</p>{r.notes&&<p>{l.notes}: {r.notes}</p>}
  {r.fabrication&&<><p>{f.material}: {r.fabrication.material||'?'} · {f.welds}: {r.fabrication.welds||'?'}</p>{r.fabrication.secondTop&&<p>{f.secondTop} · {f.secondDrop}: {r.fabrication.secondTop.drop||'?'} · {f.secondHint}</p>}<p>{f.startGap}: {r.fabrication.startGap||'?'} · {f.endGap}: {r.fabrication.endGap||'?'} · {f.picketGap}: {r.fabrication.picketGap||'?'}</p></>}
  {!!cuts.parts.length&&<><p>{f.draft}</p><p>{f.gap}: {cuts.clearGap!.toFixed(4)}″</p><table style={{width:'100%',fontSize:10,borderCollapse:'collapse'}}><thead><tr>{[f.mark,f.profile,f.edge,f.stock,f.angle,f.station].map(h=><th key={h} style={{padding:5,border:'1px solid #cbd5e1'}}>{h}</th>)}</tr></thead><tbody>{cuts.parts.map(p=><tr key={p.mark}>{[p.mark,p.profile,p.edgeLength.toFixed(4),p.stockLength.toFixed(4),p.angle.toFixed(3),p.station?.toFixed(4)||'—'].map((v,i)=><td key={i} style={{padding:5,border:'1px solid #cbd5e1'}}>{v}</td>)}</tr>)}</tbody></table></>}
  {siteRailProblems(site,r).map(issue=><p key={issue} style={{color:'#92400e'}}>{mt(lang,issue)}</p>)}
 </article>;})}</section>;
}
