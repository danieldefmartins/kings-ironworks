import {resolveSite} from '@/lib/shop/measure-wall-placement';
import {segmentIdAt} from '@/lib/shop/measure';
import type { MeasureData } from '@/lib/shop/measure';
import { siteIssues } from '@/lib/shop/measure-site';
import { mt } from '@/lib/shop/measure-i18n';
import SiteRailPrint from './SiteRailPrint';
import SiteDrawing from './SiteDrawing';
import { siteLabels } from '@/lib/shop/measure-site-i18n';

/** This travels with the same immutable field revision as the existing railing sheets. */
export default function SitePrint({data,lang,revision=0}:{data:MeasureData;lang:string;revision?:number}) {
  if(!data.site||(!data.site.objects.length&&!data.site.rails?.length))return null;
  const l=siteLabels(lang),site=resolveSite(data)!;
  return <section style={{breakBefore:'page'}}>
    <h2 style={{fontSize:20,fontWeight:800,marginBottom:8}}>{l.title} · {mt(lang,"revLabel")} {revision}</h2>
    <p style={{fontWeight:700}}>{lang === 'pt' ? "REFERÊNCIA DO LOCAL · NÃO É DESENHO DE CORTE" : lang === 'es' ? "REFERENCIA DEL SITIO · NO ES PLANO DE CORTE" : "SITE REFERENCE \u00b7 NOT A CUT DRAWING"}</p>
    <p><strong>{l.datum}: </strong>{site.datum||(lang==='pt'?'CONFERIR':lang==='es'?'VERIFICAR':'VERIFY')}</p>
    <p style={{fontSize:11,margin:'8px 0'}}>X / Y → site axes · Z → up · {mt(lang,"unitsIn")} · Existing site / railing references</p>
    <SiteDrawing data={data} lang={lang} view="plan"/>
    <SiteDrawing data={data} lang={lang} view="iso"/>
    {siteIssues(site).map(issue=><p key={issue} style={{color:'#b45309'}}>{mt(lang,issue)}</p>)}
    <h3 style={{fontWeight:800,marginTop:16,breakBefore:'page'}}>{l.objects} · {mt(lang,"unitsIn")} · {mt(lang,"revLabel")} {revision}</h3>
    {data.site.objects.filter(o=>o.wallAnchor).map(o=>{const a=o.wallAnchor!,index=data.segments.findIndex((s,i)=>segmentIdAt(s,i)===a.segmentId);return <p key={`placement-${o.id}`} style={{fontSize:11,margin:'8px 0',breakInside:'avoid'}}><strong>{o.label}{lang === 'pt' ? " · PAREDE RELATIVA À BORDA: " : lang === 'es' ? " · PARED RELATIVA AL BORDE: " : " \u00b7 EDGE-RELATIVE WALL: "}</strong>{index<0?(lang==='pt'?'APOIO AUSENTE':lang==='es'?'FALTA APOYO':'SUPPORT MISSING'):`${lang==='pt'?'Peça':lang==='es'?'Pieza':'Piece'} ${index+1} · ${lang==='pt'?{left:'esquerda',right:'direita',start:'início',end:'fim'}[a.side]:lang==='es'?{left:'izquierda',right:'derecha',start:'inicio',end:'final'}[a.side]:a.side}`}{lang === 'pt' ? " · folga " : lang === 'es' ? " · holgura " : " \u00b7 gap "}{a.gap||'?'}{lang === 'pt' ? " · extensão inicial " : lang === 'es' ? " · extensión inicial " : " \u00b7 start extension "}{a.startExtension||'?'}{lang === 'pt' ? " · extensão final " : lang === 'es' ? " · extensión final " : " \u00b7 end extension "}{a.endExtension||'?'}{lang === 'pt' ? " · desnível da base " : lang === 'es' ? " · desnivel de la base " : " \u00b7 base offset "}{a.baseOffset||'?'}{lang === 'pt' ? " polegadas. Posição e vão calculados pelas medidas dos apoios. Extensões positivas alongam; negativas encurtam. Altura e espessura são medidas no local." : lang === 'es' ? " pulgadas. Posición y vano calculados a partir de las medidas de los apoyos. Las extensiones positivas alargan; las negativas acortan. La altura y el espesor se miden en campo." : " inches. Position and span calculated from supporting measurements. Positive extensions lengthen; negative extensions shorten. Height and thickness are field measurements."}</p>;})}
    <table style={{borderCollapse:'collapse',width:'100%',fontSize:10}}><thead><tr>{[l.name,'X / Y / Z',`${l.length} × ${l.depth} × ${l.height}`,l.rotation,l.source].map(h=><th key={h} style={{padding:6,border:'1px solid #cbd5e1',textAlign:'left'}}>{h}</th>)}</tr></thead><tbody>{site.objects.map(o=><tr key={o.id} style={{breakInside:'avoid'}}>{[`${o.label} · ${l[o.kind]}${o.section==='round'?' · Ø':''}`,`${o.x||'?'} / ${o.y||'?'} / ${o.z||'?'}`,`${o.length||'?'} × ${o.section==='round'?o.length||'?':o.depth||'?'} × ${o.height||'?'}`,`${o.rotation}°`,`${l[o.source]} · ${o.verified?l.checked:l.needs}`].map((v,i)=><td key={i} style={{padding:6,border:'1px solid #cbd5e1',verticalAlign:'top'}}>{v}</td>)}</tr>)}</tbody></table>
    {site.objects.filter(o=>o.material||o.notes||o.kind==='slab'||o.photoPaths.length).map(o=><p key={o.id} style={{marginTop:8,breakInside:'avoid'}}><strong>{o.label}: </strong>{o.kind==='slab'?`${l.riseX}: ${o.riseX}; ${l.riseY}: ${o.riseY}. `:''}{o.material?`${lang==='pt'?'Material existente':lang==='es'?'Material existente':'Existing material / substrate'}: ${o.material}. `:''}{o.notes}{o.photoPaths.length?` · ${l.photos}: ${o.photoPaths.map(path=>data.photos.find(p=>p.path===path)?.slot||path.split('/').at(-1)).join(', ')}`:''}</p>)}
    <SiteRailPrint site={site} lang={lang}/>
  </section>;
}
