import {Vector3} from 'three';
import type {Point3} from './measure-geometry';
import type {MeasureScene,SceneMesh,SceneLine} from './measure-scene';
export type SceneView='iso'|'plan'|'front';
export const viewDirection=(view:SceneView)=>new Vector3(...(view==='plan'?[0,-0.000001,1]:view==='front'?[0,-1,0]:[1,-1,0.85]) as [number,number,number]).normalize();
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
