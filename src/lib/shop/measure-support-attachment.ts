import {z} from 'zod';
import type {MeasureData,PostMeasure} from './measure';
import {stairGeometry,surfacePoint,type Point3} from './measure-geometry';
import {SiteRailEndSchema} from './measure-site-rails-schema';
import {resolveRailEnd,railHosts} from './measure-site-rails';
import {siteNumber,type SiteModel} from './measure-site';
import {railFaceSpan} from './measure-rail-end-position';
export const SupportAttachmentSchema=SiteRailEndSchema.extend({gap:z.string().max(40)});
export type SupportAttachment=z.infer<typeof SupportAttachmentSchema>;
export type SupportTerminal={kind:'existing-support';hostId:string;facePoint:Point3;normal:Point3;gap:number;verified:boolean;faceClearance:number;bottomZ:number;topZ:number;rectangular:true};
export function supportTerminal(data:MeasureData,site:SiteModel|undefined,post:PostMeasure):{base:Point3|null;top:Point3|null;provisional:boolean;terminal?:SupportTerminal}{
 const attachment=post.supportAttachment;
 const segment=data.segments[post.segIdx];
 if(!segment||!['flight','platform'].includes(segment.kind)||post.pathId||(segment.kind==='flight'&&(post.stepIdx===null||!segment.steps[post.stepIdx])))return {base:null,top:null,provisional:true};
 if(!attachment||post.pointType==='railing_post')return {base:null,top:null,provisional:true};
 const host=railHosts(site).find(h=>h.id===attachment.objectId),span=railFaceSpan(host,attachment.face),height=siteNumber(data.rail.height),gap=siteNumber(attachment.gap);
 const base=resolveRailEnd(site,attachment);
 if(!host||!span||!base||height===null||height<=0||gap===null||gap<0||host.section==='round'||siteNumber(host.riseX)!==0||siteNumber(host.riseY)!==0)return {base:null,top:null,provisional:true};
 const top={...base,z:base.z+height},angle=host.rotation*Math.PI/180;
 const local=attachment.face==='left'?[-1,0]:attachment.face==='right'?[1,0]:attachment.face==='near'?[0,-1]:[0,1];
 const normal={x:local[0]*Math.cos(angle)-local[1]*Math.sin(angle),y:local[0]*Math.sin(angle)+local[1]*Math.cos(angle),z:0};
 const bottomZ=siteNumber(host.z)!,topZ=bottomZ+siteNumber(host.height)!;
 const model=stairGeometry(data);
 const neighbors=data.posts.filter(p=>p.id!==post.id&&p.segIdx===post.segIdx&&p.side===post.side).flatMap(p=>{
  if(p.supportAttachment&&p.pointType!=='railing_post'){const point=resolveRailEnd(site,p.supportAttachment);return point?[point]:[];}
  if(p.pointType!=='railing_post')return [];
  const tread=model?.treads.find(t=>t.segIdx===p.segIdx&&t.stepIdx===p.stepIdx),along=siteNumber(p.stepIdx===null?p.pos:p.fromNosing),edge=siteNumber(p.fromEdge);
  if(!tread||tread.provisional||along===null||edge===null||along<0||along>tread.run||edge<0||edge>tread.width)return [];
  return [surfacePoint(tread,along,p.side==='right'?tread.width-edge:edge)];
 }).sort((a,b)=>Math.hypot(a.x-base.x,a.y-base.y)-Math.hypot(b.x-base.x,b.y-base.y));
 const next=neighbors[0],dx=next?next.x-base.x:0,dy=next?next.y-base.y:0,run=Math.hypot(dx,dy);
 const aligned=run>1/16&&(dx*normal.x+dy*normal.y)/run>1-1e-6;
 const verified=aligned&&host.verified&&host.source!=='unknown'&&!!site?.datum.trim()&&!!attachment.connection.trim()&&!!post.side&&base.z>=bottomZ&&top.z<=topZ;
 return {base,top,provisional:!verified,terminal:{kind:'existing-support',hostId:host.id,facePoint:base,normal,gap,verified,faceClearance:Math.min(attachment.along,1-attachment.along)*span.length,bottomZ,topZ,rectangular:true}};
}
