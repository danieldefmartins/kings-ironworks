import {expect,it} from 'vitest';
import {newMeasureData,newPost} from './measure';
import {stairGeometry,surfacePoint} from './measure-geometry';
import {resolvePostPoint,resolvePostMove,applyPostPoint} from './measure-scene-edit';
function fixture(rotation=0){const d=newMeasureData('straight',2),s=d.segments[0];if(s.kind!=='flight')throw Error();s.width='36';s.steps.forEach(t=>{t.rise='7';t.run='10';});d.datums.postRef='centerline';d.sceneSetup={environment:'exterior',projectType:'stairs',placement:{x:'120',y:'-24',z:'12',rotation}};return d;}
it.each([0,90,37])('inverts the measured support at rotation %s and snaps intrinsic offsets',rotation=>{
 const d=fixture(rotation),surface=stairGeometry(d)!.treads[1],point=surfacePoint(surface,3.14,33.12),before=JSON.stringify(d),result=resolvePostPoint(d,{segmentIndex:0,stepIndex:1,worldPoint:point});
 expect(result.ok).toBe(true);if(!result.ok)throw Error(result.error);expect(result.position).toMatchObject({segIdx:0,stepIdx:1,side:'right',fromNosing:'3.125',fromEdge:'2.875',pos:''});expect(result.point).toEqual(surfacePoint(surface,3.125,33.125));expect(JSON.stringify(d)).toBe(before);
});
it('supports ramp and sloped landing surfaces with their measured along-surface coordinates',()=>{
 for(const kind of ['ramp','level_run'] as const){const d=newMeasureData(kind,0),s=d.segments[0];d.datums.postRef='centerline';if(s.kind==='ramp')Object.assign(s,{runH:'120',rise:'12',width:'36'});else if(s.kind==='platform')Object.assign(s,{length:'120',depth:'36',slope:'1/4 / ft',slopeDir:'Left'});const surface=stairGeometry(d)!.treads[0],point=surfacePoint(surface,22.26,4.26),result=resolvePostPoint(d,{segmentIndex:0,stepIndex:null,worldPoint:point,grid:.25});expect(result.ok).toBe(true);if(!result.ok)throw Error();expect(result.position).toMatchObject({pos:'22.25',fromEdge:'4.25',fromNosing:''});expect(result.point).toEqual(surfacePoint(surface,22.25,4.25));}
});
it('clamps grid snapping at an irregular measured boundary and rejects points outside or below it',()=>{
 const d=fixture(),s=d.segments[0];if(s.kind!=='flight')throw Error();s.steps[0].run='10.08';const surface=stairGeometry(d)!.treads[0];
 const result=resolvePostPoint(d,{segmentIndex:0,stepIndex:0,worldPoint:surfacePoint(surface,10.08,36),grid:.1});expect(result.ok).toBe(true);if(!result.ok)throw Error();expect(Number(result.position.fromNosing)).toBe(10.08);expect(result.position.fromEdge).toBe('0');
 const at=surfacePoint(surface,5,5);expect(resolvePostPoint(d,{segmentIndex:0,stepIndex:0,worldPoint:surfacePoint(surface,11,5)}).ok).toBe(false);expect(resolvePostPoint(d,{segmentIndex:0,stepIndex:0,worldPoint:{...at,z:at.z-1}}).ok).toBe(false);
});
it('creates or moves one post while preserving fabrication fields, notes, and other posts',()=>{
 const d=fixture(),surface=stairGeometry(d)!.treads[0],p=Object.assign(newPost(0,0),{mount:'Base plate',anchor:'Concrete',plate:'4 x 4',notes:'keep',fromEdge:'2'}),other=newPost(0,1);d.posts=[p,other];const before=JSON.stringify(other),result=applyPostPoint(d,p.id,{segmentIndex:0,stepIndex:0,worldPoint:surfacePoint(surface,4,3)});expect(result.ok).toBe(true);expect(p).toMatchObject({mount:'Base plate',anchor:'Concrete',plate:'4 x 4',notes:'keep',fromEdge:'3',fromNosing:'4'});expect(JSON.stringify(other)).toBe(before);
 expect(applyPostPoint(d,null,{segmentIndex:0,stepIndex:0,worldPoint:surfacePoint(surface,5,5)}).ok).toBe(true);expect(d.posts).toHaveLength(3);
});
it('refuses a face datum, winders, missing posts and invalid grid without mutation',()=>{
 for(const invalid of ['datum','winder','post','grid']){const d=fixture(),surface=stairGeometry(d)!.treads[0],worldPoint=surfacePoint(surface,4,3);if(invalid==='datum')d.datums.postRef='face';if(invalid==='winder'&&d.segments[0].kind==='flight')d.segments[0].steps[0].winder=true;const before=JSON.stringify(d);expect(applyPostPoint(d,invalid==='post'?'missing':null,{segmentIndex:0,stepIndex:0,worldPoint,grid:invalid==='grid'?0:undefined}).ok).toBe(false);expect(JSON.stringify(d)).toBe(before);}
});
it('a moved post keeps its side and typed setbacks: another step changes only the step, the same step only the nosing distance',()=>{
 const d=fixture(),treads=stairGeometry(d)!.treads,p=Object.assign(newPost(0,0),{side:'right' as const,fromNosing:'2 1/2',fromEdge:'1 1/2'});d.posts=[p];
 const other=resolvePostMove(d,p.id,{segmentIndex:0,stepIndex:1,worldPoint:surfacePoint(treads[1],7,4)});expect(other.ok).toBe(true);if(!other.ok)throw Error();
 expect(other.position).toEqual({segIdx:0,stepIdx:1,side:'right',fromNosing:'2 1/2',fromEdge:'1 1/2',pos:''});expect(other.point).toEqual(surfacePoint(treads[1],2.5,34.5));
 const same=resolvePostMove(d,p.id,{segmentIndex:0,stepIndex:0,worldPoint:surfacePoint(treads[0],7,4)});expect(same.ok).toBe(true);if(!same.ok)throw Error();
 expect(same.position).toMatchObject({stepIdx:0,side:'right',fromNosing:'7',fromEdge:'1 1/2'});expect(same.point).toEqual(surfacePoint(treads[0],7,34.5));
 expect(p).toMatchObject({stepIdx:0,fromNosing:'2 1/2'});
});
it('a new post takes the tapped step and side with the usual setbacks, and a blank reference becomes centerline',()=>{
 const d=fixture(),treads=stairGeometry(d)!.treads;d.datums.postRef='';
 const result=applyPostPoint(d,null,{segmentIndex:0,stepIndex:1,worldPoint:surfacePoint(treads[1],8.3,30.7)});expect(result.ok).toBe(true);
 expect(d.datums.postRef).toBe('centerline');expect(d.posts).toHaveLength(1);expect(d.posts[0]).toMatchObject({segIdx:0,stepIdx:1,side:'right',fromEdge:'1 1/2',fromNosing:'5'});
});
it('places on a step whose width is not measured yet without recording a distance read off the assumed size',()=>{
 const d=fixture(),s=d.segments[0];if(s.kind!=='flight')throw Error();s.width='';const tread=stairGeometry(d)!.treads[0];expect(tread.provisional).toBe(true);
 const worldPoint=surfacePoint(tread,4,tread.width-3);expect(resolvePostPoint(d,{segmentIndex:0,stepIndex:0,worldPoint}).ok).toBe(false);
 const result=applyPostPoint(d,null,{segmentIndex:0,stepIndex:0,worldPoint});expect(result.ok).toBe(true);expect(d.posts[0]).toMatchObject({stepIdx:0,side:'right',fromEdge:'1 1/2'});
});
