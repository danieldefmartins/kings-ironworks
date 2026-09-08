import {describe,it,expect} from 'vitest';
import {newPresetMeasureData} from './measure';
import {applyStandardReturn} from './measure-standard-layout';
import {stairGeometry} from './measure-geometry';
function fixture(){
 const {data}=newPresetMeasureData('multi_flight',5,5);
 for(const s of data.segments){if(s.kind==='flight'){s.width='36';s.steps.forEach(t=>Object.assign(t,{run:'11',rise:'7'}));}else if(s.kind==='platform')Object.assign(s,{length:'48',depth:'84',slope:'0'});}
 return data;
}
describe('standard two-flight U stair',()=>{
 for(const wall of ['right','left'] as const)it(`keeps five flights stacked in two parallel lanes with wall ${wall}`,()=>{
  const d=fixture();applyStandardReturn(d,wall);const g=stairGeometry(d)!;
  const flights=[0,2,4,6,8].map(i=>g.treads.find(t=>t.segIdx===i)!);
  expect(g.provisional).toBe(false);
  for(let i=0;i<5;i++){
   const t=flights[i];const dx=t.corners[1].x-t.corners[0].x;
   expect(Math.sign(dx)).toBe(i%2?-1:1);
   expect(t.corners[1].y-t.corners[0].y).toBeCloseTo(0);
   expect(t.corners[0].x).toBeCloseTo(i%2?55:0);
   expect(t.corners[0].y).toBeCloseTo(i%2?(wall==='right'?-12:84):0);
  }
  expect(d.segments.every(s=>(s.kind==='flight'||s.kind==='platform')&&s.wallSide===wall)).toBe(true);
 });
 it('does not fabricate a missing landing-width measurement',()=>{
  const d=fixture();if(d.segments[1].kind==='platform')d.segments[1].depth='';applyStandardReturn(d,'right');
  expect(stairGeometry(d)!.provisional).toBe(true);
 });
});

import {newPost} from './measure';
import {landingConnections,landingConnectionGeometry} from './measure-landings';
it('uses both setbacks and post registration to size a square U bridge',()=>{
 const d=fixture();applyStandardReturn(d,'right');d.rail.height='36';d.datums.postRef='centerline';
 d.posts=[{...newPost(0,3),side:'left',fromNosing:'2',fromEdge:'3 1/2'},{...newPost(2,1),side:'left',fromNosing:'2',fromEdge:'3 1/2'}];
 const t=landingConnections(d)[0];Object.assign(t,{kind:'drop',lowerPostId:d.posts[0].id,upperPostId:d.posts[1].id,lowerReach:'1',upperReach:'1',verticalAt:'lower',higherEnd:'upper',heightDifference:'0',horizontalSpan:'0'});
 let g=landingConnectionGeometry(d,t)!;
 expect(g.layout.lowerReachForSquareBridge).toBeCloseTo(8);
 t.lowerReach='8';g=landingConnectionGeometry(d,t)!;
 expect(g.layout.alongRailEnds).toBeCloseTo(0);
 expect(g.layout.clearGapBetweenFlights).toBeCloseTo(12);
 expect(g.horizontalSpan).toBeCloseTo(19);
 expect(g.heightDifference).toBeCloseTo(15.27272727);
 d.posts[0].fromEdge='4 1/2';d.posts[1].fromEdge='4 1/2';g=landingConnectionGeometry(d,t)!;
 expect(g.horizontalSpan).toBeCloseTo(21);expect(g.layout.clearGapBetweenFlights).toBeCloseTo(12);
});
