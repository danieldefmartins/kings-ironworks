'use client';
import {useState} from 'react';
import type {MeasureData} from '@/lib/shop/measure';
import {newSceneSetup,sceneProjectOrder,sceneProjectLabel,updateSceneSetup,type SceneSetup,type SceneProject} from '@/lib/shop/measure-scene-setup';

function Illustration({kind}:{kind:SceneProject|'interior'|'exterior'}){
 const stroke={stroke:'currentColor',strokeWidth:2.5,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,fill:'none'};
 const stairs=<><path d="M32 86h22V72h22V58h22V44h24"/><path d="M43 60l76-48M44 60v23m25-39v25m25-41v27m25-43v29"/></>;
 return <svg viewBox="0 0 160 110" className="h-full w-full" aria-hidden="true"><g {...stroke}>
  {kind==='interior'&&<><path d="M20 86V22l58-12 62 19v57M78 10v63M20 86l58-13 62 13M106 77V40l20 6v35"/><path d="M29 73h16V61h16V49h16V37"/><path d="M29 55l48-34"/></>}
  {kind==='exterior'&&<><path d="M17 57l55-41 57 41M31 48v44h82V47M65 92V59h25v33M114 91h15V81h14"/><path d="M42 59h12v16H42zM15 96h130"/><circle cx="134" cy="24" r="8"/></>}
  {kind==='stairs'&&stairs}
  {kind==='landing'&&<><path d="M26 70l45-26 67 19-45 27zM26 70v10l67 20 45-26V63M27 70V35l66 20 45-26v34M93 55v35M49 42v35m23-29v36m43-42v36"/></>}
  {kind==='ramp'&&<><path d="M23 87l112-35v15L23 102zM25 84V54l108-35v32M49 48v29m28-39v30m28-39v31"/></>}
  {kind==='railing'&&<><path d="M27 91V22m106 69V22M27 29h106M27 77h106M45 29v48m18-48v48m18-48v48m18-48v48m18-48v48"/><path d="M19 92h121" strokeDasharray="3 5"/></>}
  {kind==='window_well'&&<><path d="M22 18h114v74M45 36h49v29H45zM22 75l39 27 73-16V52L62 68 22 43zM62 68v34M41 55v34m43-26v34m24-39v33"/></>}
  {kind==='grate'&&<><path d="M23 71l43-46 72 19-43 46zM23 71v8l72 19 43-46v-8M40 75l43-46m-24 51 43-46m-24 51 43-46M44 49l72 20M54 38l73 21"/></>}
  {kind==='ladder'&&<><path d="M51 94V16m58 78V16M51 28h58M51 44h58M51 60h58M51 76h58M51 92h58"/></>}
  {kind==='gate'&&<><path d="M22 94V23m116 71V23M29 31h102v56H29zM80 31v56M44 33v52m18-52v52m37-52v52m18-52v52"/><circle cx="72" cy="60" r="2"/><circle cx="88" cy="60" r="2"/></>}
  {kind==='fence'&&<><path d="M18 90V30m62 60V30m62 60V30M18 42h124M18 78h124M32 33v55m16-55v55m16-55v55m32-55v55m16-55v55m16-55v55"/></>}
  {kind==='balcony'&&<><path d="M29 20v70l94-18V24M29 56l35 18 59-13M29 81l35 20 59-15V50L64 63 29 43M64 63v38m-18-47v37m37-31v36m21-41v36"/></>}
  {kind==='deck'&&<><path d="M22 68l47-34 69 18-48 39zM22 68v20m68 3v13m48-52v33M36 59l70 19m-54-31 71 19M22 68V40l47-34 69 18v28M69 6v28M44 24v27m48-39v28m24-21v27"/></>}
  {kind==='fire_escape'&&<><path d="M29 11v88M29 24h66v15H29m0 27h66v15H29M43 39l42 27M95 24l31 17v43L95 67M48 81v22m18-22v22M48 91h18"/></>}
  {kind==='spiral'&&<><path d="M80 8v92M80 21l42 10-19 14-23-9-37 14 16 14 21-8 39 16-20 15-19-11-38 15M43 49V24l37-14 42 10v11M42 91V65m77 7V46"/></>}
  {kind==='wall_rail'&&<><path d="M26 90V24l108-13v73M40 76l76-37M54 70v13m30-28v13m30-28v13"/><path d="M40 94h22V81h22V68h22V55h23"/></>}
  {kind==='custom'&&<><path d="M30 76l20-46 58-7 26 49-57 21z" strokeDasharray="5 6"/><circle cx="30" cy="76" r="4"/><circle cx="50" cy="30" r="4"/><circle cx="108" cy="23" r="4"/><circle cx="134" cy="72" r="4"/><path d="M73 53h19m-9-9v19"/></>}
 </g></svg>;
}

export default function SceneStart({data,set,lang,onContinue}:{data:MeasureData&{sceneSetup?:SceneSetup};set:(fn:(d:MeasureData&{sceneSetup?:SceneSetup})=>void)=>void;lang:string;onContinue:()=>void}){
 const tx=(en:string,pt:string,es:string)=>lang==='pt'?pt:lang==='es'?es:en;
 const setup:SceneSetup={...(data.sceneSetup||newSceneSetup()),environment:data.routing.setting||data.sceneSetup?.environment||''};const [stage,setStage]=useState<'environment'|'project'>(setup.environment?'project':'environment');

 const card=(selected:boolean)=>`group relative rounded-3xl border p-4 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 ${selected?'border-indigo-400 bg-indigo-50 text-indigo-900 shadow-md':'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-indigo-300 hover:shadow-md'}`;
 return <section aria-label={tx('Start with the site','Comece pelo local','Empiece por el lugar')} className="rounded-3xl border border-slate-200 bg-slate-100 p-4 text-slate-900 shadow-xl sm:p-7">
  <div className="mb-6 flex items-center justify-between gap-3"><span className="text-xs font-bold uppercase tracking-[.18em] text-slate-500">{tx('Your site, first','Primeiro, seu local','Primero, su lugar')}</span><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">{stage==='environment'?'1':'2'} / 2</span></div>
  <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{stage==='environment'?tx('Where are we working?','Onde vamos trabalhar?','¿Dónde vamos a trabajar?'):tx('What are we building?','O que vamos construir?','¿Qué vamos a construir?')}</h2>
  <p className="mb-6 mt-2 max-w-xl text-base text-slate-500">{stage==='environment'?tx('Start with the space. Add its measurements on the sketch.','Comece pelo espaço. Adicione as medidas no desenho.','Empiece por el espacio. Añada sus medidas al dibujo.'):tx('Choose a starting point. You can add more pieces as you go.','Escolha por onde começar. Adicione outras peças depois.','Elija un punto de partida. Puede añadir más piezas después.')}</p>
  {stage==='environment'?<div className="grid grid-cols-2 gap-3 sm:gap-5">{(['interior','exterior'] as const).map(kind=><button key={kind} type="button" aria-pressed={setup.environment===kind} className={card(setup.environment===kind)} onClick={()=>{set(d=>updateSceneSetup(d,{environment:kind}));setStage('project');}}><div className="mx-auto mb-3 h-28 max-w-64 text-indigo-500 sm:h-44"><Illustration kind={kind}/></div><strong className="block text-lg sm:text-xl">{kind==='interior'?tx('Interior','Interior','Interior'):tx('Exterior','Exterior','Exterior')}</strong><span className="mt-1 block text-xs text-slate-500 sm:text-sm">{kind==='interior'?tx('Inside the building','Dentro da construção','Dentro del edificio'):tx('Outside & around it','Fora e ao redor','Fuera y alrededor')}</span></button>)}</div>:<>
   <button type="button" className="mb-4 min-h-11 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm" onClick={()=>setStage('environment')}>← {setup.environment==='interior'?tx('Interior','Interior','Interior'):tx('Exterior','Exterior','Exterior')} · {tx('Change','Alterar','Cambiar')}</button>
   <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{sceneProjectOrder(setup.environment).map(kind=><button key={kind} type="button" aria-pressed={setup.projectType===kind} className={card(setup.projectType===kind)} onClick={()=>set(d=>updateSceneSetup(d,{projectType:kind}))}><div className="mb-2 h-24 text-indigo-500"><Illustration kind={kind}/></div><strong className="block text-sm sm:text-base">{sceneProjectLabel(kind,lang)}</strong>{setup.projectType===kind&&<span aria-hidden="true" className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-indigo-600 text-sm text-white">✓</span>}</button>)}</div>
   <button type="button" disabled={!setup.environment||!setup.projectType} className="mt-6 min-h-14 w-full rounded-2xl bg-indigo-600 px-5 py-3 text-base font-bold text-white shadow-lg transition hover:bg-indigo-500 disabled:opacity-40" onClick={onContinue}>{tx('Build the site','Criar o local','Crear el lugar')} →</button>
  </>}
 </section>;
}
