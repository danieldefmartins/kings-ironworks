import {describe,it,expect} from 'vitest';
import {Vector3,BufferGeometry,BufferAttribute,Mesh,MeshBasicMaterial,DoubleSide,Raycaster,Plane} from 'three';
import {PostDragGesture,TapGesture,localPositions,placeSceneTargets,fitScene,viewDirection,faceIndices,isSceneSelected} from './scene-viewport-utils';
import type {SceneMesh} from './measure-scene';
const mesh:SceneMesh={id:'site:wall1',label:'Wall',kind:'site',provisional:false,referenceOnly:false,entity:{siteId:'wall1'},vertices:[{x:0,y:0,z:0},{x:30,y:0,z:0},{x:30,y:2,z:0},{x:0,y:2,z:0}],faces:[[0,1,2,3]]};
describe('viewport geometry and interaction',()=>{
 it('triangulates measured faces without adding vertices or dimensions',()=>{expect(faceIndices(mesh)).toEqual([0,1,2,0,2,3]);expect(mesh.vertices).toHaveLength(4);expect(faceIndices({...mesh,faces:[[0,1,99]]})).toEqual([]);});
 it('fits every world-space corner in phone and desktop projections',()=>{const bounds={min:{x:-240,y:-70,z:-10},max:{x:360,y:200,z:120}};for(const aspect of [.46,1.8])for(const view of ['iso','plan','front'] as const){const dir=viewDirection(view),fit=fitScene(bounds,aspect,dir),right=new Vector3(0,0,1).cross(dir).normalize(),up=dir.clone().cross(right);for(const x of [-240,360])for(const y of [-70,200])for(const z of [-10,120]){const p=new Vector3(x,y,z).sub(fit.center);expect(Math.abs(p.dot(right))).toBeLessThan(fit.halfHeight*aspect);expect(Math.abs(p.dot(up))).toBeLessThan(fit.halfHeight);}}});
 it('keeps a usable camera for empty scenes',()=>{expect(fitScene({min:{x:0,y:0,z:0},max:{x:0,y:0,z:0}},1,viewDirection('plan')).halfHeight).toBeGreaterThan(0);});
 it('selects taps but rejects dragging even when returning to the start',()=>{const tap=new TapGesture();tap.down(1,20,20);expect(tap.up(1,23,22)).toBe(true);tap.down(1,20,20);tap.move(1,60,20);expect(tap.up(1,20,20)).toBe(false);});
 it('does not select after pinch gestures or cancellation',()=>{const tap=new TapGesture();tap.down(1,0,0);tap.down(2,20,20);expect(tap.up(2,20,20)).toBe(false);expect(tap.up(1,0,0)).toBe(false);tap.down(1,0,0);tap.cancel();expect(tap.up(1,0,0)).toBe(false);});
 it('recognizes persisted entity IDs and precise surface IDs',()=>{expect(isSceneSelected(mesh,'wall1')).toBe(true);expect(isSceneSelected(mesh,'site:wall1')).toBe(true);expect(isSceneSelected(mesh,'other')).toBe(false);});
});

describe('large site offset precision',()=>{
 it('raycasts a fractional ramp at a large world offset without weakening plane tolerance',()=>{
  const origin={x:120000.12345,y:119000.34567,z:110000.23456},vertices=[origin,{x:origin.x+99.137,y:origin.y,z:origin.z+13.271},{x:origin.x+99.137,y:origin.y+40.173,z:origin.z+13.271},{x:origin.x,y:origin.y+40.173,z:origin.z}];
  const local=localPositions(vertices),geometry=new BufferGeometry();geometry.setAttribute('position',new BufferAttribute(local.positions,3));geometry.setIndex([0,1,2,0,2,3]);const material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(geometry,material);mesh.position.set(origin.x,origin.y,origin.z);mesh.updateMatrixWorld(true);
  const ray=new Raycaster(new Vector3(origin.x+40,origin.y+20,origin.z+100),new Vector3(0,0,-1));const hit=ray.intersectObject(mesh)[0];expect(hit).toBeDefined();const plane=new Plane().setFromCoplanarPoints(...vertices.slice(0,3).map(p=>new Vector3(p.x,p.y,p.z)) as [Vector3,Vector3,Vector3]);expect(Math.abs(plane.distanceToPoint(hit.point))).toBeLessThan(1e-5);expect(local.positions[0]).toBe(0);expect(vertices[0]).toEqual(origin);geometry.dispose();material.dispose();
 });
});

describe('phone wall touch targets',()=>{
 it('keeps four clustered targets distinct and inside a 320 by 455 viewport',()=>{
  for(const anchor of [{x:160,y:220},{x:0,y:0},{x:319,y:454},{x:160,y:454}]){
   const positions=placeSceneTargets(Array.from({length:4},()=>anchor),320,455);
   positions.forEach((p,i)=>{expect(p.x).toBeGreaterThanOrEqual(40);expect(p.x).toBeLessThanOrEqual(280);expect(p.y).toBeGreaterThanOrEqual(22);expect(p.y).toBeLessThanOrEqual(433);for(const q of positions.slice(i+1))expect(Math.abs(p.x-q.x)>=84||Math.abs(p.y-q.y)>=48).toBe(true);});
  }
 });
 it('preserves separated anchors instead of moving every label to a fixed dock',()=>{
  const anchors=[{x:60,y:80},{x:200,y:80},{x:60,y:280},{x:200,y:280}];expect(placeSceneTargets(anchors,320,455)).toEqual(anchors);
 });
});

describe('post drag gesture contract',()=>{
 it('separates click from explicit drag and commits only once',()=>{
  const gesture=new PostDragGesture();gesture.down(1,10,10);expect(gesture.up(1,14,12)).toBe('tap');expect(gesture.up(1,14,12)).toBeNull();gesture.down(2,10,10);expect(gesture.move(2,30,10)).toBe(true);expect(gesture.up(2,10,10)).toBe('drop');expect(gesture.up(2,10,10)).toBeNull();
 });
 it('cancels second-finger gestures and pointer cancellation without a drop',()=>{
  const gesture=new PostDragGesture();gesture.down(1,10,10);expect(gesture.down(2,20,20)).toBe(false);expect(gesture.up(1,30,30)).toBeNull();gesture.down(3,0,0);gesture.move(3,30,30);gesture.cancel();expect(gesture.up(3,30,30)).toBeNull();
 });
});
