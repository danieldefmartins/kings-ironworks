// Window / egress well: the well liner at its measured outside and inside
// footprint and depth, standing above (or below) grade by the measured amount;
// the house wall behind it as the measured bands — each set back from the
// proudest face, which is what the guard's end post is dimensioned off; the
// basement window at its sill height; and whatever KIW supplies over it: grate,
// guard + gate, ladder. Layout: proud face of the house at Y=0, well out toward
// −Y, grade at Z=0.
import type {MeasureData} from '../measure';
import {Geo,Guard,SceneOut,arc,emptyScene,guardBay,len,p3,section,signed,type ShapeSceneOutput} from './build-kit';

export function windowWellScene(data:MeasureData):ShapeSceneOutput{
 const w=data.well;if(!w)return emptyScene();
 const out=new SceneOut(),m=data.materials;
 const Lh=len(w.lengthAtHouse),Pj=len(w.projection),inL=len(w.insideLength),inP=len(w.insideProjection);
 if(Lh===null)out.need('Well · length at house');if(Pj===null)out.need('Well · projection');
 if(Lh===null||Pj===null)return out.done();
 // Wall thickness: measured, or what the outside and inside footprints leave.
 const t=len(w.wallThickness)??(inL!==null&&inL<Lh?(Lh-inL)/2:inP!==null&&inP<Pj?Pj-inP:null);
 if(t===null)out.need('Well · wall thickness');
 const depth=len(w.depth);if(depth===null)out.need('Well · depth');
 const rise=signed(w.topToGrade);if(rise===null)out.need('Well · top to grade');
 const top=rise??0,floor=depth!==null?top-depth:top;
 const tw=t??0,inside={x0:tw,x1:Lh-tw,y0:-(Pj-tw),y1:0};
 // Liner: three walls; the house is the fourth.
 const liner=new Geo();
 if(t){liner.box(p3(0,-Pj,floor),p3(t,0,top)).box(p3(Lh-t,-Pj,floor),p3(Lh,0,top)).box(p3(t,-Pj,floor),p3(Lh-t,-Pj+t,top));}
 out.mesh('well:liner','Well walls','site',liner,{provisional:depth===null,referenceOnly:false,entity:{part:'well-liner'}});
 if(!t)out.line('well:outline','Well · outside','site',[p3(0,0,top),p3(0,-Pj,top),p3(Lh,-Pj,top),p3(Lh,0,top)],{provisional:true,entity:{part:'well-liner'}});
 out.mesh('well:floor','Well floor','site',new Geo().quad(p3(inside.x0,inside.y0,floor),p3(inside.x1,inside.y0,floor),p3(inside.x1,0,floor),p3(inside.x0,0,floor)),{provisional:depth===null,referenceOnly:true,entity:{part:'well-liner'}});
 // Grade around the well.
 const g=36,ground=new Geo();
 ground.quad(p3(-g,-Pj-g,0),p3(Lh+g,-Pj-g,0),p3(Lh+g,-Pj,0),p3(-g,-Pj,0)).quad(p3(-g,-Pj,0),p3(0,-Pj,0),p3(0,0,0),p3(-g,0,0)).quad(p3(Lh,-Pj,0),p3(Lh+g,-Pj,0),p3(Lh+g,0,0),p3(Lh,0,0));
 out.mesh('well:grade','Grade','site',ground,{referenceOnly:true,entity:{part:'well-grade'}});

 // House wall: measured bands in relief, an unmeasured backdrop behind them.
 const bands=w.bands.map(b=>({b,set:len(b.setback)??(signed(b.setback)===0?0:null),from:signed(b.fromTop),to:signed(b.toTop)}));
 const back=Math.max(0,...bands.map(b=>b.set??0)),x0=-g,x1=Lh+g;
 out.mesh('house:well','House · unmeasured reference','house',new Geo().box(p3(x0,back,floor-6),p3(x1,back+8,top+96)),{provisional:true,referenceOnly:true,entity:{}});
 bands.forEach(({b,set,from,to},i)=>{
  if(set===null||from===null||to===null||to<=from)return;
  out.mesh(`well:band:${b.id}`,b.label||`Wall band ${i+1}`,'site',new Geo().box(p3(x0,set,top-to),p3(x1,back+.01,top-from)),{referenceOnly:true,entity:{part:'well-band'}});
 });
 // The window, centred on the well (its side offset is not measured), on the face behind the sill.
 const ww=len(w.windowW),wh=len(w.windowH),sill=len(w.sillToFloor);
 if(ww!==null&&wh!==null&&sill!==null&&depth!==null){
  const z0=floor+sill,z1=z0+wh,cx=Lh/2;
  const face=bands.find(x=>x.set!==null&&x.from!==null&&x.to!==null&&top-x.to<=z0&&top-x.from>=z0)?.set??0;
  const y=face-.05;
  out.line('well:window','Basement window','post',[p3(cx-ww/2,y,z0),p3(cx+ww/2,y,z0),p3(cx+ww/2,y,z1),p3(cx-ww/2,y,z1),p3(cx-ww/2,y,z0)],{entity:{part:'well-window'}});
  out.mesh('well:glass','Basement window · glass','house',new Geo().quad(p3(cx-ww/2,y,z0),p3(cx+ww/2,y,z0),p3(cx+ww/2,y,z1),p3(cx-ww/2,y,z1)),{referenceOnly:true,entity:{}});
 }
 const has=(k:string)=>w.deliverables.includes(k as never);
 // Grate.
 if(has('grate')){
  const recessed=w.grateBearing==='recessed'||w.grateBearing==='angle_frame';
  const [gx0,gx1,gy0]=recessed?[inside.x0,inside.x1,inside.y0]:[0,Lh,-Pj];
  const z=recessed?top-.01:top+.01;
  out.mesh('well:grate','Well grate','attached',new Geo().quad(p3(gx0,gy0,z),p3(gx1,gy0,z),p3(gx1,0,z),p3(gx0,0,z)),{provisional:!w.grateBearing,entity:{part:'well-grate'}});
  if(!w.grateBearing)out.need('Well · grate bearing');
 }
 // Guard on the wall top, end posts held off the proud face by the measured gap.
 const guardH=len(w.guardHeight);
 if(has('guard')){
  if(guardH===null)out.need('Well · guard height');
  const post=section(m.post),pw=post?.width??0,topRail=section(m.topRail),bottomRail=section(m.bottomRail),picket=section(m.picket);
  const gap=len(m.picketSpacing)??len(w.maxSphere),clear=len(data.fab.bottomClearance)??0,gapToWall=len(w.postToWall)??(signed(w.postToWall)===0?0:null);
  if(gapToWall===null)out.need('Well · post to wall');
  if(guardH!==null){
   const c=tw/2,yEnd=-((gapToWall??0)+pw/2),yFront=-Pj+c;
   const corners=[p3(c,yEnd,top),p3(c,yFront,top),p3(Lh-c,yFront,top),p3(Lh-c,yEnd,top)];
   const gw=has('gate')?len(w.gateWidth):null;if(has('gate')&&gw===null)out.need('Well · gate width');
   const guard=new Guard(),posts=new Guard(),entity={part:'well-guard'};
   const runs:[typeof corners[0],typeof corners[0]][]=[[corners[0],corners[1]],[corners[2],corners[3]]];
   const frontL=corners[2].x-corners[1].x;
   const gate=gw!==null&&gw<frontL-2*pw?{a:p3(corners[1].x+(frontL-gw)/2,yFront,top),b:p3(corners[1].x+(frontL+gw)/2,yFront,top)}:null;
   if(gate)runs.push([corners[1],gate.a],[gate.b,corners[2]]);else runs.push([corners[1],corners[2]]);
   const postPts=[...corners,...(gate?[gate.a,gate.b]:[])];
   for(const p of postPts)posts.add(p3(p.x,p.y,top),p3(p.x,p.y,top+guardH),post);
   for(const [a,b] of runs)guardBay(guard,{a,b,bottomA:top+clear,bottomB:top+clear,height:guardH-clear,topRail,bottomRail,picket,gap,postWidth:pw});
   guard.emit(out,'well:guard','Well guard',{provisional:gapToWall===null,entity});
   out.mesh('well:posts','Well guard · posts','post',posts.geo,{entity});
   posts.axes.forEach(points=>out.line('well:posts','Well guard · posts','post',points,{entity}));
   if(gate){
    const leaf=new Guard(),fw=topRail?.width??0,hingeRight=w.gateHinge==='right',h=hingeRight?gate.b:gate.a,L=gw!;
    const a=p3(gate.a.x+pw/2,yFront,top),b=p3(gate.b.x-pw/2,yFront,top);
    for(const x of [a.x+fw/2,b.x-fw/2])leaf.add(p3(x,yFront,top+clear),p3(x,yFront,top+guardH),topRail,{x:0,y:1,z:0});
    guardBay(leaf,{a,b,bottomA:top+clear,bottomB:top+clear,height:guardH-clear,topRail,bottomRail,picket,gap,postWidth:fw*2});
    leaf.emit(out,'well:gate','Well gate',{provisional:!w.gateSwing||!w.gateHinge,entity:{part:'well-gate'}});
    if(!w.gateSwing)out.need('Well · gate swing');if(!w.gateHinge)out.need('Well · gate hinge');
    const sy=w.gateSwing==='in'?1:-1,start=hingeRight?Math.PI:0,end=start+(hingeRight?-1:1)*sy*Math.PI/2;
    out.line('well:gate-swing','Well gate · swing','rail',arc(h,L-pw,start,end,()=>top),{provisional:!w.gateSwing,entity:{part:'well-gate'}});
   }
  }
 }
 // Ladder on the far wall, rungs held off it by the measured standoff.
 if(has('ladder')){
  const lw=len(w.ladderWidth),sp=len(w.ladderSpacing),so=len(w.ladderStandoff),ext=len(w.ladderTopExt)??0;
  if(lw===null)out.need('Well · ladder width');if(sp===null)out.need('Well · rung spacing');if(so===null)out.need('Well · ladder standoff');
  if(lw!==null&&depth!==null){
   const y=inside.y0+(so??0),cx=Lh/2,ladder=new Guard();
   for(const x of [cx-lw/2,cx+lw/2]){ladder.add(p3(x,y,floor),p3(x,y,top+ext),null);ladder.add(p3(x,y,top+ext*.5),p3(x,inside.y0,top+ext*.5),null);}
   const count=Math.round(len(w.ladderRungs)??0)||(sp?Math.floor((top-floor)/sp):0);
   for(let i=1;i<=count&&sp;i++){const z=floor+sp*i;if(z>top+ext)break;ladder.add(p3(cx-lw/2,y,z),p3(cx+lw/2,y,z),null);}
   ladder.emit(out,'well:ladder','Well ladder',{provisional:so===null||sp===null,entity:{part:'well-ladder'}});
  }
 }
 return out.done();
}
