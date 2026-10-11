// Small geometry kit shared by the opening / structural / fire-escape / spiral /
// wall-rail / custom scene adapters. Inches, Z up. Display only: nothing here
// is written back to a sheet or used to cut steel.
import type {Point3} from '../measure-geometry';
import type {SceneEntity,SceneKind,SceneLine,SceneMesh} from '../measure-scene';
import {parseMeas} from '../measure-parse';

export type Geo={vertices:Point3[];faces:number[][]};
export type ShapeScene={meshes:SceneMesh[];lines:SceneLine[];pending:string[]};
export const emptyScene=():ShapeScene=>({meshes:[],lines:[],pending:[]});

/** A measured value, or null when blank / unreadable / not positive. */
export function num(s:string|null|undefined,zero=false):number|null{
 const n=parseMeas(s??'');
 return n!==null&&Number.isFinite(n)&&(zero?n>=0:n>0)?n:null;
}
/** First number in free text ('4" pipe', '(5) @ 48"') — for labels that carry a size. */
export function leadingNumber(s:string|null|undefined):number|null{
 const m=(s||'').match(/\d+(?:\.\d+)?(?:[\s-]+\d+\/\d+)?|\d+\/\d+/);
 return m?num(m[0]):null;
}

export const P=(x:number,y:number,z:number):Point3=>({x,y,z});
const add=(a:Point3,b:Point3)=>P(a.x+b.x,a.y+b.y,a.z+b.z);
const sub=(a:Point3,b:Point3)=>P(a.x-b.x,a.y-b.y,a.z-b.z);
const mul=(a:Point3,k:number)=>P(a.x*k,a.y*k,a.z*k);
const dot=(a:Point3,b:Point3)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross=(a:Point3,b:Point3)=>P(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);
const len=(a:Point3)=>Math.hypot(a.x,a.y,a.z);
const unit=(a:Point3)=>{const l=len(a)||1;return mul(a,1/l);};
export const vec={add,sub,mul,dot,cross,len,unit};

export function merge(...parts:Geo[]):Geo{
 const out:Geo={vertices:[],faces:[]};
 for(const g of parts){const o=out.vertices.length;out.vertices.push(...g.vertices);out.faces.push(...g.faces.map(f=>f.map(i=>i+o)));}
 return out;
}
/** Faces with their own corners, so a box shades flat (shared corners would be smoothed round). */
export function flat(vertices:Point3[],faces:number[][]):Geo{
 const out:Geo={vertices:[],faces:[]};
 for(const f of faces){const o=out.vertices.length;out.vertices.push(...f.map(i=>({...vertices[i]})));out.faces.push(f.map((_,i)=>o+i));}
 return out;
}
/** Eight corners → six faces. Corner order: bottom ring then top ring. */
function hexa(c:Point3[]):Geo{
 return flat(c,[[3,2,1,0],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]]);
}
/** Axis-aligned box. */
export function box(a:Point3,b:Point3):Geo{
 const x0=Math.min(a.x,b.x),x1=Math.max(a.x,b.x),y0=Math.min(a.y,b.y),y1=Math.max(a.y,b.y),z0=Math.min(a.z,b.z),z1=Math.max(a.z,b.z);
 return hexa([P(x0,y0,z0),P(x1,y0,z0),P(x1,y1,z0),P(x0,y1,z0),P(x0,y0,z1),P(x1,y0,z1),P(x1,y1,z1),P(x0,y1,z1)]);
}
/** Local section frame for a member running a→b: V follows `up` as closely as possible, U = V × T. */
export function frame(a:Point3,b:Point3,up:Point3=P(0,0,1)){
 const t=unit(sub(b,a));let v=sub(up,mul(t,dot(up,t)));
 if(len(v)<1e-6)v=Math.abs(t.z)<.9?P(0,0,1):P(1,0,0),v=sub(v,mul(t,dot(v,t)));
 v=unit(v);const u=cross(v,t);return {t,u,v};
}
/** Rectangle [u0,v0,u1,v1] of a section. */
export type Rect=[number,number,number,number];
/** Sweep section rectangles straight from a to b (a true steel shape is a few rectangles). */
export function sweepRects(a:Point3,b:Point3,rects:Rect[],up:Point3=P(0,0,1)):Geo{
 const {u,v}=frame(a,b,up);
 return merge(...rects.map(([u0,v0,u1,v1])=>{
  const at=(o:Point3,uu:number,vv:number)=>add(o,add(mul(u,uu),mul(v,vv)));
  const ring=(o:Point3)=>[at(o,u0,v0),at(o,u1,v0),at(o,u1,v1),at(o,u0,v1)];
  return hexa([...ring(a),...ring(b)]);
 }));
}
/** Solid round bar / tube envelope from a to b. */
export function cylinder(a:Point3,b:Point3,r:number,sides=18,up:Point3=P(0,0,1)):Geo{
 const {u,v}=frame(a,b,up),ring=(o:Point3)=>Array.from({length:sides},(_,i)=>add(o,add(mul(u,r*Math.cos(2*Math.PI*i/sides)),mul(v,r*Math.sin(2*Math.PI*i/sides)))));
 const n=sides,ra=ring(a),rb=ring(b);
 // Sides share corners (smooth round shading); the two ends have their own.
 return {vertices:[...ra,...rb,...ra.map(p=>({...p})),...rb.map(p=>({...p}))],faces:[Array.from({length:n},(_,i)=>2*n+n-1-i),Array.from({length:n},(_,i)=>3*n+i),...Array.from({length:n},(_,i)=>[i,(i+1)%n,(i+1)%n+n,i+n])]};
}
/** Hollow pipe: outer and inner wall with ring ends. */
export function pipe(a:Point3,b:Point3,r:number,wall:number,sides=20,up:Point3=P(0,0,1)):Geo{
 const ri=Math.max(.01,r-wall),{u,v}=frame(a,b,up),n=sides;
 const ring=(o:Point3,rr:number)=>Array.from({length:n},(_,i)=>add(o,add(mul(u,rr*Math.cos(2*Math.PI*i/n)),mul(v,rr*Math.sin(2*Math.PI*i/n)))));
 const vertices=[...ring(a,r),...ring(b,r),...ring(a,ri),...ring(b,ri)],faces:number[][]=[];
 for(let i=0;i<n;i++){const j=(i+1)%n;faces.push([i,j,n+j,n+i],[2*n+j,2*n+i,3*n+i,3*n+j],[j,i,2*n+i,2*n+j],[n+i,n+j,3*n+j,3*n+i]);}
 return {vertices,faces};
}
/** A tube along a polyline (one straight piece per leg). */
export function polyTube(points:Point3[],r:number,sides=18):Geo{
 const parts:Geo[]=[];for(let i=1;i<points.length;i++)if(len(sub(points[i],points[i-1]))>1e-6)parts.push(cylinder(points[i-1],points[i],r,sides));return merge(...parts);
}
/** Flat polygon (convex), extruded by `thick` along its normal direction `n`. */
export function slab(poly:Point3[],n:Point3,thick:number):Geo{
 const k=poly.length,top=poly.map(p=>add(p,mul(n,thick)));
 return flat([...poly,...top],[Array.from({length:k},(_,i)=>k-1-i),Array.from({length:k},(_,i)=>k+i),...poly.map((_,i)=>[i,(i+1)%k,(i+1)%k+k,i+k])]);
}
/** A plate / bar between two points with a width along `side` and thickness along `up`. */
export function bar(a:Point3,b:Point3,width:number,thick:number,up:Point3=P(0,0,1)):Geo{
 return sweepRects(a,b,[[-width/2,-thick/2,width/2,thick/2]],up);
}

type Opts={provisional?:boolean;referenceOnly?:boolean;entity?:SceneEntity};
export function mesh(id:string,label:string,kind:SceneKind,g:Geo,o:Opts={}):SceneMesh{
 return {id,label,kind,vertices:g.vertices,faces:g.faces,provisional:!!o.provisional,referenceOnly:!!o.referenceOnly,entity:o.entity||{}};
}
export function line(id:string,label:string,kind:SceneKind,points:Point3[],o:Opts={}):SceneLine{
 return {id,label,kind,points,provisional:!!o.provisional,referenceOnly:o.referenceOnly??true,entity:o.entity||{}};
}

/** Outer envelope of a rail/post material spec ('1-1/2" sq tube', '1-1/4" Sch40 pipe'). Null when not stated. */
export function memberSize(spec:string|null|undefined):{size:number;round:boolean}|null{
 const s=spec||'';if(!s.trim())return null;
 const round=/pipe|round|sch|dia|ø/i.test(s);let size=leadingNumber(s);if(size===null||size<=0||size>12)return null;
 // Nominal pipe sizes name the bore, not the outside.
 if(round&&/pipe|sch/i.test(s)){const od:Record<string,number>={'1':1.315,'1.25':1.66,'1.5':1.9,'2':2.375,'2.5':2.875,'3':3.5};size=od[String(size)]??size;}
 return {size,round};
}
export function postGeo(base:Point3,top:Point3,m:{size:number;round:boolean}):Geo{
 return m.round?cylinder(base,top,m.size/2,18,P(1,0,0)):sweepRects(base,top,[[-m.size/2,-m.size/2,m.size/2,m.size/2]],P(1,0,0));
}
