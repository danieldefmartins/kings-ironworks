// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
import {newMeasureData} from '@/lib/shop/measure';
const m=vi.hoisted(()=>({session:vi.fn(),select:vi.fn(),url:vi.fn(),zip:vi.fn()}));
vi.mock('@/lib/shop/session',()=>({getSessionWorker:m.session}));
vi.mock('@/lib/shop/db',()=>({ORG_ID:'tenant',sbSelect:m.select}));
vi.mock('@/lib/shop/drawing-storage',()=>({drawingDownloadUrl:m.url}));
vi.mock('@/lib/shop/drawing-assembly-zip',()=>({drawingAssemblyZip:m.zip}));
import {GET} from './route';
const id='a0000000-0000-4000-8000-000000000001',updated='2026-10-10T12:00:00.000000Z';
const request=()=>GET(new NextRequest(`https://shop.test/shop/api/shop-drawings/native-cuts?sheet=${id}`));
beforeEach(()=>{vi.resetAllMocks();m.session.mockResolvedValue({id});const data=newMeasureData('straight',2);m.select.mockResolvedValueOnce([{id,job_id:id,updated_at:updated,shape:'straight',data}]).mockResolvedValueOnce([{id,job_id:id,sheet_id:id,status:'ready',source_updated_at:updated,artifact_path:`tenant/${id}/drawing.zip`,snapshot:{shape:'straight',data}}]).mockResolvedValueOnce([{updated_at:updated}]);m.url.mockResolvedValue('https://storage.test/private');vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('zip')));m.zip.mockReturnValue({members:[{mark:'P1',kind:'Post',profile:'1 x 1',provisional:false}],post_cuts:[{mark:'P1',profile:'1 x 1',stockLength:42}]});});
it('authenticates before reading tenant data',async()=>{m.session.mockResolvedValue(null);expect((await request()).status).toBe(401);expect(m.select).not.toHaveBeenCalled();});
it('returns only validated geometry and keeps all queries tenant scoped',async()=>{const r=await request(),body=await r.json();expect(r.status).toBe(200);expect(body.snapshot.sources[0]).toMatchObject({key:'native:P1',length:42,signature:id});expect(body.snapshot.pending).toEqual([]);expect(body.snapshot.signature).toContain('segments');for(const call of m.select.mock.calls)expect(call[1]).toContain('org_id=eq.tenant');});
it('rejects old drawings before fetching private artifacts',async()=>{m.select.mockReset().mockResolvedValueOnce([{id,job_id:id,updated_at:updated,shape:'straight',data:newMeasureData('straight',2)}]).mockResolvedValueOnce([]);expect((await request()).status).toBe(409);expect(m.url).not.toHaveBeenCalled();});
it('rejects a concurrent save during artifact download',async()=>{m.select.mockReset().mockResolvedValueOnce([{id,job_id:id,updated_at:updated,shape:'straight',data:newMeasureData('straight',2)}]).mockResolvedValueOnce([{id,source_updated_at:updated,artifact_path:`tenant/${id}/drawing.zip`,snapshot:{shape:'straight',data:newMeasureData('straight',2)}}]).mockResolvedValueOnce([{updated_at:'changed'}]);expect((await request()).status).toBe(409);});

it('accepts the status-only revision made by drawing submission',async()=>{
 const data=newMeasureData('straight',2),submitted='2026-10-10T12:00:01.000000Z';
 m.select.mockReset().mockResolvedValueOnce([{id,job_id:id,updated_at:submitted,shape:'straight',data}]).mockResolvedValueOnce([{id,source_updated_at:updated,artifact_path:`tenant/${id}/drawing.zip`,snapshot:{shape:'straight',data}}]).mockResolvedValueOnce([{updated_at:submitted}]);
 expect((await request()).status).toBe(200);
});
it('rejects changed geometry and shape even when a drawing is ready',async()=>{
 for(const shapeChange of [false,true]){
  const data=newMeasureData('straight',2),changed=newMeasureData('straight',shapeChange?2:3);
  m.select.mockReset().mockResolvedValueOnce([{id,job_id:id,updated_at:updated,shape:'straight',data:changed}]).mockResolvedValueOnce([{id,source_updated_at:updated,artifact_path:`tenant/${id}/drawing.zip`,snapshot:{shape:shapeChange?'ramp':'straight',data}}]);
  expect((await request()).status).toBe(409);
 }
 expect(m.url).not.toHaveBeenCalled();
});
it.each(['','bad','-1'])('rejects unresolved platform entry rise %s before fetching an artifact',async entryRise=>{
 const data=newMeasureData('stair_platform',2);const p=data.segments[1];if(p.kind!=='platform')throw Error();p.entryRise=entryRise;
 m.select.mockReset().mockResolvedValueOnce([{id,job_id:id,updated_at:updated,shape:'stair_platform',data}]);
 const response=await request();expect(response.status).toBe(409);expect((await response.json()).error).toMatch(/rise to the platform/);expect(m.url).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();expect(m.select).toHaveBeenCalledOnce();
});
it.each(['0','7 1/2'])('permits a matching drawing with explicit platform rise %s',async entryRise=>{
 const data=newMeasureData('stair_platform',2);const p=data.segments[1];if(p.kind!=='platform')throw Error();p.entryRise=entryRise;
 m.select.mockReset().mockResolvedValueOnce([{id,job_id:id,updated_at:updated,shape:'stair_platform',data}]).mockResolvedValueOnce([{id,source_updated_at:updated,artifact_path:`tenant/${id}/drawing.zip`,snapshot:{shape:'stair_platform',data}}]).mockResolvedValueOnce([{updated_at:updated}]);
 const response=await request();expect(response.status).toBe(200);expect((await response.json()).snapshot.signature).toContain('platformGeometryRevision');expect(m.url).toHaveBeenCalledOnce();
});
it('does not reimport an old missing-rise drawing after the platform has been measured',async()=>{
 const oldData=newMeasureData('stair_platform',2),data=structuredClone(oldData);const p=data.segments[1];if(p.kind!=='platform')throw Error();p.entryRise='0';
 m.select.mockReset().mockResolvedValueOnce([{id,job_id:id,updated_at:updated,shape:'stair_platform',data}]).mockResolvedValueOnce([{id,source_updated_at:updated,artifact_path:`tenant/${id}/drawing.zip`,snapshot:{shape:'stair_platform',data:oldData}}]);
 expect((await request()).status).toBe(409);expect(m.url).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
});
