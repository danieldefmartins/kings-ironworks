import { z } from 'zod';
import { SiteRailSchema } from './measure-site-rails-schema';
import type { Point3 } from './measure-geometry';
import { parseMeas } from './measure-parse';
import { SubstrateSchema } from './measure-substrate-schema';

const dimension = z.string().max(40);
export const SiteObjectSchema = z.object({
  id: z.string().min(1).max(60),
  wallAnchor:z.object({segmentId:z.string().min(1).max(80),side:z.enum(['left','right','start','end']),gap:dimension,startExtension:dimension,endExtension:dimension,baseOffset:dimension,checkedSignature:z.string().max(24000).optional()}).nullable().optional(),
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
  material: z.string().max(120).optional(),
  /** Shared mounting substrate (measure-substrate.ts); `material` stays in step. */
  substrate: SubstrateSchema.optional(),
  /** A column: already on site, or one the shop fabricates. Absent = existing. */
  origin: z.enum(['existing', 'new']).optional(),
  /** Base molding / block: how far it stands out on each side, and how tall it is. */
  baseProjection: dimension.optional(), baseHeight: dimension.optional(),
  /** Cap block at the top, same two numbers. */
  capProjection: dimension.optional(), capHeight: dimension.optional(),
  notes: z.string().max(1000),
  photoPaths: z.array(z.string().max(300)).max(20),
});
export const SiteModelSchema = z.object({
  version: z.literal(1),
  datum: z.string().max(300),
  objects: z.array(SiteObjectSchema).max(100),
  rails: z.array(SiteRailSchema).max(100).optional(),
}).superRefine((site, ctx) => {
  if (new Set((site.rails||[]).map(r => r.id)).size !== (site.rails||[]).length)
    ctx.addIssue({code:'custom',message:'Attached railing IDs must be unique',path:['rails']});
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
/**
 * The wider block at the foot of a column (base molding) and at its top (cap):
 * display geometry in the same frame as siteMesh. Null when none is recorded.
 */
export function siteTrim(o: SiteObject): {vertices: Point3[]; faces: number[][]} | null {
  if (o.kind !== 'column' && o.kind !== 'post') return null;
  const x = siteNumber(o.x), y = siteNumber(o.y), z = siteNumber(o.z), length = siteNumber(o.length), height = siteNumber(o.height);
  const depth = o.section === 'round' ? length : siteNumber(o.depth);
  if (x === null || y === null || z === null || !length || !depth || !height || length < 0 || depth < 0 || height < 0) return null;
  const angle = o.rotation * Math.PI / 180, vertices: Point3[] = [], faces: number[][] = [];
  const block = (projection: string | undefined, tall: string | undefined, top: boolean) => {
    const p = siteNumber(projection || ''), h = siteNumber(tall || '');
    if (p === null || h === null || p <= 0 || h <= 0 || h > height) return;
    const ring = o.section === 'round'
      ? Array.from({length: 24}, (_, i) => {const t = i * Math.PI / 12; return {x: length / 2 + Math.cos(t) * (length / 2 + p), y: depth / 2 + Math.sin(t) * (depth / 2 + p)};})
      : [{x: -p, y: -p}, {x: length + p, y: -p}, {x: length + p, y: depth + p}, {x: -p, y: depth + p}];
    const at = vertices.length, n = ring.length, z0 = top ? z + height - h : z;
    for (const zz of [z0, z0 + h]) for (const q of ring) vertices.push({x: x + q.x * Math.cos(angle) - q.y * Math.sin(angle), y: y + q.x * Math.sin(angle) + q.y * Math.cos(angle), z: zz});
    faces.push(Array.from({length: n}, (_, i) => at + n - 1 - i), Array.from({length: n}, (_, i) => at + n + i), ...ring.map((_, i) => [at + i, at + (i + 1) % n, at + (i + 1) % n + n, at + i + n]));
  };
  block(o.baseProjection, o.baseHeight, false);
  block(o.capProjection, o.capHeight, true);
  return vertices.length ? {vertices, faces} : null;
}
/** A mesh with its base / cap blocks joined on, for drawing only: measured anchors and cuts keep reading siteMesh. */
export function withSiteTrim<M extends {vertices: Point3[]; faces: number[][]}>(mesh: M, o: SiteObject): M {
  const trim = siteTrim(o);
  if (!trim) return mesh;
  const at = mesh.vertices.length;
  return {...mesh, vertices: [...mesh.vertices, ...trim.vertices], faces: [...mesh.faces, ...trim.faces.map(f => f.map(i => i + at))]};
}
/** What the shop cuts for a column it makes: the shaft, and the base and cap blocks when it has them. */
export function newColumnParts(site?: SiteModel): {key: string; label: string; length: number; width: number; depth: number; round: boolean; signature: string}[] {
  return (site?.objects || []).flatMap(o => {
    if (o.kind !== 'column' || o.origin !== 'new' || siteObjectProblems(o).length) return [];
    const w = siteNumber(o.length)!, d = o.section === 'round' ? w : siteNumber(o.depth)!, h = siteNumber(o.height)!, round = o.section === 'round';
    const signature = JSON.stringify([o.section, o.length, o.depth, o.height, o.baseProjection, o.baseHeight, o.capProjection, o.capHeight]);
    const block = (projection: string | undefined, tall: string | undefined) => {const p = siteNumber(projection || ''), t = siteNumber(tall || ''); return p !== null && t !== null && p > 0 && t > 0 && t < h ? {p, t} : null;};
    const base = block(o.baseProjection, o.baseHeight), cap = block(o.capProjection, o.capHeight);
    const parts = [{key: `column:${o.id}:shaft`, label: `${o.label} · shaft`, length: h - (base?.t || 0) - (cap?.t || 0), width: w, depth: d, round, signature}];
    if (base) parts.push({key: `column:${o.id}:base`, label: `${o.label} · base`, length: base.t, width: w + 2 * base.p, depth: d + 2 * base.p, round, signature});
    if (cap) parts.push({key: `column:${o.id}:cap`, label: `${o.label} · cap`, length: cap.t, width: w + 2 * cap.p, depth: d + 2 * cap.p, round, signature});
    return parts.filter(p => p.length > 0);
  });
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

/** Old clients omit new optional fields. An explicit [] still means intentional removal. */
export function preserveSiteExtensions(incoming:SiteModel|undefined,existing:SiteModel|undefined):SiteModel|undefined {
  if(!incoming)return existing;
  const objects=incoming.objects.map(o=>{const stored=existing?.objects.find(p=>p.id===o.id);return {...o,...(o.wallAnchor===undefined&&stored?.wallAnchor!==undefined?{wallAnchor:stored.wallAnchor}:{}),...(o.material===undefined&&stored?.material!==undefined?{material:stored.material}:{}),...Object.fromEntries((['origin','baseProjection','baseHeight','capProjection','capHeight'] as const).flatMap(k=>o[k]===undefined&&stored?.[k]!==undefined?[[k,stored[k]]]:[])),...(o.substrate===undefined&&stored?.substrate!==undefined?{substrate:stored.substrate}:{})};});
  const rails=incoming.rails===undefined?existing?.rails:incoming.rails.map(r=>{
    const stored=existing?.rails?.find(old=>old.id===r.id);
    if(r.fabrication===undefined&&stored?.fabrication)return {...r,fabrication:stored.fabrication};
    if(r.fabrication&&stored?.fabrication?.secondTop!==undefined&&r.fabrication.secondTop===undefined)return {...r,fabrication:{...r.fabrication,secondTop:stored.fabrication.secondTop}};
    return r;
  });
  return {...incoming,objects,...(rails!==undefined?{rails}:{})};
}
