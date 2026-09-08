import { NextRequest, NextResponse } from 'next/server';
import { getSessionWorker } from '@/lib/shop/session';
import { ORG_ID, sbSelect } from '@/lib/shop/db';
import { drawingDownloadUrl } from '@/lib/shop/drawing-storage';
import type { DrawingRequest } from '@/lib/shop/shop-drawings';
import { z } from 'zod';
export const runtime = 'nodejs';
export async function GET(req: NextRequest) {
  if (!await getSessionWorker()) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const sheet = req.nextUrl.searchParams.get('sheet');
  if (!z.string().uuid().safeParse(sheet).success) return NextResponse.json({ error: 'Bad sheet' }, { status: 400 });
  try {
    const rows = await sbSelect<DrawingRequest[]>('kiw_shop_drawing_requests', `select=id,status,requested_at,artifact_path,error&org_id=eq.${ORG_ID}&sheet_id=eq.${sheet}&order=requested_at.desc&limit=50`);
    const download = req.nextUrl.searchParams.get('download');
    if (download) {
      const row = rows.find(r => r.id === download);
      if (!row?.artifact_path || !['ready', 'approved'].includes(row.status)) return NextResponse.json({ error: 'Drawing is not ready' }, { status: 404 });
      return NextResponse.redirect(await drawingDownloadUrl(row.artifact_path), { headers: { 'Cache-Control': 'private, no-store' } });
    }
    const workers = await sbSelect<{ last_seen_at: string | null }[]>('kiw_shop_drawing_workers', `select=last_seen_at&org_id=eq.${ORG_ID}&revoked=eq.false&order=last_seen_at.desc.nullslast&limit=1`);
    return NextResponse.json({ requests: rows.map(({ artifact_path, ...row }) => ({ ...row, hasFile: !!artifact_path, format: artifact_path?.endsWith('.skp') ? 'sketchup' : 'blender' })), connected: !!workers[0]?.last_seen_at && Date.now() - Date.parse(workers[0].last_seen_at) < 120000 }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Shop Drawings is not available yet. Your measurements are saved.' }, { status: 503 });
  }
}
