import {describe,it,expect} from 'vitest';
import {drawingProjection,drawingPointOccluded} from './measure-projection';
describe('whole staircase projection',()=>{
  it('sorts faces by camera depth rather than segment order',()=>{
    const camera=drawingProjection('iso');
    const near={x:0,y:0,z:7},far={x:11,y:0,z:14};
    expect(camera.depth([near])).toBeGreaterThan(camera.depth([far]));
    expect(camera.depth([{...far,z:60}])).toBeGreaterThan(camera.depth([near]));
  });
  it('rotates the view without changing dimensions or source coordinates',()=>{
    const p={x:11,y:36,z:7};
    expect(drawingProjection('iso',360).project(p)[0]).toBeCloseTo(drawingProjection('iso').project(p)[0]);
    expect(drawingProjection('plan',90).project(p)).toEqual([66,216]);
    expect(drawingProjection('iso',90).project(p)).not.toEqual(drawingProjection('iso').project(p));
    expect(p).toEqual({x:11,y:36,z:7});
  });
});

it('hides an annotation behind a higher surface without hiding its own labels',()=>{
 const face=[{x:0,y:0,z:20},{x:10,y:0,z:20},{x:10,y:10,z:20},{x:0,y:10,z:20}];
 const camera=drawingProjection('plan');
 expect(drawingPointOccluded({x:5,y:5,z:0},[face],camera)).toBe(true);
 expect(drawingPointOccluded({x:5,y:5,z:20},[face],camera)).toBe(false);
 expect(drawingPointOccluded({x:15,y:5,z:0},[face],camera)).toBe(false);
});
