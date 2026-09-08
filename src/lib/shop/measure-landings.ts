import {blankLandingTransition,type LandingTransition,type MeasureData,type PostMeasure} from './measure';
import {parseMeas} from './measure-parse';
import {stairGeometry,surfacePoint,type Point3} from './measure-geometry';
const number=(v:string)=>{const n=parseMeas(v);return n!==null&&Number.isFinite(n)&&n>=0?n:null;};
export const transitionKey=(t:LandingTransition)=>`${t.landingSegIdx}-${t.upperFlightIdx}-${t.side}`;

/** One connection for each lower-flight railing line and each outgoing flight. */
export function landingConnections(data:MeasureData):LandingTransition[]{
  const out:LandingTransition[]=[];
  data.segments.forEach((seg,landingSegIdx)=>{
    if(seg.kind!=='platform'||data.segments[landingSegIdx-1]?.kind!=='flight')return;
    const lower=landingSegIdx-1;
    const knownSides=data.posts.filter(p=>p.segIdx===lower&&p.pointType==='railing_post'&&p.side).map(p=>p.side as 'left'|'right');
    const sides:('left'|'right')[]=data.rail.side==='Left'?['left']:data.rail.side==='Right'?['right']:data.rail.side==='Both'?['left','right']:knownSides.length?[...new Set(knownSides)]:['left','right'];
    for(let upper=landingSegIdx+1;upper<data.segments.length;upper++){
      const flight=data.segments[upper];if(flight.kind!=='flight')break;
      if(upper>landingSegIdx+1&&!flight.branch)break;
      for(const side of sides){
        const saved=data.landingTransitions?.find(t=>t.landingSegIdx===landingSegIdx&&t.lowerFlightIdx===lower&&t.upperFlightIdx===upper&&t.side===side);
        out.push(saved??blankLandingTransition(landingSegIdx,lower,upper,side));
      }
      if(!flight.branch)break;
    }
  });
  return out;
}

export function landingConnectionGeometry(data:MeasureData,t:LandingTransition){
  const model=stairGeometry(data);if(!model)return null;
  const height=number(data.rail.height);if(height===null||height===0)return null;
  const endpoint=(id:string,segIdx:number,reach:string,sign:number):{point:Point3;post:PostMeasure;base:Point3;direction:{x:number;y:number};provisional:boolean}|null=>{
    const post=data.posts.find(p=>p.id===id&&p.segIdx===segIdx&&p.pointType==='railing_post'&&p.stepIdx!==null);
    if(!post||!post.side)return null;
    const tread=model.treads.find(st=>st.segIdx===segIdx&&st.stepIdx===post.stepIdx);
    const along=number(post.fromNosing),edge=number(post.fromEdge),extension=number(reach);
    if(!tread||along===null||edge===null||extension===null||along>tread.run||edge>tread.width)return null;
    const base=surfacePoint(tread,along,post.side==='right'?tread.width-edge:edge);
    const start=surfacePoint(tread,0,post.side==='right'?tread.width-edge:edge),end=surfacePoint(tread,tread.run,post.side==='right'?tread.width-edge:edge);
    const length=Math.hypot(end.x-start.x,end.y-start.y);if(!length)return null;
    return {post,base,direction:{x:(end.x-start.x)/length,y:(end.y-start.y)/length},point:{x:base.x+sign*extension*(end.x-start.x)/length,y:base.y+sign*extension*(end.y-start.y)/length,z:base.z+height+sign*extension*tread.rise/tread.run},provisional:model.provisional||data.datums.postRef!=='centerline'};
  };
  const lower=endpoint(t.lowerPostId,t.lowerFlightIdx,t.lowerReach,1),upper=endpoint(t.upperPostId,t.upperFlightIdx,t.upperReach,-1);
  if(!lower||!upper||lower.post.side!==t.side)return null;
  const a=lower.point,b=upper.point,difference=b.z-a.z,span=Math.hypot(b.x-a.x,b.y-a.y);
  const recordedHeight=number(t.heightDifference),recordedSpan=number(t.horizontalSpan);
  const sign=t.higherEnd==='lower'?-1:t.higherEnd==='upper'?1:0;
  const mismatch=recordedHeight===null||recordedSpan===null||Math.abs(difference-sign*recordedHeight)>.125||Math.abs(span-recordedSpan)>.125;
  const bend=t.verticalAt==='lower'?{...a,z:b.z}:{...b,z:a.z};
  const along=(b.x-a.x)*lower.direction.x+(b.y-a.y)*lower.direction.y;
  const across=(b.x-a.x)*(-lower.direction.y)+(b.y-a.y)*lower.direction.x;
  const opposing=lower.direction.x*upper.direction.x+lower.direction.y*upper.direction.y<-.999;
  const alignedReach=(b.x-lower.base.x)*lower.direction.x+(b.y-lower.base.y)*lower.direction.y;
  const inner=upper.post.side===t.side&&t.side===(data.segments[t.landingSegIdx].kind==='platform'?(data.segments[t.landingSegIdx] as {uDirection?:string}).uDirection:undefined);
  const side0=number(lower.post.fromEdge)!,side1=number(upper.post.fromEdge)!;
  return {lower:a,upper:b,path:t.kind==='level'?[a,b]:[a,bend,b],heightDifference:Math.abs(difference),higherEnd:Math.abs(difference)<.001?'level':difference>0?'upper':'lower',horizontalSpan:span,provisional:lower.provisional||upper.provisional||mismatch,
    layout:{lowerSetback:side0,upperSetback:side1,acrossRailLines:Math.abs(across),alongRailEnds:along,stepHeightDifference:upper.base.z-lower.base.z,
      clearGapBetweenFlights:opposing&&inner?Math.abs(across)-side0-side1:null,
      lowerReachForSquareBridge:opposing&&alignedReach>=0?alignedReach:null}};
}
export function landingConnectionMeasured(data:MeasureData,t:LandingTransition):boolean{
  if(!t.kind)return false;
  if(t.kind==='separate'||t.kind==='landing_posts')return !!t.note.trim();
  const h=number(t.heightDifference),span=number(t.horizontalSpan);
  if(h===null||span===null||!t.higherEnd)return false;
  if(t.kind==='drop'&&(h<=0||t.higherEnd==='level'||!t.verticalAt))return false;
  if(t.kind==='level'&&(h!==0||t.higherEnd!=='level'))return false;
  const geometry=landingConnectionGeometry(data,t);
  return geometry!==null;
}

export function landingConnectionComplete(data:MeasureData,t:LandingTransition):boolean {
  return landingConnectionMeasured(data,t) && ((t.kind==='separate'||t.kind==='landing_posts') || landingConnectionGeometry(data,t)?.provisional===false);
}
