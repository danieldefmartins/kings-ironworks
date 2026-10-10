"use client";

import type { MeasureData } from '@/lib/shop/measure';
import { stairGeometry, type Point3 } from '@/lib/shop/measure-geometry';
import { drawingPosts } from '@/lib/shop/measure-drawing';
import { siteMeshes } from '@/lib/shop/measure-site';
import { landingConnections, landingConnectionGeometry } from '@/lib/shop/measure-landings';

export type SiteView = 'plan'|'front'|'iso';
export type SiteAnchor = {id:string;label:string;point:Point3};
export function siteAnchors(data: MeasureData): SiteAnchor[] {
  return [
    {id:'origin',label:'0 · Origin',point:{x:0,y:0,z:0}},
    ...siteMeshes(data.site).flatMap(m => m.vertices.map((point,i) => ({id:`${m.id}:${i}`,label:`${m.label} · ${i+1}`,point}))),
    ...(stairGeometry(data)?.treads || []).flatMap(t => t.corners.map((point,i)=>({id:`step:${t.segIdx}:${t.stepIdx}:${i}`,label:`${t.number===null?'Landing '+(t.segIdx+1):'Step '+t.number} · ${i+1}`,point}))),
  ];
}
export function projectSite(p:Point3, view:SiteView):[number,number] {
  if(view==='plan')return [p.x,p.y];
  if(view==='front')return [p.x,-p.z];
  return [(p.x+p.y)*Math.sqrt(3)/2,-p.x/2+p.y/2-p.z];
}

export default function SiteDrawing({data,view='iso',selected,onSelect,onSurface,measure=false,onAnchor,anchorIds=[],move,onMove,zoom=1}:{
  data:MeasureData;view?:SiteView;selected?:string;onSelect?:(id:string)=>void;
  onSurface?:(segment:number,step:number|null)=>void;measure?:boolean;
  onAnchor?:(id:string)=>void;anchorIds?:string[];move?:boolean;onMove?:(x:number,y:number)=>void;zoom?:number;
}) {
  const meshes=siteMeshes(data.site),model=stairGeometry(data);
  const posts=model?drawingPosts(data,model):[];
  const groups=new Map<string,typeof posts>();
  for(const p of posts.filter(p=>p.base&&p.top&&p.post.pointType==='railing_post')) {
    const key=`${p.post.segIdx}:${p.post.side}`;
    groups.set(key,[...(groups.get(key)||[]),p]);
  }
  const connections=landingConnections(data).flatMap(t=>{const g=landingConnectionGeometry(data,t);return g?[g.path]:[];});
  const coords=[{x:0,y:0,z:0},...meshes.flatMap(m=>m.vertices),...(model?.treads||[]).flatMap(t=>t.corners),...posts.flatMap(p=>p.top?[p.top]:[])];
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
  return <svg viewBox="0 0 800 470" role="img" aria-label="Job site and railing drawing" style={{display:'block',width:`${zoom*100}%`,minWidth:'100%',background:'#f8fafc',borderRadius:16}} onClick={e=>{
    if(!move||view!=='plan'||!onMove)return;
    const matrix=e.currentTarget.getScreenCTM();if(!matrix)return;
    const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());
    onMove(Math.round(((p.x-ox)/scale+minX)*16)/16,Math.round(((p.y-oy)/scale+minY)*16)/16);
  }}>
    <title>Existing site in gray, railing references in blue, unverified geometry in amber</title>
    {(model?.treads||[]).map(t=><polygon key={`${t.segIdx}:${t.stepIdx}`} points={points(t.corners)} fill={t.provisional?'#fff1cc':'#e2e8f0'} stroke={t.provisional?'#b45309':'#94a3b8'} strokeWidth="1.2" strokeDasharray={t.provisional?'5 3':undefined} tabIndex={onSurface?0:undefined} role={onSurface?'button':undefined} aria-label={`Measure ${t.number===null?'landing':'step '+t.number}`} onClick={e=>{if(move)return;e.stopPropagation();onSurface?.(t.segIdx,t.stepIdx);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSurface?.(t.segIdx,t.stepIdx);}}}/>) }
    {faces.map(({m,verts},i)=><polygon key={`${m.id}:${i}`} points={points(verts)} fill={m.kind==='opening'?'#e0f2fe':m.provisional?'#ffedd5':m.id===selected?'#c7d2fe':'#cbd5e1'} fillOpacity={m.kind==='opening'?.25:.65} stroke={m.id===selected?'#4f46e5':m.provisional?'#c2410c':'#64748b'} strokeWidth={m.id===selected?2:1} strokeDasharray={m.provisional||m.kind==='opening'?'5 3':undefined} onClick={e=>{if(move)return;e.stopPropagation();onSelect?.(m.id);}}/>) }
    {meshes.map(m=>{const p=xy(m.vertices[m.vertices.length/2]);return <text key={m.id} x={p[0]+4} y={p[1]-7} fontSize="12" fontWeight="700" fill="#334155" paintOrder="stroke" stroke="#f8fafc" strokeWidth="3" pointerEvents="none">{m.label}</text>;})}
    {posts.map(p=>p.base&&p.top?<g key={p.post.id}><polyline points={points([p.base,p.top])} fill="none" stroke={p.provisional?'#d97706':'#2563eb'} strokeWidth="3" strokeDasharray={p.provisional?'4 3':undefined}/><text x={xy(p.top)[0]+4} y={xy(p.top)[1]-4} fontSize="11" fill="#1d4ed8">{p.label}</text></g>:null)}
    {[...groups.values()].map((list,i)=><polyline key={i} points={points(list.map(p=>p.top!))} fill="none" stroke="#2563eb" strokeWidth="2" strokeDasharray="6 3"/>)}
    {connections.map((path,i)=><polyline key={`connection:${i}`} points={points(path)} fill="none" stroke="#2563eb" strokeWidth="2" strokeDasharray="6 3"/>)}
    {measure&&anchors.filter(a=>!selected||a.id.startsWith(selected+':')||a.id.startsWith('step:')||a.id==='origin').map(a=>{const p=xy(a.point);return <g key={a.id} role="button" aria-label={a.label} tabIndex={0} onClick={e=>{e.stopPropagation();onAnchor?.(a.id);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onAnchor?.(a.id);}}}><circle cx={p[0]} cy={p[1]} r="10" fill="transparent"/><circle cx={p[0]} cy={p[1]} r={anchorIds.includes(a.id)?6:3.5} fill={anchorIds.includes(a.id)?'#dc2626':'#4f46e5'} stroke="white" strokeWidth="1.5"/></g>;})}
    {anchorIds.length===2&&anchors.find(a=>a.id===anchorIds[0])&&anchors.find(a=>a.id===anchorIds[1])&&<polyline points={points(anchorIds.map(id=>anchors.find(a=>a.id===id)!.point))} stroke="#dc2626" strokeWidth="2" strokeDasharray="4 2" fill="none"/>}
    <circle cx={xy({x:0,y:0,z:0})[0]} cy={xy({x:0,y:0,z:0})[1]} r="4" fill="#0f172a"/>
    <text x="24" y="450" fontSize="12" fill="#475569">INCHES · {view.toUpperCase()} · SITE / RAILING REFERENCE · DIMENSIONS GOVERN</text>
  </svg>;
}
