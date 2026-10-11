'use client';
import type {MeasureData} from '@/lib/shop/measure';
import type {SiteObject} from '@/lib/shop/measure-site';
import {wallPlacementEdges} from '@/lib/shop/measure-wall-placement';
const field='mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900';
export default function WallPlacement({data,wall,lang,onChange,registerInput}:{data:MeasureData;wall:SiteObject;lang:string;onChange:(patch:Partial<SiteObject>)=>void;registerInput?:(key:'depth'|'height',node:HTMLInputElement|null)=>void}){
 const tx=(en:string,pt:string,es:string)=>lang==='pt'?pt:lang==='es'?es:en,anchor=wall.wallAnchor;
 if(!anchor)return null;
 const edge=wallPlacementEdges(data).find(e=>e.segmentId===anchor.segmentId&&e.side===anchor.side);
 const sides={left:tx('Left','Esquerda','Izquierda'),right:tx('Right','Direita','Derecha'),start:tx('Start','Início','Inicio'),end:tx('End','Fim','Final')};
 function offset(key:'gap'|'startExtension'|'endExtension'|'baseOffset',value:string){onChange({wallAnchor:{...anchor!,[key]:value,checkedSignature:''}});}
 return <div aria-label={tx('Wall placement','Posição da parede','Posición de pared')}>
  <p className="mb-3 text-sm font-semibold text-slate-600">{sides[anchor.side]} · {edge?`${tx('Piece','Peça','Pieza')} ${edge.segmentIndex+1}`:tx('Missing supporting piece','Peça de apoio ausente','Pieza de apoyo ausente')}</p>
  <p className="mb-2 text-xs text-slate-500">{tx('Dimensions in inches','Medidas em polegadas','Medidas en pulgadas')}</p>
  <div className="grid grid-cols-2 gap-3">{(['depth','height'] as const).map(key=><label key={key} className="text-sm font-semibold text-slate-600">{key==='depth'?tx('Wall thickness','Espessura da parede','Espesor de pared'):tx('Wall height','Altura da parede','Altura de pared')}<input ref={node=>registerInput?.(key,node)} className={field} maxLength={40} value={wall[key]} onChange={e=>onChange({[key]:e.target.value})}/></label>)}</div>
  <div className="mt-3 flex gap-1" aria-label={tx('Wall edge','Borda da parede','Borde de pared')}>{(['left','right','start','end'] as const).map(side=><button type="button" key={side} aria-pressed={anchor.side===side} className={`min-h-11 min-w-0 flex-1 rounded-xl border px-2 text-sm font-semibold ${anchor.side===side?'border-indigo-400 bg-indigo-50 text-indigo-700':'border-slate-200 text-slate-700'}`} onClick={()=>onChange({wallAnchor:{...anchor,side,checkedSignature:''}})}>{sides[side]}</button>)}</div>
  <label className="mt-3 block text-sm font-semibold text-slate-600">{tx('Gap from edge · inches','Folga da borda · polegadas','Separación del borde · pulgadas')}<input className={field} value={anchor.gap} maxLength={40} onChange={e=>offset('gap',e.target.value)}/></label>
  <details className="mt-3"><summary className="min-h-11 cursor-pointer text-sm font-semibold">{tx('Extensions & base height','Extensões e altura da base','Extensiones y altura de base')}</summary><p className="mb-2 text-xs text-slate-500">{tx('Positive extends the wall; negative shortens it.','Positivo estende a parede; negativo encurta.','Positivo extiende la pared; negativo la acorta.')}</p><div className="grid grid-cols-2 gap-3">{(['startExtension','endExtension','baseOffset'] as const).map(key=><label key={key} className="text-sm text-slate-600">{key==='startExtension'?tx('Start extension / setback','Extensão / recuo inicial','Extensión / retranqueo inicial'):key==='endExtension'?tx('End extension / setback','Extensão / recuo final','Extensión / retranqueo final'):tx('Base above edge low point','Base acima do ponto baixo','Base sobre punto inferior')}<input className={field} maxLength={40} value={anchor[key]} onChange={e=>offset(key,e.target.value)}/></label>)}</div></details>
 </div>;
}
