import type { MeasureData } from '@/lib/shop/measure';
import { siteIssues } from '@/lib/shop/measure-site';
import { mt } from '@/lib/shop/measure-i18n';
import SiteDrawing from './SiteDrawing';
import { siteLabels } from '@/lib/shop/measure-site-i18n';

/** This travels with the same immutable field revision as the existing railing sheets. */
export default function SitePrint({data,lang,revision=0}:{data:MeasureData;lang:string;revision?:number}) {
  if(!data.site?.objects.length)return null;
  const l=siteLabels(lang);
  return <section style={{breakBefore:'page'}}>
    <h2 style={{fontSize:20,fontWeight:800,marginBottom:8}}>{l.title} · REV {revision}</h2>
    <p style={{fontWeight:700}}>SITE REFERENCE · NOT A CUT DRAWING</p>
    <p><strong>{l.datum}: </strong>{data.site.datum||'VERIFY'}</p>
    <p style={{fontSize:11,margin:'8px 0'}}>X → uphill / along · Y → right / across · Z → up · INCHES · Existing site / railing references</p>
    <SiteDrawing data={data} view="plan"/>
    <SiteDrawing data={data} view="iso"/>
    {siteIssues(data.site).map(issue=><p key={issue} style={{color:'#b45309'}}>{mt(lang,issue)}</p>)}
    <h3 style={{fontWeight:800,marginTop:16,breakBefore:'page'}}>{l.objects} · INCHES · REV {revision}</h3>
    <table style={{borderCollapse:'collapse',width:'100%',fontSize:10}}><thead><tr>{[l.name,'X / Y / Z',`${l.length} × ${l.depth} × ${l.height}`,l.rotation,l.source].map(h=><th key={h} style={{padding:6,border:'1px solid #cbd5e1',textAlign:'left'}}>{h}</th>)}</tr></thead><tbody>{data.site.objects.map(o=><tr key={o.id} style={{breakInside:'avoid'}}>{[`${o.label} · ${l[o.kind]}${o.section==='round'?' · Ø':''}`,`${o.x||'?'} / ${o.y||'?'} / ${o.z||'?'}`,`${o.length||'?'} × ${o.section==='round'?o.length||'?':o.depth||'?'} × ${o.height||'?'}`,`${o.rotation}°`,`${l[o.source]} · ${o.verified?l.checked:l.needs}`].map((v,i)=><td key={i} style={{padding:6,border:'1px solid #cbd5e1',verticalAlign:'top'}}>{v}</td>)}</tr>)}</tbody></table>
    {data.site.objects.filter(o=>o.notes||o.kind==='slab'||o.photoPaths.length).map(o=><p key={o.id} style={{marginTop:8,breakInside:'avoid'}}><strong>{o.label}: </strong>{o.kind==='slab'?`${l.riseX}: ${o.riseX}; ${l.riseY}: ${o.riseY}. `:''}{o.notes}{o.photoPaths.length?` · ${l.photos}: ${o.photoPaths.map(path=>data.photos.find(p=>p.path===path)?.slot||path.split('/').at(-1)).join(', ')}`:''}</p>)}
  </section>;
}
