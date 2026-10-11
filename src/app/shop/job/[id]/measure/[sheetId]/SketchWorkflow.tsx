"use client";
import {House,Shapes,Ruler,Move,Anvil} from 'lucide-react';
export type SketchStage='project'|'site'|'measure'|'tune'|'fabricate';
export default function SketchWorkflow({stage,onChange,lang}:{stage:SketchStage|null;onChange:(stage:SketchStage)=>void;lang:string}){
 const text=lang==='pt'?['Projeto','Local','Medir','Ajustar','Fabricar']:lang==='es'?['Proyecto','Lugar','Medir','Ajustar','Fabricar']:['Project','Site','Measure','Refine','Fabricate'];
 const steps=['project','site','measure','tune','fabricate'] as const,icons=[House,Shapes,Ruler,Move,Anvil];
 return <nav aria-label={lang === 'pt' ? "Etapas do desenho" : lang === 'es' ? "Etapas del dibujo" : "Sketch workflow"} className="mb-5 grid grid-cols-5 gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm sm:gap-2">{steps.map((id,index)=>{const Icon=icons[index],selected=id===stage;return <button type="button" key={id} aria-current={selected?'step':undefined} onClick={()=>onChange(id)} className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold transition sm:min-h-14 sm:flex-row sm:gap-2 sm:text-sm ${selected?'bg-indigo-600 text-white shadow-md':'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}><Icon aria-hidden="true" size={19} strokeWidth={1.7}/><span>{text[index]}</span></button>;})}</nav>;
}
