import {expect,it} from 'vitest';
import {porchSiteFixture} from './measure-site.fixture';
import {stairGeometry,type Point3} from './measure-geometry';
import {drawingPosts} from './measure-drawing';
import {blenderPayload,type DrawingRequest} from './shop-drawings';
const move=(p:Point3,rotation=90)=>{const a=rotation*Math.PI/180;return {x:120+p.x*Math.cos(a)-p.y*Math.sin(a),y:-36+p.x*Math.sin(a)+p.y*Math.cos(a),z:12+p.z};};
it.each([90,37,-90])('rotates the native assembly %s degrees while keeping house objects and local focus unchanged',rotation=>{
 const data=porchSiteFixture(),before=stairGeometry(data)!,posts=drawingPosts(data,before),local=stairGeometry(data,0),site=JSON.stringify(data.site),stored=JSON.stringify(data.segments);
 data.sceneSetup={environment:'exterior',projectType:'stairs',placement:{x:'120',y:'-36',z:'12',rotation}};
 const after=stairGeometry(data)!;expect(after.run).toBe(before.run);expect(after.rise).toBe(before.rise);expect(after.provisional).toBe(before.provisional);
 after.treads.forEach((t,i)=>t.corners.forEach((p,j)=>{const expected=move(before.treads[i].corners[j],rotation);expect(p.x).toBeCloseTo(expected.x);expect(p.y).toBeCloseTo(expected.y);expect(p.z).toBeCloseTo(expected.z);}));
 drawingPosts(data,after).forEach((p,i)=>{expect(p.provisional).toBe(posts[i].provisional);for(const key of ['base','top'] as const){const expected=move(posts[i][key]!,rotation);expect(p[key]!.x).toBeCloseTo(expected.x);expect(p[key]!.y).toBeCloseTo(expected.y);expect(p[key]!.z).toBeCloseTo(expected.z);}});
 expect(stairGeometry(data,0)).toEqual(local);expect(JSON.stringify(data.site)).toBe(site);expect(JSON.stringify(data.segments)).toBe(stored);
 const payload=blenderPayload({id:'placement',source_updated_at:'2026-10-10',snapshot:{name:'Sample',shape:'stair_platform',data}} as DrawingRequest);
 expect(payload.surfaces[0].corners).toEqual(after.treads[0].corners);expect(payload.posts[0].base).toEqual(drawingPosts(data,after)[0].base);expect(payload.site.objects).toEqual(data.site!.objects);
});
it('invalid placement stays visibly provisional and cannot produce verified posts',()=>{
 const data=porchSiteFixture();data.sceneSetup={environment:'exterior',projectType:'stairs',placement:{x:'',y:'0',z:'0',rotation:90}};
 const model=stairGeometry(data)!;expect(model.provisional).toBe(true);expect(model.treads.every(t=>t.provisional)).toBe(true);expect(drawingPosts(data,model).every(p=>p.provisional)).toBe(true);
 expect(stairGeometry(data,0)?.provisional).toBe(false);
});
it('absent placement and explicit identity have identical physical coordinates',()=>{const data=porchSiteFixture(),before=stairGeometry(data);data.sceneSetup={environment:'exterior',projectType:'stairs',placement:{x:'0',y:'0',z:'0',rotation:0}};expect(stairGeometry(data)).toEqual(before);});
