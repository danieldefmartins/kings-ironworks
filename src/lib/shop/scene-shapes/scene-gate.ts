// Gate: the opening between its posts, the leaf (or leaves) with frame and
// infill at the measured spacing, the swing arc ON THE GROUND — climbing by the
// measured grade rise from closed to fully open, which is exactly where a leaf
// binds — and, for a slide gate, the track and the run-back it needs.
// Layout: opening along +X from the left post face (x=0), the outside (where the
// measurer stands) toward −Y, grade at the closed leaf Z=0.
import type {MeasureData} from '../measure';
import type {Point3} from '../measure-geometry';
import {Geo,Guard,SceneOut,arc,emptyScene,guardBay,len,p3,section,signed,type ShapeSceneOutput} from './build-kit';

export function gateScene(data:MeasureData):ShapeSceneOutput{
 const g=data.gate;if(!g)return emptyScene();
 const out=new SceneOut(),m=data.materials;
 const wTop=len(g.widthTop),wBottom=len(g.widthBottom),W=wBottom!==null&&wTop!==null?Math.min(wBottom,wTop):wBottom??wTop;
 const hHinge=len(g.heightHinge),hLatch=len(g.heightLatch);
 if(W===null){out.need('Gate · opening width');return out.done();}
 if(hHinge===null&&hLatch===null)out.need('Gate · opening height');
 if(!g.operation)out.need('Gate · operation');
 if(!g.hingeSide&&g.operation!=='slide')out.need('Gate · hinge side');
 if(!g.swingDir&&g.operation!=='slide')out.need('Gate · swing direction');
 const post=section(g.postSize),pw=post?.width??0,pd=post?.depth??0;
 const hingeRight=g.hingeSide==='right',slide=g.operation==='slide',double=g.operation==='double_swing';
 // Opening heights at each post; one measured height stands for both, flagged.
 const hLeft=(hingeRight?hLatch:hHinge)??hHinge??hLatch,hRight=(hingeRight?hHinge:hLatch)??hHinge??hLatch;
 const footing=len(g.footingDepth),clearance=len(g.groundClearance)??(signed(g.groundClearance)===0?0:null);
 if(clearance===null)out.need('Gate · ground clearance');
 const rise=signed(g.gradeRise);

 // Posts: outer envelope beside the clear opening, or an axis at the opening edge.
 const postAt=(x:number,h:number|null,key:'left'|'right')=>{
  const top=h??0,cx=key==='left'?x-pw/2:x+pw/2,label=`${key==='left'?'Left':'Right'} gate post`;
  if(h!==null)out.member(`gate:post:${key}`,label,'post',p3(cx,0,0),p3(cx,0,top),post,{provisional:!post,entity:{part:`gate-post-${key}`}});
  if(footing)out.line(`gate:footing:${key}`,`${label} · footing`,'post',[p3(cx,0,0),p3(cx,0,-footing)],{entity:{part:`gate-post-${key}`}});
 };
 // The top of the opening may lean: the latch post is measured at both heights.
 postAt(0,hLeft,'left');postAt(wBottom??W,hRight,'right');
 if(wTop!==null&&wBottom!==null&&Math.abs(wTop-wBottom)>1/32&&hRight!==null)out.line('gate:opening-top','Opening · top width','post',[p3(0,0,hLeft??hRight),p3(wTop,0,hRight)],{entity:{part:'gate-opening'}});

 // Ground under the opening and the swing.
 const ground=new Geo(),groundY=g.swingDir==='out'?-1:1;
 const leaves:{hinge:number;width:number;dir:1|-1}[]=slide?[{hinge:hingeRight?W:0,width:W,dir:hingeRight?-1:1}]:double?[{hinge:0,width:W/2,dir:1},{hinge:W,width:W/2,dir:-1}]:[{hinge:hingeRight?W:0,width:W,dir:hingeRight?-1:1}];
 const frame=section(m.topRail),bottomRail=section(m.bottomRail)??frame,picket=section(m.picket);
 const gap=len(g.picketSpacing)??len(m.picketSpacing);
 if(gap===null&&!/solid|sheet|plate|privacy/i.test(g.infill))out.need('Gate · picket spacing');
 const clr=clearance??0;
 leaves.forEach((leaf,i)=>{
  const hA=leaf.hinge<W/2?hLeft:hRight;if(hA===null)return;
  const a=p3(leaf.hinge,0,0),b=p3(leaf.hinge+leaf.dir*leaf.width,0,0),hgt=hA-clr;if(!(hgt>0))return;
  const guard=new Guard(),fw=frame?.width??0;
  // Frame: stiles at both ends, rails top and bottom, infill between at the measured gap.
  const xs=[a.x,b.x].sort((p,q)=>p-q),L=xs[1]-xs[0];
  for(const x of [xs[0]+fw/2,xs[1]-fw/2])guard.add(p3(x,0,clr),p3(x,0,clr+hgt),frame,{x:0,y:1,z:0});
  guardBay(guard,{a:p3(xs[0],0,0),b:p3(xs[1],0,0),bottomA:clr,bottomB:clr,height:hgt,topRail:frame,bottomRail,picket,gap,postWidth:fw*2});
  const label=leaves.length>1?`Gate leaf ${i+1}`:'Gate leaf';
  guard.emit(out,`gate:leaf:${i}`,label,{provisional:clearance===null||!g.operation,entity:{part:'gate-leaf'}});
  if(L<=0)return;
  if(slide){
   // Track across the opening and back over the run-back, which must be clear for the full leaf.
   const back=leaf.dir===1?-1:1,end=leaf.hinge+back*leaf.width;
   out.line('gate:track','Slide track','rail',[p3(Math.max(W,end),0,0),p3(Math.min(0,end),0,0)],{entity:{part:'gate-track'}});
   const ghost=[p3(leaf.hinge,0,clr),p3(end,0,clr),p3(end,0,clr+hgt),p3(leaf.hinge,0,clr+hgt),p3(leaf.hinge,0,clr)];
   out.line('gate:runback','Run-back · leaf open','post',ghost,{entity:{part:'gate-track'}});
   const y0=-6,y1=6;ground.quad(p3(Math.min(0,end),y0,0),p3(Math.max(W,end),y0,0),p3(Math.max(W,end),y1,0),p3(Math.min(0,end),y1,0));
   return;
  }
  // Swing on the ground: the arc climbs by the measured rise from closed (0) to open (90°).
  const dirs=g.swingDir==='both'?[1,-1]:[groundY];
  for(const sy of dirs){
   const start=leaf.dir===1?0:Math.PI,end=start+sy*leaf.dir*Math.PI/2;
   const z=(t:number)=>(rise??0)*t;
   const pts=arc(a,leaf.width,start,end,z);
   out.line(`gate:swing:${i}:${sy}`,`${label} · swing`,'rail',pts,{provisional:rise===null||!g.swingDir,entity:{part:'gate-swing'}});
   // Leaf bottom at full open, so the gap over the risen grade is visible.
   const tip=pts[pts.length-1];
   out.line(`gate:open:${i}:${sy}`,`${label} · open`,'post',[p3(a.x,a.y,clr),p3(tip.x,tip.y,clr),p3(tip.x,tip.y,clr+hgt),p3(a.x,a.y,clr+hgt)],{entity:{part:'gate-swing'}});
   // Ground sweep as a fan that follows the grade.
   const fan:Point3[]=[{...a},...pts];const o=ground.vertices.length;ground.vertices.push(...fan);for(let k=1;k<fan.length-1;k++)ground.faces.push([o,o+k,o+k+1]);
  }
 });
 if(rise===null&&!slide)out.need('Gate · grade rise across swing');
 out.mesh('gate:ground','Ground · swing path','site',ground,{referenceOnly:true,provisional:rise===null&&!slide,entity:{part:'gate-ground'}});
 // Grade strip through the opening (between and beyond the posts).
 const strip=new Geo().quad(p3(-pw-18,-pd/2-12,-.05),p3(W+pw+18,-pd/2-12,-.05),p3(W+pw+18,pd/2+12,-.05),p3(-pw-18,pd/2+12,-.05));
 out.mesh('gate:grade','Grade at opening','site',strip,{referenceOnly:true,entity:{part:'gate-ground'}});
 return out.done();
}
