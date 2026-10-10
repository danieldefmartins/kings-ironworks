import {describe,it,expect} from 'vitest';
import {editSiteObject,newSiteObject,newSiteModel,pointDistance,siteIssues,siteMesh,siteNumber,SiteModelSchema} from './measure-site';
import {normalizeMeasureData,newMeasureData} from './measure';
import {blenderPayload,type DrawingRequest} from './shop-drawings';
import {porchSiteFixture} from './measure-site.fixture';
import {drawingIssues} from './measure-drawing';

describe('shared measured site coordinates',()=>{
  it('supports signed feet/fractions without accepting non-finite or unbounded coordinates',()=>{
    expect(siteNumber('-3\' 6 1/2"')).toBe(-42.5);
    expect(siteNumber('0')).toBe(0);
    for(const s of ['','1/0','Infinity','1e99','120001'])expect(siteNumber(s)).toBeNull();
  });
  it('never invents dimensions for an unfinished object',()=>{
    const o=newSiteObject('column','col','Column');expect(siteMesh(o)).toBeNull();
    const site={...newSiteModel(),objects:[o]};
    expect(siteIssues(site)).toEqual(['siteDatumOpen','siteDimensionsOpen','siteVerificationOpen']);
  });
  it('rotates walls about their measured corner and keeps global elevation',()=>{
    const o={...porchSiteFixture().site!.objects[0],x:'-12',y:'24',z:'7',length:'60',depth:'6',height:'96',rotation:90};
    const m=siteMesh(o)!;
    expect(m.vertices[0]).toEqual({x:-12,y:24,z:7});
    expect(m.vertices[1].x).toBeCloseTo(-12);expect(m.vertices[1].y).toBeCloseTo(84);
    expect(m.vertices[6]).toEqual({x:expect.closeTo(-18),y:84,z:103});
  });
  it('models sloped floors without allowing top faces below the bottom',()=>{
    const o={...porchSiteFixture().site!.objects[3],riseX:'-1',riseY:'1/2'};
    expect(siteMesh(o)!.vertices[6].z).toBe(-.5);
    expect(siteMesh({...o,riseX:'-5'})).toBeNull();
  });
  it('keeps round column diameter independent from stale rectangular depth',()=>{
    const o={...porchSiteFixture().site!.objects[1],section:'round' as const,length:'10',depth:''};
    const m=siteMesh(o)!;
    expect(Math.max(...m.vertices.map(p=>p.x))-Math.min(...m.vertices.map(p=>p.x))).toBe(10);
    expect(Math.max(...m.vertices.map(p=>p.y))-Math.min(...m.vertices.map(p=>p.y))).toBe(10);
  });
  it('separates diagonal distance, plan distance and signed elevation',()=>{
    expect(pointDistance({x:0,y:0,z:12},{x:3,y:4,z:0})).toEqual({horizontal:5,vertical:-12,distance:13});
  });
  it('invalidates verification when an observation changes',()=>{
    const o=porchSiteFixture().site!.objects[0];const changed=editSiteObject(o,{length:'84'});
    expect(o.verified).toBe(true);expect(changed.verified).toBe(false);
    expect(siteIssues({version:1,datum:'ground',objects:[changed]})).toContain('siteVerificationOpen');
  });
  it('preserves old sheets and new site data through normalization and worker handoff',()=>{
    expect(normalizeMeasureData(newMeasureData('straight',2)).site).toBeUndefined();
    const data=porchSiteFixture();expect(normalizeMeasureData(data).site).toEqual(data.site);
    const payload=blenderPayload({id:'test',source_updated_at:'2026-10-10',snapshot:{name:'Porch',shape:'stair_platform',data}} as DrawingRequest);
    expect(payload.site.meshes).toHaveLength(4);expect(payload.site.objects).toEqual(data.site!.objects);
    expect(payload.site.meshes[0].vertices[0]).toEqual({x:116,y:-24,z:28});
    expect(payload.surfaces[0].corners[0]).toEqual({x:0,y:0,z:7});
    expect(payload.draft).toBe(true);
  });
  it('blocks release for unverified site objects even when dimensions are present',()=>{
    const data=porchSiteFixture();data.site!.objects[1].verified=false;
    expect(drawingIssues(data)).toContain('siteVerificationOpen');
  });
  it('rejects duplicate identities, unsupported versions and oversized site payloads',()=>{
    const site=porchSiteFixture().site!;
    expect(SiteModelSchema.safeParse(site).success).toBe(true);
    expect(SiteModelSchema.safeParse({...site,objects:[site.objects[0],site.objects[0]]}).success).toBe(false);
    expect(SiteModelSchema.safeParse({...site,version:2}).success).toBe(false);
    expect(SiteModelSchema.safeParse({...site,objects:Array.from({length:101},(_,i)=>({...site.objects[0],id:String(i)}))}).success).toBe(false);
  });
});
