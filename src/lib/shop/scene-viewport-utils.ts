import {Vector3} from 'three';
import type {Point3} from './measure-geometry';
import type {MeasureScene,SceneMesh,SceneLine} from './measure-scene';
export type SceneView='iso'|'plan'|'front';
export const viewDirection=(view:SceneView)=>new Vector3(...(view==='plan'?[0,-0.000001,1]:view==='front'?[0,-1,0]:[1,-1,0.85]) as [number,number,number]).normalize();
/**
 * The opening 3D camera for this model. The fixed corner view looked down
 * every stair from its top end (+x travel seen from +x,−y), so risers faced
 * away and a turning stair's two flights lined up along the view diagonal —
 * an L read as one straight run. Instead, look from in front of the steps:
 * against their combined direction of travel, so every flight shows its
 * risers and a turn opens up as a visible corner. A single straight run gets
 * a three-quarter view (45° off its axis); with no steps, or flights that
 * cancel out (a U), the shop's usual corner view stays.
 */
export function isoDirection(model:Pick<MeasureScene,'meshes'>|null|undefined){
 const fallback=viewDirection('iso');if(!model)return fallback;
 const steps=model.meshes.filter(m=>m.kind==='surface'&&m.entity.stepIndex!==null&&m.entity.stepIndex!==undefined&&m.vertices.length>=2);
 let sx=0,sy=0,n=0;
 for(const m of steps){const dx=m.vertices[1].x-m.vertices[0].x,dy=m.vertices[1].y-m.vertices[0].y,len=Math.hypot(dx,dy);if(!(len>1e-6))continue;sx+=dx/len;sy+=dy/len;n++;}
 if(!n)return fallback;
 const mag=Math.hypot(sx,sy)/n;if(mag<.3)return fallback;
 let x=-sx,y=-sy;
 if(mag>.95){const c=Math.SQRT1_2;[x,y]=[c*x-c*y,c*x+c*y];}
 const h=Math.hypot(x,y);return new Vector3(x/h,y/h,.85/Math.SQRT2).normalize();
}
export function fitScene(bounds:MeasureScene['bounds'],aspect:number,direction:Vector3){
 const min=new Vector3(bounds.min.x,bounds.min.y,bounds.min.z),max=new Vector3(bounds.max.x,bounds.max.y,bounds.max.z),center=min.clone().add(max).multiplyScalar(.5);
 const forward=direction.clone().normalize(),right=new Vector3(0,0,1).cross(forward).normalize(),up=forward.clone().cross(right).normalize();
 let horizontal=0,vertical=0;
 for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z]){const p=new Vector3(x,y,z).sub(center);horizontal=Math.max(horizontal,Math.abs(p.dot(right)));vertical=Math.max(vertical,Math.abs(p.dot(up)));}
 return {center,halfHeight:Math.max(vertical,horizontal/Math.max(.1,aspect),12)*1.3,distance:Math.max(min.distanceTo(max)*2,100)};
}
export function faceIndices(mesh:SceneMesh){const indices:number[]=[];for(const face of mesh.faces){if(face.length<3||face.some(i=>!Number.isInteger(i)||!mesh.vertices[i]||!Object.values(mesh.vertices[i]).every(Number.isFinite)))continue;for(let i=1;i<face.length-1;i++)indices.push(face[0],face[i],face[i+1]);}return indices;}
export function isSceneSelected(item:SceneMesh|SceneLine,id?:string){return !!id&&(item.id===id||item.entity.siteId===id||item.entity.postId===id||item.entity.railId===id);}
export class TapGesture{
 private points=new Map<number,{x:number;y:number}>();private rejected=false;
 down(id:number,x:number,y:number){if(!this.points.size)this.rejected=false;this.points.set(id,{x,y});if(this.points.size>1)this.rejected=true;}
 move(id:number,x:number,y:number){const p=this.points.get(id);if(p&&Math.hypot(x-p.x,y-p.y)>6)this.rejected=true;}
 up(id:number,x:number,y:number){this.move(id,x,y);const accepted=this.points.has(id)&&!this.rejected&&this.points.size===1;this.points.delete(id);return accepted;}
 cancel(){this.rejected=true;this.points.clear();}
}
export const point3=(p:Vector3):Point3=>({x:p.x,y:p.y,z:p.z});

/** Keep GPU Float32 positions near zero; the object matrix preserves the world origin in doubles. */
export function localPositions(points:Point3[]){const origin=points[0]||{x:0,y:0,z:0};return {origin:{...origin},positions:new Float32Array(points.flatMap(p=>[p.x-origin.x,p.y-origin.y,p.z-origin.z]))};}

/** Place touch targets near their projected anchors without overlapping controls. */
export function placeSceneTargets(anchors:{x:number;y:number}[],width:number,height:number){
 const halfWidth=40,halfHeight=22,gap=4,margin=4;
 const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(Math.max(lo,hi),n));
 const minX=halfWidth+margin,maxX=width-halfWidth-margin,minY=halfHeight+margin,maxY=height-halfHeight-margin;
 const placed:{x:number;y:number}[]=[];
 for(const anchor of anchors){
  const origin={x:clamp(anchor.x,minX,maxX),y:clamp(anchor.y,minY,maxY)};
  const candidates=[origin];
  for(let row=-anchors.length;row<=anchors.length;row++)for(let col=-anchors.length;col<=anchors.length;col++)candidates.push({x:clamp(origin.x+col*(halfWidth*2+gap),minX,maxX),y:clamp(origin.y+row*(halfHeight*2+gap),minY,maxY)});
  // Global grid provides a bounded fallback even when anchors cluster at an edge.
  for(let y=minY;y<=Math.max(minY,maxY);y+=halfHeight*2+gap)for(let x=minX;x<=Math.max(minX,maxX);x+=halfWidth*2+gap)candidates.push({x,y});
  const overlap=(p:{x:number;y:number})=>placed.reduce((sum,q)=>sum+Math.max(0,halfWidth*2+gap-Math.abs(p.x-q.x))*Math.max(0,halfHeight*2+gap-Math.abs(p.y-q.y)),0);
  candidates.sort((a,b)=>overlap(a)-overlap(b)||Math.hypot(a.x-origin.x,a.y-origin.y)-Math.hypot(b.x-origin.x,b.y-origin.y));
  placed.push(candidates[0]);
 }
 return placed;
}

export type ScenePostDrop=import('./measure-scene').SceneSelection&{postId:string;segmentIndex:number;point:Point3};
/** A drag is explicit movement, never a tap or a second-finger gesture. */
export class PostDragGesture{
 private start:{id:number;x:number;y:number}|null=null;private moved=false;
 down(id:number,x:number,y:number){if(this.start){this.cancel();return false;}this.start={id,x,y};this.moved=false;return true;}
 move(id:number,x:number,y:number){if(this.start?.id!==id)return false;if(Math.hypot(x-this.start.x,y-this.start.y)>8)this.moved=true;return this.moved;}
 up(id:number,x:number,y:number):'tap'|'drop'|null{if(this.start?.id!==id)return null;this.move(id,x,y);const result=this.moved?'drop':'tap';this.cancel();return result;}
 cancel(){this.start=null;this.moved=false;}
}

/** The top of a measured step or landing a post can stand on (corners 0–3: near-left, far-left, far-right, near-right). */
export type TreadTop={mesh:SceneMesh;quad:[Point3,Point3,Point3,Point3]};
export function treadTops(model:Pick<MeasureScene,'meshes'>|null|undefined):TreadTop[]{
 return (model?.meshes||[]).filter(m=>m.kind==='surface'&&m.entity.segmentIndex!==undefined&&m.vertices.length>=4&&m.vertices.slice(0,4).every(p=>[p.x,p.y,p.z].every(Number.isFinite))).map(mesh=>({mesh,quad:[mesh.vertices[0],mesh.vertices[1],mesh.vertices[2],mesh.vertices[3]]}));
}
/** The point of a (rectangular) top closest to p: p dropped onto its plane, then held inside its edges. */
export function closestOnTop(quad:TreadTop['quad'],p:Point3):Point3{
 const [a,b,,d]=quad,axis=(to:Point3)=>{const e={x:to.x-a.x,y:to.y-a.y,z:to.z-a.z},len=e.x*e.x+e.y*e.y+e.z*e.z;return {e,t:len>1e-12?Math.max(0,Math.min(1,((p.x-a.x)*e.x+(p.y-a.y)*e.y+(p.z-a.z)*e.z)/len)):0};};
 const u=axis(b),v=axis(d);
 return {x:a.x+u.t*u.e.x+v.t*v.e.x,y:a.y+u.t*u.e.y+v.t*v.e.y,z:a.z+u.t*u.e.z+v.t*v.e.z};
}
/** A finger lands on a riser, a side or just off the stair: the nearest top it could have meant, or null when none is within `reach` inches. */
export function nearestTop(tops:TreadTop[],p:Point3,reach=Infinity):{top:TreadTop;point:Point3;distance:number}|null{
 let best:{top:TreadTop;point:Point3;distance:number}|null=null;
 for(const top of tops){const point=closestOnTop(top.quad,p),distance=Math.hypot(point.x-p.x,point.y-p.y,point.z-p.z);if(distance<=reach&&(!best||distance<best.distance-1e-9))best={top,point,distance};}
 return best;
}
