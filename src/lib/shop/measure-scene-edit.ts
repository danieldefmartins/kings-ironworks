import {newPost,railSideSetback,type MeasureData,type PostMeasure} from './measure';
import {stairGeometry,surfacePoint,type MeasuredTread,type Point3} from './measure-geometry';
import {parseMeas} from './measure-parse';
import {applyDefaultSetbacks,DEFAULT_SIDE_SETBACK} from './measure-post-layout';
export type PostPointSelection={segmentIndex:number;stepIndex:number|null;worldPoint:Point3;grid?:number};
export type PostPointPosition=Pick<PostMeasure,'segIdx'|'stepIdx'|'side'|'fromNosing'|'pos'|'fromEdge'>;
export type PostPointResult={ok:true;position:PostPointPosition;point:Point3}|{ok:false;error:string};
const decimal=(n:number)=>Math.abs(n)<.000000005?'0':n.toFixed(8).replace(/\.?0+$/,'');
type Located={ok:true;surface:MeasuredTread;along:number;across:number}|{ok:false;error:string};
function locate(data:MeasureData,selection:PostPointSelection,/** Accept a step drawn from assumed sizes (its width or run not measured yet). */loose=false):Located{
 const fail=(error:string):Located=>({ok:false,error});
 // A blank reference is not a reason to refuse: placing a post on the drawing records centerline offsets (applyPostPoint sets it).
 if(data.datums.postRef==='face')return fail('Set the post measurement reference to centerline before placing a post.');
 const {segmentIndex,stepIndex,worldPoint}=selection,grid=selection.grid??1/16;
 if(!Number.isInteger(segmentIndex)||segmentIndex<0||!Number.isFinite(grid)||grid<=0)return fail('Choose a valid support and positive snap spacing.');
 if(!worldPoint||!['x','y','z'].every(k=>Number.isFinite(worldPoint[k as keyof Point3])))return fail('Choose a valid point on the measured support.');
 const segment=data.segments[segmentIndex];
 if(!segment||segment.kind==='curve'||segment.kind==='flight'&&segment.steps.some(s=>s.winder))return fail('Point placement requires a straight stair, landing or ramp. Use exact offsets for this support.');
 if(segment.kind==='flight'?(stepIndex===null||!Number.isInteger(stepIndex)||stepIndex<0||stepIndex>=segment.steps.length):stepIndex!==null)return fail('Choose an existing step or landing.');
 const surface=stairGeometry(data)?.treads.find(t=>t.segIdx===segmentIndex&&t.stepIdx===stepIndex);
 if(!surface||surface.provisional&&!loose||!(surface.run>0)||!(surface.width>0)||!surface.corners.every(p=>[p.x,p.y,p.z].every(Number.isFinite)))return fail('Complete and verify the support measurements before placing a post.');
 const [a,b,,d]=surface.corners,ux=b.x-a.x,uy=b.y-a.y,vx=d.x-a.x,vy=d.y-a.y,det=ux*vy-uy*vx;
 if(!Number.isFinite(det)||Math.abs(det)<1e-9)return fail('The measured support has no usable footprint.');
 const x=worldPoint.x-a.x,y=worldPoint.y-a.y,u=(x*vy-y*vx)/det,v=(ux*y-uy*x)/det;
 const tolerance=1e-6;
 if(u<-tolerance||u>1+tolerance||v<-tolerance||v>1+tolerance)return fail('Choose a point inside the measured support.');
 const measured=surfacePoint(surface,u*surface.run,v*surface.width);
 if(Math.abs(measured.z-worldPoint.z)>1e-4)return fail('Choose the top face of the support, not a riser or wall.');
 const snap=(n:number,maximum:number)=>Math.max(0,Math.min(maximum,Math.round(n/grid)*grid));
 return {ok:true,surface,along:snap(u*surface.run,surface.run),across:snap(v*surface.width,surface.width)};
}
/** Inverse of surfacePoint for measured rectangular supports. Snapping is in local inches,
 * so rotating an assembly never rotates or changes its measurement grid. */
export function resolvePostPoint(data:MeasureData,selection:PostPointSelection):PostPointResult{
 const at=locate(data,selection);if(!at.ok)return at;
 const {surface,along,across}=at,stepIndex=surface.stepIdx,side=across<=surface.width/2?'left':'right',edge=side==='left'?across:surface.width-across;
 const position:PostPointPosition={segIdx:surface.segIdx,stepIdx:stepIndex,side,fromNosing:stepIndex===null?'':decimal(along),pos:stepIndex===null?decimal(along):'',fromEdge:decimal(edge)};
 return {ok:true,position,point:surfacePoint(surface,along,across)};
}
/**
 * Where a post ends up when it is dropped (or tapped into place) on the drawing.
 * A finger is not a tape, so the drop only answers "which step, and where along it":
 * - a post that is moved keeps the side and the side-edge setback it had; moved to
 *   another step it also keeps its nosing setback, so the typed numbers survive;
 * - a new post takes the tapped side and the sheet's usual setbacks.
 * A step whose width or depth is not measured yet still takes a post: the step and
 * the side are what the tap records, with the usual setbacks rather than a distance
 * read off an assumed size; the post stays a preview until the numbers are in.
 * `point` is where it will actually stand (what the drag preview shows).
 */
export function resolvePostMove(data:MeasureData,postId:string|null,selection:PostPointSelection):PostPointResult{
 const existing=postId===null?null:data.posts.find(p=>p.id===postId);
 if(postId!==null&&!existing)return {ok:false,error:'This post no longer exists. Select it again.'};
 if(existing?.pathId)return {ok:false,error:'This point belongs to a drawn run. Move it in that run’s tools.'};
 const at=locate(data,selection,true);if(!at.ok)return at;
 const {surface}=at,finger=at.across<=surface.width/2?'left' as const:'right' as const;
 const position:PostPointPosition={segIdx:surface.segIdx,stepIdx:surface.stepIdx,side:finger,fromNosing:surface.stepIdx===null?'':decimal(at.along),pos:surface.stepIdx===null?decimal(at.along):'',fromEdge:decimal(finger==='left'?at.across:surface.width-at.across)},within=(value:string,maximum:number)=>{const n=value.trim()?parseMeas(value):null;return n!==null&&Number.isFinite(n)&&n>=0&&n<=maximum+1e-9?n:null;};
 let along=at.along,across=at.across,keptEdge=false,keptFront=false;
 const keep=(source:Pick<PostMeasure,'side'|'fromEdge'|'fromNosing'>,nosing:boolean)=>{
  const edge=within(source.fromEdge,surface.width);
  if((source.side==='left'||source.side==='right')&&edge!==null){position.side=source.side;position.fromEdge=source.fromEdge;keptEdge=true;across=source.side==='left'?edge:surface.width-edge;}
  const front=nosing&&surface.stepIdx!==null?within(source.fromNosing,surface.run):null;
  if(front!==null){position.fromNosing=source.fromNosing;keptFront=true;along=front;}
 };
 if(existing)keep(existing,existing.stepIdx!==null&&(existing.segIdx!==surface.segIdx||existing.stepIdx!==surface.stepIdx));
 else{const draft=Object.assign(newPost(surface.segIdx,surface.stepIdx),{side:position.side});applyDefaultSetbacks(data,draft,railSideSetback(data));keep(draft,true);}
 if(surface.provisional){
  // Sizes here are assumed: never record a distance measured off them.
  if(!keptEdge){const usual=parseMeas(DEFAULT_SIDE_SETBACK)??1.5;position.fromEdge=DEFAULT_SIDE_SETBACK;across=position.side==='left'?usual:surface.width-usual;}
  const segment=data.segments[surface.segIdx],step=segment.kind==='flight'&&surface.stepIdx!==null?segment.steps[surface.stepIdx]:null,run=step?parseMeas(step.run):null;
  if(step&&!keptFront&&!(run!==null&&run>0)){position.fromNosing='';along=surface.run/2;}
 }
 return {ok:true,position,point:surfacePoint(surface,along,across)};
}
/** Explicit mutation only after validation; existing fabrication and field notes are retained. */
export function applyPostPoint(data:MeasureData,postId:string|null,selection:PostPointSelection):PostPointResult&{postId?:string}{
 const result=resolvePostMove(data,postId,selection);if(!result.ok)return result;
 const existing=postId===null?null:data.posts.find(p=>p.id===postId)!;
 const post=existing||newPost(result.position.segIdx,result.position.stepIdx);
 Object.assign(post,result.position);if(!existing)data.posts.push(post);
 if(!data.datums.postRef)data.datums.postRef='centerline';
 return {...result,postId:post.id};
}
