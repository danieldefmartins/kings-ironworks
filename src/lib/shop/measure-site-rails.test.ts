import {describe,expect,it} from 'vitest';
import {attachedPorchFixture} from './measure-site.fixture';
import {SiteModelSchema,preserveSiteExtensions} from './measure-site';
import {newSiteRail,resolveRailEnd,siteRailLayout,siteRailProblems,siteRailSignature,siteRailVerified} from './measure-site-rails';
import {normalizeMeasureData} from './measure';
import {blenderPayload,type DrawingRequest} from './shop-drawings';
import {drawingIssues} from './measure-drawing';

describe('attached railing references',()=>{
 it('preserves attachments omitted by older clients while allowing explicit removal',()=>{
  const existing=attachedPorchFixture().site!;const old={...existing};delete old.rails;
  expect(preserveSiteExtensions(old,existing)?.rails).toEqual(existing.rails);
  expect(preserveSiteExtensions(undefined,existing)).toEqual(existing);
  expect(preserveSiteExtensions({...old,rails:[]},existing)?.rails).toEqual([]);
  expect(old.rails).toBeUndefined();
 });
 it('follows host translation and resizing while preserving connection records',()=>{
  const d=attachedPorchFixture(),s=d.site!,r=s.rails![0];
  expect(siteRailLayout(s,r)?.horizontal).toBe(64);
  expect(resolveRailEnd(s,r.start)).toEqual({x:52,y:-20,z:28});
  s.objects[0].x='126';expect(siteRailLayout(s,r)?.horizontal).toBe(74);
  s.objects[1].length='10';expect(siteRailLayout(s,r)?.horizontal).toBe(72);
  expect(r.start.connection).toContain('Bracket to column');
 });
 it('resolves rotated local faces and signed fractional floor elevations',()=>{
  const d=attachedPorchFixture(),s=d.site!,r=s.rails![0];s.objects[1].rotation=90;r.start.elevation='-1 1/2';
  const p=resolveRailEnd(s,r.start)!;expect(p.x).toBeCloseTo(40);expect(p.y).toBeCloseTo(-16);expect(p.z).toBe(26.5);
 });
 it('attaches to the true circumference of a round column',()=>{
  const d=attachedPorchFixture(),s=d.site!,r=s.rails![0];s.objects[1].section='round';r.start.face='radial';r.start.angle=45;
  const p=resolveRailEnd(s,r.start)!;expect(Math.hypot(p.x-48,p.y+20)).toBeCloseTo(4);
  r.start.face='near';expect(resolveRailEnd(s,r.start)).toBeNull();
 });
 it('does not invent missing dimensions or reconnect a deleted host',()=>{
  const d=attachedPorchFixture(),s=d.site!,r=s.rails![0];
  expect(siteRailLayout(s,newSiteRail('new','New'))).toBeNull();
  r.start.elevation='';expect(siteRailLayout(s,r)).toBeNull();r.start.elevation='0';
  s.objects=s.objects.filter(o=>o.id!==r.start.objectId);expect(siteRailLayout(s,r)).toBeNull();
  expect(r.start.objectId).toBe('column-1');expect(siteRailProblems(s,r)).toContain('siteRailGeometryOpen');
 });
 it('invalidates verification after host or railing changes, even if the host is reverified',()=>{
  const d=attachedPorchFixture(),s=d.site!,r=s.rails![0];r.checkedSignature=siteRailSignature(s,r);
  expect(siteRailVerified(s,r)).toBe(true);s.objects[0].x='120';expect(siteRailVerified(s,r)).toBe(false);
  r.checkedSignature=siteRailSignature(s,r);expect(siteRailVerified(s,r)).toBe(true);
  r.height='42';expect(siteRailVerified(s,r)).toBe(false);
  r.checkedSignature=siteRailSignature(s,r);s.datum='Another reference';expect(siteRailVerified(s,r)).toBe(false);
 });
 it('rejects impossible panels and flags attachments beyond host height',()=>{
  const d=attachedPorchFixture(),s=d.site!,r=s.rails![0];r.bottomClearance='36';expect(siteRailLayout(s,r)).toBeNull();
  r.bottomClearance='2';r.height='90';expect(siteRailProblems(s,r)).toContain('siteRailSupportOpen');
  r.end={...r.start};expect(siteRailLayout(s,r)).toBeNull();
 });
 it('keeps fabrication unresolved even for a field-verified reference panel',()=>{
  const d=attachedPorchFixture(),s=d.site!,r=s.rails![0];r.checkedSignature=siteRailSignature(s,r);
  expect(siteRailProblems(s,r)).toEqual(['siteRailFabricationOpen']);
  expect(drawingIssues(d)).toContain('siteRailFabricationOpen');
 });
 it('retains references in normalization and drawing snapshots, with strict limits',()=>{
  const d=attachedPorchFixture();expect(normalizeMeasureData(d).site).toEqual(d.site);
  const payload=blenderPayload({id:'sample',snapshot:{name:'Sample',shape:'stair_platform',data:d},source_updated_at:'2026-10-10'} as DrawingRequest);
  expect(payload.site.rails[0].layout?.horizontal).toBe(64);expect(payload.site.rails[0].source).toEqual(d.site!.rails![0]);
  expect(SiteModelSchema.safeParse(d.site).success).toBe(true);
  d.site!.rails!.push(structuredClone(d.site!.rails![0]));expect(SiteModelSchema.safeParse(d.site).success).toBe(false);
 });
});
