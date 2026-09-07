import { describe,it,expect } from 'vitest';
import { newMeasureData,newPost,type FlightSegment } from './measure';
import { drawingIssues,drawingPosts } from './measure-drawing';
import { stairGeometry } from './measure-geometry';
const fixture=()=>{
  const d=newMeasureData('straight',1),f=d.segments[0] as FlightSegment;f.width='36';Object.assign(f.steps[0],{rise:'7',run:'11'});
  d.datums.postRef='centerline';d.rail.height='36';d.materials.post='2" sq';d.materials.topRail='1 1/2"';
  const p=newPost(0,0);Object.assign(p,{side:'right',fromNosing:'2',fromEdge:'3',mount:'Base plate',anchor:'Concrete',plate:'4x4',anchors:'4 bolts'});d.posts=[p];return d;
};
describe('drawing release readiness',()=>{
  it('positions post centerlines on the selected tread',()=>{
    const d=fixture(),p=drawingPosts(d,stairGeometry(d)!)[0];expect(p.base?.x).toBeCloseTo(2);expect(p.base?.y).toBeCloseTo(33);expect(p.base?.z).toBeCloseTo(7);expect(p.top?.z).toBeCloseTo(43);expect(p.provisional).toBe(false);expect(drawingIssues(d)).toEqual([]);
  });
  it('does not accept absent offsets or face-based dimensions as measured centerlines',()=>{
    const d=fixture();d.posts[0].fromEdge='';expect(drawingIssues(d)).toContain('drawingPostsOpen');
    d.posts[0].fromEdge='3';d.datums.postRef='face';expect(drawingIssues(d)).toContain('drawingPostsOpen');
  });
  it('blocks off-tread points and missing mounting details',()=>{
    const d=fixture();d.posts[0].fromNosing='12';d.posts[0].anchors='';
    expect(drawingIssues(d)).toEqual(expect.arrayContaining(['drawingPostsOpen','drawingConnectionsOpen']));
  });
  it('blocks missing geometry, profiles and unresolved joints',()=>{
    const d=fixture();(d.segments[0] as FlightSegment).steps[0].rise='';d.materials.post='';
    d.joints=[{afterSegment:0,gap:'',offsetV:'',offsetH:'',angleChange:'',method:'',carriedBy:'',leaveLong:'',note:''}];
    expect(drawingIssues(d)).toEqual(expect.arrayContaining(['drawingGeometryOpen','drawingProfilesOpen','drawingJointsOpen']));
  });
});
