'use client';
import {createContext,useCallback,useContext,useEffect,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import type {MeasureData,MeasureShape} from '@/lib/shop/measure';
import SceneViewport,{type SceneViewportProps} from './SceneViewport';
import SiteDrawing from './SiteDrawing';
import SketchZoom from './SketchZoom';
import {useDrawingPinch} from './useDrawingPinch';
type Registration={token:object;props:SceneViewportProps};
const SceneContext=createContext<((registration:Registration|null,token:object)=>void)|null>(null);
/** Editors register interactions, while the physical renderer and camera stay mounted. */
export function WorkspaceScene(props:SceneViewportProps){
 const register=useContext(SceneContext),token=useRef({});
 useLayoutEffect(()=>{register?.({token:token.current,props},token.current);});
 useLayoutEffect(()=>{const id=token.current;return()=>register?.(null,id);},[register]);
 return register?null:<SceneViewport {...props}/>;
}
/**
 * The measuring workspace. The scene is the star: phone — controls above, a
 * tall 3D view, the next-measurement card right under it, then the selected
 * tool scrolling beneath. Tablet/desktop (≥1024): scene + next card on the
 * left (sticky), controls and tool on the right. `wide` hides the scene (it
 * stays mounted) and gives the content full width.
 */
export default function ProWorkspace({data,lang,shape,children,toolbar,lead,nav,wide=false,stacked=false,onSelect,onPostDrop,focus}:{/** The step face the Next card is on, lit in the 3D. */focus?:SceneViewportProps['focus'];/** One column with the scene on top (sheets whose own form needs the full width). */stacked?:boolean;onPostDrop?:SceneViewportProps['onPostDrop'];onSelect?:SceneViewportProps['onSelect'];data:MeasureData;shape?:MeasureShape;lang:string;children:ReactNode;toolbar?:ReactNode;lead?:ReactNode;nav?:ReactNode;wide?:boolean}){
 const [active,setActive]=useState<Registration|null>(null),[reference,setReference]=useState(false),[zoom,setZoom]=useState(1);
 const register=useCallback((next:Registration|null,token:object)=>setActive(old=>next||(!old||old.token===token?null:old)),[]);
 const viewport=useRef<HTMLDivElement>(null),drawing=useRef<HTMLDivElement>(null);useDrawingPinch(viewport,drawing,zoom,setZoom,reference);
 const props=active?.props,select=props?.onSelect||onSelect;
 const scene=useRef<HTMLDivElement>(null);
 const placement=props?.wallPlacement?'wall':props?.groundPick?'ground':props?.surfacePick?'surface':'';
 useEffect(()=>{if(placement)scene.current?.scrollIntoView?.({block:'start',behavior:'smooth'});},[placement]);
 const tx=(en:string,pt:string,es:string)=>lang==='pt'?pt:lang==='es'?es:en;
 return <SceneContext.Provider value={register}><section aria-label={tx('Measuring workspace','Área de medição','Área de medición')} className={wide||stacked?'space-y-3':'grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(340px,410px)] lg:grid-rows-[auto_1fr] lg:gap-4'}>
  {(nav||toolbar)&&<div className={wide||stacked?'min-w-0 space-y-3':'min-w-0 space-y-3 lg:col-start-2 lg:row-start-1'}>{nav}{!wide&&toolbar}</div>}
  <div className={stacked?'min-w-0 space-y-3':'min-w-0 space-y-3 lg:sticky lg:top-[72px] lg:col-start-1 lg:row-span-2 lg:row-start-1'}>
  <div ref={scene} hidden={wide} className="relative min-w-0 scroll-mt-16" role="region" aria-label="Job scene">
   {reference&&<div className="mb-2 flex justify-end"><button type="button" className="min-h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700" onClick={()=>setReference(false)}>3D</button></div>}
   <div hidden={reference}><SceneViewport {...props} focus={props?.focus??focus} shape={props?.shape??shape} onPostDrop={props?.onPostDrop||onPostDrop} onSelect={select} data={data} lang={lang} compact={!stacked} onUnavailable={()=>setReference(true)} menuExtra={<button type="button" className="min-h-11 rounded-lg border border-slate-400/30 px-3 text-sm font-semibold" onClick={()=>setReference(true)}>{tx('2D reference drawing','Desenho de referência 2D','Dibujo de referencia 2D')}</button>}/></div>
   {reference&&<div className="rounded-2xl border bg-white p-2">{props?.groundPick&&<p role="status" className="mb-2 text-sm text-slate-600">{tx('Top view: tap the ground to position. Check elevation in the dimensions.','Planta: toque no chão para posicionar. Confira a elevação nas medidas.','Planta: toque el suelo para ubicar. Verifique la elevación en las medidas.')}</p>}<SketchZoom zoom={zoom} onChange={setZoom} lang={lang} light/><div ref={viewport} className="max-h-[32dvh] overflow-auto lg:max-h-[60dvh]"><div ref={drawing} style={{width:`${zoom*100}%`}}><SiteDrawing data={data} view={props?.groundPick?'plan':'iso'} move={props?.groundPick} onMove={(x,y)=>select?.({point:{x,y,z:0}})} draftObjects lang={lang} selected={props?.selectedId?.replace(/^site:/,'')} wallPlacement={props?.wallPlacement} wallPlacementSegment={props?.wallPlacementSegment} onWallEdge={props?.onWallEdge} onSelect={siteId=>select?.({siteId})} onSurface={props?.groundPick?undefined:(segmentIndex,stepIndex)=>select?.({segmentIndex,stepIndex})} onMember={(railId,part,role)=>select?.({railId,part,role})}/></div></div></div>}
  </div>
  {lead}
  </div>
  <div className={wide||stacked?'min-w-0':'min-w-0 rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 lg:col-start-2 lg:row-start-2'} aria-label="Selection tools">{children}</div>
 </section></SceneContext.Provider>;
}
