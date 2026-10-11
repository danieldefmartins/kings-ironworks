'use client';
import type {MeasureData,PostMeasure} from '@/lib/shop/measure';
import {resolveSite} from '@/lib/shop/measure-wall-placement';
import {railHosts,newSiteRailEnd} from '@/lib/shop/measure-site-rails';
import {railFaceSpan} from '@/lib/shop/measure-rail-end-position';
import {supportTerminal,type SupportAttachment} from '@/lib/shop/measure-support-attachment';
import {EndpointDistance} from './AttachedRails';
const field='mt-1 min-h-11 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm';
export default function SupportAttachmentEditor({data,post,set,lang}:{data:MeasureData;post:PostMeasure;set:(fn:(d:MeasureData)=>void)=>void;lang:string}){
 const tx=(en:string,pt:string,es:string)=>lang==='pt'?pt:lang==='es'?es:en;
 if(post.pointType==='railing_post')return null;
 const resolvedSite=resolveSite(data);
 const attachment=post.supportAttachment,hosts=railHosts(resolvedSite),host=hosts.find(h=>h.id===attachment?.objectId),span=attachment?railFaceSpan(host,attachment.face):null;
 const save=(next:SupportAttachment|null)=>set(d=>{const p=d.posts.find(p=>p.id===post.id);if(p)p.supportAttachment=next;});
 const patch=(next:Partial<SupportAttachment>)=>{if(attachment)save({...attachment,...next});};
 return <fieldset className="my-3 rounded-xl border border-neutral-700 p-3"><legend className="px-1 text-sm font-semibold">{tx('Attach rail to existing support','Ligar corrimão ao apoio existente','Unir baranda a soporte existente')}</legend>
 {!attachment?<button type="button" className="min-h-11 rounded-lg border border-neutral-600 px-3 text-sm" onClick={()=>save({...newSiteRailEnd(),gap:''})}>{tx('Choose measured column or wall','Escolher coluna ou parede medida','Elegir columna o pared medida')}</button>:<>
 <label className="block text-sm">{tx('Measured support','Apoio medido','Soporte medido')}<select className={field} value={attachment.objectId} onChange={e=>patch({objectId:e.target.value,face:'near'})}><option value="">—</option>{attachment.objectId&&!host&&<option value={attachment.objectId}>{tx('Missing support','Apoio ausente','Soporte ausente')}</option>}{hosts.filter(h=>h.section!=='round').map(h=><option key={h.id} value={h.id}>{h.label}</option>)}</select></label>
 <label className="mt-3 block text-sm">{tx('Support face','Face do apoio','Cara del soporte')}<select className={field} value={attachment.face} onChange={e=>patch({face:e.target.value as SupportAttachment['face']})}>{(['left','right','near','far'] as const).map(f=><option value={f} key={f}>{f==='left'?tx('Left','Esquerda','Izquierda'):f==='right'?tx('Right','Direita','Derecha'):f==='near'?tx('Near','Próxima','Cercana'):tx('Far','Distante','Lejana')}</option>)}</select></label>
 <EndpointDistance key={`${post.id}-${attachment.objectId}-${attachment.face}-${span?.length}-${attachment.along}`} value={span?String(Number((span.length*attachment.along).toFixed(8))):''} span={span?.length??null} label={span?.datum==='near'?tx('From near edge · inches','Da borda próxima · polegadas','Desde borde cercano · pulgadas'):tx('From left edge · inches','Da borda esquerda · polegadas','Desde borde izquierdo · pulgadas')} hint={tx('Along the selected face, in the support’s local direction.','Ao longo da face, na direção local do apoio.','Sobre la cara, en la dirección local del soporte.')} invalidLabel={tx('Invalid distance. Last saved position is unchanged.','Distância inválida. Posição salva mantida.','Distancia inválida. Se conserva la posición guardada.')} onCommit={along=>patch({along})}/>
 {(['elevation','gap','connection'] as const).map(key=><label key={key} className="mt-3 block text-sm">{key==='elevation'?tx('Rail datum above support bottom · inches','Referência do corrimão acima da base · polegadas','Referencia sobre base del soporte · pulgadas'):key==='gap'?tx('Rail end to support face gap · inches','Folga entre corrimão e apoio · polegadas','Holgura entre baranda y soporte · pulgadas'):tx('Clip, fastener and substrate detail','Detalhes de presilha, fixação e substrato','Detalle de clip, fijación y sustrato')}<input className={field} value={attachment[key]} maxLength={key==='connection'?1000:40} onChange={e=>patch({[key]:e.target.value})}/></label>)}
 <p className="mt-3 text-xs text-neutral-400">{tx('Rail height is added above this datum. Existing supports are not fabricated posts. Use a separate attached railing for a level return on another face.','A altura do corrimão é somada à referência. Apoios existentes não são postes fabricados. Use outro painel para o retorno em outra face.','La altura se suma a esta referencia. Los soportes existentes no son postes fabricados. Use otra baranda para el retorno por otra cara.')}</p>
 {supportTerminal(data,resolvedSite,post).provisional&&<p role="status" className="mt-2 text-xs text-amber-500">{tx('Unresolved connection: check support measurements, face alignment, rail datum, gap and connection detail.','Ligação não resolvida: confira medidas, alinhamento da face, referência, folga e detalhes.','Conexión sin resolver: revise medidas, alineación de cara, referencia, holgura y detalles.')}</p>}
 <button type="button" className="mt-3 min-h-11 px-2 text-sm text-red-400" onClick={()=>save(null)}>{tx('Disconnect support','Desligar apoio','Desconectar soporte')}</button>
 </>}
 </fieldset>;
}
