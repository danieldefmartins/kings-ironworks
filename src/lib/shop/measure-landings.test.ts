import {describe,it,expect} from 'vitest';
import {newMeasureData,newPost,railSideSetback,insertSegment,removeSegment,type FlightSegment} from './measure';
import {landingConnections,landingConnectionGeometry,landingConnectionComplete,landingConnectionMeasured} from './measure-landings';
const fixture=()=>{
  const d=newMeasureData('straight',2),lower=d.segments[0] as FlightSegment;
  lower.width='36';lower.steps.forEach(s=>Object.assign(s,{rise:'7',run:'11'}));
  d.segments.push({kind:'platform',length:'48',depth:'84',diag:'',slope:'0',slopeDir:'',turn:'u',entryOffset:'0',exitOffset:'0'},structuredClone(lower));
  d.rail.height='36';d.rail.side='Left';d.datums.postRef='centerline';
  d.posts=[Object.assign(newPost(0,1),{side:'left',fromNosing:'2',fromEdge:'3 1/2'}),Object.assign(newPost(2,0),{side:'left',fromNosing:'2',fromEdge:'3 1/2'})];
  return d;
};
describe('multi-flight railing layout',()=>{
  it('defaults the side setback to 3 1/2 without rewriting existing measurements',()=>{
    const d=fixture();d.posts=[];expect(railSideSetback(d)).toBe('3 1/2');
    d.posts=[Object.assign(newPost(0,0),{fromEdge:'4'})];expect(railSideSetback(d)).toBe('4');
    d.rail.sideSetback='3';expect(railSideSetback(d)).toBe('3');expect(d.posts[0].fromEdge).toBe('4');
    expect(railSideSetback(newMeasureData('straight',2))).toBe('');
  });
  it('connects flights across a landing without creating a landing post',()=>{
    const d=fixture(),t=landingConnections(d)[0];expect(t).toMatchObject({landingSegIdx:1,lowerFlightIdx:0,upperFlightIdx:2,side:'left'});
    Object.assign(t,{kind:'drop',lowerPostId:d.posts[0].id,upperPostId:d.posts[1].id,lowerReach:'0',upperReach:'0',heightDifference:'7',higherEnd:'upper',verticalAt:'lower'});
    const geometry=landingConnectionGeometry(d,t)!;t.horizontalSpan=String(geometry.horizontalSpan);
    expect(geometry.heightDifference).toBeCloseTo(7);expect(geometry.higherEnd).toBe('upper');expect(geometry.path[1].z).toBe(geometry.upper.z);
    expect(landingConnectionComplete(d,t)).toBe(true);expect(d.posts).toHaveLength(2);expect(d.posts.every(p=>p.stepIdx!==null)).toBe(true);
  });
  it('accounts for rail extensions that reverse which connection end is higher',()=>{
    const d=fixture(),t=landingConnections(d)[0];Object.assign(t,{kind:'drop',lowerPostId:d.posts[0].id,upperPostId:d.posts[1].id,lowerReach:'22',upperReach:'0',heightDifference:'7',higherEnd:'lower',verticalAt:'upper'});
    const g=landingConnectionGeometry(d,t)!;t.horizontalSpan=String(g.horizontalSpan);
    expect(g.higherEnd).toBe('lower');expect(g.heightDifference).toBeCloseTo(7);expect(g.path[1].z).toBe(g.lower.z);expect(landingConnectionComplete(d,t)).toBe(true);
  });
  it('retains measured disagreement for review instead of overwriting it',()=>{
    const d=fixture(),t=landingConnections(d)[0];Object.assign(t,{kind:'drop',lowerPostId:d.posts[0].id,upperPostId:d.posts[1].id,lowerReach:'0',upperReach:'0',heightDifference:'20',horizontalSpan:'4',higherEnd:'upper',verticalAt:'lower'});
    expect(landingConnectionMeasured(d,t)).toBe(true);expect(landingConnectionComplete(d,t)).toBe(false);expect(t.heightDifference).toBe('20');
    t.upperPostId='deleted-post';expect(landingConnectionMeasured(d,t)).toBe(false);
  });
  it('moves connection references with segment insertion and removes invalid pairs',()=>{
    const d=fixture();d.landingTransitions=landingConnections(d);insertSegment(d,0,structuredClone(d.segments[0]));
    expect(d.landingTransitions[0]).toMatchObject({landingSegIdx:2,lowerFlightIdx:1,upperFlightIdx:3});
    removeSegment(d,0);expect(d.landingTransitions[0].landingSegIdx).toBe(1);
    removeSegment(d,1);expect(d.landingTransitions).toEqual([]);
  });
});
