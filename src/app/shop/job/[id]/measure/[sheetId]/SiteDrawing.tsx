"use client";

import type { MeasureData } from '@/lib/shop/measure';
import { showMeas } from '@/lib/shop/measure-parse';
import { stairGeometry, type Point3 } from '@/lib/shop/measure-geometry';
import { drawingPosts } from '@/lib/shop/measure-drawing';
import {houseContext} from '@/lib/shop/measure-house-context';
import {attachedCuts} from '@/lib/shop/measure-attached-fab';
import { siteRailLayout, siteRailVerified } from '@/lib/shop/measure-site-rails';
import {resolveSite,wallPlacementEdges,previewWall} from '@/lib/shop/measure-wall-placement';
import { siteMeshes,siteNumber } from '@/lib/shop/measure-site';
import { landingConnections, landingConnectionGeometry } from '@/lib/shop/measure-landings';

type WallPlacementEdgeSide='left'|'right'|'start'|'end';
export type SiteView = 'plan'|'front'|'iso';
export type SiteAnchor = {id:string;label:string;point:Point3};
export function siteAnchors(data: MeasureData): SiteAnchor[] {
  return [
    {id:'origin',label:'0 · Origin',point:{x:0,y:0,z:0}},
    ...siteMeshes(resolveSite(data)).flatMap(m => m.vertices.map((point,i) => ({id:`${m.id}:${i}`,label:`${m.label} · ${i+1}`,point}))),
    ...(stairGeometry(data)?.treads || []).flatMap(t => t.corners.map((point,i)=>({id:`step:${t.segIdx}:${t.stepIdx}:${i}`,label:`${t.number===null?'Landing '+(t.segIdx+1):'Step '+t.number} · ${i+1}`,point}))),
  ];
}
export function projectSite(p:Point3, view:SiteView):[number,number] {
  if(view==='plan')return [p.x,p.y];
  if(view==='front')return [p.x,-p.z];
  return [(p.x+p.y)*Math.sqrt(3)/2,-p.x/2+p.y/2-p.z];
}

export default function SiteDrawing({data,view='iso',selected,onSelect,onSurface,measure=false,onAnchor,anchorIds=[],move,onMove,zoom=1,onMember,onDimension,draftObjects=false,lang='en',wallPlacement=false,wallPlacementSegment,onWallEdge}:{
  draftObjects?:boolean;lang?:string;wallPlacement?:boolean;wallPlacementSegment?:string;onWallEdge?:(segmentId:string,side:'left'|'right'|'start'|'end')=>void;
  onDimension?:(id:string,key:'length'|'depth'|'height')=>void;
  onMember?:(railId:string,part:string,role:'top'|'secondTop'|'bottom'|'picket')=>void;
  data:MeasureData;view?:SiteView;selected?:string;onSelect?:(id:string)=>void;
  onSurface?:(segment:number,step:number|null)=>void;measure?:boolean;
  onAnchor?:(id:string)=>void;anchorIds?:string[];move?:boolean;onMove?:(x:number,y:number)=>void;zoom?:number;
}) {
  const site=resolveSite(data),meshes=siteMeshes(site),model=stairGeometry(data),house=wallPlacement?null:houseContext(data);
  const wallEdges=wallPlacement?wallPlacementEdges(data).filter(e=>!wallPlacementSegment||e.segmentId===wallPlacementSegment):[];
  const previews=draftObjects?(data.site?.objects||[]).filter(o=>o.wallAnchor&&!meshes.some(m=>m.id===o.id)).flatMap(o=>{const mesh=previewWall(data,o);return mesh?[mesh]:[];}):[];
  // Editor-only placeholders. Never feed guessed sizes to geometry, anchors, exports or stock.
  const ghosts=draftObjects?(data.site?.objects||[]).filter(o=>!o.wallAnchor&&!meshes.some(m=>m.id===o.id)).map(object=>{const x=siteNumber(object.x),y=siteNumber(object.y),z=siteNumber(object.z);return {object,origin:x!==null&&y!==null&&z!==null?{x,y,z}:null};}):[];
  const ghostColumns=Math.max(1,Math.ceil(Math.sqrt(ghosts.length*2))),ghostRows=Math.max(1,Math.ceil(ghosts.length/ghostColumns));
  const rails=(data.site?.rails||[]).flatMap(r=>{const layout=siteRailLayout(site,r);return layout?[{...layout,parts:attachedCuts(site,r,layout).parts,verified:siteRailVerified(site,r)}]:[];});
  const posts=model?drawingPosts(data,model):[];
  const groups=new Map<string,typeof posts>();
  for(const p of posts.filter(p=>p.base&&p.top&&p.post.pointType==='railing_post')) {
    const key=`${p.post.segIdx}:${p.post.side}`;
    groups.set(key,[...(groups.get(key)||[]),p]);
  }
  const connections=landingConnections(data).flatMap(t=>{const g=landingConnectionGeometry(data,t);return g?[g.path]:[];});
  const coords=[{x:0,y:0,z:0},...(house?[...house.vertices,...house.roof.flat(),house.label]:[]),...ghosts.flatMap(g=>g.origin?[g.origin]:[]),...meshes.flatMap(m=>m.vertices),...previews.flatMap(m=>m.vertices),...rails.flatMap(r=>r.vertices),...(model?.treads||[]).flatMap(t=>t.corners),...posts.flatMap(p=>p.top?[p.top]:[])];
  const projected=coords.map(p=>projectSite(p,view));
  const minX=Math.min(...projected.map(p=>p[0]))-12,maxX=Math.max(100,...projected.map(p=>p[0]))+12;
  const minY=Math.min(...projected.map(p=>p[1]))-12,maxY=Math.max(60,...projected.map(p=>p[1]))+12;
  const scale=Math.min(720/(maxX-minX),380/(maxY-minY));
  const ox=40+(720-(maxX-minX)*scale)/2,oy=40+(380-(maxY-minY)*scale)/2;
  const xy=(p:Point3)=>{const q=projectSite(p,view);return [ox+(q[0]-minX)*scale,oy+(q[1]-minY)*scale];};
  const points=(list:Point3[])=>list.map(p=>xy(p).join(',')).join(' ');
  const anchors=siteAnchors(data);
  const faces=meshes.flatMap(m=>m.faces.map(face=>({m,verts:face.map(i=>m.vertices[i])})))
    .sort((a,b)=>a.verts.reduce((n,p)=>n+p.x-p.y+p.z,0)/a.verts.length-b.verts.reduce((n,p)=>n+p.x-p.y+p.z,0)/b.verts.length);
  const sideLabel=(side:WallPlacementEdgeSide)=>lang==='pt'?{left:'Esquerda',right:'Direita',start:'Início',end:'Fim'}[side]:lang==='es'?{left:'Izquierda',right:'Derecha',start:'Inicio',end:'Final'}[side]:{left:'Left',right:'Right',start:'Start',end:'End'}[side];
  return <div style={{position:"relative",width:`${zoom*100}%`,minWidth:"100%"}}><svg data-site-sketch viewBox="0 0 800 470" role="img" aria-label={lang === 'pt' ? "Desenho do local e guarda-corpo" : lang === 'es' ? "Dibujo del sitio y la baranda" : "Job site and railing drawing"} style={{display:'block',width:'100%',minWidth:'100%',background:'#f8fafc',borderRadius:16}} onClick={e=>{
    if(!move||view!=='plan'||!onMove)return;
    const matrix=e.currentTarget.getScreenCTM();if(!matrix)return;
    const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());
    onMove(Math.round(((p.x-ox)/scale+minX)*16)/16,Math.round(((p.y-oy)/scale+minY)*16)/16);
  }}>
    <title>{lang === 'pt' ? "Local existente em cinza, guarda-corpo em azul, geometria não conferida em âmbar" : lang === 'es' ? "Sitio existente en gris, baranda en azul, geometría sin verificar en ámbar" : "Existing site in gray, railing references in blue, unverified geometry in amber"}</title>
    {house&&<g data-house-context="reference-only" pointerEvents="none" aria-label={lang==='pt'?'Casa · apenas referência':lang==='es'?'Casa · solo referencia':'House · reference only'}>{house.faces.map((face,i)=><polygon key={i} points={points(face.map(v=>house.vertices[v]))} fill="#e2e8f0" fillOpacity=".38" stroke="#94a3b8" strokeWidth="1" strokeDasharray="5 3"/>)}{house.roof.map((roof,i)=><polyline key={i} points={points(roof)} fill="none" stroke="#64748b" strokeWidth="2"/>)}<text x={xy(house.label)[0]} y={xy(house.label)[1]} textAnchor="middle" fontSize="12" fill="#64748b">{lang==='pt'?'Casa · apenas referência':lang==='es'?'Casa · solo referencia':'House · reference only'}</text></g>}
    {(model?.treads||[]).map(t=><polygon key={`${t.segIdx}:${t.stepIdx}`} points={points(t.corners)} fill={t.provisional?'#fff1cc':'#e2e8f0'} stroke={t.provisional?'#b45309':'#94a3b8'} strokeWidth="1.2" strokeDasharray={t.provisional?'5 3':undefined} tabIndex={onSurface?0:undefined} role={onSurface?'button':undefined} aria-label={`${lang==='pt'?'Medir':lang==='es'?'Medir':'Measure'} ${t.number===null?(lang==='pt'?'patamar':lang==='es'?'descanso':'landing'):`${lang==='pt'?'degrau':lang==='es'?'peldaño':'step'} ${t.number}`}`} onClick={e=>{if(move)return;e.stopPropagation();onSurface?.(t.segIdx,t.stepIdx);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSurface?.(t.segIdx,t.stepIdx);}}}/>) }
    {faces.map(({m,verts},i)=><polygon key={`${m.id}:${i}`} points={points(verts)} fill={m.kind==='opening'?'#e0f2fe':m.provisional?'#ffedd5':m.id===selected?'#c7d2fe':'#cbd5e1'} fillOpacity={m.kind==='opening'?.25:.65} stroke={m.id===selected?'#4f46e5':m.provisional?'#c2410c':'#64748b'} strokeWidth={m.id===selected?2:1} strokeDasharray={m.provisional||m.kind==='opening'?'5 3':undefined} onClick={e=>{if(move)return;e.stopPropagation();onSelect?.(m.id);}}/>) }
    {previews.map(m=><g key={`wall-preview:${m.id}`} data-wall-preview={m.id} role={onSelect?'button':undefined} tabIndex={onSelect?0:undefined} aria-label={`${m.label} · ${lang==='pt'?'Não medido':lang==='es'?'Sin medir':'Not measured'}`} onClick={e=>{e.stopPropagation();onSelect?.(m.id);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect?.(m.id);}}}>{m.faces.map((face,i)=><polygon key={i} points={points(face.map(v=>m.vertices[v]))} fill="#fef3c7" fillOpacity=".32" stroke={selected===m.id?'#4f46e5':'#b45309'} strokeWidth="1.5" strokeDasharray="6 4"/>)}<text x={xy(m.vertices[4])[0]} y={xy(m.vertices[4])[1]-10} fontSize="12" fill="#92400e" paintOrder="stroke" stroke="#fff" strokeWidth="3">{m.label} · {lang==='pt'?'Medir altura / espessura':lang==='es'?'Medir altura / espesor':'Measure height / thickness'}</text></g>)}
    {meshes.map(m=>{const p=xy(m.vertices[m.vertices.length/2]);return <text key={m.id} x={p[0]+4} y={p[1]-7} fontSize="12" fontWeight="700" fill="#334155" paintOrder="stroke" stroke="#f8fafc" strokeWidth="3" pointerEvents="none">{m.label}</text>;})}
    {onDimension&&meshes.filter(m=>m.id===selected).map(m=>{const object=site?.objects.find(o=>o.id===m.id);if(!object)return null;const p=xy(m.vertices[0]),x=Math.max(8,Math.min(550,p[0])),y=Math.max(22,Math.min(408,p[1]+26));return <g key={`dimensions-${m.id}`}>{(['length','depth','height'] as const).filter(key=>!object.wallAnchor||key!=='length').map((key,i)=><g key={key} role="button" tabIndex={0} aria-label={`${lang==='en'?'Edit':'Editar'} ${object.label} ${lang==='pt'?{length:'comprimento',depth:'espessura',height:'altura'}[key]:lang==='es'?{length:'longitud',depth:'espesor',height:'altura'}[key]:key}`} onClick={e=>{e.stopPropagation();onDimension(m.id,key);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onDimension(m.id,key);}}} style={{cursor:'pointer'}}><rect x={x+i*80} y={y} width={76} height={34} rx={8} fill="white" stroke="#6366f1"/><text x={x+i*80+38} y={y+21} textAnchor="middle" fontSize={11} fill="#3730a3">{key[0].toUpperCase()} {showMeas(object[key],data.units||'in')||'?'}</text></g>)}</g>;})}
    {posts.map(p=>p.base&&p.top?<g key={p.post.id}><polyline points={points([p.base,p.top])} fill="none" stroke={p.provisional?'#d97706':'#2563eb'} strokeWidth="3" strokeDasharray={p.provisional?'4 3':undefined}/><text x={xy(p.top)[0]+4} y={xy(p.top)[1]-4} fontSize="11" fill="#1d4ed8">{p.label}</text></g>:null)}
    {[...groups.values()].map((list,i)=><polyline key={i} points={points(list.map(p=>p.top!))} fill="none" stroke="#2563eb" strokeWidth="2" strokeDasharray="6 3"/>)}
    {connections.map((path,i)=><polyline key={`connection:${i}`} points={points(path)} fill="none" stroke="#2563eb" strokeWidth="2" strokeDasharray="6 3"/>)}
    {rails.map(r=><g key={r.id} data-attached-rail={r.id}>{r.parts.map(p=><g key={p.mark} role={onMember?'button':undefined} tabIndex={onMember?0:undefined} aria-label={onMember?`Assign material ${p.mark}`:undefined} style={{cursor:onMember?'pointer':undefined}} onClick={e=>{e.stopPropagation();onMember?.(r.id,p.mark.split('-').at(-1)!,p.kind);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onMember?.(r.id,p.mark.split('-').at(-1)!,p.kind);}}}>{p.faces.map((face,i)=><polygon key={i} points={points(face.map(v=>p.vertices[v]))} fill="#94a3b8" fillOpacity=".8" stroke="#475569" strokeWidth=".7"/>)}</g>)}<polygon pointerEvents={onMember?'none':undefined} points={points(r.vertices)} fill="#93c5fd" fillOpacity=".22" stroke={r.verified?'#2563eb':'#d97706'} strokeWidth="2.5" strokeDasharray="6 3"/><text x={xy(r.vertices[3])[0]+4} y={xy(r.vertices[3])[1]-8} fontSize="12" fontWeight="700" fill="#1d4ed8" paintOrder="stroke" stroke="#f8fafc" strokeWidth="3">{r.mark}</text>{[r.vertices[2],r.vertices[3]].map((p,i)=><circle key={i} cx={xy(p)[0]} cy={xy(p)[1]} r="4" fill="#2563eb"/>)}</g>)}
    {measure&&anchors.filter(a=>!selected||a.id.startsWith(selected+':')||a.id.startsWith('step:')||a.id==='origin').map(a=>{const p=xy(a.point);return <g key={a.id} role="button" aria-label={a.label} tabIndex={0} onClick={e=>{e.stopPropagation();onAnchor?.(a.id);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onAnchor?.(a.id);}}}><circle cx={p[0]} cy={p[1]} r="10" fill="transparent"/><circle cx={p[0]} cy={p[1]} r={anchorIds.includes(a.id)?6:3.5} fill={anchorIds.includes(a.id)?'#dc2626':'#4f46e5'} stroke="white" strokeWidth="1.5"/></g>;})}
    {anchorIds.length===2&&anchors.find(a=>a.id===anchorIds[0])&&anchors.find(a=>a.id===anchorIds[1])&&<polyline points={points(anchorIds.map(id=>anchors.find(a=>a.id===id)!.point))} stroke="#dc2626" strokeWidth="2" strokeDasharray="4 2" fill="none"/>}
    {wallEdges.map(edge=><polyline key={`${edge.segmentId}:${edge.side}`} points={points([edge.start,edge.end])} fill="none" stroke="#4f46e5" strokeWidth="4" strokeDasharray="8 4" pointerEvents="none"/>)}
    {ghosts.map(({object,origin},i)=>{const known=origin?xy(origin):null,cellWidth=720/ghostColumns,cellHeight=330/ghostRows;const x=known?known[0]:40+(i%ghostColumns)*cellWidth+cellWidth/2,y=known?known[1]:50+Math.floor(i/ghostColumns)*cellHeight+cellHeight/2;const size=Math.min(1,cellWidth/150,cellHeight/95);return <g key={`ghost:${object.id}`} data-site-ghost={object.id} data-position-known={!!origin} transform={`translate(${x},${y}) scale(${size})`} role={onSelect?'button':undefined} tabIndex={onSelect?0:undefined} aria-label={`${object.label} · ${lang==='pt'?'Não medido':lang==='es'?'Sin medir':'Not measured'}`} onClick={e=>{if(move)return;e.stopPropagation();onSelect?.(object.id);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect?.(object.id);}}} style={{cursor:onSelect?'pointer':undefined}}>
      <title>{`${object.label} · ${origin?(lang==='pt'?'Posição registrada; tamanho desconhecido':lang==='es'?'Posición registrada; tamaño desconocido':'Position recorded; size unknown'):(lang==='pt'?'Posição e tamanho desconhecidos':lang==='es'?'Posición y tamaño desconocidos':'Position and size unknown')} · ${lang==='pt'?'Sem escala':lang==='es'?'Sin escala':'Not to scale'}`}</title>
      <rect x="-66" y="-43" width="132" height="86" rx="10" fill="#fffbeb" fillOpacity=".95" stroke={selected===object.id?'#4f46e5':'#b45309'} strokeWidth={selected===object.id?2.5:1.5} strokeDasharray="5 4"/>
      {object.kind==='column'||object.kind==='post'?<rect x="-13" y="-29" width="26" height="42" rx={object.section==='round'?9:0} fill="#fed7aa" stroke="#b45309" strokeDasharray="3 2"/>:object.kind==='slab'?<path d="M-31 0 L8 -17 L35 -3 L-7 16 Z" fill="#fed7aa" stroke="#b45309" strokeDasharray="3 2"/>:object.kind==='opening'?<rect x="-24" y="-27" width="48" height="40" fill="none" stroke="#b45309" strokeWidth="3" strokeDasharray="4 3"/>:<path d="M-30 -18 L20 -30 L31 -22 L31 10 L-20 20 L-30 12 Z" fill="#fed7aa" stroke="#b45309" strokeDasharray="3 2"/>}
      <text x="0" y="3" textAnchor="middle" fontSize="24" fontWeight="700" fill="#92400e">?</text>
      <text x="0" y="28" textAnchor="middle" fontSize="11" fontWeight="700" fill="#92400e">{object.label.length>19?object.label.slice(0,17)+'…':object.label}</text>
      <text x="0" y="40" textAnchor="middle" fontSize="9" fill="#92400e">{lang==='pt'?'Não medido':lang==='es'?'Sin medir':'Not measured'}</text>
    </g>;})}
    <circle cx={xy({x:0,y:0,z:0})[0]} cy={xy({x:0,y:0,z:0})[1]} r="4" fill="#0f172a"/>
    <text x="24" y="450" fontSize="12" fill="#475569">{lang === 'pt' ? "POLEGADAS" : lang === 'es' ? "PULGADAS" : "INCHES"} · {view==='plan'?(lang==='pt'?'PLANTA':lang==='es'?'PLANTA':'PLAN'):view==='front'?(lang==='pt'?'FRENTE':lang==='es'?'FRENTE':'FRONT'):'3D'} · {lang === 'pt' ? "REFERÊNCIA DO LOCAL / GUARDA-CORPO · PREVALECEM AS COTAS" : lang === 'es' ? "REFERENCIA DEL SITIO / BARANDA · PREVALECEN LAS COTAS" : "SITE / RAILING REFERENCE \u00b7 DIMENSIONS GOVERN"}</text>
  </svg>{wallEdges.map(edge=>{const a=xy(edge.start),b=xy(edge.end);return <button key={`${edge.segmentId}:${edge.side}`} type="button" data-wall-edge={`${edge.segmentId}:${edge.side}`} aria-label={`${lang==='pt'?'Posicionar parede':lang==='es'?'Colocar pared':'Place wall'} · ${sideLabel(edge.side)} · ${lang==='pt'?'trecho':lang==='es'?'tramo':'segment'} ${edge.segmentIndex+1}`} className="absolute z-10 flex min-h-11 min-w-14 items-center justify-center rounded-xl border-2 border-indigo-500 bg-white px-2 text-sm font-bold text-indigo-700 shadow-md" style={{left:`${(a[0]+b[0])/16}%`,top:`${(a[1]+b[1])/9.4}%`,transform:'translate(-50%, -50%)'}} onClick={()=>onWallEdge?.(edge.segmentId,edge.side)}>{sideLabel(edge.side)}</button>;})}</div>;
}
