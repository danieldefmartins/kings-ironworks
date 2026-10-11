import {z} from 'zod';

const mark=z.string().min(1).max(120);
const length=z.number().finite().positive().max(12000);
const envelopeSchema=z.object({width:z.number().finite().positive().max(24),depth:z.number().finite().positive().max(24),round:z.boolean()});
const member=z.object({mark,kind:z.string().max(80),profile:z.string().max(240),provisional:z.boolean(),section:envelopeSchema.nullable().optional()});
const cut=z.object({mark,profile:z.string().max(240),stock_length:length,attached:z.boolean().optional(),section:z.string().max(120).optional(),kind:z.string().max(80).optional(),quantity:z.literal(1).optional()});
const postCut=z.object({mark,profile:z.string().max(240),stockLength:length,section:z.string().max(120).optional()});
const schema=z.object({members:z.array(member).max(10000),cut_parts:z.array(cut).max(10000).optional(),post_cuts:z.array(postCut).max(10000).optional(),sections:z.array(z.object({mark,issues:z.array(z.string().max(2000)).max(200)})).max(1000).optional()});
export type NativeSteelSource={key:string;label:string;role:string;length:number;profile:string;signature:string;envelope?:z.infer<typeof envelopeSchema>};
/** Consume only the worker's fitted cuts, never its reference-axis member lengths.
 * Caller authorizes the sheet/job and binds signature to the saved measurement snapshot.
 * Older or provisional drawing packages cannot silently become an order takeoff. */
export function parseNativeCutSources(assembly:unknown,context:{sourceUpdatedAt:string;currentUpdatedAt:string;signature:string}):{sources:NativeSteelSource[];pending:string[]}{
 const source=Date.parse(context.sourceUpdatedAt),current=Date.parse(context.currentUpdatedAt);
 if(!Number.isFinite(source)||!Number.isFinite(current)||source!==current||context.sourceUpdatedAt!==context.currentUpdatedAt||!context.signature)throw new Error('Drawing measurements have changed. Generate a new drawing before importing cuts.');
 const parsed=schema.safeParse(assembly);
 if(!parsed.success)throw new Error('Drawing package contains invalid cut records. Generate a new drawing.');
 const data=parsed.data,members=new Map<string,z.infer<typeof member>>(),seen=new Set<string>(),sources:NativeSteelSource[]=[],pending=new Set<string>();
 for(const m of data.members){if(members.has(m.mark))throw new Error('Drawing package contains duplicate member marks.');members.set(m.mark,m);}
 const blocked=new Set((data.sections||[]).filter(s=>s.issues.length).map(s=>s.mark));
 const roles:Record<string,string>={'Top rail':'toprail','Bottom rail':'bottomrail','Picket':'picket','Post':'post','Newel post':'newel'};
 const records=[...(data.cut_parts||[]).filter(c=>!c.attached).map(c=>({...c,length:c.stock_length})),...(data.post_cuts||[]).map(c=>({...c,length:c.stockLength}))];
 for(const c of records){
  if(seen.has(c.mark))throw new Error('Drawing package contains duplicate cut marks.');seen.add(c.mark);
  const m=members.get(c.mark);
  if(!m)throw new Error('Drawing cut has no matching member.');
  if(m.provisional||(c.section&&blocked.has(c.section))||!roles[m.kind]){pending.add(c.mark);continue;}
  if(c.profile!==m.profile||!c.profile.trim()||c.profile==='VERIFY')throw new Error('Drawing cut profile does not match its member.');
  sources.push({key:`native:${c.mark}`,label:c.mark,role:roles[m.kind],length:c.length,profile:c.profile,signature:context.signature,...(m.section?{envelope:m.section}:{})});
 }
 for(const m of data.members)if(!m.kind.startsWith('Attached ')&&!sources.some(s=>s.key===`native:${m.mark}`))pending.add(m.mark);
 return {sources,pending:[...pending]};
}

const sourceSchema=z.object({key:z.string().max(140),label:mark,role:z.string().max(60),length,profile:z.string().max(240),signature:z.string().max(500000),envelope:envelopeSchema.optional()});
export const NativeSteelSnapshotSchema=z.object({signature:z.string().max(500000),sourceUpdatedAt:z.string().max(60),drawingId:z.string().uuid(),sources:z.array(sourceSchema).max(10000),pending:z.array(mark).max(10000)});
export type NativeSteelSnapshot=z.infer<typeof NativeSteelSnapshotSchema>;
/** Stable snapshot of geometry only; assigning stock and importing cuts do not invalidate it. */
export function nativeGeometrySignature(data:Record<string,unknown>|object):string{
 const omitted=new Set(['steelPlan','nativeSteel']);
 const canonical=(value:unknown):unknown=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>[k,canonical(v)])):value;
 // Segment IDs identify wall anchors; adding them to legacy records does not change native cuts.
 const physical=Object.fromEntries(Object.entries(data).filter(([k])=>!omitted.has(k)).map(([k,v])=>[k,k==='segments'&&Array.isArray(v)?v.map(segment=>Object.fromEntries(Object.entries(segment).filter(([key])=>key!=='id'))):v]));
 return JSON.stringify(canonical(physical));
}
