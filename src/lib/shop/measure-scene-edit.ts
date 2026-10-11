import {newPost,type MeasureData,type PostMeasure} from './measure';
import {stairGeometry,surfacePoint,type Point3} from './measure-geometry';
export type PostPointSelection={segmentIndex:number;stepIndex:number|null;worldPoint:Point3;grid?:number};
export type PostPointPosition=Pick<PostMeasure,'segIdx'|'stepIdx'|'side'|'fromNosing'|'pos'|'fromEdge'>;
export type PostPointResult={ok:true;position:PostPointPosition;point:Point3}|{ok:false;error:string};
const decimal=(n:number)=>Math.abs(n)<.000000005?'0':n.toFixed(8).replace(/\.?0+$/,'');
/** Inverse of surfacePoint for measured rectangular supports. Snapping is in local inches,
 * so rotating an assembly never rotates or changes its measurement grid. */
export function resolvePostPoint(data:MeasureData,selection:PostPointSelection):PostPointResult{
 const fail=(error:string):PostPointResult=>({ok:false,error});
 if(data.datums.postRef!=='centerline')return fail('Set the post measurement reference to centerline before placing a post.');
 const {segmentIndex,stepIndex,worldPoint}=selection,grid=selection.grid??1/16;
 if(!Number.isInteger(segmentIndex)||segmentIndex<0||!Number.isFinite(grid)||grid<=0)return fail('Choose a valid support and positive snap spacing.');
 if(!worldPoint||!['x','y','z'].every(k=>Number.isFinite(worldPoint[k as keyof Point3])))return fail('Choose a valid point on the measured support.');
 const segment=data.segments[segmentIndex];
 if(!segment||segment.kind==='curve'||segment.kind==='flight'&&segment.steps.some(s=>s.winder))return fail('Point placement requires a straight stair, landing or ramp. Use exact offsets for this support.');
 if(segment.kind==='flight'?(stepIndex===null||!Number.isInteger(stepIndex)||stepIndex<0||stepIndex>=segment.steps.length):stepIndex!==null)return fail('Choose an existing step or landing.');
 const surface=stairGeometry(data)?.treads.find(t=>t.segIdx===segmentIndex&&t.stepIdx===stepIndex);
 if(!surface||surface.provisional||surface.run<=0||surface.width<=0)return fail('Complete and verify the support measurements before placing a post.');
 const [a,b,,d]=surface.corners,ux=b.x-a.x,uy=b.y-a.y,vx=d.x-a.x,vy=d.y-a.y,det=ux*vy-uy*vx;
 if(!Number.isFinite(det)||Math.abs(det)<1e-9)return fail('The measured support has no usable footprint.');
 const x=worldPoint.x-a.x,y=worldPoint.y-a.y,u=(x*vy-y*vx)/det,v=(ux*y-uy*x)/det;
 const tolerance=1e-7;
 if(u<-tolerance||u>1+tolerance||v<-tolerance||v>1+tolerance)return fail('Choose a point inside the measured support.');
 const measured=surfacePoint(surface,u*surface.run,v*surface.width);
 if(Math.abs(measured.z-worldPoint.z)>1e-5)return fail('Choose the top face of the support, not a riser or wall.');
 const snap=(n:number,maximum:number)=>Math.max(0,Math.min(maximum,Math.round(n/grid)*grid));
 const along=snap(u*surface.run,surface.run),across=snap(v*surface.width,surface.width),side=across<=surface.width/2?'left':'right',edge=side==='left'?across:surface.width-across;
 const position:PostPointPosition={segIdx:segmentIndex,stepIdx:stepIndex,side,fromNosing:stepIndex===null?'':decimal(along),pos:stepIndex===null?decimal(along):'',fromEdge:decimal(edge)};
 return {ok:true,position,point:surfacePoint(surface,along,across)};
}
/** Explicit mutation only after validation; existing fabrication and field notes are retained. */
export function applyPostPoint(data:MeasureData,postId:string|null,selection:PostPointSelection):PostPointResult&{postId?:string}{
 const existing=postId===null?null:data.posts.find(p=>p.id===postId);
 if(postId!==null&&!existing)return {ok:false,error:'This post no longer exists. Select it again.'};
 if(existing?.pathId)return {ok:false,error:'This point belongs to a drawn run. Move it in that run’s tools.'};
 const result=resolvePostPoint(data,selection);if(!result.ok)return result;
 const post=existing||newPost(result.position.segIdx,result.position.stepIdx);
 Object.assign(post,result.position);if(!existing)data.posts.push(post);
 return {...result,postId:post.id};
}
