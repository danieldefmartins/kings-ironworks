// Balcony / Juliet: the slab at its measured projection and thickness against
// the wall it hangs on, the guard on its exposed edges set in from the slab edge
// by the measured anchor edge distance (or outside the slab face when fascia
// mounted), and — for a Juliet — a single rail across the door opening held
// off the wall by brackets. Layout: wall face at Y=0, balcony out toward −Y,
// finished floor at Z=0.
import type {MeasureData} from '../measure';
import type {Point3} from '../measure-geometry';
import {balconySuggestion} from '../measure-post-suggest-balcony';
import {pointAlong} from '../measure-post-suggest';
import {Geo,Guard,SceneOut,emptyScene,guardBay,len,p3,section,type ShapeSceneOutput} from './build-kit';

export function balconyScene(data:MeasureData):ShapeSceneOutput{
 const b=data.balcony;if(!b)return emptyScene();
 const out=new SceneOut(),m=data.materials,sugg=balconySuggestion(data),approved=!!data.rail.runPlan?.approved;
 const juliet=b.kind==='juliet',L=juliet?len(b.doorOpening)??len(b.edgeLength):len(b.edgeLength);
 if(!b.kind)out.need('Balcony · type');
 if(L===null){out.need(juliet?'Juliet · door opening width':'Balcony · edge length');return out.done();}
 const guardH=len(b.guardHeight)??len(data.rail.height);if(guardH===null)out.need('Balcony · guard height');
 const P=len(b.projection),T=len(b.slabThickness),ed=len(b.edgeDistance),embed=len(b.anchorEmbedment);
 const post=section(m.post),pw=post?.width??0,topRail=section(m.topRail),bottomRail=section(m.bottomRail),picket=section(m.picket);
 const gap=len(b.picketSpacing)??len(m.picketSpacing),clear=len(data.fab.bottomClearance)??0;
 if(gap===null)out.need('Balcony · picket spacing');
 const wallMargin=36,top=(guardH??42)+60;
 const wall=new Geo();
 if(juliet){
  // Door opening through the wall; its height is not on the sheet, the wall is reference only.
  const door=80,x0=-wallMargin,x1=L+wallMargin,zb=-24;
  wall.box(p3(x0,0,zb),p3(0,8,top)).box(p3(L,0,zb),p3(x1,8,top)).box(p3(0,0,door),p3(L,8,top)).box(p3(0,0,zb),p3(L,8,0));
  out.mesh('house:balcony','Wall · unmeasured reference','house',wall,{provisional:true,referenceOnly:true,entity:{}});
  out.mesh('balcony:sill','Door threshold','surface',new Geo().quad(p3(0,0,0),p3(L,0,0),p3(L,8,0),p3(0,8,0)),{entity:{part:'balcony-slab'}});
  if(guardH===null)return out.done();
  // Rail stands off the wall by the measured projection (0 = in the opening's plane).
  const y=-(P??0),guard=new Guard(),posts=new Guard(),entity={part:'balcony-guard'};
  const xs=sugg?.layouts[0]?.posts.map(q=>pw/2+q.at)??[pw/2,L-pw/2];
  for(const x of xs)posts.add(p3(x,y,0),p3(x,y,guardH),post,{x:1,y:0,z:0});
  for(let k=1;k<xs.length;k++)guardBay(guard,{a:p3(xs[k-1],y,0),b:p3(xs[k],y,0),bottomA:clear,bottomB:clear,height:guardH-clear,topRail,bottomRail,picket,gap,postWidth:pw});
  // Brackets back to the jambs at top and bottom rail.
  if(P)for(const x of [0,L])for(const z of [clear+2,guardH-2])posts.add(p3(x,y,z),p3(x,0,z),bottomRail??topRail);
  guard.emit(out,'balcony:guard','Juliet rail',{entity});
  out.mesh('balcony:posts','Juliet · posts + brackets','post',posts.geo,{entity,provisional:!approved});
  posts.axes.forEach(points=>out.line('balcony:posts','Juliet · posts + brackets','post',points,{entity,provisional:!approved}));
  return out.done();
 }
 wall.box(p3(-wallMargin,0,-(T??0)-48),p3(L+wallMargin,8,top));
 out.mesh('house:balcony','Wall · unmeasured reference','house',wall,{provisional:true,referenceOnly:true,entity:{}});
 if(P===null)out.need('Balcony · projection');if(T===null&&b.slabMaterial!=='wood framing')out.need('Balcony · slab thickness');
 const depth=P??0;
 if(depth>0){
  const slab=T?new Geo().box(p3(0,-depth,-T),p3(L,0,0)):new Geo().quad(p3(0,-depth,0),p3(L,-depth,0),p3(L,0,0),p3(0,0,0));
  out.mesh('balcony:slab','Balcony slab','surface',slab,{provisional:P===null,referenceOnly:false,entity:{part:'balcony-slab'}});
 }
 if(guardH===null)return out.done();
 // Guard path: the front edge, plus the two returns to the wall on a projecting balcony.
 const fascia=b.mount==='fascia',set=fascia?-pw/2:(ed??pw/2);
 if(!fascia&&ed===null)out.need('Balcony · anchor edge distance');
 const front=-depth+set,sx0=set,sx1=L-set;
 const returns=b.kind==='balcony'||b.kind==='';
 const path:Point3[]=depth>0&&returns?[p3(sx0,0,0),p3(sx0,front,0),p3(sx1,front,0),p3(sx1,0,0)]:[p3(sx0,front,0),p3(sx1,front,0)];
 const base=fascia?-(T??0):b.mount==='core_drill'||b.mount==='embedded'?-(embed??0):0;
 const guard=new Guard(),posts=new Guard(),entity={part:'balcony-guard'};
 // Posts where the post plan puts them (measure-post-suggest-balcony): corners and wall ends fixed, the rest evenly spaced.
 const lines=sugg?.layouts.map(l=>l.posts.map(q=>pointAlong(l.run.path,q.at)))??[path];
 const off=(q:Point3)=>Math.abs(q.y)<1e-6&&path.length>2?p3(q.x,-pw/2,0):q;
 const seen:Point3[]=[];
 for(const pts of lines)for(let i=0;i<pts.length;i++){
  const p=pts[i],next=pts[i+1]??pts[i-1]??p,ux=next.x-p.x,uy=next.y-p.y,l=Math.hypot(ux,uy)||1;
  if(seen.some(s0=>Math.hypot(s0.x-p.x,s0.y-p.y)<.5))continue;seen.push(p);
  // A post against the wall is a return's end; it stops short of the wall face.
  const q=off(p);posts.add(p3(q.x,q.y,base),p3(q.x,q.y,guardH),post,{x:ux/l,y:uy/l,z:0});
 }
 for(const pts of lines)for(let i=0;i<pts.length-1;i++)guardBay(guard,{a:off(pts[i]),b:off(pts[i+1]),bottomA:clear,bottomB:clear,height:guardH-clear,topRail,bottomRail,picket,gap,postWidth:pw});
 guard.emit(out,'balcony:guard','Balcony guard',{provisional:!fascia&&ed===null,entity});
 out.mesh('balcony:posts','Balcony · posts','post',posts.geo,{entity,provisional:!approved});
 posts.axes.forEach(points=>out.line('balcony:posts','Balcony · posts','post',points,{entity,provisional:!approved}));
 return out.done();
}
