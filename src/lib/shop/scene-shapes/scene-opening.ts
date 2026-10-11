// Openings in 3D: each measured hole in its own stretch of wall, the hole drawn
// from the three widths and three heights exactly as read (so an out-of-square
// masonry opening LOOKS out of square), the reveal as the wall depth, the sill
// with its projection and fall, and the fabricated piece at its "fabricate to"
// size in its mount position. Several openings stand side by side, left to
// right in sheet order. Viewed from outside: the wall face is y = 0 and the
// viewer stands at −y.
import type {MeasureData} from '../measure';
import type {Point3} from '../measure-geometry';
import {openingFabSize,openingFabFinal,julietGuardAboveSill,unitTag,isFaceMount,OPENING_DOOR_PRODUCTS,type OpeningData,type OpeningUnit,type OpeningProduct} from '../measure-opening';
import {P,box,cylinder,emptyScene,flat,merge,mesh,num,sweepRects,type Geo,type ShapeScene} from './kit';

/** Wall shown around each opening — context only, never a measurement. */
const MARGIN=14;
/** Openings share one wall, left to right. */
const GAP=0;

export type HoleOutline={
 /** Corners, outside view, counter-clockwise from bottom-left: BL, B, BR, MR, TR, T, TL, ML. */
 points:{x:number;z:number}[];
 width:number;height:number;provisional:boolean;
};

/**
 * The hole as measured. Widths are centred on one vertical line; the sill is
 * level at z = 0 and the left / centre / right heights stand up from it. A
 * reading that was not taken borrows its neighbour's and marks the outline
 * provisional; with nothing at all the hole is a 36 × 48 placeholder.
 */
export function holeOutline(u:OpeningUnit):HoleOutline{
 const w=[num(u.wTop),num(u.wMid),num(u.wBot)],h=[num(u.hLeft),num(u.hCenter),num(u.hRight)];
 const pick=(xs:(number|null)[],i:number,fallback:number)=>xs[i]??xs.find(n=>n!==null)??fallback;
 const provisional=w.some(n=>n===null)||h.some(n=>n===null);
 const [wt,wm,wb]=[0,1,2].map(i=>pick(w,i,36)),[hl,hc,hr]=[0,1,2].map(i=>pick(h,i,48));
 const points=[{x:-wb/2,z:0},{x:0,z:0},{x:wb/2,z:0},{x:wm/2,z:hr/2},{x:wt/2,z:hr},{x:0,z:hc},{x:-wt/2,z:hl},{x:-wm/2,z:hl/2}];
 return {points,width:Math.max(wt,wm,wb),height:Math.max(hl,hc,hr),provisional};
}

/** Front + back faces of a wall ring around the hole, jamb faces, and the outer edges. */
function wallWithHole(hole:HoleOutline,cx:number,sillZ:number,depth:number,wallTop:number):Geo{
 const W=hole.width/2+MARGIN,top=Math.max(wallTop,sillZ+hole.height+MARGIN),bottom=0;
 const inner=hole.points.map(p=>P(cx+p.x,0,sillZ+p.z));
 const midZ=sillZ+hole.height/2;
 const outer=[P(cx-W,0,bottom),P(cx,0,bottom),P(cx+W,0,bottom),P(cx+W,0,midZ),P(cx+W,0,top),P(cx,0,top),P(cx-W,0,top),P(cx-W,0,midZ)];
 const back=(p:Point3)=>({...p,y:depth}),n=8;
 const vertices=[...inner,...outer,...inner.map(back),...outer.map(back)],faces:number[][]=[];
 for(let i=0;i<n;i++){const j=(i+1)%n;
  faces.push([i,j,n+j,n+i]); // outside face ring
  faces.push([2*n+n+i,2*n+n+j,2*n+j,2*n+i]); // inside face ring
  faces.push([j,i,2*n+i,2*n+j]); // jamb / head / sill surfaces of the hole
  faces.push([n+i,n+j,3*n+j,3*n+i]); // outer edges of the shown wall
 }
 return flat(vertices,faces);
}

/** Bars / frame of the fabricated piece, in the wall plane at depth y. */
function grille(x0:number,x1:number,z0:number,z1:number,y:number,product:OpeningProduct|''):Geo{
 const fw=1.5,ft=1,bars:Geo[]=[];
 const picket=(a:Point3,b:Point3)=>sweepRects(a,b,[[-.375,-.375,.375,.375]],P(0,-1,0));
 // Perimeter frame (flat bar seen on edge).
 bars.push(box(P(x0,y-ft/2,z0),P(x1,y+ft/2,z0+fw)),box(P(x0,y-ft/2,z1-fw),P(x1,y+ft/2,z1)),box(P(x0,y-ft/2,z0),P(x0+fw,y+ft/2,z1)),box(P(x1-fw,y-ft/2,z0),P(x1,y+ft/2,z1)));
 const door=product&&OPENING_DOOR_PRODUCTS.includes(product as OpeningProduct);
 if(door){const zm=z0+(z1-z0)*.45;bars.push(box(P(x0,y-ft/2,zm-fw/2),P(x1,y+ft/2,zm+fw/2)));}
 // Pickets at no more than 4" clear — the infill pattern itself lives in the design notes.
 const clear=x1-x0-2*fw,count=Math.max(1,Math.ceil((clear+.75)/(4+.75))-1),pitch=clear/(count+1);
 for(let i=1;i<=count;i++){const x=x0+fw+pitch*i;bars.push(picket(P(x,y,z0+fw),P(x,y,z1-fw)));}
 if(product==='skylight_guard'||product==='panel'){const zc=(z0+z1)/2;bars.push(box(P(x0,y-ft/2,zc-.375),P(x1,y+ft/2,zc+.375)));}
 return merge(...bars);
}

function hinges(x:number,z0:number,z1:number,y:number):Geo{
 const parts:Geo[]=[];for(const t of [.12,.5,.88]){const z=z0+(z1-z0)*t;parts.push(cylinder(P(x,y,z-2),P(x,y,z+2),.5,12,P(1,0,0)));}return merge(...parts);
}

/**
 * Where each opening stands on the shared wall: its hole, centre x, sill height
 * and wall depth. The 3D and the dimension lines (measure-dims-opening) read
 * the same layout, so a line always lands on the hole it measures.
 */
export function openingLayout(o:OpeningData){
 const door=!!o.product&&OPENING_DOOR_PRODUCTS.includes(o.product as OpeningProduct);
 // The ground is the outside grade: a door stands on its threshold, a sill at its measured
 // drop to the surface outside (a placeholder height until that is read).
 const sillOf=(u:OpeningUnit)=>door?0:num(u.dropOutside,true)??30;
 const wallTop=Math.max(...o.units.map(u=>sillOf(u)+holeOutline(u).height+MARGIN));
 let cursor=0;
 const units=o.units.map(u=>{
  const hole=holeOutline(u),reveal=num(u.reveal),depth=reveal??8,half=hole.width/2+MARGIN,cx=cursor+half;cursor+=2*half+GAP;
  return {hole,reveal,depth,cx,sillZ:sillOf(u)};
 });
 return {door,wallTop,units};
}

export function openingScene(data:MeasureData):ShapeScene{
 const out=emptyScene(),o=data.opening as OpeningData|null|undefined;
 if(!o||!o.units.length)return out;
 const product=o.product,door=!!product&&OPENING_DOOR_PRODUCTS.includes(product as OpeningProduct);
 if(!product)out.pending.push('Product');
 if(!o.mount)out.pending.push('Mount');
 const layout=openingLayout(o),wallTop=layout.wallTop;
 o.units.forEach((u,i)=>{
  const tag=unitTag(u,i),{hole,reveal,depth,cx,sillZ}=layout.units[i];
  if(hole.provisional)out.pending.push(`${tag} · opening`);
  if(o.mount==='reveal'&&reveal===null)out.pending.push(`${tag} · reveal`);
  const entity={part:`opening:${u.id}`};
  out.meshes.push(mesh(`opening:wall:${u.id}`,`${tag} · wall`,'site',wallWithHole(hole,cx,sillZ,depth,wallTop),{referenceOnly:true,provisional:reveal===null,entity}));
  // Sill: projects proud of the face and falls outward by the measured slope.
  const proj=num(u.sillProjection,true),fall=num(u.sillSlope,true)??0;
  if(!door&&proj!==null){
   const bw=(hole.points[2].x-hole.points[0].x)/2+2,x0=cx-bw,x1=cx+bw,zt=sillZ,zb=sillZ-2;
   const c=[P(x0,-proj,zb),P(x1,-proj,zb),P(x1,depth,zb),P(x0,depth,zb),P(x0,-proj,zt-fall),P(x1,-proj,zt-fall),P(x1,depth,zt),P(x0,depth,zt)];
   out.meshes.push(mesh(`opening:sill:${u.id}`,`${tag} · sill`,'site',flat(c,[[3,2,1,0],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]]),{referenceOnly:true,entity}));
  }
  // The piece the shop builds, at its "fabricate to" size.
  const fab=openingFabSize(o,u),final=openingFabFinal(o,u),face=isFaceMount(o.mount);
  const w=final?.width??hole.width,h=final?.height??hole.height,provisional=!fab||!product||!o.mount;
  if(!fab)out.pending.push(`${tag} · fabricate to`);
  const allowance=fab?.allowance??0,z0=sillZ+(face?-allowance:allowance),x0=cx-w/2,x1=cx+w/2;
  if(product==='juliet'){
   // A Juliet stands off the face at its projection, to the code height above the inside floor.
   const above=julietGuardAboveSill(o),projection=num(o.julietProjection,true)??4,gh=above&&above>0?above:36;
   if(above===null)out.pending.push(`${tag} · guard height`);
   const y=-projection-1,top=sillZ+gh,parts:Geo[]=[grille(x0,x1,sillZ,top,y,product)];
   for(const x of [x0+1,x1-1])for(const z of [sillZ+3,top-3])parts.push(box(P(x-.75,y,z-.75),P(x+.75,0,z+.75)));
   out.meshes.push(mesh(`opening:piece:${u.id}`,`${tag} · Juliet`,'attached',merge(...parts),{provisional:provisional||above===null,entity}));
  }else{
   const y=face?(o.mount==='face_in'?depth+.75:-.75):Math.min(2,depth/2);
   const parts=[grille(x0,x1,z0,z0+h,y,product)];
   if(door){const hingeX=o.doorHinge==='right'?x1:x0;if(o.doorHinge)parts.push(hinges(hingeX,z0,z0+h,y));}
   out.meshes.push(mesh(`opening:piece:${u.id}`,`${tag} · ${w.toFixed(2).replace(/\.?0+$/,'')} × ${h.toFixed(2).replace(/\.?0+$/,'')}`,'attached',merge(...parts),{provisional,entity}));
  }
 });
 return out;
}
