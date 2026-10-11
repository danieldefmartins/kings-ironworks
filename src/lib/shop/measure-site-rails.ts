import {attachedCuts} from './measure-attached-fab';
import type {SiteRail,SiteRailEnd} from './measure-site-rails-schema';
export type {SiteRail,SiteRailEnd} from './measure-site-rails-schema';
import type { Point3 } from './measure-geometry';
import { siteNumber, siteObjectProblems, type SiteModel, type SiteObject } from './measure-site';

export const newSiteRailEnd = (): SiteRailEnd => ({objectId:'',face:'near',along:.5,angle:0,elevation:'',connection:''});
export const newSiteRail = (id:string,label:string): SiteRail => ({id,label,start:newSiteRailEnd(),end:newSiteRailEnd(),height:'',bottomClearance:'',infill:'',profiles:'',notes:'',checkedSignature:''});
/** Reuse design dimensions only; the new opening needs its own measurements and checks. */
export function reuseSiteRail(source:SiteRail,id:string,label:string):SiteRail {
 const copy=structuredClone(source);
 return {...copy,id,label:label.slice(0,80),start:newSiteRailEnd(),end:newSiteRailEnd(),checkedSignature:'',
  ...(copy.fabrication?{fabrication:{...copy.fabrication,reviewedSignature:''}}:{})};
}
export const railHosts = (site?:SiteModel) => (site?.objects||[]).filter(o=>['wall','column','post'].includes(o.kind));

/** Face coordinates stay attached to a stable object ID, including rotation and resizing.
 * Elevation is the surveyed floor/reference elevation relative to the host bottom.
 * Round hosts use the true circumference, never the corners of a bounding square. */
export function resolveRailEnd(site:SiteModel|undefined, end:SiteRailEnd): Point3|null {
  const host=railHosts(site).find(o=>o.id===end.objectId);
  if(!host||siteObjectProblems(host).length)return null;
  const elevation=siteNumber(end.elevation);
  if(elevation===null)return null;
  const l=siteNumber(host.length)!,d=host.section==='round'?l:siteNumber(host.depth)!;
  let x:number,y:number;
  if(host.section==='round') {
    if(end.face!=='radial')return null;
    const a=end.angle*Math.PI/180;
    x=l/2+Math.cos(a)*l/2;y=l/2+Math.sin(a)*l/2;
  } else {
    if(end.face==='radial')return null;
    x=end.face==='left'?0:end.face==='right'?l:l*end.along;
    y=end.face==='near'?0:end.face==='far'?d:d*end.along;
  }
  const a=host.rotation*Math.PI/180;
  return {x:siteNumber(host.x)!+x*Math.cos(a)-y*Math.sin(a),y:siteNumber(host.y)!+x*Math.sin(a)+y*Math.cos(a),z:siteNumber(host.z)!+elevation};
}

export function siteRailLayout(site:SiteModel|undefined, rail:SiteRail) {
  const start=resolveRailEnd(site,rail.start),end=resolveRailEnd(site,rail.end);
  const height=siteNumber(rail.height),bottom=siteNumber(rail.bottomClearance);
  if(!start||!end||height===null||height<=0||bottom===null||bottom<0||bottom>=height)return null;
  const horizontal=Math.hypot(end.x-start.x,end.y-start.y);
  if(horizontal<1/16)return null;
  const rise=end.z-start.z;
  const vertices=[{...start,z:start.z+bottom},{...end,z:end.z+bottom},{...end,z:end.z+height},{...start,z:start.z+height}];
  return {id:rail.id,label:rail.label,mark:`SR${(site?.rails||[]).findIndex(r=>r.id===rail.id)+1}`,start,end,vertices,faces:[[0,1,2,3]],horizontal,rise,length:Math.hypot(horizontal,rise),pitch:Math.atan2(rise,horizontal)*180/Math.PI};
}

function hostSignature(o:SiteObject|undefined) {
  if(!o)return null;
  const {id,kind,section,x,y,z,length,depth,height,rotation,source,verified}=o;
  return {id,kind,section,x,y,z,length,depth,height,rotation,source,verified};
}
export function siteRailSignature(site:SiteModel|undefined,rail:SiteRail):string {
  // Rebuild explicitly so database JSON key order cannot invalidate a valid check.
  const endpoint=(e:SiteRailEnd)=>({objectId:e.objectId,face:e.face,along:e.along,angle:e.angle,elevation:e.elevation,connection:e.connection});
  const f=rail.fabrication;
  const profile=(p:NonNullable<SiteRail['fabrication']>['top'])=>({width:p.width,depth:p.depth,section:p.section,wall:p.wall});
  const fabrication=f?{top:profile(f.top),bottom:profile(f.bottom),picket:profile(f.picket),startGap:f.startGap,endGap:f.endGap,picketGap:f.picketGap,maxClear:f.maxClear,material:f.material,welds:f.welds}:undefined;
  return JSON.stringify({fabrication,datum:site?.datum||'',start:endpoint(rail.start),end:endpoint(rail.end),height:rail.height,bottomClearance:rail.bottomClearance,infill:rail.infill,profiles:rail.profiles,notes:rail.notes,hosts:[rail.start,rail.end].map(e=>hostSignature(site?.objects.find(o=>o.id===e.objectId)))});
}
export function siteRailVerified(site:SiteModel|undefined,rail:SiteRail):boolean {
  return !!siteRailLayout(site,rail)&&!!site?.datum.trim()&&[rail.start,rail.end].every(e=>{
    const host=site.objects.find(o=>o.id===e.objectId);return host?.verified&&host.source!=='unknown';
  })&&rail.checkedSignature===siteRailSignature(site,rail);
}
export function siteRailProblems(site:SiteModel|undefined,rail:SiteRail):string[] {
  const issues:string[]=[];
  const layout=siteRailLayout(site,rail);
  if(!layout)issues.push('siteRailGeometryOpen');
  if(layout&&[rail.start,rail.end].some(e=>{const h=site?.objects.find(o=>o.id===e.objectId);const floor=siteNumber(e.elevation);return h&&floor!==null&&(floor+siteNumber(rail.bottomClearance)!<0||floor+siteNumber(rail.height)!>siteNumber(h.height)!);}))issues.push('siteRailSupportOpen');
  if(!siteRailVerified(site,rail))issues.push('siteRailVerifyOpen');
  if(!rail.start.connection.trim()||!rail.end.connection.trim())issues.push('siteRailConnectionsOpen');
  if((!rail.profiles.trim()&&!rail.fabrication)||!rail.infill)issues.push('siteRailProfilesOpen');
  const cuts=attachedCuts(site,rail,layout);
  if(!rail.fabrication)issues.push('siteRailFabricationOpen');
  else if(cuts.issues.length)issues.push(...cuts.issues);
  else if(!siteRailFabReviewed(site,rail))issues.push('siteRailFabReview');
  return issues;
}
export function siteRailFabReviewed(site:SiteModel|undefined,rail:SiteRail):boolean {
  const f=rail.fabrication;
  return !!f&&!!f.material.trim()&&!!f.welds.trim()&&!!rail.start.connection.trim()&&!!rail.end.connection.trim()
    &&siteRailVerified(site,rail)&&!attachedCuts(site,rail,siteRailLayout(site,rail)).issues.length&&f.reviewedSignature===siteRailSignature(site,rail);
}
export function siteRailPayload(site?:SiteModel) {
  return (site?.rails||[]).map(rail=>({source:rail,layout:siteRailLayout(site,rail),verified:siteRailVerified(site,rail),issues:siteRailProblems(site,rail),fabrication:attachedCuts(site,rail,siteRailLayout(site,rail))}));
}
