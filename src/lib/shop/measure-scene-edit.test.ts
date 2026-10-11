import {expect,it} from 'vitest';
import {newMeasureData,newPost} from './measure';
import {stairGeometry,surfacePoint} from './measure-geometry';
import {resolvePostPoint,applyPostPoint} from './measure-scene-edit';
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
it('refuses unknown dimensions, unconfirmed datum, winders, missing posts and invalid grid without mutation',()=>{
 for(const invalid of ['datum','dimensions','winder','post','grid']){const d=fixture(),surface=stairGeometry(d)!.treads[0],worldPoint=surfacePoint(surface,4,3);if(invalid==='datum')d.datums.postRef='face';if(invalid==='dimensions'&&d.segments[0].kind==='flight')d.segments[0].width='';if(invalid==='winder'&&d.segments[0].kind==='flight')d.segments[0].steps[0].winder=true;const before=JSON.stringify(d);expect(applyPostPoint(d,invalid==='post'?'missing':null,{segmentIndex:0,stepIndex:0,worldPoint,grid:invalid==='grid'?0:undefined}).ok).toBe(false);expect(JSON.stringify(d)).toBe(before);}
});
