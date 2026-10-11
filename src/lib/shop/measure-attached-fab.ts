import type {SiteModel} from './measure-site';
import {siteNumber} from './measure-site';
import type {SiteRail,AttachedFab,AttachedProfile} from './measure-site-rails-schema';
import type {Point3} from './measure-geometry';

export const newAttachedFab=():AttachedFab=>({top:{width:'',depth:'',section:'',wall:''},bottom:{width:'',depth:'',section:'',wall:''},picket:{width:'',depth:'',section:'',wall:''},startGap:'',endGap:'',picketGap:'',maxClear:'',material:'',welds:'',reviewedSignature:''});
type Layout={start:Point3;end:Point3;horizontal:number;rise:number;mark:string};
export type AttachedCut={mark:string;kind:'top'|'secondTop'|'bottom'|'picket';profile:string;edgeLength:number;stockLength:number;angle:number;polygon:[number,number][];vertices:Point3[];faces:number[][];station:number|null};
const faces=[[3,2,1,0],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]];
function profile(p:AttachedProfile){
 const width=siteNumber(p.width),depth=siteNumber(p.depth),wall=siteNumber(p.wall);
 if(width===null||depth===null||width<=0||depth<=0||width>24||depth>24||!p.section||(p.section==='tube'&&(wall===null||wall<=0||wall*2>=Math.min(width,depth))))return null;
 return {width,depth,spec:`${width} x ${depth} ${p.section}${p.section==='tube'?` / wall ${wall}`:''}`};
}
/** Polygon is retained material in longitudinal/depth axes, stock origin at its minimum U. */
function parallelCut(edgeLength:number,depth:number,slope:number){
 const shear=slope*depth/2;
 const raw:[number,number][]=[[-shear,-depth/2],[edgeLength-shear,-depth/2],[edgeLength+shear,depth/2],[shear,depth/2]];
 const low=Math.min(...raw.map(p=>p[0]));
 return {edgeLength,stockLength:edgeLength+2*Math.abs(shear),angle:Math.abs(Math.atan(slope)*180/Math.PI),polygon:raw.map(([u,v])=>[u-low,v] as [number,number])};
}
/** Exact outer envelopes for straight rectangular rails with parallel PLUMB end faces.
 * Rail depth is normal to its rake. Pickets are vertical; their width is along the run.
 * End gaps are horizontal. Picket end gaps are vertical. No kerf/process allowance.
 * Round/oblique/saddle connections are rejected, not approximated as square cuts. */
export function attachedCuts(site:SiteModel|undefined,rail:SiteRail,layout:Layout|null):{issues:string[];parts:AttachedCut[];clearGap:number|null;stations:number[]} {
 const fail=(key:string)=>({issues:[key],parts:[],clearGap:null,stations:[]});
 const f=rail.fabrication;
 if(!layout||!f)return fail('siteRailFabDimensions');
 if(rail.infill!=='pickets')return fail('siteRailFabInfill');
 const h=layout.horizontal,dx=(layout.end.x-layout.start.x)/h,dy=(layout.end.y-layout.start.y)/h,m=layout.rise/h,cos=1/Math.sqrt(1+m*m);
 if(cos<.1)return fail('siteRailFabFaces');
 for(const [index,end] of [rail.start,rail.end].entries()){
  const host=site?.objects.find(o=>o.id===end.objectId);
  if(!host||host.section!=='rectangular'||end.face==='radial')return fail('siteRailFabFaces');
  const normals={left:[-1,0],right:[1,0],near:[0,-1],far:[0,1]};
  const [nx,ny]=normals[end.face],angle=host.rotation*Math.PI/180;
  const dot=(nx*Math.cos(angle)-ny*Math.sin(angle))*dx+(nx*Math.sin(angle)+ny*Math.cos(angle))*dy;
  if(Math.abs(dot-(index===0?1:-1))>1e-8)return fail('siteRailFabFaces');
 }
 const top=profile(f.top),bottom=profile(f.bottom),picket=profile(f.picket);
 const second=f.secondTop?profile(f.secondTop.profile):null,drop=f.secondTop?siteNumber(f.secondTop.drop):0;
 if(f.secondTop&&(!second||drop===null||drop<=0))return fail('siteRailFabDimensions');
 const gs=siteNumber(f.startGap),ge=siteNumber(f.endGap),pg=siteNumber(f.picketGap),max=siteNumber(f.maxClear);
 if(!top||!bottom||!picket||gs===null||ge===null||pg===null||max===null||gs<0||ge<0||pg<0||max<=0||gs+ge>=h)return fail('siteRailFabDimensions');
 const height=siteNumber(rail.height)!,clearance=siteNumber(rail.bottomClearance)!;
 const upper=height-(drop||0),termination=second||top;
 if(second&&drop!<=top.depth/cos)return fail('siteRailFabFit');
 const span=h-gs-ge,picketLength=upper-clearance-(termination.depth+bottom.depth)/cos-2*pg;
 if(!Number.isFinite(picketLength)||picketLength<=0||picket.depth>Math.min(termination.width,bottom.width))return fail('siteRailFabFit');
 // Make sure the physical end width fits on each recorded supporting face.
 for(const end of [rail.start,rail.end]){
  const host=site!.objects.find(o=>o.id===end.objectId)!;
  const faceWidth=siteNumber(end.face==='left'||end.face==='right'?host.depth:host.length)!;
  if(Math.min(end.along,1-end.along)*faceWidth+1e-8<Math.max(top.width,bottom.width,second?.width||0)/2)return fail('siteRailFabFit');
 }
 const n=Math.max(1,Math.ceil((span-max)/(picket.width+max)-1e-10));
 if(n>200)return fail('siteRailFabCount');
 const gap=(span-n*picket.width)/(n+1);
 if(gap<=0)return fail('siteRailFabFit');
 const point=(s:number,y:number,z:number):Point3=>({x:layout.start.x+s*dx-y*dy,y:layout.start.y+s*dy+y*dx,z:layout.start.z+z});
 const parts:AttachedCut[]=[];
 const rails: ['top'|'secondTop'|'bottom',NonNullable<ReturnType<typeof profile>>,number][]=[['top',top,height],...(second?[['secondTop',second,upper] as ['secondTop',typeof second,number]]:[]),['bottom',bottom,clearance+bottom.depth/cos]];
 for(const [kind,p,topFace] of rails){
  const lower=topFace-p.depth/cos;
  const vertices=[gs,h-ge].flatMap(s=>[[-p.width/2,lower],[p.width/2,lower],[p.width/2,lower+p.depth/cos],[-p.width/2,lower+p.depth/cos]].map(([y,z])=>point(s,y,s*m+z)));
  parts.push({mark:`${layout.mark}-${kind==='top'?'T':kind==='secondTop'?'T2':'B'}`,kind,profile:p.spec,...parallelCut(span/cos,p.depth,m),vertices,faces,station:null});
 }
 const stations=Array.from({length:n},(_,i)=>gs+gap+picket.width/2+i*(picket.width+gap));
 for(const [i,s] of stations.entries()){
  const lower=clearance+bottom.depth/cos+pg,upper=height-(drop||0)-termination.depth/cos-pg;
  const vertices=[lower,upper].flatMap(z=>[[-picket.width/2,-picket.depth/2],[picket.width/2,-picket.depth/2],[picket.width/2,picket.depth/2],[-picket.width/2,picket.depth/2]].map(([x,y])=>point(s+x,y,(s+x)*m+z)));
  parts.push({mark:`${layout.mark}-V${i+1}`,kind:'picket',profile:picket.spec,...parallelCut(picketLength,picket.width,m),vertices,faces,station:s});
 }
 return {issues:[],parts,clearGap:gap,stations};
}
export function attachedCutCsv(parts:AttachedCut[]):string{
 const cell=(v:string|number|null)=>{let s=v===null?'':String(v);if(typeof v==='string'&&/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
 const rows:(string|number|null)[][]=[['DRAFT - SHOP REVIEW REQUIRED; inches; no kerf or process allowance'],['Mark','Member','Rectangular profile','Edge length','Minimum stock length','Both end angles from square (deg)','End relationship','Station from start support face (horizontal)']];
 for(const p of parts)rows.push([p.mark,p.kind,p.profile,Number(p.edgeLength.toFixed(4)),Number(p.stockLength.toFixed(4)),Number(p.angle.toFixed(4)),'Parallel ends / same orientation',p.station===null?null:Number(p.station.toFixed(4))]);
 return rows.map(row=>row.map(cell).join(',')).join('\r\n');
}
