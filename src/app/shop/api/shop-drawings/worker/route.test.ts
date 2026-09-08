// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newMeasureData } from '@/lib/shop/measure';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({ select: vi.fn(), rpc: vi.fn(), update: vi.fn(), exists: vi.fn(), upload: vi.fn() }));
vi.mock('@/lib/shop/db', () => ({ ORG_ID: 'tenant', sbSelect: m.select, sbRpc: m.rpc, sbUpdate: m.update }));
vi.mock('@/lib/shop/drawing-storage', () => ({ drawingObjectExists: m.exists, drawingUploadUrl: m.upload }));
import { POST } from './route';
const id = 'a0000000-0000-4000-8000-000000000001';
const request = (body: object, token = 'a'.repeat(64)) => POST(new NextRequest('https://shop.test/shop/api/shop-drawings/worker', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({engine:"blender",...body}) }));
beforeEach(() => { vi.clearAllMocks(); m.select.mockResolvedValue([{ id }]); m.rpc.mockResolvedValue([]); m.update.mockResolvedValue([{ id }]); });
describe('Blender worker boundary', () => {
  it('rejects the obsolete worker before it can claim a job', async () => {expect((await request({action:'claim',engine:'sketchup'})).status).toBe(400);expect(m.rpc).not.toHaveBeenCalled();});
  it('heartbeats without claiming customer work', async () => {expect((await request({action:'heartbeat'})).status).toBe(200);expect(m.rpc).not.toHaveBeenCalled();expect(m.update.mock.calls[0][0]).toBe('kiw_shop_drawing_workers');});
  it('claims a Blender payload with a private ZIP upload destination', async () => {m.rpc.mockResolvedValue([{id,lease_token:id,snapshot:{name:'Test',data:newMeasureData('straight',2)}}]);m.upload.mockResolvedValue('https://storage.test/upload');const response=await request({action:'claim'});const data=await response.json();expect(data.request.payload).toMatchObject({version:2,engine:'blender',units:'inches',draft:true});expect(m.upload).toHaveBeenCalledWith(`tenant/${id}/${id}.zip`);});
  it('renews only the active lease and refreshes worker heartbeat', async () => {expect((await request({action:'renew',id,lease:id})).status).toBe(200);expect(m.update.mock.calls[0][1]).toContain(`lease_token=eq.${id}`);expect(m.update.mock.calls[0][2].lease_until).toBeTruthy();});
  it('requires the dedicated token, not a browser session', async () => { expect((await request({ action: 'claim' }, '')).status).toBe(401); expect(m.select).not.toHaveBeenCalled(); });
  it('rejects revoked or foreign workers before claiming', async () => { m.select.mockResolvedValue([]); expect((await request({ action: 'claim' })).status).toBe(401); expect(m.rpc).not.toHaveBeenCalled(); expect(m.select.mock.calls[0][1]).toContain('org_id=eq.tenant'); expect(m.select.mock.calls[0][1]).toContain('revoked=eq.false'); expect(m.select.mock.calls[0][1]).not.toContain('a'.repeat(64)); });
  it('returns an empty queue distinctly from generated output', async () => { const response = await request({ action: 'claim' }); expect(await response.json()).toEqual({ request: null }); expect(m.rpc).toHaveBeenCalledWith('kiw_shop_claim_drawing', { p_org_id: 'tenant', p_worker_id: id }); });
  it('rejects an expired or replaced lease before inspecting storage', async () => { m.select.mockResolvedValueOnce([{ id }]).mockResolvedValueOnce([]); expect((await request({ action: 'complete', id, lease: id })).status).toBe(409); expect(m.exists).not.toHaveBeenCalled(); expect(m.update).not.toHaveBeenCalled(); });
  it('does not mark ready until an actual uploaded artifact exists', async () => { m.exists.mockResolvedValue(false); expect((await request({ action: 'complete', id, lease: id })).status).toBe(409); expect(m.update).not.toHaveBeenCalled(); });
  it('scopes completion to worker, tenant and unexpired lease; clears lease', async () => { m.exists.mockResolvedValue(true); expect((await request({ action: 'complete', id, lease: id })).status).toBe(200); const [, filter, patch] = m.update.mock.calls[0]; expect(filter).toContain(`worker_id=eq.${id}`); expect(filter).toContain('lease_until=gt.'); expect(filter).toContain('org_id=eq.tenant'); expect(patch).toMatchObject({ status: 'ready', lease_token: null, artifact_path: `tenant/${id}/${id}.zip` }); });
  it('reports a concurrent lease loss instead of claiming completion', async () => { m.exists.mockResolvedValue(true); m.update.mockResolvedValue([]); expect((await request({ action: 'complete', id, lease: id })).status).toBe(409); });
});
