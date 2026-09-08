import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ORG_ID, sbSelect, sbRpc, sbUpdate } from '@/lib/shop/db';
import { blenderPayload, type DrawingRequest } from '@/lib/shop/shop-drawings';
import { drawingUploadUrl, drawingObjectExists } from '@/lib/shop/drawing-storage';
export const runtime = 'nodejs';
const bad = (error: string, status: number) => NextResponse.json({ error }, { status });
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!token) return bad('Unauthorized', 401);
  try {
    const hash = createHash('sha256').update(token).digest('hex');
    const workers = await sbSelect<{ id: string }[]>('kiw_shop_drawing_workers', `select=id&org_id=eq.${ORG_ID}&token_hash=eq.${hash}&revoked=eq.false&limit=1`);
    if (!workers[0]) return bad('Unauthorized', 401);
    const worker = workers[0];
    const body = await req.json();
    if (body.engine !== 'blender') return bad('Use the Blender drawing worker', 400);
    if (body.action === 'heartbeat') {
      await sbUpdate('kiw_shop_drawing_workers', `id=eq.${worker.id}&org_id=eq.${ORG_ID}&revoked=eq.false`, { last_seen_at: new Date().toISOString() });
      return NextResponse.json({ ok: true });
    }
    if (body.action === 'claim') {
      const rows = await sbRpc<DrawingRequest[]>('kiw_shop_claim_drawing', { p_org_id: ORG_ID, p_worker_id: worker.id });
      const row = rows[0];
      if (!row) return NextResponse.json({ request: null });
      try {
        const payload = blenderPayload(row);
        const path = `${ORG_ID}/${row.id}/${row.lease_token}.zip`;
        return NextResponse.json({ request: { id: row.id, lease: row.lease_token, payload, uploadUrl: await drawingUploadUrl(path) } });
      } catch {
        await sbUpdate('kiw_shop_drawing_requests', `org_id=eq.${ORG_ID}&id=eq.${row.id}&lease_token=eq.${row.lease_token}`, { status: 'failed', error: 'Could not prepare Blender geometry or upload', lease_until: null });
        return bad('Could not prepare drawing', 422);
      }
    }
    const parsed = z.object({ action: z.enum(['complete', 'fail', 'renew']), id: z.string().uuid(), lease: z.string().uuid(), error: z.string().max(500).optional() }).safeParse(body);
    if (!parsed.success) return bad('Bad request', 400);
    const b = parsed.data;
    const filter = `org_id=eq.${ORG_ID}&id=eq.${b.id}&worker_id=eq.${worker.id}&lease_token=eq.${b.lease}&status=eq.generating&lease_until=gt.${encodeURIComponent(new Date().toISOString())}`;
    const active = await sbSelect<DrawingRequest[]>('kiw_shop_drawing_requests', `select=id&${filter}&limit=1`);
    if (!active.length) return bad('Lease expired', 409);
    if (b.action === 'renew') {
      const rows = await sbUpdate<DrawingRequest[]>('kiw_shop_drawing_requests', filter, { lease_until: new Date(Date.now() + 300000).toISOString() });
      await sbUpdate('kiw_shop_drawing_workers', `id=eq.${worker.id}&org_id=eq.${ORG_ID}&revoked=eq.false`, { last_seen_at: new Date().toISOString() });
      return rows.length ? NextResponse.json({ ok: true }) : bad('Lease expired', 409);
    }
    const path = `${ORG_ID}/${b.id}/${b.lease}.zip`;
    if (b.action === 'complete' && !await drawingObjectExists(path)) return bad('Upload the Blender file first', 409);
    const rows = await sbUpdate<DrawingRequest[]>('kiw_shop_drawing_requests', filter, { status: b.action === 'complete' ? 'ready' : 'failed', artifact_path: b.action === 'complete' ? path : null, error: b.action === 'fail' ? b.error || 'Blender generation failed' : null, completed_at: new Date().toISOString(), lease_token: null, lease_until: null });
    return rows.length ? NextResponse.json({ ok: true }) : bad('Lease expired', 409);
  } catch { return bad('Drawing worker service unavailable', 503); }
}
