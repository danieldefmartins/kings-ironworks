import {describe,it,expect} from 'vitest';
import {attachedPorchFixture} from './measure-site.fixture';
import {attachedCuts,newAttachedFab,attachedCutCsv} from './measure-attached-fab';
import {siteRailLayout,siteRailSignature,siteRailVerified,siteRailFabReviewed,siteRailProblems} from './measure-site-rails';
import {preserveSiteExtensions,siteNumber} from './measure-site';
function sample(rise=0){const d=attachedPorchFixture(),s=d.site!,r=s.rails![0];r.end.elevation=String(rise);r.fabrication={...newAttachedFab(),top:{width:'1 1/2',depth:'3/8',section:'solid',wall:''},bottom:{width:'1',depth:'1',section:'tube',wall:'1/8'},picket:{width:'1/2',depth:'1/2',section:'solid',wall:''},startGap:'1/16',endGap:'1/8',picketGap:'1/32',maxClear:'3 1/2',material:'Steel',welds:'Specified weld detail W1'};return {d,s,r};}
describe('attached straight panel fabrication',()=>{
 it.each([0,24,-16])('matches cut lengths to the actual member envelopes at rise %s',rise=>{
  const {s,r}=sample(rise),g=siteRailLayout(s,r)!,c=attachedCuts(s,r,g);expect(c.issues).toEqual([]);
  const dx=(g.end.x-g.start.x)/g.horizontal,dy=(g.end.y-g.start.y)/g.horizontal,cos=g.horizontal/g.length,sin=g.rise/g.length;
  for(const p of c.parts){
   const projected=p.vertices.map(v=>p.kind==='picket'?v.z:cos*(v.x*dx+v.y*dy)+sin*v.z);
   expect(Math.max(...projected)-Math.min(...projected)).toBeCloseTo(p.stockLength,8);
   expect(Math.max(...p.polygon.map(v=>v[0]))).toBeCloseTo(p.stockLength,8);
  }
  expect(c.clearGap).toBeGreaterThan(0);expect(c.clearGap).toBeLessThanOrEqual(3.5);
  expect(c.stations[0]-.0625-.25).toBeCloseTo(c.clearGap!);
  expect(64-.125-c.stations.at(-1)!-.25).toBeCloseTo(c.clearGap!);
  const top=c.parts[0];expect(top.vertices[0].x).toBeCloseTo(g.start.x+.0625);
  expect(top.vertices[4].x).toBeCloseTo(g.end.x-.125);
  const p=c.parts.find(p=>p.kind==='picket')!;
  for(const v of p.vertices.slice(0,4)){const along=v.x-g.start.x;expect(v.z).toBeCloseTo(g.start.z+along*rise/64+2+1/cos+1/32);}
 });
 it('preserves cut geometry when the complete site rotates in plan',()=>{
  const {s,r}=sample(24),before=attachedCuts(s,r,siteRailLayout(s,r)),a=Math.PI/4;
  for(const host of s.objects){const x=siteNumber(host.x)!,y=siteNumber(host.y)!;host.x=String(x*Math.cos(a)-y*Math.sin(a));host.y=String(x*Math.sin(a)+y*Math.cos(a));host.rotation+=45;}
  const after=attachedCuts(s,r,siteRailLayout(s,r));expect(after.issues).toEqual([]);
  after.parts.forEach((p,i)=>{expect(p.stockLength).toBeCloseTo(before.parts[i].stockLength);p.vertices.forEach((v,j)=>{const old=before.parts[i].vertices[j];expect(v.x).toBeCloseTo(old.x*Math.cos(a)-old.y*Math.sin(a));expect(v.y).toBeCloseTo(old.x*Math.sin(a)+old.y*Math.cos(a));expect(v.z).toBeCloseTo(old.z);});});
 });
 it('does not guess dimensions or cut oblique and round support connections',()=>{
  const {s,r}=sample();r.fabrication!.startGap='';expect(attachedCuts(s,r,siteRailLayout(s,r)).parts).toEqual([]);r.fabrication!.startGap='0';
  s.objects[0].rotation=5;expect(attachedCuts(s,r,siteRailLayout(s,r)).issues).toContain('siteRailFabFaces');
  s.objects[0].rotation=0;s.objects[1].section='round';r.start.face='radial';expect(attachedCuts(s,r,siteRailLayout(s,r)).issues).toContain('siteRailFabFaces');
 });
 it('rejects invalid tubes and infill that cannot fit or exceeds limits',()=>{
  const {s,r}=sample();r.fabrication!.bottom.wall='1/2';expect(attachedCuts(s,r,siteRailLayout(s,r)).parts).toEqual([]);
  r.fabrication!.bottom.wall='1/8';r.fabrication!.picket.depth='2';expect(attachedCuts(s,r,siteRailLayout(s,r)).issues).toContain('siteRailFabFit');
  r.fabrication!.picket.depth='1/2';r.fabrication!.maxClear='1/32';r.fabrication!.picket.width='1/32';expect(attachedCuts(s,r,siteRailLayout(s,r)).issues).toContain('siteRailFabCount');
 });
 it('requires independent field and shop checks and invalidates both when a gap changes',()=>{
  const {s,r}=sample();r.checkedSignature=siteRailSignature(s,r);expect(siteRailProblems(s,r)).toContain('siteRailFabReview');
  r.fabrication!.reviewedSignature=siteRailSignature(s,r);expect(siteRailFabReviewed(s,r)).toBe(true);expect(siteRailProblems(s,r)).toEqual([]);
  r.fabrication!.startGap='1/4';expect(siteRailVerified(s,r)).toBe(false);expect(siteRailFabReviewed(s,r)).toBe(false);
 });
 it('preserves fabrication fields omitted by older tabs and produces an explicit draft CSV',()=>{
  const {s,r}=sample(),old=structuredClone(s);delete old.rails![0].fabrication;
  expect(preserveSiteExtensions(old,s)?.rails![0].fabrication).toEqual(r.fabrication);
  const csv=attachedCutCsv(attachedCuts(s,r,siteRailLayout(s,r)).parts);expect(csv).toContain('DRAFT - SHOP REVIEW REQUIRED');expect(csv).toContain('Minimum stock length');expect(csv).toContain('SR1-T');
 });
});
