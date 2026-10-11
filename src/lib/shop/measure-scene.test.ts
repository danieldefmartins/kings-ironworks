import {expect,it} from 'vitest';
import {porchSiteFixture,attachedFabricationFixture} from './measure-site.fixture';
import {focusFace,measureScene} from './measure-scene';
import {newMeasureData,normalizeMeasureData} from './measure';
import {stairGeometry} from './measure-geometry';
import {drawingPosts} from './measure-drawing';
import {newSiteObject,siteMeshes} from './measure-site';
import {resolveSite} from './measure-wall-placement';
import {attachedCuts} from './measure-attached-fab';
import {siteRailLayout} from './measure-site-rails';
it('reuses measured geometry, includes stable selectable domain references and never mutates the sheet',()=>{
 const data=attachedFabricationFixture(),before=JSON.stringify(data),scene=measureScene(data),model=stairGeometry(data)!;
 const surfaces=scene.meshes.filter(m=>m.kind==='surface');expect(surfaces).toHaveLength(model.treads.length);surfaces.forEach((m,i)=>{expect(m.vertices.slice(0,4)).toEqual(model.treads[i].corners);expect(m.entity.segmentIndex).toBe(model.treads[i].segIdx);expect(m.entity.stepIndex).toBe(model.treads[i].stepIdx);});
 const site=resolveSite(data),cuts=attachedCuts(site,site!.rails![0],siteRailLayout(site,site!.rails![0]));expect(scene.meshes.filter(m=>m.kind==='attached').map(m=>m.vertices)).toEqual(cuts.parts.map(p=>p.vertices));
 for(const p of drawingPosts(data,model)){const m=scene.meshes.find(m=>m.entity.postId===p.post.id)!;expect(m.referenceOnly).toBe(true);expect(m.vertices.slice(0,4).reduce((sum,v)=>sum+v.x,0)/4).toBeCloseTo(p.base!.x);expect(m.vertices[0].z).toBe(p.base!.z);}
 expect(new Set([...scene.meshes,...scene.lines].map(m=>m.id)).size).toBe(scene.meshes.length+scene.lines.length);expect(JSON.stringify(data)).toBe(before);
});
it('separates draft walls and illustrative houses from actual site meshes and supplies four wall placement targets',()=>{
 const data=porchSiteFixture(),wall=newSiteObject('wall','draft-wall','Draft wall');wall.wallAnchor={segmentId:'legacy-segment-1',side:'left',gap:'0',startExtension:'0',endExtension:'0',baseOffset:'0'};data.site!.objects.push(wall);data.sceneSetup={environment:'exterior',projectType:'stairs',house:{side:'right'}};
 const scene=measureScene(data),draft=scene.meshes.find(m=>m.kind==='wall-preview')!;expect(draft.provisional).toBe(true);expect(draft.referenceOnly).toBe(true);expect(draft.entity.siteId).toBe(wall.id);expect(siteMeshes(resolveSite(data)).some(m=>m.id===wall.id)).toBe(false);expect(scene.pending).toContain(wall.label);
 expect(scene.meshes.find(m=>m.kind==='house')?.referenceOnly).toBe(true);expect(scene.lines.filter(l=>l.entity.segmentId==='legacy-segment-1'&&l.entity.side)).toHaveLength(4);
 for(const p of [...scene.meshes.flatMap(m=>m.vertices),...scene.lines.flatMap(l=>l.points)])for(const k of ['x','y','z'] as const){expect(p[k]).toBeGreaterThanOrEqual(scene.bounds.min[k]);expect(p[k]).toBeLessThanOrEqual(scene.bounds.max[k]);}
});
it('does not invent a steel section when a post material is unresolved',()=>{const data=porchSiteFixture();data.materials.post='custom ornamental unknown';const scene=measureScene(data);expect(scene.meshes.some(m=>m.kind==='post')).toBe(false);expect(scene.lines.filter(m=>m.kind==='post')).toHaveLength(data.posts.length);});

it('ends native rail references at linked support faces without inventing a second structural post',()=>{
 const data=porchSiteFixture(),post=data.posts[1];post.pointType='existing_post';post.existingW='8';post.existingD='8';post.supportAttachment={objectId:'column-1',face:'left',along:.5,angle:0,elevation:'0',connection:'Measured clip',gap:'1/8'};
 const before=JSON.stringify(data),scene=measureScene(data),terminal=drawingPosts(data,stairGeometry(data)!).find(p=>p.post.id===post.id)!;
 expect(scene.meshes.some(mesh=>mesh.entity.postId===post.id)).toBe(false);expect(scene.meshes.filter(mesh=>mesh.entity.siteId==='column-1')).toHaveLength(1);const marker=scene.lines.find(line=>line.entity.postId===post.id)!;expect(marker.referenceOnly).toBe(true);expect(marker.points).toContainEqual(terminal.top);expect(Math.max(...marker.points.map(p=>p.z))-Math.min(...marker.points.map(p=>p.z))).toBe(2);
 const rail=scene.lines.find(line=>line.kind==='rail'&&line.id.includes(post.id))!;expect(rail.points).toContainEqual(terminal.top);expect(JSON.stringify(data)).toBe(before);
 data.site!.objects.find(o=>o.id==='column-1')!.x='50';expect(measureScene(data).lines.find(line=>line.id===rail.id)!.points).toContainEqual({...terminal.top!,x:50});
 data.site!.objects=[];const unresolved=measureScene(data);expect(unresolved.lines.some(line=>line.entity.postId===post.id)).toBe(false);expect(unresolved.pending.some(label=>label.includes('support connection'))).toBe(true);
});

it('lights just the riser for a rise and just the tread for a tread depth on the step asked about',()=>{
 const data=normalizeMeasureData(newMeasureData('straight',3)),scene=measureScene(data,'straight');
 const tread=focusFace(scene,{segmentIndex:0,stepIndex:1,part:'run'})!,riser=focusFace(scene,{segmentIndex:0,stepIndex:1,part:'rise'})!;
 expect(tread.mesh.entity.stepIndex).toBe(1);expect(tread.quad).toEqual(tread.mesh.vertices.slice(0,4));
 // The riser hangs from the tread's front edge: two corners on it, two below.
 expect(riser.quad.filter(p=>p.z===tread.quad[0].z)).toHaveLength(2);expect(Math.min(...riser.quad.map(p=>p.z))).toBeLessThan(tread.quad[0].z);
 expect(focusFace(scene,{segmentIndex:0,stepIndex:9,part:'run'})).toBeNull();expect(focusFace(scene,null)).toBeNull();
});
