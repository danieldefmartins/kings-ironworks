import {flightWalls,segmentIdAt,type MeasureData,type MeasureShape} from './measure';
import {stairGeometry,type Point3} from './measure-geometry';
import {drawingPosts} from './measure-drawing';
import {orderedPosts} from './measure-checks';
import {postLayout} from './measure-post-layout';
import {formatIn} from './measure-parse';
import {previewSiteObject} from './measure-site-placement';
import {siteMeshes,siteNumber} from './measure-site';
import {resolveSite,previewWall,wallPlacementEdges} from './measure-wall-placement';
import {siteRailLayout,siteRailFabReviewed} from './measure-site-rails';
import {attachedCuts} from './measure-attached-fab';
import {landingConnections,landingConnectionGeometry} from './measure-landings';
import {houseContext} from './measure-house-context';
import {SCENE_SHAPES,sceneShapeOf} from './scene-shapes';
import {sceneDims,type SceneDim} from './measure-dims';
export type SceneKind='surface'|'site'|'wall-preview'|'post'|'rail'|'attached'|'wall-edge'|'house'|'dim';
export type SceneEntity={segmentId?:string;segmentIndex?:number;stepIndex?:number|null;siteId?:string;postId?:string;railId?:string;part?:string;role?:string;side?:'left'|'right'|'start'|'end'};
export type SceneSelection=SceneEntity&{point?:Point3};
type SceneItem={id:string;label:string;kind:SceneKind;provisional:boolean;referenceOnly:boolean;entity:SceneEntity};
export type SceneMesh=SceneItem&{vertices:Point3[];faces:number[][]};
/** `dim` lines carry a calculated label and show only while one of their two posts is selected. */
export type SceneLine=SceneItem&{points:Point3[];text?:string;between?:[string,string];/** Points are disjoint pairs (drawn as segments, not a strip). */pairs?:boolean;/** An architectural dimension line (measure-dims); `dashed` marks its dashed companion (a diagonal, the floor line). */dim?:Omit<SceneDim,'lines'|'dashed'>;dashed?:boolean};
export type MeasureScene={meshes:SceneMesh[];lines:SceneLine[];bounds:{min:Point3;max:Point3};pending:string[]};
/** What the Next card is asking for, lit on the 3D: a step's riser (rise), its tread (run), or a landing's top (surface). */
export type SceneFocus={segmentIndex:number;stepIndex:number|null;part:'rise'|'run'|'surface'|'dim';/** With part 'dim': the Next slot id being asked; the dimension line whose `slots` hold it lights up. */dim?:string;/** Short tag shown on the lit face ("Step 3 · Rise"). */label?:string};
/**
 * The face to light for a focus: the surface mesh it belongs to and the quad
 * (4 corners) of just that face. A step mesh is its tread top (corners 0–3,
 * front edge 0→3) plus, when it has a rise, the riser hanging from the front
 * edge (vertices 4, 5). Null when the sheet has no such step.
 */
export function focusFace(scene:Pick<MeasureScene,'meshes'>,focus:SceneFocus|null|undefined):{mesh:SceneMesh;quad:Point3[]}|null{
 if(!focus||focus.part==='dim')return null;
 const mesh=scene.meshes.find(m=>m.kind==='surface'&&m.entity.segmentIndex===focus.segmentIndex&&(m.entity.stepIndex??null)===focus.stepIndex);
 if(!mesh||mesh.vertices.length<4)return null;
 const [a,b,c,d]=mesh.vertices;
 if(focus.part==='rise'){
  if(mesh.vertices.length<6)return null;
  return {mesh,quad:[{...mesh.vertices[4]},{...mesh.vertices[5]},{...d},{...a}]};
 }
 return {mesh,quad:[a,b,c,d].map(p=>({...p}))};
}
/** Same unambiguous outer-profile convention as Blender assembly.profile.
 * Missing/ambiguous sections remain axes, with no invented steel dimensions. */
function postSection(spec:string){
 const round=/round|pipe|diameter|\bdia\b|[Øø]/i.test(spec);
 const cleaned=spec.toLowerCase().replaceAll('×','x').replace(/\b(?:hss|tube|square|sq|rectangular|solid|flat|bar|round|pipe|diameter|dia)\b|[Øø]/g,'').trim();
 const dims=cleaned.split('x').map(s=>siteNumber(s));
 if(!dims.length||dims.length>3||dims.some(n=>n===null||n<=0||n>24)||dims.length===1&&!round&&!/\b(?:square|sq)\b/i.test(spec))return null;
 return {width:dims[0]!,depth:dims[1]??dims[0]!,round};
}
/** Vertical post outer envelope only; its final mounting and cap cuts remain in fabrication drawings. */
function postEnvelope(base:Point3,top:Point3,section:{width:number;depth:number;round:boolean}){
 const ring=section.round?Array.from({length:16},(_,i)=>[Math.cos(i*Math.PI/8),Math.sin(i*Math.PI/8)]):[[-1,-1],[1,-1],[1,1],[-1,1]];
 // Matches the vertical axis basis used by Blender assembly.envelope.
 const vertices=[base,top].flatMap(p=>ring.map(([x,y])=>({x:p.x+x*section.width/2,y:p.y+y*section.depth/2,z:p.z}))),n=ring.length;
 return {vertices,faces:[Array.from({length:n},(_,i)=>n-1-i),Array.from({length:n},(_,i)=>n+i),...ring.map((_,i)=>[i,(i+1)%n,(i+1)%n+n,i+n])]};
}
/** Pure display adapter. Inches / Z up. It never writes defaults back or supplies fabrication cuts. */
export function measureScene(data:MeasureData,shape?:MeasureShape|null):MeasureScene{
 const meshes:SceneMesh[]=[],lines:SceneLine[]=[],pending:string[]=[],model=stairGeometry(data),site=resolveSite(data);
 const realSite=siteMeshes(site),realIds=new Set(realSite.map(m=>m.id));
 for(const m of realSite)meshes.push({...m,id:`site:${m.id}`,kind:'site',referenceOnly:false,entity:{siteId:m.id}});
 for(const object of data.site?.objects||[])if(!realIds.has(object.id)){
  pending.push(object.label);const preview=object.wallAnchor?previewWall(data,object):previewSiteObject(object);
  if(preview)meshes.push({...preview,id:`wall-preview:${object.id}`,kind:'wall-preview',provisional:true,referenceOnly:true,entity:{siteId:object.id}});
 }
 if(model){
  const surfaceCounts=new Map<number,number>();
  model.treads.forEach(t=>{
   const partIndex=surfaceCounts.get(t.segIdx)||0;surfaceCounts.set(t.segIdx,partIndex+1);
   const segmentId=segmentIdAt(data.segments[t.segIdx],t.segIdx),id=`surface:${segmentId}:${t.stepIdx??`part-${partIndex}`}`;
   const vertices=t.corners.map(p=>({...p})),faces=[[0,1,2],[0,2,3]];
   // Match build_drawings.py: measured top plus the recorded front rise; no assumed slab thickness.
   if(t.rise>0){vertices.push({...t.corners[0],z:t.corners[0].z-t.rise},{...t.corners[3],z:t.corners[3].z-t.rise});faces.push([4,0,3,5]);}
   const entity={segmentId,segmentIndex:t.segIdx,stepIndex:t.stepIdx};
   meshes.push({id,label:t.number===null?`Segment ${t.segIdx+1}`:`Step ${t.number}`,kind:'surface',vertices,faces,provisional:t.provisional,referenceOnly:false,entity});
   const seg=data.segments[t.segIdx],override=seg.kind==='flight'&&t.stepIdx!==null?seg.steps[t.stepIdx].wallSide:undefined,walls=override?{left:override==='left'||override==='both',right:override==='right'||override==='both'}:flightWalls(seg,data.datums.orientation);
   for(const side of ['left','right'] as const)if(walls[side])lines.push({id:`wall-edge:${id}:${side}`,label:`${side} wall boundary`,kind:'wall-edge',provisional:t.provisional,referenceOnly:true,entity,points:(side==='left'?[t.corners[0],t.corners[1]]:[t.corners[3],t.corners[2]]).map(p=>({...p}))});
  });
  const resolvedPosts=drawingPosts(data,model);for(const p of resolvedPosts)if(p.post.supportAttachment&&(!p.base||!p.top))pending.push(`${p.label} · support connection`);
  const posts=resolvedPosts.filter(p=>p.base&&p.top),groups=new Map<string,typeof posts>();
  for(const p of posts){
   const entity={postId:p.post.id,segmentIndex:p.post.segIdx,segmentId:segmentIdAt(data.segments[p.post.segIdx],p.post.segIdx),stepIndex:p.post.stepIdx},item={id:`post:${p.post.id}`,label:p.label,kind:'post' as const,/* a suggested post not yet accepted shows as an amber ghost */provisional:p.provisional||p.post.suggested==='ghost',referenceOnly:true,entity};
   const terminal='terminal' in p?p.terminal:undefined;
   const w=siteNumber(p.post.existingW),d=siteNumber(p.post.existingD);
   const section=p.post.pointType==='railing_post'?postSection(data.materials.post):p.post.pointType==='existing_post'&&w!==null&&d!==null&&w>0&&d>0?{width:w,depth:d,round:false}:null;
   if(terminal){const center=p.top!,tangent={x:-terminal.normal.y,y:terminal.normal.x};lines.push({...item,label:`${p.label} · support connection`,points:[{x:center.x-tangent.x,y:center.y-tangent.y,z:center.z},{x:center.x+tangent.x,y:center.y+tangent.y,z:center.z},{...center},{...center,z:center.z-1},{...center,z:center.z+1}]});}
   else if(section)meshes.push({...item,...postEnvelope(p.base!,p.top!,section)});else lines.push({...item,points:[{...p.base!},{...p.top!}]});
   if(p.post.pointType==='railing_post'||terminal){const key=`${p.post.segIdx}:${p.post.side}`;groups.set(key,[...(groups.get(key)||[]),p]);}
  }
  // Rail lines from the post layout: post to post along each side, following the rail height up the
  // flight, the knee onto a landing, any turn corner and level across a platform (not just within a segment).
  const layout=postLayout(data,orderedPosts(data)),inLayout=new Set(layout?.posts.map(p=>p.post.id)||[]);
  const drawnConnections=new Set(landingConnections(data).filter(t=>(t.kind==='drop'||t.kind==='level')&&landingConnectionGeometry(data,t)).map(t=>`${t.lowerPostId}:${t.upperPostId}`));
  const ghost=(p:{suggested?:unknown})=>p.suggested==='ghost';
  for(const sp of layout?.spans||[]){
   const a=sp.from.post,b=sp.to.post;if(drawnConnections.has(`${a.id}:${b.id}`)||drawnConnections.has(`${b.id}:${a.id}`))continue;
   lines.push({id:`rail:${a.id}:${b.id}`,label:`Railing ${b.segIdx}:${sp.side}`,kind:'rail',provisional:sp.provisional||ghost(a)||ghost(b),referenceOnly:true,entity:{segmentId:segmentIdAt(data.segments[b.segIdx],b.segIdx),segmentIndex:b.segIdx},points:sp.path.map(p=>({...p}))});
  }
  for(const [group,list] of groups){
   const tread=model.treads.find(t=>t.segIdx===list[0].post.segIdx);if(!tread)continue;const [a,b]=tread.corners,dx=b.x-a.x,dy=b.y-a.y;
   list.sort((p,q)=>(p.base!.x-q.base!.x)*dx+(p.base!.y-q.base!.y)*dy);
   // Only pairs the layout cannot draw (e.g. a support-connection terminal).
   for(let i=1;i<list.length;i++)if(!inLayout.has(list[i-1].post.id)||!inLayout.has(list[i].post.id))lines.push({id:`rail:${list[i-1].post.id}:${list[i].post.id}`,label:`Railing ${group}`,kind:'rail',provisional:list[i-1].provisional||list[i].provisional||ghost(list[i-1].post)||ghost(list[i].post),referenceOnly:true,entity:{segmentId:segmentIdAt(data.segments[list[i].post.segIdx],list[i].post.segIdx),segmentIndex:list[i].post.segIdx},points:[{...list[i-1].top!},{...list[i].top!}]});
  }
 }
 // Calculated post-to-post dimensions: run · rail length · rake, drawn just above the rail line.
 const DIM_LIFT=10;
 if(model&&data.posts.length>1){const layout=postLayout(data,orderedPosts(data));for(const sp of layout?.spans||[]){
  const angle=sp.kind==='level'?'0°':sp.pieces.filter(p=>p.kind==='rake').map(p=>`${Math.abs(p.angle).toFixed(1)}°`).join(' / ');
  lines.push({id:`dim:${sp.from.post.id}:${sp.to.post.id}`,label:`${sp.from.label} → ${sp.to.label}`,kind:'dim',provisional:sp.provisional,referenceOnly:true,entity:{},between:[sp.from.post.id,sp.to.post.id],
   text:`${sp.from.label}→${sp.to.label}   ↔ ${formatIn(sp.run)}   ⟋ ${formatIn(sp.length)}   ∠ ${angle}`,points:sp.path.map(p=>({...p,z:p.z+DIM_LIFT}))});
 }}
 // Architectural dimension lines: floor to floor, run, rake, each flight and landing, joints, rail height, spans.
 for(const d of sceneDims(data,shape||sceneShapeOf(data))){
  const {lines:pairs,dashed,...dim}=d,item={label:d.key,kind:'dim' as const,provisional:d.state!=='measured',referenceOnly:true,entity:{},dim};
  lines.push({...item,id:`dimline:${d.key}`,pairs:true,points:pairs.flatMap(([a,b])=>[{...a},{...b}])});
  if(dashed?.length)lines.push({...item,id:`dimline:${d.key}:dashed`,pairs:true,dashed:true,points:dashed.flatMap(([a,b])=>[{...a},{...b}])});
 }
 for(const [i,t] of landingConnections(data).entries()){
  if(t.kind!=='drop'&&t.kind!=='level')continue;const g=landingConnectionGeometry(data,t);if(!g)continue;
  lines.push({id:`transition:${t.lowerPostId}:${t.upperPostId}:${i}`,label:`Connection ${i+1}`,kind:'rail',provisional:g.provisional,referenceOnly:true,entity:{segmentIndex:t.landingSegIdx,segmentId:segmentIdAt(data.segments[t.landingSegIdx],t.landingSegIdx)},points:g.path.map(p=>({...p}))});
 }
 for(const rail of site?.rails||[]){
  const layout=siteRailLayout(site,rail);if(!layout){pending.push(rail.label);continue;}
  const cuts=attachedCuts(site,rail,layout),checked=siteRailFabReviewed(site,rail);
  if(cuts.parts.length)for(const p of cuts.parts)meshes.push({id:`attached:${rail.id}:${p.mark.split('-').at(-1)}`,label:p.mark,kind:'attached',provisional:!checked,referenceOnly:false,entity:{railId:rail.id,part:p.mark.split('-').at(-1),role:p.kind},vertices:p.vertices.map(v=>({...v})),faces:p.faces.map(f=>[...f])});
  else lines.push({id:`attached:${rail.id}`,label:rail.label,kind:'attached',provisional:true,referenceOnly:true,entity:{railId:rail.id},points:[...layout.vertices,layout.vertices[0]].map(p=>({...p}))});
 }
 for(const edge of wallPlacementEdges(data))lines.push({id:`placement-edge:${edge.segmentId}:${edge.side}`,label:`Place wall · ${edge.side}`,kind:'wall-edge',provisional:edge.provisional,referenceOnly:true,entity:{segmentId:edge.segmentId,segmentIndex:edge.segmentIndex,side:edge.side},points:[{...edge.start},{...edge.end}]});
 const house=houseContext(data);
 if(house){const item={kind:'house' as const,provisional:true,referenceOnly:true,entity:{},label:'House · unmeasured reference'};meshes.push({...item,id:'house:reference',vertices:house.vertices.map(p=>({...p})),faces:house.faces.map(f=>[...f])});house.roof.forEach((points,i)=>lines.push({...item,id:`house:roof:${i}`,points:points.map(p=>({...p}))}));}
 const kind=shape||sceneShapeOf(data),adapter=kind?SCENE_SHAPES[kind]:undefined;
 if(adapter){const extra=adapter(data);meshes.push(...extra.meshes);lines.push(...extra.lines);pending.push(...extra.pending);}
 const points=[...meshes.flatMap(m=>m.vertices),...lines.flatMap(l=>l.points)];
 const bounds={min:{x:0,y:0,z:0},max:{x:0,y:0,z:0}};
 if(points.length){bounds.min={...points[0]};bounds.max={...points[0]};for(const p of points)for(const k of ['x','y','z'] as const){bounds.min[k]=Math.min(bounds.min[k],p[k]);bounds.max[k]=Math.max(bounds.max[k],p[k]);}}
 return {meshes,lines,bounds,pending:[...new Set(pending)]};
}
