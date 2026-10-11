import type {MeasureData} from './measure';
import {segmentIdAt} from './measure';
import {stairGeometry,type Point3} from './measure-geometry';
import {siteNumber,siteMesh,type SiteObject,type SiteModel,type SiteMesh} from './measure-site';
export type WallPlacementEdge={segmentId:string;segmentIndex:number;side:'left'|'right'|'start'|'end';start:Point3;end:Point3;outward:{x:number;y:number};provisional:boolean};
/** Straight segment perimeter, in the assembly's world frame. Provisional edges are editing targets only. */
export function wallPlacementEdges(data:MeasureData):WallPlacementEdge[]{
 const model=stairGeometry(data);if(!model)return [];
 return data.segments.flatMap((s,segmentIndex)=>{
  if(s.kind==='curve'||s.kind==='flight'&&s.steps.some(t=>t.winder))return [];
  const treads=model.treads.filter(t=>t.segIdx===segmentIndex);if(!treads.length)return [];
  const first=treads[0],last=treads[treads.length-1],startL={...first.corners[0]},startR={...first.corners[3]},endL=last.corners[1],endR=last.corners[2];
  if(s.kind==='flight'){startL.z-=first.rise;startR.z-=first.rise;}
  const center={x:(startL.x+startR.x+endL.x+endR.x)/4,y:(startL.y+startR.y+endL.y+endR.y)/4};
  const edges:[WallPlacementEdge['side'],Point3,Point3][]=[['left',startL,endL],['right',startR,endR],['start',startL,startR],['end',endL,endR]];
  return edges.flatMap(([side,start,end])=>{
   const dx=end.x-start.x,dy=end.y-start.y,length=Math.hypot(dx,dy);if(length<1e-6)return [];
   let outward={x:-dy/length,y:dx/length};if(outward.x*(center.x-(start.x+end.x)/2)+outward.y*(center.y-(start.y+end.y)/2)>0)outward={x:-outward.x,y:-outward.y};
   return [{segmentId:segmentIdAt(s,segmentIndex),segmentIndex,side,start,end,outward,provisional:treads.some(t=>t.provisional)}];
  });
 });
}
function resolvedWall(data:MeasureData,object:SiteObject,draft=false):{object:SiteObject;signature:string}|null{
 const a=object.wallAnchor;if(!a||object.kind!=='wall'||object.section!=='rectangular')return null;
 const matching=data.segments.filter((s,i)=>segmentIdAt(s,i)===a.segmentId);if(matching.length!==1)return null;
 const edge=wallPlacementEdges(data).find(e=>e.segmentId===a.segmentId&&e.side===a.side);if(!edge||edge.provisional&&!draft)return null;
 const gap=siteNumber(a.gap),start=siteNumber(a.startExtension),end=siteNumber(a.endExtension),base=siteNumber(a.baseOffset);
 const depth=siteNumber(object.depth),height=siteNumber(object.height);
 if([gap,start,end,base].some(n=>n===null)||gap!<0)return null;
 if(!draft&&(depth===null||depth<=0||height===null||height<=0))return null;
 const thickness=depth!==null&&depth>0?depth:6,wallHeight=height!==null&&height>0?height:84;
 const span=Math.hypot(edge.end.x-edge.start.x,edge.end.y-edge.start.y);
 // Positive values extend past an endpoint; negative values trim inward.
 if(span+start!+end!<=0)return null;
 const ux=(edge.end.x-edge.start.x)/span,uy=(edge.end.y-edge.start.y)/span;
 // Local Y always points left of local X. Shift the outside corner when the wall is on the other side.
 const reverse=(-uy*edge.outward.x+ux*edge.outward.y)<0,offset=gap!+(reverse?thickness:0);
 const x=edge.start.x-ux*start!+edge.outward.x*offset,y=edge.start.y-uy*start!+edge.outward.y*offset,z=Math.min(edge.start.z,edge.end.z)+base!;
 const decimal=(n:number)=>Math.abs(n)<.000000005?'0':n.toFixed(8).replace(/\.?0+$/, '');
 const output={...object,x:decimal(x),y:decimal(y),z:decimal(z),rotation:Math.atan2(uy,ux)*180/Math.PI,length:decimal(span+start!+end!),depth:decimal(thickness),height:decimal(wallHeight),riseX:'0',riseY:'0'};
 const signature=JSON.stringify({segment:a.segmentId,side:a.side,edge:[edge.start,edge.end],outward:edge.outward,gap,start,end,base,depth,height,source:object.source});
 output.verified=!draft&&object.verified&&a.checkedSignature===signature;
 return {object:output,signature};
}
/** Compute this from the raw field record when the user explicitly verifies placement. */
export function wallAnchorSignature(data:MeasureData,object:SiteObject):string {return resolvedWall(data,object)?.signature||'';}
/** Resolved host geometry is ephemeral. Never autosave these derived XYZ/length fields. */
export function resolveSite(data:MeasureData):SiteModel|undefined {
 if(!data.site)return undefined;
 return {...data.site,objects:data.site.objects.map(o=>!o.wallAnchor?o:resolvedWall(data,o)?.object||{...o,x:'',y:'',z:'',length:'',verified:false})};
}
/** Editing preview only: fixed display depth/height for blanks, never anchors or cut geometry. */
export function previewWall(data:MeasureData,object:SiteObject):SiteMesh|null {
 const resolved=resolvedWall(data,object,true);if(!resolved)return null;
 const mesh=siteMesh(resolved.object);return mesh?{...mesh,provisional:true}:null;
}
