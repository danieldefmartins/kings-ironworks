// Deck: the perimeter sides chained in plan (each turning at its end by the
// measured angle, + = left), the walking surface at the measured height, the
// grade under each side at ITS measured height below the surface, guard posts at
// the intended spacing on railed sides only, and the gaps the rail stops for
// (stairs, gates). Sides that are not railed — and the closing edge of an open
// outline — are the house. The model is turned so the house sits at the back
// (+Y) and the camera's default view looks at the open front.
import type {MeasureData} from '../measure';
import {deckPlan,outwardOf,type DeckEdge} from '../measure-deck-plan';
import {deckPostStations} from '../measure-post-suggest-deck';
import type {Point3} from '../measure-geometry';
import {Geo,Guard,SceneOut,emptyScene,guardBay,len,p3,section,type ShapeSceneOutput} from './build-kit';

export function deckScene(data:MeasureData):ShapeSceneOutput{
 const d=data.deck;if(!d)return emptyScene();
 const out=new SceneOut(),m=data.materials;
 // 1. Plan (shared with the dimension lines and the post suggestion).
 const dp=deckPlan(data);
 const missing=d.sides.find(sd=>len(sd.length)===null);
 if(missing)out.need(`Deck side ${missing.label||d.sides.indexOf(missing)+1} · length`);
 if(!dp){if(!d.sides.length)out.need('Deck · sides');return out.done();}
 if(d.closedLoop&&dp.complete&&dp.closeGap>1)out.need('Deck · outline does not close');
 const edges=dp.edges,plan=dp.plan,used=d.sides.slice(0,edges.filter(e=>e.side).length);
 const outward=(e:DeckEdge)=>outwardOf(dp,e);

 // 2. Heights: the surface sits at the highest measured side; grade drops away per side.
 const heights=dp.heights,known=used.map((_,i)=>heights[i]).filter((h):h is number=>h!==null);
 used.forEach((sd,i)=>{if(heights[i]===null)out.need(`Deck side ${sd.label||i+1} · height above grade`);});
 const top=dp.top;
 const decking=len(d.deckingThickness),rim=section(d.rimJoistSize)?.depth??null,mount=d.mount;
 const deckGeo=new Geo().polygon(plan.map(p=>p3(p.x,p.y,top)));
 out.mesh('deck:surface','Deck surface','surface',deckGeo,{provisional:!known.length,referenceOnly:false,entity:{part:'deck-surface'}});
 const depth=(decking??0)+(rim??0);
 if(depth>0)out.mesh('deck:rim','Deck edge · decking + rim','site',new Geo().extrude(plan,top-depth,top-.01),{referenceOnly:true,entity:{part:'deck-surface'}});

 // 3. Grade under each side, house along the unrailed edges. Rotation keeps the
 // outline's winding, so outward() still holds on the turned plan.
 const ground=new Geo(),houseGeo=new Geo();
 for(const e of edges){
  const o=outward(e);
  if(!e.side||!e.side.railed){houseGeo.extrude([e.a,e.b,{x:e.b.x+o.x*8,y:e.b.y+o.y*8},{x:e.a.x+o.x*8,y:e.a.y+o.y*8}],0,top+108);continue;}
  const h=heights[e.index];if(h===null)continue;const z=top-h,far=36;
  ground.quad(p3(e.a.x,e.a.y,z),p3(e.b.x,e.b.y,z),p3(e.b.x+o.x*far,e.b.y+o.y*far,z),p3(e.a.x+o.x*far,e.a.y+o.y*far,z));
  // Height reference: deck edge down to this side's grade.
  const mid={x:(e.a.x+e.b.x)/2,y:(e.a.y+e.b.y)/2};out.line(`deck:height:${e.side.id}`,`Deck side ${e.side.label||e.index+1} · height above grade`,'post',[p3(mid.x,mid.y,top),p3(mid.x,mid.y,z)],{entity:{part:`deck-side-${e.side.id}`}});
 }
 out.mesh('deck:grade','Grade around the deck','site',ground,{referenceOnly:true,entity:{part:'deck-grade'}});
 out.mesh('house:deck','House · unmeasured reference','house',houseGeo,{provisional:true,referenceOnly:true,entity:{}});

 // 4. Guard on railed sides.
 const guardH=len(d.guardHeight)??len(data.rail.height);if(guardH===null)out.need('Deck · guard height');
 const post=section(m.post),pw=post?.width??0,topRail=section(m.topRail),bottomRail=section(m.bottomRail),picket=section(m.picket);
 const gap=len(d.picketSpacing)??len(m.picketSpacing),spacing=len(d.postSpacing)??len(d.maxPostSpacing),clear=len(data.fab.bottomClearance)??0;
 if(gap===null)out.need('Deck · picket spacing');if(spacing===null)out.need('Deck · post spacing');if(!mount)out.need('Deck · post mount');
 const fascia=mount==='fascia'||mount==='through_bolt',postBase=fascia&&depth>0?top-depth:top;
 const stations=deckPostStations(data),approved=!!data.rail.runPlan?.approved;
 for(const e of edges){
  const sd=e.side;if(!sd||!sd.railed||guardH===null)continue;
  // Fascia posts sit outside the rim; surface posts just inside the edge.
  const o=outward(e),inset=fascia?pw/2:-pw/2;
  const A={x:e.a.x+o.x*inset,y:e.a.y+o.y*inset},B={x:e.b.x+o.x*inset,y:e.b.y+o.y*inset},L=Math.hypot(B.x-A.x,B.y-A.y);if(!(L>0))continue;
  const ux=(B.x-A.x)/L,uy=(B.y-A.y)/L,at=(t:number)=>p3(A.x+ux*t,A.y+uy*t,top);
  // Posts where the post plan puts them (measure-post-suggest-deck): corners and
  // opening edges fixed, the rest evenly spaced. Not yet approved = amber ghosts.
  const opens=!!sd.opening&&sd.opening!=='none',ow=opens?len(sd.openingWidth):null;
  if(opens&&ow===null)out.need(`Deck side ${sd.label||e.index+1} · opening width`);
  const plan2=stations.get(sd.id),scaleK=L/Math.hypot(e.b.x-e.a.x,e.b.y-e.a.y);
  const ats=(plan2?.at??[0,L]).map(a=>a*scaleK),blocked=new Set(plan2?.blocked??[]);
  const guard=new Guard(),posts=new Guard(),entity={part:`deck-side-${sd.id}`},label=`Deck side ${sd.label||e.index+1}`;
  for(const a of ats){const p=at(a);posts.add(p3(p.x,p.y,postBase),p3(p.x,p.y,top+guardH),post,{x:ux,y:uy,z:0});}
  for(let k=1;k<ats.length;k++){if(blocked.has(k-1)||ats[k]-ats[k-1]<=pw)continue;guardBay(guard,{a:at(ats[k-1]),b:at(ats[k]),bottomA:top+clear,bottomB:top+clear,height:guardH-clear,topRail,bottomRail,picket,gap,postWidth:pw});}
  guard.emit(out,`deck:guard:${sd.id}`,`${label} · guard`,{provisional:spacing===null,entity});
  out.mesh(`deck:posts:${sd.id}`,`${label} · posts`,'post',posts.geo,{entity,provisional:!approved});
  posts.axes.forEach(points=>out.line(`deck:posts:${sd.id}`,`${label} · posts`,'post',points,{entity,provisional:!approved}));
  if(ow!==null&&ow<L){
   const a=at((L-ow)/2),b=at((L+ow)/2),kind=sd.opening==='stairs'?'Stair opening':sd.opening==='gate'?'Gate opening':'Opening';
   const h=heights[e.index];
   // Stairs drop to this side's grade; a gate or gap is a clear frame at guard height.
   const outline:Point3[]=sd.opening==='stairs'&&h!==null?[p3(a.x,a.y,top-h),a,b,p3(b.x,b.y,top-h)]:[a,p3(a.x,a.y,top+guardH),p3(b.x,b.y,top+guardH),b];
   out.line(`deck:opening:${sd.id}`,`${label} · ${kind}`,'rail',outline,{provisional:true,entity});
  }
 }
 return out.done();
}

