// Window / egress well: the well liner at its measured outside and inside
// footprint and depth, standing above (or below) grade by the measured amount;
// the house wall behind it as the measured bands — each set back from the
// proudest face, which is what the guard's end post is dimensioned off; the
// basement window at its sill height; and whatever KIW supplies over it: grate,
// guard + gate, ladder. Layout: proud face of the house at Y=0, well out toward
// −Y, grade at Z=0. Anything not read yet is drawn at a preview size (flagged
// provisional), so a new sheet opens on a picture of the job, not on a blank.
import {type MeasureData} from '../measure';
import {SHOP_DEFAULTS} from '../measure-shop-defaults';
import {WELL_PREVIEW as PV,wellGateSwing,wellGuardLayout,wellLadderLayout,type P2} from '../measure-well-layout';
import {Geo,Guard,SceneOut,arc,emptyScene,guardBay,len,p3,section,signed,type Section,type ShapeSceneOutput} from './build-kit';

const sq=(n:number):Section=>({width:n,depth:n,round:false});
// Steel drawn until the sheet names the real sections; the ladder is always drawn at these.
const STEEL={post:sq(PV.post),topRail:sq(1.5),bottomRail:sq(1),picket:sq(.5),ladderRail:{width:2,depth:.375,round:false} as Section,rung:{width:.75,depth:.75,round:true} as Section};
const at=(p:P2,d:P2,k:number):P2=>({x:p.x+d.x*k,y:p.y+d.y*k});

export function windowWellScene(data:MeasureData):ShapeSceneOutput{
 const w=data.well;if(!w)return emptyScene();
 const out=new SceneOut(),m=data.materials,has=(k:string)=>w.deliverables.includes(k as never);
 const Lm=len(w.lengthAtHouse),Pm=len(w.projection),inL=len(w.insideLength),inP=len(w.insideProjection);
 if(Lm===null)out.need('Well · length at house');if(Pm===null)out.need('Well · projection');
 const Lh=Lm??PV.length,Pj=Pm??PV.projection;
 // Wall thickness: measured, or what the outside and inside footprints leave.
 const tm=len(w.wallThickness)??(inL!==null&&inL<Lh?(Lh-inL)/2:inP!==null&&inP<Pj?Pj-inP:null);
 if(tm===null&&(has('guard')||has('grate')))out.need('Well · wall thickness');
 const dm=len(w.depth);if(dm===null&&has('ladder'))out.need('Well · depth');
 const rise=signed(w.topToGrade);if(rise===null&&has('guard'))out.need('Well · top to grade');
 const t=tm??PV.wall,top=rise??0,floor=top-(dm??PV.depth),inside={x0:t,x1:Lh-t,y0:-(Pj-t),y1:0};
 const rough=Lm===null||Pm===null,shell=rough||tm===null||(dm===null&&has('ladder')),z=(p:P2,h:number)=>p3(p.x,p.y,h);
 // Liner: three walls; the house is the fourth. With a ladder inside, the two
 // walls nearest the opening view go see-through so it can be seen.
 const liner=new Geo(),near=has('ladder')?new Geo():liner;
 liner.box(p3(0,-Pj,floor),p3(t,0,top));near.box(p3(Lh-t,-Pj,floor),p3(Lh,0,top)).box(p3(t,-Pj,floor),p3(Lh-t,-Pj+t,top));
 out.mesh('well:liner','Well walls','site',liner,{provisional:shell,referenceOnly:false,entity:{part:'well-liner'}});
 if(near!==liner)out.mesh('well:liner-near','Well walls','wall-preview',near,{provisional:shell,referenceOnly:false,entity:{part:'well-liner'}});
 out.mesh('well:floor','Well floor','site',new Geo().quad(p3(inside.x0,inside.y0,floor),p3(inside.x1,inside.y0,floor),p3(inside.x1,0,floor),p3(inside.x0,0,floor)),{provisional:shell,referenceOnly:true,entity:{part:'well-liner'}});
 // Grade around the well: a narrow apron, so the well itself fills the view.
 const g=18,ground=new Geo();
 ground.quad(p3(-g,-Pj-g,0),p3(Lh+g,-Pj-g,0),p3(Lh+g,-Pj,0),p3(-g,-Pj,0)).quad(p3(-g,-Pj,0),p3(0,-Pj,0),p3(0,0,0),p3(-g,0,0)).quad(p3(Lh,-Pj,0),p3(Lh+g,-Pj,0),p3(Lh+g,0,0),p3(Lh,0,0));
 out.mesh('well:grade','Grade','site',ground,{referenceOnly:true,entity:{part:'well-grade'}});

 // House wall: measured bands in relief, an unmeasured backdrop behind them.
 const bands=w.bands.map(b=>({b,set:len(b.setback)??(signed(b.setback)===0?0:null),from:signed(b.fromTop),to:signed(b.toTop)}));
 const back=Math.max(0,...bands.map(b=>b.set??0)),x0=-g,x1=Lh+g;
 // The face of the house at a height: the band there, else the proud face.
 const faceAt=(h:number)=>bands.find(x=>x.set!==null&&x.from!==null&&x.to!==null&&top-x.to<=h&&top-x.from>=h)?.set??0;
 out.mesh('house:well','House · unmeasured reference','house',new Geo().box(p3(x0,back,floor-6),p3(x1,back+8,top+(len(w.guardHeight)??PV.guardHeight)+18)),{provisional:true,referenceOnly:true,entity:{}});
 bands.forEach(({b,set,from,to},i)=>{
  if(set===null||from===null||to===null||to<=from)return;
  out.mesh(`well:band:${b.id}`,b.label||`Wall band ${i+1}`,'site',new Geo().box(p3(x0,set,top-to),p3(x1,back+.01,top-from)),{referenceOnly:true,entity:{part:'well-band'}});
 });
 // The window, centred on the well (its side offset is not measured), on the face behind the sill.
 const ww=len(w.windowW),wh=len(w.windowH),sill=len(w.sillToFloor);
 if(ww!==null&&wh!==null&&sill!==null&&dm!==null){
  const z0=floor+sill,z1=z0+wh,cx=Lh/2,y=faceAt(z0)-.05;
  out.line('well:window','Basement window','post',[p3(cx-ww/2,y,z0),p3(cx+ww/2,y,z0),p3(cx+ww/2,y,z1),p3(cx-ww/2,y,z1),p3(cx-ww/2,y,z0)],{entity:{part:'well-window'}});
  out.mesh('well:glass','Basement window · glass','house',new Geo().quad(p3(cx-ww/2,y,z0),p3(cx+ww/2,y,z0),p3(cx+ww/2,y,z1),p3(cx-ww/2,y,z1)),{referenceOnly:true,entity:{}});
 }
 // Grate.
 if(has('grate')){
  const recessed=w.grateBearing==='recessed'||w.grateBearing==='angle_frame';
  const [gx0,gx1,gy0]=recessed?[inside.x0,inside.x1,inside.y0]:[0,Lh,-Pj];
  const zg=recessed?top-.01:top+.01;
  out.mesh('well:grate','Well grate','attached',new Geo().quad(p3(gx0,gy0,zg),p3(gx1,gy0,zg),p3(gx1,0,zg),p3(gx0,0,zg)),{provisional:rough||!w.grateBearing,entity:{part:'well-grate'}});
  if(!w.grateBearing)out.need('Well · grate bearing');
 }
 // Guard on the wall top: a front run and a return down each side, the end
 // posts held off the proud face by the measured gap.
 if(has('guard')){
  const gm=len(w.guardHeight);if(gm===null)out.need('Well · guard height');
  const named=[m.post,m.topRail,m.bottomRail,m.picket].map(section),[post,topRail,bottomRail,picket]=[named[0]??STEEL.post,named[1]??STEEL.topRail,named[2]??STEEL.bottomRail,named[3]??STEEL.picket];
  const pw=post.width,gap=len(m.picketSpacing)??len(w.maxSphere)??PV.sphere,clear=len(data.fab.bottomClearance)??0,gapToWall=len(w.postToWall)??(signed(w.postToWall)===0?0:null);
  if(gapToWall===null)out.need('Well · post to wall');
  const gwm=has('gate')?len(w.gateWidth):null;if(has('gate')&&gwm===null)out.need('Well · gate width');
  const H=gm??PV.guardHeight,soft=rough||tm===null||gm===null||gapToWall===null;
  const lay=wellGuardLayout({length:Lh,projection:Pj,wall:t,postWidth:pw,gapToWall:gapToWall??0,gate:has('gate')?{run:w.gateRun,at:w.gateAt,offset:len(w.gateOffset),width:gwm??PV.gateWidth}:null});
  const guard=new Guard(),posts=new Guard(),entity={part:'well-guard'};
  for(const p of lay.posts)posts.add(z(p,top),z(p,top+H),post);
  for(const [a,b] of lay.bays)guardBay(guard,{a:z(a,top),b:z(b,top),bottomA:top+clear,bottomB:top+clear,height:H-clear,topRail,bottomRail,picket,gap,postWidth:pw});
  guard.emit(out,'well:guard','Well guard',{provisional:soft,entity});
  out.mesh('well:posts','Well guard · posts','post',posts.geo,{provisional:soft,entity});
  // A side run clipped to the house: a stub off the top rail to a plate on the wall.
  const clip=SHOP_DEFAULTS.draw.clip,zc=top+H-topRail.depth/2,face=faceAt(zc);
  for(const [side,mode,p] of [['left',w.returnLeft,lay.runs[0].a],['right',w.returnRight,lay.runs[2].a]] as const){
   if(mode!=='clip')continue;
   // One leg of the angle on the wall, the other out under the stub.
   const hl=clip.length/2,geo=new Geo().member(z(p,zc),p3(p.x,face,zc),topRail).box(p3(p.x-hl,face-clip.thickness,zc-clip.leg/2),p3(p.x+hl,face,zc+clip.leg/2)).box(p3(p.x-hl,face-clip.leg,zc-clip.leg/2-clip.thickness),p3(p.x+hl,face,zc-clip.leg/2));
   out.mesh(`well:return-clip:${side}`,'Well guard · wall clip','attached',geo,{provisional:soft,entity:{part:'well-return'}});
  }
  if(lay.gate){
   const gt=lay.gate,leaf=new Guard(),fw=topRail.width,across={x:gt.out.x,y:gt.out.y,z:0},a=at(gt.a,gt.u,pw/2),b=at(gt.b,gt.u,-pw/2);
   for(const p of [at(a,gt.u,fw/2),at(b,gt.u,-fw/2)])leaf.add(z(p,top+clear),z(p,top+H),topRail,across);
   guardBay(leaf,{a:z(a,top),b:z(b,top),bottomA:top+clear,bottomB:top+clear,height:H-clear,topRail,bottomRail,picket,gap,postWidth:fw*2});
   // Its own colour, so the leaf reads as a separate piece from the guard it sits in.
   out.mesh('well:gate','Well gate','rail',leaf.geo,{provisional:soft||gwm===null||!w.gateSwing||!w.gateHinge,entity:{part:'well-gate'}});
   if(!w.gateSwing)out.need('Well · gate swing');if(!w.gateHinge)out.need('Well · gate hinge');
   // The swing, as a wedge on the wall top: hinge post, the leaf's sweep, back to the hinge.
   const sw=wellGateSwing(gt,w.gateHinge,w.gateSwing),hinge=z(sw.hinge,top);
   out.line('well:gate-swing','Well gate · swing','rail',[hinge,...arc(hinge,gt.width-pw,sw.from,sw.to,()=>top),hinge],{provisional:!w.gateSwing||!w.gateHinge,entity:{part:'well-gate'}});
  }
 }
 // Ladder against one inside wall, rungs held off it by the measured standoff.
 if(has('ladder')){
  const lw=len(w.ladderWidth),sp=len(w.ladderSpacing),so=len(w.ladderStandoff),ext=len(w.ladderTopExt)??0;
  if(lw===null)out.need('Well · ladder width');if(sp===null)out.need('Well · rung spacing');if(so===null)out.need('Well · ladder standoff');
  const lp=wellLadderLayout({inside,wall:w.ladderWall,at:w.ladderAt,offset:len(w.ladderOffset),width:lw??PV.ladderWidth,standoff:so??PV.ladderStandoff});
  const ladder=new Guard(),S=sp??PV.ladderSpacing,inward={x:lp.inward.x,y:lp.inward.y,z:0};
  // Each rail, and its standoffs back to the wall: at the wall top and at the first rung.
  for(const [rail,wall] of [[lp.railA,lp.wallA],[lp.railB,lp.wallB]] as const){
   ladder.add(z(rail,floor),z(rail,top+ext),STEEL.ladderRail,inward);
   for(const h of [top+ext*.5-.5,floor+S])ladder.add(z(rail,h),z(wall,h),STEEL.rung);
  }
  const count=Math.round(len(w.ladderRungs)??0)||Math.floor((top-floor)/S);
  for(let i=1;i<=count;i++){const h=floor+S*i;if(h>top+ext)break;ladder.add(z(lp.railA,h),z(lp.railB,h),STEEL.rung);}
  out.mesh('well:ladder','Well ladder','rail',ladder.geo,{provisional:shell||lw===null||so===null||sp===null,entity:{part:'well-ladder'}});
 }
 return out.done();
}
