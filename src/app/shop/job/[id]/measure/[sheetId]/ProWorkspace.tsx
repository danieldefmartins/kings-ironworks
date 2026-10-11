'use client';
import {createContext,useCallback,useContext,useEffect,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {Box,ChevronDown} from 'lucide-react';
import type {MeasureData} from '@/lib/shop/measure';
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
const COLLAPSE_KEY='kiw.measure.sceneCollapsed';
const readCollapsed=()=>{try{return window.localStorage.getItem(COLLAPSE_KEY)==='1';}catch{return false;}};
/**
 * The measuring workspace. Phone: one column — lead (next measurement), nav,
 * toolbar, the compact 3D scene, then the selected tool. Tablet/desktop
 * (≥1024): the scene fills the left, everything else stacks on the right.
 * `wide` hides the scene (it stays mounted) and gives the content full width.
 */
export default function ProWorkspace({data,lang,children,toolbar,lead,nav,wide=false,onSelect,onPostDrop}:{onPostDrop?:SceneViewportProps['onPostDrop'];onSelect?:SceneViewportProps['onSelect'];data:MeasureData;lang:string;children:ReactNode;toolbar?:ReactNode;lead?:ReactNode;nav?:ReactNode;wide?:boolean}){
 const [active,setActive]=useState<Registration|null>(null),[reference,setReference]=useState(false),[zoom,setZoom]=useState(1),[collapsed,setCollapsed]=useState(false);
 useEffect(()=>{setCollapsed(readCollapsed());},[]);
 const toggleCollapsed=()=>setCollapsed(c=>{const next=!c;try{window.localStorage.setItem(COLLAPSE_KEY,next?'1':'0');}catch{}return next;});
 const register=useCallback((next:Registration|null,token:object)=>setActive(old=>next||(!old||old.token===token?null:old)),[]);
 const viewport=useRef<HTMLDivElement>(null),drawing=useRef<HTMLDivElement>(null);useDrawingPinch(viewport,drawing,zoom,setZoom,reference);
 const props=active?.props,select=props?.onSelect||onSelect;
 const scene=useRef<HTMLDivElement>(null);
 const placement=props?.wallPlacement?'wall':props?.groundPick?'ground':props?.surfacePick?'surface':'';
 // Placing on the scene needs the scene: open it if it was folded away.
 useEffect(()=>{if(placement){setCollapsed(false);scene.current?.scrollIntoView?.({block:'start',behavior:'smooth'});}},[placement]);
 const tx=(en:string,pt:string,es:string)=>lang==='pt'?pt:lang==='es'?es:en;
 const sceneLabel=tx('3D view','Vista 3D','Vista 3D');
 return <SceneContext.Provider value={register}><section aria-label={tx('Measuring workspace','Área de medição','Área de medición')} className={wide?'space-y-3':'grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(340px,410px)] lg:gap-4'}>
  {(lead||nav||toolbar)&&<div className="min-w-0 space-y-3 lg:col-start-2 lg:row-start-1">{lead}{nav}{toolbar&&!wide&&<div className="flex items-center gap-2">{<div className="min-w-0 flex-1">{toolbar}</div>}<button type="button" aria-expanded={!collapsed} aria-label={sceneLabel} onClick={toggleCollapsed} className="flex h-11 shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 lg:hidden"><Box aria-hidden className="h-4 w-4"/>3D<ChevronDown aria-hidden className={`h-4 w-4 transition-transform ${collapsed?'-rotate-90':''}`}/></button></div>}</div>}
  <div ref={scene} hidden={wide} className={`relative z-20 min-w-0 scroll-mt-16 lg:sticky lg:top-[72px] lg:col-start-1 lg:row-span-2 lg:row-start-1 ${collapsed?'max-lg:hidden':''}`} role="region" aria-label="Job scene">
   <div className={reference?"mb-2 flex justify-end":"absolute right-2 top-14 z-30"}><details className="relative"><summary className="flex min-h-10 cursor-pointer list-none items-center rounded-xl border border-slate-200 bg-white/90 px-3 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">{tx('View','Visualização','Vista')}</summary><div className="absolute right-0 top-full z-30 min-w-48 rounded-xl border bg-white p-2 shadow-xl"><button type="button" className="min-h-11 w-full rounded-lg px-3 text-left text-sm text-slate-800" onClick={e=>{setReference(!reference);const menu=e.currentTarget.closest('details');if(menu)menu.open=false;}}>{reference?'3D':tx('2D reference drawing','Desenho de referência 2D','Dibujo de referencia 2D')}</button></div></details></div>
   <div hidden={reference}><SceneViewport {...props} onPostDrop={props?.onPostDrop||onPostDrop} onSelect={select} data={data} lang={lang} compact onUnavailable={()=>setReference(true)}/></div>
   {reference&&<div className="rounded-2xl border bg-white p-2">{props?.groundPick&&<p role="status" className="mb-2 text-sm text-slate-600">{tx('Top view: tap the ground to position. Check elevation in the dimensions.','Planta: toque no chão para posicionar. Confira a elevação nas medidas.','Planta: toque el suelo para ubicar. Verifique la elevación en las medidas.')}</p>}<SketchZoom zoom={zoom} onChange={setZoom} lang={lang} light/><div ref={viewport} className="max-h-[32dvh] overflow-auto lg:max-h-[60dvh]"><div ref={drawing} style={{width:`${zoom*100}%`}}><SiteDrawing data={data} view={props?.groundPick?'plan':'iso'} move={props?.groundPick} onMove={(x,y)=>select?.({point:{x,y,z:0}})} draftObjects lang={lang} selected={props?.selectedId?.replace(/^site:/,'')} wallPlacement={props?.wallPlacement} wallPlacementSegment={props?.wallPlacementSegment} onWallEdge={props?.onWallEdge} onSelect={siteId=>select?.({siteId})} onSurface={props?.groundPick?undefined:(segmentIndex,stepIndex)=>select?.({segmentIndex,stepIndex})} onMember={(railId,part,role)=>select?.({railId,part,role})}/></div></div></div>}
  </div>
  <div className={wide?'min-w-0':'min-w-0 rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 lg:col-start-2 lg:row-start-2'} aria-label="Selection tools">{children}</div>
 </section></SceneContext.Provider>;
}
