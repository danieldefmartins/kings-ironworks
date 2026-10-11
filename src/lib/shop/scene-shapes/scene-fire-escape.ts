// Fire escape in 3D: the building wall, one platform per level at its height
// above grade, the window or door each one serves, guards, the stair from each
// level down to the next, the brackets and anchors that hold each platform to
// the wall, and the drop ladder from the lowest platform. Levels are stored top
// down. The wall face is y = 0; platforms project toward the viewer (−y).
import type {FireLevel,MeasureData} from '../measure';
import type {Point3} from '../measure-geometry';
import {P,box,emptyScene,merge,mesh,num,polyTube,sweepRects,type Geo,type ShapeScene} from './kit';
import {preMirrorScene} from './pre-mirror';
import {steelSection,sweepSection} from './steel-sections';

const STORY=108;

/** Platform heights above grade: measured, else built from neighbours' floor-to-floor, else one storey apart. */
export function fireHeights(levels:FireLevel[]):{z:number;provisional:boolean}[]{
 const n=levels.length,z:(number|null)[]=levels.map(l=>num(l.heightAboveGrade,true));
 for(let pass=0;pass<n;pass++)for(let i=0;i<n;i++){
  if(z[i]!==null)continue;
  const below=i+1<n?z[i+1]:null,ftf=num(levels[i].floorToFloor);
  if(below!==null&&ftf!==null){z[i]=below+ftf;continue;}
  const above=i>0?z[i-1]:null,ftfAbove=i>0?num(levels[i-1].floorToFloor):null;
  if(above!==null&&ftfAbove!==null)z[i]=above-ftfAbove;
 }
 return z.map((v,i)=>v===null?{z:(n-i)*STORY,provisional:true}:{z:v,provisional:false});
}

export function fireEscapeScene(data:MeasureData):ShapeScene{return preMirrorScene(build(data));}
function build(data:MeasureData):ShapeScene{
 const out=emptyScene(),f=data.fire;
 if(!f||!f.levels.length)return out;
 const heights=fireHeights(f.levels);
 const dims=f.levels.map(l=>({L:num(l.platLength)??120,W:num(l.platWidth)??42,missing:num(l.platLength)===null||num(l.platWidth)===null}));
 const maxL=Math.max(...dims.map(d=>d.L)),top=Math.max(...heights.map(h=>h.z));
 const stringer=steelSection('C6x8.2')!,channel=steelSection('C5x6.7')!;
 // Building wall (context).
 out.meshes.push(mesh('fire:wall','Building wall','site',box(P(-48,0,0),P(maxL+48,14,top+84)),{referenceOnly:true}));
 f.levels.forEach((l,i)=>{
  const tag=l.label?`Level ${l.label}`:`Level ${i+1}`,{z,provisional:hp}=heights[i],{L,W,missing}=dims[i],entity={part:`fire:${l.id}`};
  if(hp)out.pending.push(`${tag} · height`);
  if(missing)out.pending.push(`${tag} · platform`);
  const prov=hp||missing;
  // Platform: grating deck in a channel frame.
  const deck=box(P(0,-W,z-1.25),P(L,0,z));
  const frameParts=[sweepSection(channel,P(0,-W+1.25,z-2.5),P(L,-W+1.25,z-2.5),P(0,0,1)),sweepSection(channel,P(.9,-W,z-2.5),P(.9,0,z-2.5),P(0,0,1)),sweepSection(channel,P(L-.9,-W,z-2.5),P(L-.9,0,z-2.5),P(0,0,1))];
  out.meshes.push(mesh(`fire:deck:${l.id}`,`${tag} · platform`,'surface',deck,{provisional:prov,entity}));
  out.meshes.push(mesh(`fire:frame:${l.id}`,`${tag} · frame`,'attached',merge(...frameParts),{provisional:prov,entity}));
  // Guard round the open sides: posts, top rail, bottom bar, pickets at the measured spacing.
  const gh=num(l.guardHeight),spacing=num(l.picketSpacing)??4;
  if(gh===null)out.pending.push(`${tag} · guard height`);
  const H=gh??42,edge:Point3[]=[P(0,-.75,z),P(0,-W+.75,z),P(L,-W+.75,z),P(L,-.75,z)];
  const guard:Geo[]=[polyTube(edge.map(p=>({...p,z:z+H})),.84),polyTube(edge.map(p=>({...p,z:z+4})),.5)];
  for(let k=1;k<edge.length;k++){
   const a=edge[k-1],b=edge[k],len=Math.hypot(b.x-a.x,b.y-a.y),posts=Math.max(1,Math.ceil(len/60));
   for(let j=0;j<=posts;j++){const t=j/posts,p=P(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,z);guard.push(sweepRects(p,{...p,z:z+H},[[-.75,-.75,.75,.75]],P(1,0,0)));}
   const count=Math.max(0,Math.floor(len/(spacing+.5)));for(let j=1;j<count;j++){const t=j/count,p=P(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,z+4);guard.push(sweepRects(p,{...p,z:z+H},[[-.25,-.25,.25,.25]],P(1,0,0)));}
  }
  out.meshes.push(mesh(`fire:guard:${l.id}`,`${tag} · guard`,'rail',merge(...guard),{provisional:prov||gh===null,entity}));
  // The opening it serves, on the wall above the deck.
  const ow=num(l.openingW),oh=num(l.openingH),sill=num(l.sillToPlatform,true);
  if(l.openingType||ow!==null||oh!==null){
   const w=ow??(l.openingType==='door'?36:32),h=oh??(l.openingType==='door'?80:54),zs=z+(l.openingType==='door'?0:sill??24),cx=L/2,ft=2.5;
   if(ow===null||oh===null)out.pending.push(`${tag} · opening`);
   const frame=[box(P(cx-w/2-ft,-1,zs-ft),P(cx+w/2+ft,0,zs)),box(P(cx-w/2-ft,-1,zs+h),P(cx+w/2+ft,0,zs+h+ft)),box(P(cx-w/2-ft,-1,zs),P(cx-w/2,0,zs+h)),box(P(cx+w/2,-1,zs),P(cx+w/2+ft,0,zs+h)),box(P(cx-w/2,-.4,zs),P(cx+w/2,0,zs+h))];
   if(l.openingType!=='door')frame.push(box(P(cx-w/2,-1,zs+h/2-1),P(cx+w/2,-.4,zs+h/2+1)));
   out.meshes.push(mesh(`fire:opening:${l.id}`,`${tag} · ${l.openingType||'opening'}`,'site',merge(...frame),{referenceOnly:true,provisional:ow===null||oh===null,entity}));
  }
  // Brackets and anchors: knee braces from the wall up to the deck's outer edge.
  const count=num(l.anchorCount)!==null?Math.round(num(l.anchorCount)!):null,spacingA=num(l.anchorSpacing);
  const n=Math.max(2,Math.min(12,count??2));
  if(count===null)out.pending.push(`${tag} · anchors`);
  const span=spacingA!==null?spacingA*(n-1):L-12,x0=(L-Math.min(span,L-4))/2,pitch=n>1?Math.min(span,L-4)/(n-1):0,angle=steelSection('L2-1/2x2-1/2x1/4')!;
  const brackets:Geo[]=[];
  for(let k=0;k<n;k++){const x=x0+pitch*k,low=z-2.5-W*.85;
   brackets.push(sweepSection(angle,P(x,-.2,low),P(x,-W+2,z-2.6),P(0,1,0)),sweepSection(angle,P(x,-.2,z-2.6),P(x,-W+2,z-2.6),P(0,0,1)),box(P(x-3,-.6,low-4),P(x+3,0,low+4)),box(P(x-3,-.6,z-6),P(x+3,0,z-1.5)));
  }
  out.meshes.push(mesh(`fire:brackets:${l.id}`,`${tag} · brackets`,'attached',merge(...brackets),{provisional:prov||count===null,entity}));
  // Stair down to the next level.
  if(i<f.levels.length-1){
   const lower=heights[i+1].z,drop=z-lower,risers=num(l.stairRisers)!==null?Math.round(num(l.stairRisers)!):null,rise=num(l.stairRise),run=num(l.stairRun),sw=num(l.stairWidth)??22;
   const nR=risers??Math.max(2,Math.round(drop/(rise??8))),r=drop/nR,t=run??(rise!==null?rise:8)/Math.tan((num(l.stairAngle)??55)*Math.PI/180);
   const sprov=risers===null||rise===null||run===null||num(l.stairWidth)===null;
   if(sprov)out.pending.push(`${tag} · stair`);
   const total=t*(nR-1),Lo=Math.min(L,dims[i+1].L),dir=i%2===0?-1:1,xt=dir<0?Math.min(Lo,L)-6:6,xb=xt+dir*Math.min(total,Lo-12);
   const yIn=-W+sw+1.5,yOut=-W+1.5,stairParts:Geo[]=[];
   // nR risers, nR − 1 treads between the two decks.
   const tp=(xb-xt)/Math.max(1,nR-1);
   for(const y of [yIn,yOut])stairParts.push(sweepSection(stringer,P(xt,y,z-3),P(xb+tp/2,y,lower-1),P(0,0,1)));
   for(let k=1;k<nR;k++){const x=xt+tp*(k-.5),zz=z-r*k,half=Math.abs(tp)/2+.5;stairParts.push(box(P(x-half,yOut+1,zz-1),P(x+half,yIn-1,zz)));}
   out.meshes.push(mesh(`fire:stair:${l.id}`,`${tag} · stair`,'attached',merge(...stairParts),{provisional:sprov||prov,entity}));
   out.meshes.push(mesh(`fire:stair-rail:${l.id}`,`${tag} · stair rail`,'rail',polyTube([P(xt,yOut,z+34),P(xb,yOut,lower+34)],.84),{provisional:sprov||prov,entity}));
  }
 });
 // Drop ladder off the lowest platform.
 const lad=f.ladder,lowIdx=f.levels.length-1;
 if(lad.present){
  const {z}=heights[lowIdx],{L,W}=dims[lowIdx],len=num(lad.length),width=num(lad.width)??16,stowed=num(lad.stowedAboveGrade,true),rung=num(lad.rungSpacing)??12;
  const bottom=stowed??Math.max(0,z-(len??z)),topZ=len!==null?bottom+len:z+42,x=lowIdx%2===0?L-12-width/2:12+width/2,y=-W-3;
  const prov=len===null||stowed===null;
  if(prov)out.pending.push('Drop ladder');
  const parts:Geo[]=[sweepRects(P(x-width/2,y,bottom),P(x-width/2,y,topZ),[[-.25,-1,.25,1]],P(1,0,0)),sweepRects(P(x+width/2,y,bottom),P(x+width/2,y,topZ),[[-.25,-1,.25,1]],P(1,0,0))];
  for(let zz=bottom+2;zz<topZ-1;zz+=rung)parts.push(sweepRects(P(x-width/2,y,zz),P(x+width/2,y,zz),[[-.375,-.375,.375,.375]],P(0,0,1)));
  out.meshes.push(mesh('fire:ladder','Drop ladder','attached',merge(...parts),{provisional:prov,entity:{part:'fire:ladder'}}));
 }
 return out;
}
