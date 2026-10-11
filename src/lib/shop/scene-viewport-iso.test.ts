import {describe,it,expect} from 'vitest';
import {Vector3} from 'three';
import {isoDirection,viewDirection} from './scene-viewport-utils';
import {measureScene} from './measure-scene';
import {newMeasureData,normalizeMeasureData} from './measure';

describe('opening 3D camera',()=>{
 // A riser faces back along the direction of travel; the camera sees it only
 // when the view direction (target → camera) points the same way.
 const risersFacing=(shape:'straight'|'l_shape')=>{
  const scene=measureScene(normalizeMeasureData(newMeasureData(shape,4))),dir=isoDirection(scene);
  return scene.meshes.filter(m=>m.kind==='surface'&&m.entity.stepIndex!=null).map(m=>{const t=new Vector3(m.vertices[1].x-m.vertices[0].x,m.vertices[1].y-m.vertices[0].y,0).normalize();return {segment:m.entity.segmentIndex,dot:-t.dot(dir)};});
 };
 it('shows the risers of both flights of an L-shape, so its 90° turn reads as a corner',()=>{
  const faces=risersFacing('l_shape');expect(new Set(faces.map(f=>f.segment))).toEqual(new Set([0,2]));
  for(const f of faces)expect(f.dot).toBeGreaterThan(.3);
  // the old fixed corner view looked at the first flight from behind
  expect(-new Vector3(1,0,0).dot(viewDirection('iso'))).toBeLessThan(0);
 });
 it('gives a straight run a three-quarter view of its risers and keeps the corner view without steps',()=>{
  for(const f of risersFacing('straight'))expect(f.dot).toBeGreaterThan(.5);
  expect(isoDirection({meshes:[]}).equals(viewDirection('iso'))).toBe(true);
  expect(isoDirection(null).equals(viewDirection('iso'))).toBe(true);
 });
 it('keeps the same camera elevation as the corner view',()=>{
  expect(isoDirection(measureScene(normalizeMeasureData(newMeasureData('l_shape',3)))).z).toBeCloseTo(viewDirection('iso').z,5);
 });
});
