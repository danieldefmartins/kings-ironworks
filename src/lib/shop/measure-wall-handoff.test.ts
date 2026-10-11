import {expect,it} from 'vitest';
import {newMeasureData,newPlatformSegment,removeSegment,type MeasureData} from './measure';
import {attachedFabricationFixture} from './measure-site.fixture';
import {newSiteModel,newSiteObject,siteMeshes} from './measure-site';
import {resolveSite,wallAnchorSignature} from './measure-wall-placement';
import {resolveRailEnd,siteRailLayout,siteRailSignature} from './measure-site-rails';
import {attachedCuts} from './measure-attached-fab';
import {steelSources} from './measure-steel';
import {drawingIssues} from './measure-drawing';
import {blenderPayload,type DrawingRequest} from './shop-drawings';

function fixture(){
 const data=newMeasureData('straight',2),flight=data.segments[0];if(flight.kind!=='flight')throw Error('fixture');flight.id='flight-fixed';flight.width='36';flight.steps.forEach(s=>Object.assign(s,{rise:'7',run:'10'}));
 data.site=newSiteModel();data.site.datum='Measured stair origin';
 data.site.objects=(['start','end'] as const).map(side=>Object.assign(newSiteObject('wall',`wall-${side}`,`${side} measured wall`),{x:'999',y:'888',z:'777',length:'666',depth:'6',height:'84',source:'tape',verified:true,wallAnchor:{segmentId:'flight-fixed',side,gap:'0',startExtension:'0',endExtension:'0',baseOffset:'0',checkedSignature:''}}));
 for(const wall of data.site.objects)wall.wallAnchor!.checkedSignature=wallAnchorSignature(data,wall);
 const rail=structuredClone(attachedFabricationFixture().site!.rails![0]);rail.id='between-walls';rail.label='Measured between anchored walls';rail.start={objectId:'wall-start',face:'near',along:.5,angle:0,elevation:'0',connection:'Shop detail A'};rail.end={objectId:'wall-end',face:'far',along:.5,angle:0,elevation:'0',connection:'Shop detail B'};data.site.rails=[rail];
 rail.checkedSignature=siteRailSignature(resolveSite(data),rail);rail.fabrication!.reviewedSignature=siteRailSignature(resolveSite(data),rail);
 return data;
}
function payload(data:MeasureData){return blenderPayload({id:'integration',source_updated_at:'2026-10-10T12:00:00.000Z',snapshot:{name:'Synthetic wall handoff',shape:'straight',data}} as DrawingRequest);}

it('uses the same resolved support faces, cuts and wall meshes across fabrication consumers',()=>{
 const data=fixture(),before=structuredClone(data),site=resolveSite(data)!,rail=site.rails![0],layout=siteRailLayout(site,rail)!,cuts=attachedCuts(site,rail,layout),out=payload(data);
 expect(cuts.issues).toEqual([]);expect(layout.horizontal).toBeCloseTo(20);expect(layout.rise).toBe(14);expect(resolveRailEnd(site,rail.start)?.x).toBeCloseTo(0);expect(resolveRailEnd(site,rail.end)?.x).toBeCloseTo(20);
 expect(out.site.meshes).toEqual(siteMeshes(site));expect(out.site.rails[0].layout).toEqual(layout);expect(out.site.rails[0].fabrication.parts).toEqual(cuts.parts);
 const sources=steelSources(data);expect(sources.length).toBe(cuts.parts.length);cuts.parts.forEach(p=>expect(sources.find(s=>s.key===`${rail.id}:${p.mark.split('-').at(-1)}`)?.length).toBe(p.stockLength));
 expect(drawingIssues(data)).not.toContain('siteRailLayoutOpen');expect(out.measurements.site).toEqual(before.site);expect(out.measurements.site!.objects[0].x).toBe('999');expect(data).toEqual(before);
});

it('updates cuts after measured support movement and rotates world geometry without changing physical cut lengths',()=>{
 const data=fixture(),initial=steelSources(data).find(s=>s.role==='toprail')!.length;
 const flight=data.segments[0];if(flight.kind!=='flight')throw Error('fixture');flight.steps[0].run='20';
 const grown=steelSources(data).find(s=>s.role==='toprail')!.length;expect(grown).toBeGreaterThan(initial);expect(resolveSite(data)!.objects.find(w=>w.id==='wall-end')!.verified).toBe(false);
 const before=payload(data);data.sceneSetup={environment:'exterior',projectType:'stairs',placement:{x:'120',y:'-30',z:'12',rotation:90}};const after=payload(data);
 expect(steelSources(data).find(s=>s.role==='toprail')!.length).toBeCloseTo(grown);
 for(const mesh of before.site.meshes){const moved=after.site.meshes.find(m=>m.id===mesh.id)!;mesh.vertices.forEach((p,i)=>{expect(moved.vertices[i].x).toBeCloseTo(120-p.y);expect(moved.vertices[i].y).toBeCloseTo(-30+p.x);expect(moved.vertices[i].z).toBeCloseTo(12+p.z);});}
 expect(after.site.rails[0].layout!.start.x).toBeCloseTo(120-before.site.rails[0].layout!.start.y);expect(after.measurements.site!.objects[0].x).toBe('999');
});

it('fails closed after anchored segment deletion, without stale support geometry or steel cuts',()=>{
 const data=fixture();expect(steelSources(data).length).toBeGreaterThan(0);data.segments.push({...newPlatformSegment(),id:'unrelated-platform'});removeSegment(data,0);const before=structuredClone(data),site=resolveSite(data)!,out=payload(data);
 expect(siteMeshes(site)).toEqual([]);expect(siteRailLayout(site,site.rails![0])).toBeNull();expect(steelSources(data)).toEqual([]);expect(out.site.meshes).toEqual([]);expect(out.site.rails[0].layout).toBeNull();expect(out.site.rails[0].fabrication.parts).toEqual([]);expect(out.issues.length).toBeGreaterThan(0);
 expect(out.measurements.site!.objects[0].wallAnchor!.segmentId).toBe('flight-fixed');expect(out.measurements.site!.objects[0].x).toBe('999');expect(data).toEqual(before);
});
