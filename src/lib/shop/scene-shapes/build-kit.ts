// Small geometry kit shared by the gate / fence / deck / balcony / window-well
// scene adapters. Inches, Z up. Everything here is pure and only turns MEASURED
// numbers into display geometry — a member gets a real section only when its
// profile is written on the sheet; otherwise callers draw an axis line.
import type {MeasureData} from '../measure';
import type {Point3} from '../measure-geometry';
import {parseMeas} from '../measure-parse';
import {siteNumber} from '../measure-site';
import type {SceneEntity,SceneKind,SceneLine,SceneMesh} from '../measure-scene';

export type ShapeSceneOutput={meshes:SceneMesh[];lines:SceneLine[];pending:string[]};
export type ShapeSceneAdapter=(data:MeasureData)=>ShapeSceneOutput;
export type Section={width:number;depth:number;round:boolean};
export const emptyScene=():ShapeSceneOutput=>({meshes:[],lines:[],pending:[]});

/** A positive measurement ("3' 4-1/2"" → 40.5) or null. */
export function len(text:string|undefined|null):number|null{const n=parseMeas(text??'');return n!==null&&Number.isFinite(n)&&n>0?n:null;}
/** A signed measurement (+ rises / − falls) or null. Blank is null, "0" is 0. */
export function signed(text:string|undefined|null):number|null{const t=(text??'').trim().replace(/[−–]/g,'-');return t?siteNumber(t):null;}
/** Same outer-profile convention as the stair posts (measure-scene postSection):
 * "2x2", "1-1/2 sq", "1.66 round" … Anything ambiguous returns null — no invented steel. */
export function section(spec:string|undefined|null):Section|null{
 const s=(spec??'').trim();if(!s)return null;
 const round=/round|pipe|diameter|\bdia\b|[Øø]/i.test(s);
 const cleaned=s.toLowerCase().replaceAll('×','x').replace(/"/g,'').replace(/\b(?:hss|tube|square|sq|rectangular|solid|flat|bar|round|pipe|diameter|dia|steel|post|posts)\b|[Øø]/g,'').trim();
 const dims=cleaned.split('x').map(p=>siteNumber(p.trim()));
 if(!dims.length||dims.length>3||dims.some(n=>n===null||n<=0||n>24)||dims.length===1&&!round&&!/\b(?:square|sq)\b/i.test(s))return null;
 return {width:dims[0]!,depth:dims[1]??dims[0]!,round};
}

const sub=(a:Point3,b:Point3)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const dot=(a:Point3,b:Point3)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross=(a:Point3,b:Point3)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const scale=(a:Point3,k:number)=>({x:a.x*k,y:a.y*k,z:a.z*k});
const unit=(a:Point3)=>{const l=Math.hypot(a.x,a.y,a.z);return l>1e-9?scale(a,1/l):{x:0,y:0,z:0};};
export const lerp=(a:Point3,b:Point3,t:number):Point3=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
export const p3=(x:number,y:number,z:number):Point3=>({x,y,z});

/** Accumulates many solids into ONE scene mesh (one pick target, one draw call). */
export class Geo{
 vertices:Point3[]=[];faces:number[][]=[];
 get empty(){return !this.faces.length;}
 /** A straight member from a to b with an outer section. `side` orients the section's width. */
 member(a:Point3,b:Point3,sec:Section,side?:Point3){
  const u=unit(sub(b,a));if(!(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)>1e-6))return this;
  const hint=side??(Math.abs(u.z)>.9?{x:1,y:0,z:0}:cross({x:0,y:0,z:1},u));
  const v=unit(sub(hint,scale(u,dot(hint,u)))),w=cross(u,v);
  const ring=sec.round?Array.from({length:12},(_,i)=>[Math.cos(i*Math.PI/6)*sec.width/2,Math.sin(i*Math.PI/6)*sec.depth/2]):[[-sec.width/2,-sec.depth/2],[sec.width/2,-sec.depth/2],[sec.width/2,sec.depth/2],[-sec.width/2,sec.depth/2]];
  const o=this.vertices.length,n=ring.length;
  for(const p of [a,b])for(const [x,y] of ring)this.vertices.push({x:p.x+v.x*x+w.x*y,y:p.y+v.y*x+w.y*y,z:p.z+v.z*x+w.z*y});
  this.faces.push(Array.from({length:n},(_,i)=>o+n-1-i),Array.from({length:n},(_,i)=>o+n+i),...ring.map((_,i)=>[o+i,o+(i+1)%n,o+(i+1)%n+n,o+i+n]));
  return this;
 }
 /** Flat polygon (any planar, convex or not — triangulated in its own plane). */
 polygon(points:Point3[]){
  if(points.length<3)return this;const o=this.vertices.length;this.vertices.push(...points.map(p=>({...p})));
  for(const t of triangulate(points))this.faces.push(t.map(i=>o+i));return this;
 }
 quad(a:Point3,b:Point3,c:Point3,d:Point3){const o=this.vertices.length;this.vertices.push(a,b,c,d);this.faces.push([o,o+1,o+2,o+3]);return this;}
 /** Vertical prism from a plan polygon between two heights. */
 extrude(plan:{x:number;y:number}[],z0:number,z1:number){
  if(plan.length<3||!(z1>z0))return this;const o=this.vertices.length,n=plan.length;
  for(const z of [z0,z1])for(const p of plan)this.vertices.push({x:p.x,y:p.y,z});
  const tris=triangulate(plan.map(p=>({x:p.x,y:p.y,z:0})));
  for(const t of tris){this.faces.push([o+t[2],o+t[1],o+t[0]],[o+n+t[0],o+n+t[1],o+n+t[2]]);}
  for(let i=0;i<n;i++)this.faces.push([o+i,o+(i+1)%n,o+n+(i+1)%n,o+n+i]);
  return this;
 }
 /** Axis-aligned box. */
 box(min:Point3,max:Point3){return this.extrude([{x:min.x,y:min.y},{x:max.x,y:min.y},{x:max.x,y:max.y},{x:min.x,y:max.y}],min.z,max.z);}
}

/** Ear clipping in the polygon's dominant plane; returns index triples. */
export function triangulate(points:Point3[]):number[][]{
 const n=points.length;if(n<3)return [];
 let nx=0,ny=0,nz=0;for(let i=0;i<n;i++){const a=points[i],b=points[(i+1)%n];nx+=(a.y-b.y)*(a.z+b.z);ny+=(a.z-b.z)*(a.x+b.x);nz+=(a.x-b.x)*(a.y+b.y);}
 const ax=Math.abs(nx),ay=Math.abs(ny),az=Math.abs(nz);
 const flat=points.map(p=>az>=ax&&az>=ay?[p.x,p.y]:ax>=ay?[p.y,p.z]:[p.z,p.x]);
 let area=0;for(let i=0;i<n;i++){const a=flat[i],b=flat[(i+1)%n];area+=a[0]*b[1]-b[0]*a[1];}
 const idx=Array.from({length:n},(_,i)=>i);if(area<0)idx.reverse();
 const crossZ=(o:number[],a:number[],b:number[])=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
 const out:number[][]=[];let guard=0;
 while(idx.length>3&&guard++<n*n){
  let clipped=false;
  for(let k=0;k<idx.length;k++){
   const i0=idx[(k+idx.length-1)%idx.length],i1=idx[k],i2=idx[(k+1)%idx.length],a=flat[i0],b=flat[i1],c=flat[i2];
   if(crossZ(a,b,c)<=1e-9)continue;
   let inside=false;for(const j of idx){if(j===i0||j===i1||j===i2)continue;const p=flat[j];if(crossZ(a,b,p)>=0&&crossZ(b,c,p)>=0&&crossZ(c,a,p)>=0){inside=true;break;}}
   if(inside)continue;out.push(area<0?[i2,i1,i0]:[i0,i1,i2]);idx.splice(k,1);clipped=true;break;
  }
  if(!clipped)break;
 }
 if(idx.length>=3)for(let k=1;k<idx.length-1;k++)out.push(area<0?[idx[k+1],idx[k],idx[0]]:[idx[0],idx[k],idx[k+1]]);
 return out;
}

/** Infill centres for a clear length with a maximum clear gap and a picket width
 * (0 when the picket profile is unknown — then the axes still honour the gap). */
export function picketCentres(clear:number,maxGap:number,picket:number):number[]{
 if(!(clear>0)||!(maxGap>0))return [];
 const n=Math.max(0,Math.ceil((clear-maxGap)/(picket+maxGap)-1e-9));if(!n||n>2000)return [];
 const gap=(clear-n*picket)/(n+1);return Array.from({length:n},(_,i)=>gap+picket/2+i*(gap+picket));
}

type ItemOptions={provisional?:boolean;referenceOnly?:boolean;entity?:SceneEntity};
export class SceneOut{
 meshes:SceneMesh[]=[];lines:SceneLine[]=[];pending:string[]=[];
 mesh(id:string,label:string,kind:SceneKind,geo:Geo,o:ItemOptions={}){if(geo.empty)return;this.meshes.push({id,label,kind,provisional:!!o.provisional,referenceOnly:o.referenceOnly??kind!=='surface',entity:o.entity??{part:id},vertices:geo.vertices,faces:geo.faces});}
 line(id:string,label:string,kind:SceneKind,points:Point3[],o:ItemOptions={}){if(points.length<2)return;this.lines.push({id,label,kind,provisional:!!o.provisional,referenceOnly:o.referenceOnly??true,entity:o.entity??{part:id},points:points.map(p=>({...p}))});}
 need(label:string){if(!this.pending.includes(label))this.pending.push(label);}
 /** A member: a real section when one is specified, otherwise its axis. */
 member(id:string,label:string,kind:SceneKind,a:Point3,b:Point3,sec:Section|null,o:ItemOptions={},side?:Point3){if(sec)this.mesh(id,label,kind,new Geo().member(a,b,sec,side),o);else this.line(id,label,kind==='post'?'post':'rail',[a,b],o);}
 done():ShapeSceneOutput{return {meshes:this.meshes,lines:this.lines,pending:this.pending};}
}

/** Arc on the ground (or any z-function of the sweep fraction). */
export function arc(center:Point3,radius:number,from:number,to:number,z:(t:number)=>number,steps=24):Point3[]{
 return Array.from({length:steps+1},(_,i)=>{const t=i/steps,a=from+(to-from)*t;return {x:center.x+Math.cos(a)*radius,y:center.y+Math.sin(a)*radius,z:z(t)};});
}

/** Collects one guard's members: profiled ones into a single mesh, unprofiled
 * ones as axes that share one id (one pick target / one menu entry per guard). */
export class Guard{
 geo=new Geo();axes:Point3[][]=[];
 add(a:Point3,b:Point3,sec:Section|null,side?:Point3){if(sec)this.geo.member(a,b,sec,side);else this.axes.push([{...a},{...b}]);}
 emit(out:SceneOut,id:string,label:string,o:ItemOptions={}){out.mesh(id,label,'attached',this.geo,o);this.axes.forEach(points=>out.line(id,label,'rail',points,o));}
}

export type BayOptions={a:Point3;b:Point3;bottomA:number;bottomB:number;height:number;topRail:Section|null;bottomRail:Section|null;picket:Section|null;gap:number|null;postWidth:number};
/** Rails + infill for one straight bay between two post centres. Bottom heights
 * may differ at each end (racked); the infill stays plumb. */
export function guardBay(guard:Guard,o:BayOptions){
 const dir={x:o.b.x-o.a.x,y:o.b.y-o.a.y,z:0},L=Math.hypot(dir.x,dir.y);if(!(L>o.postWidth))return;
 const ux=dir.x/L,uy=dir.y/L,half=o.postWidth/2,ta=half/L,tb=1-half/L,across={x:-uy,y:ux,z:0};
 const at=(t:number,z:number)=>({x:o.a.x+dir.x*t,y:o.a.y+dir.y*t,z});
 const bottom=(t:number)=>o.bottomA+(o.bottomB-o.bottomA)*t,top=(t:number)=>bottom(t)+o.height;
 const tr=o.topRail?.depth??0,br=o.bottomRail?.depth??0;
 guard.add(at(ta,top(ta)-tr/2),at(tb,top(tb)-tr/2),o.topRail,across);
 guard.add(at(ta,bottom(ta)+br/2),at(tb,bottom(tb)+br/2),o.bottomRail,across);
 if(o.gap===null)return;
 for(const x of picketCentres(L-o.postWidth,o.gap,o.picket?.width??0)){const t=(half+x)/L;guard.add(at(t,bottom(t)+br),at(t,top(t)-tr),o.picket,{x:ux,y:uy,z:0});}
}
