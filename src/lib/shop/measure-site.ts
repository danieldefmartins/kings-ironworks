import { z } from 'zod';
import type { Point3 } from './measure-geometry';
import { parseMeas } from './measure-parse';

const dimension = z.string().max(40);
export const SiteObjectSchema = z.object({
  id: z.string().min(1).max(60),
  kind: z.enum(['wall', 'column', 'post', 'slab', 'opening', 'obstruction']),
  label: z.string().min(1).max(80),
  section: z.enum(['rectangular', 'round']),
  x: dimension, y: dimension, z: dimension,
  length: dimension, depth: dimension, height: dimension,
  rotation: z.number().finite().min(-360).max(360),
  // Rise across the local X/Y footprint; zero must be entered explicitly.
  riseX: dimension, riseY: dimension,
  source: z.enum(['tape', 'laser', 'drawing', 'scan', 'unknown']),
  verified: z.boolean(),
  notes: z.string().max(1000),
  photoPaths: z.array(z.string().max(300)).max(20),
});
export const SiteModelSchema = z.object({
  version: z.literal(1),
  datum: z.string().max(300),
  objects: z.array(SiteObjectSchema).max(100),
}).superRefine((site, ctx) => {
  if (new Set(site.objects.map(o => o.id)).size !== site.objects.length)
    ctx.addIssue({code: 'custom', message: 'Site object IDs must be unique', path: ['objects']});
});
export type SiteObject = z.infer<typeof SiteObjectSchema>;
export type SiteModel = z.infer<typeof SiteModelSchema>;
export type SiteMesh = {id: string; label: string; kind: SiteObject['kind']; vertices: Point3[]; faces: number[][]; provisional: boolean};
export const newSiteModel = (): SiteModel => ({version: 1, datum: '', objects: []});
export function newSiteObject(kind: SiteObject['kind'], id: string, label: string): SiteObject {
  return {id, kind, label, section: 'rectangular', x: '', y: '', z: '', length: '', depth: '', height: '', rotation: 0, riseX: '0', riseY: '0', source: 'unknown', verified: false, notes: '', photoPaths: []};
}

/** Signed coordinates retain the same feet/fraction syntax as field dimensions. */
export function siteNumber(text: string): number | null {
  const negative = text.trim().startsWith('-');
  const n = parseMeas(text.trim().replace(/^[+-]/, ''));
  return n === null || !Number.isFinite(n) || Math.abs(n) > 120000 ? null : (negative ? -n : n);
}

export function siteObjectProblems(o: SiteObject): string[] {
  const problems: string[] = [];
  for (const field of ['x', 'y', 'z', 'riseX', 'riseY'] as const)
    if (siteNumber(o[field]) === null) problems.push(field);
  for (const field of ['length', 'height', ...(o.section === 'round' ? [] : ['depth'])] as ('length'|'height'|'depth')[]) {
    const n = siteNumber(o[field]);
    if (n === null || n <= 0) problems.push(field);
  }
  // Slab top may slope but cannot pass below its bottom face.
  if (o.kind === 'slab') {
    const h = siteNumber(o.height), a = siteNumber(o.riseX), b = siteNumber(o.riseY);
    if (h !== null && a !== null && b !== null && h + Math.min(0,a) + Math.min(0,b) <= 0) problems.push('slope');
  }
  return problems;
}

/** Real inch geometry only. Incomplete objects are listed, never given invented dimensions. */
export function siteMesh(o: SiteObject): SiteMesh | null {
  if (siteObjectProblems(o).length) return null;
  const x = siteNumber(o.x)!, y = siteNumber(o.y)!, z = siteNumber(o.z)!;
  const length = siteNumber(o.length)!, depth = o.section === 'round' ? length : siteNumber(o.depth)!;
  const height = siteNumber(o.height)!, angle = o.rotation * Math.PI / 180;
  const riseX = o.kind === 'slab' ? siteNumber(o.riseX)! : 0;
  const riseY = o.kind === 'slab' ? siteNumber(o.riseY)! : 0;
  const local = o.section === 'round'
    ? Array.from({length: 24}, (_,i) => {const t=i*Math.PI/12; return {x:length/2+Math.cos(t)*length/2,y:depth/2+Math.sin(t)*depth/2};})
    : [{x:0,y:0},{x:length,y:0},{x:length,y:depth},{x:0,y:depth}];
  const vertices = [false,true].flatMap(top => local.map(p => ({
    x:x+p.x*Math.cos(angle)-p.y*Math.sin(angle), y:y+p.x*Math.sin(angle)+p.y*Math.cos(angle),
    z:z+(top ? height+riseX*p.x/length+riseY*p.y/depth : 0),
  })));
  const n = local.length;
  const faces = [Array.from({length:n},(_,i)=>n-1-i),Array.from({length:n},(_,i)=>n+i),...local.map((_,i)=>[i,(i+1)%n,(i+1)%n+n,i+n])];
  return {id:o.id,label:o.label,kind:o.kind,vertices,faces,provisional:!o.verified};
}
export function siteMeshes(site?: SiteModel): SiteMesh[] {
  return (site?.objects || []).flatMap(o => {const m=siteMesh(o);return m?[m]:[];});
}
export function siteIssues(site?: SiteModel): string[] {
  if (!site?.objects.length) return [];
  const issues: string[] = [];
  if (!site.datum.trim()) issues.push('siteDatumOpen');
  if (site.objects.some(o => siteObjectProblems(o).length)) issues.push('siteDimensionsOpen');
  if (site.objects.some(o => !o.verified || o.source === 'unknown')) issues.push('siteVerificationOpen');
  return issues;
}

/** Any changed observation invalidates that object's previous verification. */
export function editSiteObject(o: SiteObject, patch: Partial<SiteObject>): SiteObject {
  return {...o,...patch,id:o.id,verified:false};
}
export function pointDistance(a: Point3, b: Point3) {
  return {horizontal:Math.hypot(b.x-a.x,b.y-a.y),vertical:b.z-a.z,distance:Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)};
}
