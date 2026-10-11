// Custom (drawn) railing in 3D. Every drawn run is walked line by line in the
// drawn direction for its MEASURED length; stair / ramp / curve lines climb by
// their measured rise. The rail stands at the sheet's rail height with a top
// rail, bottom rail and pickets, and posts stand at every placed point. A line
// with no length yet is drawn at the drawing's own scale and marked amber.
import type {MeasureData,PlanPath,PlanSegment} from '../measure';
import {planPaths} from '../measure';
import type {Point3} from '../measure-geometry';
import {P,emptyScene,memberSize,merge,mesh,num,polyTube,postGeo,sweepRects,type Geo,type ShapeScene} from './kit';

/** Inches per drawn unit, from the lines that have been measured (median). Null when none have. */
export function drawingScale(paths:PlanPath[]):number|null{
 const r:number[]=[];
 for(const p of paths)for(let i=0;i<p.segs.length;i++){const a=p.points[i],b=p.points[(i+1)%p.points.length],L=num(p.segs[i]?.len);if(a&&b&&L){const d=Math.hypot(b.x-a.x,b.y-a.y);if(d>0)r.push(L/d);}}
 if(!r.length)return null;r.sort((x,y)=>x-y);return r[Math.floor(r.length/2)];
}

/** Total rise of one drawn line: steps × typical rise on a flight, the segment rise otherwise. */
export function segmentRise(s:PlanSegment|undefined):number{
 if(!s)return 0;
 if(s.kind==='flight'){const n=parseInt(s.steps,10),r=num(s.rise);return Number.isFinite(n)&&n>0&&r!==null?n*r:0;}
 if(s.kind==='ramp'||s.kind==='curve')return num(s.rise,true)??0;
 return 0;
}

export type WalkedPath={id:string;points:Point3[];provisional:boolean[]};

/** 3D polyline of a run, origin at its first point, drawn y flipped to world y. */
export function walkPath(path:PlanPath,scale:number,origin:Point3):WalkedPath{
 const pts=path.points,count=path.closed&&pts.length>2?pts.length:pts.length-1;
 const out:WalkedPath={id:path.id,points:[{...origin}],provisional:[]};let cur={...origin};
 for(let i=0;i<count;i++){
  const a=pts[i],b=pts[(i+1)%pts.length],dx=b.x-a.x,dy=-(b.y-a.y),d=Math.hypot(dx,dy)||1,L=num(path.segs[i]?.len);
  const len=L??d*scale;cur=P(cur.x+dx/d*len,cur.y+dy/d*len,cur.z+segmentRise(path.segs[i]));
  out.points.push(cur);out.provisional.push(L===null);
 }
 return out;
}

export function customScene(data:MeasureData):ShapeScene{
 const out=emptyScene(),paths=planPaths(data.plan).filter(p=>p.points.length>1);
 if(!paths.length){out.pending.push('Plan drawing');return out;}
 const measured=drawingScale(paths),scale=measured??1.2;
 const h=num(data.rail.height),H=h??36;
 if(h===null)out.pending.push('Rail height');
 const top=memberSize(data.materials.topRail)??{size:1.5,round:false},post=memberSize(data.materials.post),picket=memberSize(data.materials.picket)??{size:.5,round:false};
 const spacing=num(data.materials.picketSpacing)??4;
 // Runs keep their drawn relationship: each starts where it was drawn relative to the first.
 const first=paths[0].points[0];
 paths.forEach((path,pi)=>{
  const o=path.points[0],origin=P((o.x-first.x)*scale,-(o.y-first.y)*scale,0),run=walkPath(path,scale,origin);
  const label=path.label||`Run ${pi+1}`,entity={part:`plan:${path.id}`};
  run.provisional.forEach((p,i)=>{if(p)out.pending.push(`${label} · line ${i+1}`);});
  const anyProv=run.provisional.some(Boolean)||h===null;
  const up=(p:Point3,dz:number)=>({...p,z:p.z+dz});
  // Walking surface outline (where the rail stands).
  out.lines.push({id:`plan:base:${path.id}`,label,kind:'rail',points:run.points.map(p=>({...p})),provisional:anyProv,referenceOnly:true,entity});
  const topRail=top.round?polyTube(run.points.map(p=>up(p,H)),top.size/2):merge(...run.points.slice(1).map((p,i)=>sweepRects(up(run.points[i],H-top.size/2),up(p,H-top.size/2),[[-top.size/2,-top.size/2,top.size/2,top.size/2]])));
  const bottom=merge(...run.points.slice(1).map((p,i)=>sweepRects(up(run.points[i],3.5),up(p,3.5),[[-.375,-.75,.375,.75]])));
  const pickets:Geo[]=[];
  for(let i=1;i<run.points.length;i++){
   const a=run.points[i-1],b=run.points[i],len=Math.hypot(b.x-a.x,b.y-a.y),n=Math.floor(len/(spacing+picket.size));
   for(let k=1;k<=n;k++){const t=k/(n+1),p=P(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,a.z+(b.z-a.z)*t);pickets.push(sweepRects(up(p,4.25),up(p,H-top.size),[[-picket.size/2,-picket.size/2,picket.size/2,picket.size/2]],P(1,0,0)));}
  }
  out.meshes.push(mesh(`plan:rail:${path.id}`,`${label} · rail`,'rail',merge(topRail,bottom,...pickets),{provisional:anyProv,entity}));
  // Posts at the placed points on this run.
  const placed=data.posts.filter(p=>p.pathId===path.id);
  placed.forEach((po,k)=>{
   const i=po.planSegIdx??0,a=run.points[i],b=run.points[i+1];if(!a||!b)return;
   const L=Math.hypot(b.x-a.x,b.y-a.y),along=num(po.pos,true),t=along!==null&&L>0?Math.max(0,Math.min(1,along/L)):.5;
   const base=P(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,a.z+(b.z-a.z)*t),provisional=along===null||run.provisional[i];
   if(along===null)out.pending.push(`${label} · post ${k+1}`);
   const entity2={postId:po.id};
   if(post)out.meshes.push(mesh(`post:${po.id}`,`${label} · post ${k+1}`,'post',postGeo(base,up(base,H),post),{provisional,referenceOnly:true,entity:entity2}));
   else out.lines.push({id:`post:${po.id}`,label:`${label} · post ${k+1}`,kind:'post',points:[base,up(base,H)],provisional,referenceOnly:true,entity:entity2});
  });
 });
 return out;
}
