import type {SiteModel} from '@/lib/shop/measure-site';
import {siteRailLayout,siteRailProblems,siteRailVerified} from '@/lib/shop/measure-site-rails';
import {siteRailLabels} from '@/lib/shop/measure-site-rails-i18n';
import {mt} from '@/lib/shop/measure-i18n';
import {formatIn} from '@/lib/shop/measure-parse';
export default function SiteRailPrint({site,lang}:{site:SiteModel;lang:string}){
 const l=siteRailLabels(lang);
 if(!site.rails?.length)return null;
 return <section style={{breakBefore:'page'}}><h3 style={{fontSize:18,fontWeight:800}}>{l.title}</h3><p>{l.layout}</p>{site.rails.map((r,i)=>{const g=siteRailLayout(site,r);return <article key={r.id} style={{border:'1px solid #cbd5e1',padding:12,marginTop:12,overflowWrap:'anywhere'}}>
  <h4 style={{fontWeight:800}}>SR{i+1} · {r.label} · {siteRailVerified(site,r)?l.verified:l.unverified}</h4>
  {(['start','end'] as const).map(which=>{const e=r[which],h=site.objects.find(o=>o.id===e.objectId);return <p key={which}><strong>{l[which]}: </strong>{h?.label||l.missing} · {l[e.face]} · {e.face==='radial'?`${e.angle}°`:`${e.along*100}%`} · {l.elevation}: {e.elevation||'?'} · {l.connection}: {e.connection||l.unknown}</p>;})}
  <p>{l.height}: {r.height||'?'} · {l.bottom}: {r.bottomClearance||'?'}</p>
  {g&&<p>{l.horizontal}: {formatIn(g.horizontal)} · {l.rise}: {g.rise<0?'−':''}{formatIn(Math.abs(g.rise))} · {l.length}: {formatIn(g.length)} · {l.pitch}: {g.pitch.toFixed(2)}°</p>}
  <p>{l.infill}: {r.infill?l[r.infill]:l.unknown} · {l.profiles}: {r.profiles||l.unknown}</p>{r.notes&&<p>{l.notes}: {r.notes}</p>}
  {siteRailProblems(site,r).map(issue=><p key={issue} style={{color:'#92400e'}}>{mt(lang,issue)}</p>)}
 </article>;})}</section>;
}
