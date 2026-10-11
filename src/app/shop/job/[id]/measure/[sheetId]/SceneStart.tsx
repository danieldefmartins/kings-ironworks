'use client';

import type {MeasureData} from '@/lib/shop/measure';
import {newSceneSetup,sceneProjectOrder,sceneProjectLabel,sceneProjectShape,updateSceneSetup,type SceneSetup,type SceneProject} from '@/lib/shop/measure-scene-setup';

import ShapeIcon from '../ShapeIcon';

export default function SceneStart({data,set,lang,onProjectChange}:{data:MeasureData&{sceneSetup?:SceneSetup};set:(fn:(d:MeasureData&{sceneSetup?:SceneSetup})=>void)=>void;lang:string;onProjectChange?:(project:SceneProject)=>void}){
 const tx=(en:string,pt:string,es:string)=>lang==='pt'?pt:lang==='es'?es:en;
 const setup:SceneSetup={...(data.sceneSetup||newSceneSetup()),environment:data.routing.setting||data.sceneSetup?.environment||''};
 return <section aria-label={tx('Project setup','Configuração do projeto','Configuración del proyecto')} className="mb-5 text-neutral-100">
  <h2 className="text-lg font-semibold tracking-tight">{tx('Project setup','Configuração do projeto','Configuración del proyecto')}</h2>
  <p className="mt-1 text-sm text-neutral-500">{tx('Choose the location and type of work.','Escolha o local e o tipo de trabalho.','Elija el lugar y el tipo de trabajo.')}</p>
  <fieldset className="mt-5">
   <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">{tx('Location','Local','Ubicación')}</legend>
   <div className="inline-flex rounded-lg bg-neutral-800 p-1">{(['interior','exterior'] as const).map(kind=><button key={kind} type="button" aria-pressed={setup.environment===kind} className={`min-h-11 min-w-28 rounded-md px-5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 ${setup.environment===kind?'border border-amber-500 bg-amber-500/10 text-amber-300 shadow-sm':'border border-transparent text-neutral-400 hover:text-white'}`} onClick={()=>set(d=>updateSceneSetup(d,{environment:kind}))}>{kind==='interior'?tx('Interior','Interno','Interior'):tx('Exterior','Externo','Exterior')}</button>)}</div>
  </fieldset>
  <fieldset className="mt-5">
   <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">{tx('Work type','Tipo de trabalho','Tipo de trabajo')}</legend>
   <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{sceneProjectOrder(setup.environment).map(kind=><button key={kind} type="button" aria-pressed={setup.projectType===kind} className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border px-2 py-3 text-center text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 ${setup.projectType===kind?'border-amber-500 bg-amber-500/10 text-amber-300':'border-neutral-700 bg-neutral-800/60 text-neutral-300 hover:border-neutral-500'}`} onClick={()=>{set(d=>updateSceneSetup(d,{projectType:kind}));onProjectChange?.(kind);}}><span aria-hidden="true"><ShapeIcon shape={sceneProjectShape(kind)} project={kind} size={32}/></span><span>{sceneProjectLabel(kind,lang)}</span></button>)}</div>
  </fieldset>
 </section>;
}
