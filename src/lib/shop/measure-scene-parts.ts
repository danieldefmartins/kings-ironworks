// Display geometry for the small parts of a railing: a post's base plate, a
// wall clip or plate at a rail end, the patch of wall it sits on. Inches, Z up.
// Nothing here is a cut: sizes come from SHOP_DEFAULTS.draw.
import type {MeasureData,PostMeasure,Termination} from './measure';
import type {Point3,MeasuredTread} from './measure-geometry';
import {surfacePoint} from './measure-geometry';
import type {PostLayout} from './measure-post-layout';
import {parseMeas} from './measure-parse';
import {SHOP_DEFAULTS} from './measure-shop-defaults';
export type Solid={vertices:Point3[];faces:number[][]};
type Vec={x:number;y:number};
type Model={treads:MeasuredTread[]};
/** A site mesh as a wall or column the rail can meet: its plan outline is the bottom ring. */
export type Host={id:string;kind:string;vertices:Point3[];ring:number};
const unit=(v:Vec):Vec=>{const n=Math.hypot(v.x,v.y);return n>1e-9?{x:v.x/n,y:v.y/n}:{x:1,y:0};};
/** A box from a corner along two plan directions and up. */
export function box(o:Point3,u:Vec,du:number,v:Vec,dv:number,dz:number):Solid{
 const ring=[[0,0],[1,0],[1,1],[0,1]].map(([a,b])=>({x:o.x+u.x*du*a+v.x*dv*b,y:o.y+u.y*du*a+v.y*dv*b}));
 return {vertices:[o.z,o.z+dz].flatMap(z=>ring.map(p=>({...p,z}))),faces:[[3,2,1,0],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]]};
}
export function join(...solids:(Solid|null|undefined)[]):Solid{
 const out:Solid={vertices:[],faces:[]};
 for(const s of solids){if(!s)continue;const at=out.vertices.length;out.vertices.push(...s.vertices);out.faces.push(...s.faces.map(f=>f.map(i=>i+at)));}
 return out;
}
/** Square plate under a post, centred on its base. A typed "5 x 5 x 3/8" is drawn to size. */
export function basePlate(base:Point3,spec:string):Solid{
 const d=SHOP_DEFAULTS.draw.basePlate,nums=spec.toLowerCase().replaceAll('×','x').split('x').map(s=>parseMeas(s.replace(/[^0-9/. -]/g,'').trim())).filter((n):n is number=>n!==null&&n>0&&n<=24);
 const w=nums[0]??d.size,l=nums[1]??w,t=nums[2]&&nums[2]<=2?nums[2]:d.thickness;
 return box({x:base.x-w/2,y:base.y-l/2,z:base.z},{x:1,y:0},w,{x:0,y:1},l,t);
}
/** A wider block around the foot of an existing post: its skirt / base molding. */
export function skirtBlock(base:Point3,width:number,depth:number,projection:number,height:number):Solid{
 return box({x:base.x-width/2-projection,y:base.y-depth/2-projection,z:base.z},{x:1,y:0},width+2*projection,{x:0,y:1},depth+2*projection,height);
}
/** Folded flat-bar clip on a wall face: `at` is on the face at the rail line, `normal` points out of the wall toward the rail. */
export function clipSolid(at:Point3,normal:Vec):Solid{
 const c=SHOP_DEFAULTS.draw.clip,n=unit(normal),t={x:-n.y,y:n.x},o={x:at.x-t.x*c.thickness/2,y:at.y-t.y*c.thickness/2,z:at.z-c.width/2};
 return join(box(o,t,c.tab,n,c.thickness,c.width),box(o,t,c.thickness,n,c.standoff,c.width));
}
/** Where the rail stops: on the clip's leg, off the wall; a plate takes it to the face. */
export function railEnd(part:{at:Point3;normal:Vec;method:'clip'|'wall_plate'}):Point3{
 const n=unit(part.normal),d=part.method==='clip'?SHOP_DEFAULTS.draw.clip.standoff:0;
 return {x:part.at.x+n.x*d,y:part.at.y+n.y*d,z:part.at.z};
}
/** Flat plate on a wall face. */
export function plateSolid(at:Point3,normal:Vec):Solid{
 const p=SHOP_DEFAULTS.draw.plate,n=unit(normal),t={x:-n.y,y:n.x};
 return box({x:at.x-t.x*p.width/2,y:at.y-t.y*p.width/2,z:at.z-p.height/2},t,p.width,n,p.thickness,p.height);
}
/** The piece of wall a clip sits on, where no measured wall is drawn there. */
export function wallPatch(at:Point3,normal:Vec,size=16):Solid{
 const n=unit(normal),t={x:-n.y,y:n.x};
 return box({x:at.x-t.x*size/2-n.x,y:at.y-t.y*size/2-n.y,z:at.z-size/2},t,size,n,1,size);
}
const outline=(h:Host)=>h.vertices.slice(0,h.ring);
/** Where a ray in plan first meets a host's outline. */
export function rayHit(hosts:Host[],from:Point3,dir:Vec,reach=120):{t:number;host:Host}|null{
 let best:{t:number;host:Host}|null=null;const d=unit(dir);
 for(const host of hosts){const ring=outline(host);
  for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],ex=b.x-a.x,ey=b.y-a.y,den=d.x*ey-d.y*ex;if(Math.abs(den)<1e-9)continue;
   const t=((a.x-from.x)*ey-(a.y-from.y)*ex)/den,s=((a.x-from.x)*d.y-(a.y-from.y)*d.x)/den;
   if(t>0.25&&t<=reach&&s>=-1e-6&&s<=1+1e-6&&(!best||t<best.t))best={t,host};}}
 return best;
}
/** Nearest point of a host's outline to a point, with the direction from the host toward that point. */
export function nearestOnHost(host:Host,p:Point3):{point:Vec;normal:Vec;distance:number}|null{
 const ring=outline(host);let best:{point:Vec;distance:number}|null=null;
 for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],ex=b.x-a.x,ey=b.y-a.y,len=ex*ex+ey*ey;if(len<1e-9)continue;
  const s=Math.max(0,Math.min(1,((p.x-a.x)*ex+(p.y-a.y)*ey)/len)),q={x:a.x+ex*s,y:a.y+ey*s},distance=Math.hypot(p.x-q.x,p.y-q.y);if(!best||distance<best.distance)best={point:q,distance};}
 if(!best)return null;
 const c=ring.reduce((s,v)=>({x:s.x+v.x/ring.length,y:s.y+v.y/ring.length}),{x:0,y:0});
 return {...best,normal:best.distance>1e-6?unit({x:p.x-best.point.x,y:p.y-best.point.y}):unit({x:best.point.x-c.x,y:best.point.y-c.y})};
}
/** Where a point's own tread measurements put it, whatever it attaches to. */
export function treadPoint(model:Model,post:PostMeasure):{base:Point3;tread:MeasuredTread}|null{
 const tread=model.treads.find(t=>t.segIdx===post.segIdx&&t.stepIdx===post.stepIdx);if(!tread||!post.side)return null;
 const along=parseMeas(post.stepIdx===null?post.pos:post.fromNosing)??tread.run/2,edge=parseMeas(post.fromEdge)??0;
 return {tread,base:surfacePoint(tread,Math.max(0,Math.min(tread.run,along)),post.side==='right'?tread.width-Math.min(tread.width,Math.max(0,edge)):Math.min(tread.width,Math.max(0,edge)))};
}
/** Across the tread, away from the wall on `side`: the way a clip on that wall faces. */
export function inward(tread:MeasuredTread,side:'left'|'right'):Vec{
 const [nl,,,nr]=tread.corners,v=unit({x:nr.x-nl.x,y:nr.y-nl.y});return side==='left'?v:{x:-v.x,y:-v.y};
}
const heading=(t:MeasuredTread):Vec=>unit({x:t.corners[1].x-t.corners[0].x,y:t.corners[1].y-t.corners[0].y});
export type RailEndPart={spanId:string;spanIndex:number;end:'start'|'end';method:'clip'|'wall_plate';target:'wall'|'existing_post';/** Rail line where the rail leaves its last post (or the stair edge). */from:Point3;/** On the wall / column face. */at:Point3;normal:Vec;/** The measured site object it lands on; null when the wall is assumed at the end of the stair. */hostId:string|null};
const drawn=(t:Termination)=>(t.attachTo==='wall'&&(t.method==='clip'||t.method==='wall_plate'))||(t.attachTo==='existing_post'&&(t.method==='clip'||t.method==='plate'));
/**
 * Where each rail end that fastens to a wall or column meets it.
 * Rail piece n runs along the n-th railing side that has posts (left, then
 * right); its START is the bottom / first post, its END the top / last post.
 * From there the rail carries on in the direction of travel until it meets a
 * measured wall or column. With none drawn there, the wall is taken at the end
 * of the stair in that direction.
 */
export function railEndParts(data:MeasureData,model:Model,layout:PostLayout|null,hosts:Host[]):RailEndPart[]{
 if(!model.treads.length)return [];
 const height=parseMeas(data.rail.height),railH=height&&height>0?height:SHOP_DEFAULTS.draw.post.previewHeight;
 const chains=(['left','right'] as const).map(side=>(layout?.posts||[]).filter(p=>p.side===side&&!p.post.pathId)).filter(c=>c.length);
 const out:RailEndPart[]=[];
 data.spans.forEach((span,spanIndex)=>{
  for(const end of ['start','end'] as const){
   const t=span[end];if(!drawn(t))continue;
   const chain=chains.length?chains[spanIndex%chains.length]:null,post=chain?(end==='start'?chain[0]:chain[chain.length-1]):null;
   // A point already recorded as a clip on that end is drawn by the point itself.
   if(post&&(post.post.pointType==='clip'||post.post.supportAttachment))continue;
   let from:Point3,dir:Vec,slope=0;
   if(post){from={...post.top};dir=end==='end'?post.heading:{x:-post.heading.x,y:-post.heading.y};slope=post.onLanding?0:(end==='end'?post.slope:-post.slope);}
   else{
    const tread=end==='start'?model.treads[0]:model.treads[model.treads.length-1],right=(data.rail.side==='Right')!==(spanIndex%2===1);
    const base=surfacePoint(tread,tread.run/2,right?Math.max(0,tread.width-1.5):Math.min(tread.width,1.5)),h=heading(tread);
    from={...base,z:base.z+railH};dir=end==='end'?h:{x:-h.x,y:-h.y};
   }
   const part={spanId:span.id,spanIndex,end,method:t.method==='clip'?'clip' as const:'wall_plate' as const,target:t.attachTo as 'wall'|'existing_post',from};
   const wanted=t.attachTo==='wall'?hosts.filter(h=>h.kind==='wall'):hosts.filter(h=>h.kind!=='wall'&&(!t.columnId||h.id===t.columnId));
   const hit=rayHit(wanted,from,dir);
   if(hit){out.push({...part,at:{x:from.x+dir.x*hit.t,y:from.y+dir.y*hit.t,z:from.z+slope*hit.t},normal:{x:-dir.x,y:-dir.y},hostId:hit.host.id});continue;}
   // The rail does not point straight at the column it was linked to: it still lands on that column.
   const linked=t.columnId?wanted.map(h=>({h,n:nearestOnHost(h,from)})).find(x=>x.n):null;
   if(linked?.n){out.push({...part,at:{x:linked.n.point.x,y:linked.n.point.y,z:from.z},normal:linked.n.normal,hostId:linked.h.id});continue;}
   // No measured face there: the wall is taken at the end of the stair in that direction.
   const reach=Math.max(3,Math.min(120,Math.max(...model.treads.flatMap(tr=>tr.corners.map(c=>(c.x-from.x)*dir.x+(c.y-from.y)*dir.y)))));
   out.push({...part,at:{x:from.x+dir.x*reach,y:from.y+dir.y*reach,z:from.z+slope*reach},normal:{x:-dir.x,y:-dir.y},hostId:null});
  }
 });
 return out;
}
