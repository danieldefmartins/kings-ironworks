import {expect,it} from 'vitest';
import {newMeasureData,normalizeMeasureData,insertSegment,removeSegment,newFlightSegment,newPlatformSegment,ensureSegmentIds} from './measure';
import {newSiteModel,newSiteObject,siteMesh,preserveSiteExtensions} from './measure-site';
import {wallPlacementEdges,resolveSite,previewWall,wallAnchorSignature} from './measure-wall-placement';
function fixture(){const d=newMeasureData('straight',2),s=d.segments[0];if(s.kind!=='flight')throw Error();s.width='36';s.steps.forEach(t=>{t.rise='7';t.run='10';});d.site=newSiteModel();const wall=newSiteObject('wall','wall','Side wall');Object.assign(wall,{depth:'6',height:'84',source:'tape',wallAnchor:{segmentId:'legacy-segment-1',side:'left',gap:'0',startExtension:'0',endExtension:'0',baseOffset:'0'}});d.site.objects.push(wall);return {d,wall};}
it('puts measured walls exactly outside all four measured edges without mutating field records',()=>{
 for(const side of ['left','right','start','end'] as const){const {d,wall}=fixture();wall.wallAnchor!.side=side;const before=JSON.stringify(d),resolved=resolveSite(d)!.objects[0],mesh=siteMesh(resolved)!;expect(mesh).toBeTruthy();expect(resolved.z).toBe(side==='end'?'14':'0');
 const xs=mesh.vertices.map(p=>p.x),ys=mesh.vertices.map(p=>p.y);
 if(side==='left'){expect(Math.min(...ys)).toBeCloseTo(-6);expect(Math.max(...ys)).toBeCloseTo(0);expect(resolved.length).toBe('20');}
 if(side==='right'){expect(Math.min(...ys)).toBeCloseTo(36);expect(Math.max(...ys)).toBeCloseTo(42);}
 if(side==='start'){expect(Math.min(...xs)).toBeCloseTo(-6);expect(Math.max(...xs)).toBeCloseTo(0);expect(resolved.length).toBe('36');}
 if(side==='end'){expect(Math.min(...xs)).toBeCloseTo(20);expect(Math.max(...xs)).toBeCloseTo(26);}
 expect(JSON.stringify(d)).toBe(before);}
});
it('follows measured width, run, translation and rotation while revoking prior verification',()=>{
 const {d,wall}=fixture();wall.verified=true;wall.wallAnchor!.checkedSignature=wallAnchorSignature(d,wall);expect(resolveSite(d)!.objects[0].verified).toBe(true);
 const before=siteMesh(resolveSite(d)!.objects[0])!;d.sceneSetup={environment:'exterior',projectType:'stairs',placement:{x:'120',y:'-24',z:'12',rotation:90}};
 const after=siteMesh(resolveSite(d)!.objects[0])!;after.vertices.forEach((p,i)=>{expect(p.x).toBeCloseTo(120-before.vertices[i].y);expect(p.y).toBeCloseTo(-24+before.vertices[i].x);expect(p.z).toBeCloseTo(12+before.vertices[i].z);});expect(resolveSite(d)!.objects[0].verified).toBe(false);
 const s=d.segments[0];if(s.kind!=='flight')throw Error();s.steps[0].run='15';wall.wallAnchor!.side='right';s.width='40';const result=resolveSite(d)!.objects[0];expect(Number(result.length)).toBeCloseTo(25);
});
it('separates draft previews from real hosts and never falls back to stale absolute coordinates',()=>{
 const {d,wall}=fixture();Object.assign(wall,{x:'999',y:'999',z:'999',length:'999',height:''});expect(previewWall(d,wall)).toBeTruthy();expect(siteMesh(resolveSite(d)!.objects[0])).toBeNull();expect(wall.height).toBe('');
 wall.height='84';wall.wallAnchor!.segmentId='deleted';expect(previewWall(d,wall)).toBeNull();expect(siteMesh(resolveSite(d)!.objects[0])).toBeNull();
 wall.wallAnchor!.segmentId='legacy-segment-1';const s=d.segments[0];if(s.kind!=='flight')throw Error();s.steps[0].run='';expect(wallPlacementEdges(d).every(e=>e.provisional)).toBe(true);expect(previewWall(d,wall)).toBeTruthy();expect(siteMesh(resolveSite(d)!.objects[0])).toBeNull();s.steps[0].winder=true;expect(wallPlacementEdges(d)).toEqual([]);
});
it('applies outward gaps, both extensions and signed base offsets from the recorded edge',()=>{
 const {d,wall}=fixture();Object.assign(wall.wallAnchor!,{gap:'2',startExtension:'3',endExtension:'4',baseOffset:'-5'});const r=resolveSite(d)!.objects[0];expect(Number(r.x)).toBeCloseTo(-3);expect(Number(r.y)).toBeCloseTo(-8);expect(Number(r.z)).toBe(-5);expect(Number(r.length)).toBe(27);
 wall.wallAnchor!.gap='-1';expect(siteMesh(resolveSite(d)!.objects[0])).toBeNull();
});
it('keeps stable identities through normalization, insertion and removal, retaining deleted hosts as unresolved',()=>{
 const {d,wall}=fixture();expect(normalizeMeasureData(d).segments[0].id).toBe('legacy-segment-1');ensureSegmentIds(d);insertSegment(d,0,newFlightSegment(1));expect(d.segments[1].id).toBe(wall.wallAnchor!.segmentId);removeSegment(d,0);expect(d.segments[0].id).toBe(wall.wallAnchor!.segmentId);expect(siteMesh(resolveSite(d)!.objects[0])).toBeTruthy();insertSegment(d,1,newPlatformSegment());removeSegment(d,0);expect(wall.wallAnchor!.segmentId).toBe('legacy-segment-1');expect(siteMesh(resolveSite(d)!.objects[0])).toBeNull();
});
it('keeps legacy absolute walls unchanged and preserves anchor metadata omitted by older clients',()=>{
 const {d,wall}=fixture(),copy=structuredClone(d.site!);delete copy.objects[0].wallAnchor;expect(preserveSiteExtensions(copy,d.site)!.objects[0].wallAnchor).toEqual(wall.wallAnchor);copy.objects[0].wallAnchor=null;expect(preserveSiteExtensions(copy,d.site)!.objects[0].wallAnchor).toBeNull();wall.wallAnchor=null;expect(resolveSite(d)!.objects[0]).toBe(wall);
});

import {newSiteRail,siteRailLayout} from './measure-site-rails';
it('updates attached-panel endpoints through the real wall host while preserving their stored attachment',()=>{
 const {d}=fixture(),column=Object.assign(newSiteObject('column','column','Column'),{x:'60',y:'-6',z:'0',length:'6',depth:'6',height:'84'}),rail=newSiteRail('panel','Panel');
 d.site!.objects.push(column);Object.assign(rail,{height:'36',bottomClearance:'2'});Object.assign(rail.start,{objectId:'wall',face:'right',elevation:'0'});Object.assign(rail.end,{objectId:'column',face:'left',elevation:'0'});d.site!.rails=[rail];const stored=JSON.stringify(rail);
 expect(siteRailLayout(resolveSite(d),rail)?.horizontal).toBeCloseTo(40);
 const flight=d.segments[0];if(flight.kind!=='flight')throw Error();flight.steps[0].run='15';expect(siteRailLayout(resolveSite(d),rail)?.horizontal).toBeCloseTo(35);expect(JSON.stringify(rail)).toBe(stored);
});

it('supports partial walls with signed trims and rejects inverted or zero-length spans',()=>{
 const {d,wall}=fixture();Object.assign(wall.wallAnchor!,{startExtension:'-3',endExtension:'-5'});let resolved=resolveSite(d)!.objects[0];expect(Number(resolved.x)).toBe(3);expect(Number(resolved.length)).toBe(12);expect(siteMesh(resolved)).toBeTruthy();
 wall.wallAnchor!.startExtension='-15';resolved=resolveSite(d)!.objects[0];expect(siteMesh(resolved)).toBeNull();expect(previewWall(d,wall)).toBeNull();
 wall.wallAnchor!.startExtension='-16';expect(siteMesh(resolveSite(d)!.objects[0])).toBeNull();
});

it.each([90,180,270,37])('keeps all four real wall meshes after rotation %s without exponent coordinates',rotation=>{
 for(const side of ['left','right','start','end'] as const){const {d,wall}=fixture();wall.wallAnchor!.side=side;wall.wallAnchor!.startExtension='-2';wall.wallAnchor!.endExtension='-2';d.sceneSetup={environment:'exterior',projectType:'stairs',placement:{x:'0',y:'0',z:'0',rotation}};const resolved=resolveSite(d)!.objects[0];expect(siteMesh(resolved)).not.toBeNull();for(const key of ['x','y','z','length'] as const)expect(resolved[key]).not.toMatch(/e[+-]/i);}
});
