import { landingConnections, landingConnectionComplete } from "./measure-landings";
import type { MeasureData } from './measure';
import { orderedPosts } from './measure-checks';
import { parseMeas } from './measure-parse';
import { stairGeometry, surfacePoint, type Point3 } from './measure-geometry';

export function drawingPosts(data: MeasureData, model: NonNullable<ReturnType<typeof stairGeometry>>) {
  return orderedPosts(data).map((post,index)=> {
    const t=model.treads.find(t=>t.segIdx===post.segIdx && t.stepIdx===post.stepIdx);
    const along=parseMeas(post.stepIdx===null?post.pos:post.fromNosing),edge=parseMeas(post.fromEdge);
    const height=parseMeas(data.rail.height);
    const provisional=!t||t.provisional||along===null||edge===null||!post.side||data.datums.postRef!=='centerline'
      ||(along!==null&&t!==undefined&&along>t.run)||(edge!==null&&t!==undefined&&edge>t.width)||height===null||height<=0;
    const base=t?surfacePoint(t,Math.min(t.run,along??0),post.side==='right'?t.width-Math.min(t.width,edge??0):Math.min(t.width,edge??0)):null;
    const top:Point3|null=base?{...base,z:base.z+(height&&height>0?height:36)}:null;
    return {post,label:`P${index+1}`,base,top,provisional};
  });
}

/** Drawing completeness is separate from the existing field submission gate. */
export function drawingIssues(data: MeasureData): string[] {
  const model=stairGeometry(data);
  if(!model)return ['drawingNoGeometry'];
  const issues:string[]=[];
  if(landingConnections(data).some(t=>!landingConnectionComplete(data,t)))issues.push("landingDrawingOpen");
  if(model.provisional)issues.push('drawingGeometryOpen');
  const posts=drawingPosts(data,model).filter(p=>p.post.pointType==='railing_post');
  if(!posts.length||posts.some(p=>p.provisional))issues.push('drawingPostsOpen');
  if(!data.materials.post.trim()||!data.materials.topRail.trim()||!data.rail.height.trim())issues.push('drawingProfilesOpen');
  if(posts.some(({post:p})=>!p.mount.trim()||!p.anchor.trim()||(p.mount==='Base plate'&&(!p.plate.trim()||!p.anchors.trim()))))issues.push('drawingConnectionsOpen');
  if(data.joints.some(j=>!j.method || (j.method!=='one_piece'&&(!j.gap.trim()||!j.carriedBy))))issues.push('drawingJointsOpen');
  return issues;
}

/** Sequential joint slots address each incoming piece; sibling branches share a landing. */
export function drawingJointSource(data:MeasureData,afterSegment:number):number {
  const before=data.segments[afterSegment],after=data.segments[afterSegment+1];
  if(before?.kind==='flight'&&after?.kind==='flight'&&before.branch&&after.branch&&before.branch!==after.branch){
    for(let i=afterSegment-1;i>=0;i--)if(data.segments[i].kind==='platform')return i;
  }
  return afterSegment;
}
