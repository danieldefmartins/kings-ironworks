'use client';
import {createContext,useCallback,useContext,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
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
export default function ProWorkspace({data,lang,children,toolbar,onSelect}:{onSelect?:SceneViewportProps['onSelect'];data:MeasureData;lang:string;children:ReactNode;toolbar?:ReactNode}){
 const [active,setActive]=useState<Registration|null>(null),[reference,setReference]=useState(false),[zoom,setZoom]=useState(1);
 const register=useCallback((next:Registration|null,token:object)=>setActive(old=>next||(!old||old.token===token?null:old)),[]);
 const viewport=useRef<HTMLDivElement>(null),drawing=useRef<HTMLDivElement>(null);useDrawingPinch(viewport,drawing,zoom,setZoom,reference);
 const props=active?.props,select=props?.onSelect||onSelect;
 return <SceneContext.Provider value={register}><section aria-label={lang==='pt'?'Área de medição':lang==='es'?'Área de medición':'Measuring workspace'} className="space-y-3">{toolbar}<div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,390px)]"><div className="sticky top-0 z-20 min-w-0 bg-neutral-950 xl:top-4" role="region" aria-label="Job scene"><div className="absolute right-3 top-16 z-30"><details className="relative"><summary className="min-h-11 cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700">{lang==='pt'?'Visualização':lang==='es'?'Vista':'View'}</summary><div className="absolute right-0 top-full z-30 min-w-48 rounded-xl border bg-white p-2 shadow-xl"><button type="button" className="min-h-11 w-full rounded-lg px-3 text-left text-sm text-slate-800" onClick={()=>setReference(!reference)}>{reference?'3D':lang==='pt'?'Desenho de referência 2D':lang==='es'?'Dibujo de referencia 2D':'2D reference drawing'}</button></div></details></div><div hidden={reference}><SceneViewport {...props} onSelect={select} data={data} lang={lang} compact onUnavailable={()=>setReference(true)}/></div>{reference&&<div className="rounded-2xl border bg-white p-2"><SketchZoom zoom={zoom} onChange={setZoom} lang={lang} light/><div ref={viewport} className="max-h-[32dvh] overflow-auto xl:max-h-[60dvh]"><div ref={drawing} style={{width:`${zoom*100}%`}}><SiteDrawing data={data} draftObjects lang={lang} selected={props?.selectedId?.replace(/^site:/,'')} wallPlacement={props?.wallPlacement} wallPlacementSegment={props?.wallPlacementSegment} onWallEdge={props?.onWallEdge} onSelect={siteId=>select?.({siteId})} onSurface={(segmentIndex,stepIndex)=>select?.({segmentIndex,stepIndex})} onMember={(railId,part,role)=>select?.({railId,part,role})}/></div></div></div>}</div><div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 xl:max-h-[calc(100dvh-100px)] xl:overflow-y-auto" aria-label="Selection tools">{children}</div></div></section></SceneContext.Provider>;
}
