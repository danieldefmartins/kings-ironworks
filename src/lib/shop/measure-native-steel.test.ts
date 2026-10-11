import {expect,it} from 'vitest';
import {parseNativeCutSources} from './measure-native-steel';
const context={sourceUpdatedAt:'2026-10-10T12:00:00Z',currentUpdatedAt:'2026-10-10T12:00:00Z',signature:'saved-measurements'};
function fixture(){return {members:[{mark:'F01-L-T',kind:'Top rail',profile:'1 1/2 x 3/8',provisional:false,length:80},{mark:'P1',kind:'Post',profile:'1 x 1',provisional:false,length:36},{mark:'B1',kind:'Bottom rail',profile:'1 x 1',provisional:true,length:70}],sections:[{mark:'F01-L',issues:[]}],cut_parts:[{mark:'F01-L-T',section:'F01-L',profile:'1 1/2 x 3/8',stock_length:83.25}],post_cuts:[{mark:'P1',profile:'1 x 1',stockLength:42.5}]};}
it('imports fitted stock cuts and post embedment, never reference lengths',()=>{
 const result=parseNativeCutSources(fixture(),context);expect(result.sources.map(s=>s.length)).toEqual([83.25,42.5]);expect(result.pending).toEqual(['B1']);expect(result.sources[1].role).toBe('post');expect(result.sources[0].signature).toBe(context.signature);
});
it('rejects stale revisions, invalid lengths, duplicates and unmatched cuts',()=>{
 expect(()=>parseNativeCutSources(fixture(),{...context,currentUpdatedAt:'2026-10-10T12:00:01Z'})).toThrow(/changed/);
 const f=fixture();f.cut_parts[0].stock_length=-1;expect(()=>parseNativeCutSources(f,context)).toThrow(/invalid/);
 const duplicate=fixture();duplicate.cut_parts.push(duplicate.cut_parts[0]);expect(()=>parseNativeCutSources(duplicate,context)).toThrow(/duplicate/);
 const unmatched=fixture();unmatched.post_cuts[0].mark='missing';expect(()=>parseNativeCutSources(unmatched,context)).toThrow(/matching/);
});
it('keeps provisional or unresolved section cuts pending and excludes attached duplicates',()=>{
 const f=fixture();f.sections[0].issues.push('Check fit' as never);expect(parseNativeCutSources(f,context).sources.map(s=>s.key)).toEqual(['native:P1']);
 const g=fixture();g.members.push({mark:'SR1-T',kind:'Attached Top rail',profile:'1 x 1',provisional:false,length:64});
 const input={...g,cut_parts:[...g.cut_parts,{mark:'SR1-T',profile:'1 x 1',stock_length:64,attached:true}]};
 const result=parseNativeCutSources(input,context);expect(result.sources).toHaveLength(2);expect(result.pending).not.toContain('SR1-T');
});

import {nativeGeometrySignature} from './measure-native-steel';
it('canonical snapshot ignores stock assignments and cache but invalidates geometry edits',()=>{
 const data={segments:[{width:'36',run:'10'}],steelPlan:{rows:[]},nativeSteel:{signature:'old'}};
 expect(nativeGeometrySignature(data)).toBe(nativeGeometrySignature({segments:[{run:'10',width:'36'}],steelPlan:{rows:['new']}}));
 expect(nativeGeometrySignature(data)).not.toBe(nativeGeometrySignature({...data,segments:[{width:'37',run:'10'}]}));
});

it('imports only validated outside profile dimensions, without inferring solid or tube',()=>{
 const f=fixture(),input={...f,members:f.members.map(m=>({...m,section:{width:1.5,depth:.375,round:false,spec:'private unused text',wall:.125}}))};
 const result=parseNativeCutSources(input,context);
 expect(result.sources[0].envelope).toEqual({width:1.5,depth:.375,round:false});
 expect(parseNativeCutSources(f,context).sources[0].envelope).toBeUndefined();
 input.members[0].section.width=-1;expect(()=>parseNativeCutSources(input,context)).toThrow(/invalid/);
});

it('does not stale existing native cuts when stable segment identifiers are introduced',()=>{
 const original={segments:[{kind:'flight',width:'48',steps:[{rise:'7',run:'11'}]}],posts:[{id:'p1'}]};
 expect(nativeGeometrySignature({...original,segments:original.segments.map(s=>({...s,id:'stable-flight'}))})).toBe(nativeGeometrySignature(original));
 expect(nativeGeometrySignature({...original,posts:[{id:'p2'}]})).not.toBe(nativeGeometrySignature(original));
});
it('invalidates old platform caches while preserving unrelated legacy signature bytes',()=>{
 const platform={segments:[{kind:'platform',length:'48'}]};const legacy=JSON.stringify(platform);expect(nativeGeometrySignature(platform)).not.toBe(legacy);expect(nativeGeometrySignature(platform)).toContain('platformGeometryRevision');
 const flight={segments:[{kind:'flight',steps:[]}]};expect(nativeGeometrySignature(flight)).toBe(JSON.stringify(flight));
 expect(nativeGeometrySignature(platform)).not.toBe(nativeGeometrySignature({segments:[{kind:'platform',length:'48',entryRise:'0'}]}));
});
