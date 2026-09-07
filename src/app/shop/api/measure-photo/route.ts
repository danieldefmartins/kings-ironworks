import { NextRequest, NextResponse } from 'next/server';
import { getSessionWorker } from '@/lib/shop/session';
import { getPhotos, PRICE_CATEGORY, getJob, getMeasureSheet, getMeasureRevision, signPhotoUrl } from '@/lib/shop/db';
import { normalizeMeasureData } from '@/lib/shop/measure';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest) {
  const worker=await getSessionWorker();
  if(!worker)return new NextResponse('Not signed in',{status:401});
  const id=req.nextUrl.searchParams.get('sheetId')||'',index=Number(req.nextUrl.searchParams.get('index'));
  const revision=req.nextUrl.searchParams.get('rev');
  if(!/^[0-9a-f-]{36}$/i.test(id)||!Number.isInteger(index)||index<0||(revision!==null&&!/^[1-9]\d*$/.test(revision)))return new NextResponse('Invalid reference',{status:400});
  const sheet=await getMeasureSheet(id);
  if(!sheet||!await getJob(sheet.job_id))return new NextResponse('Not found',{status:404});
  const snapshot=revision?await getMeasureRevision(id,Number(revision)):null;
  if(revision&&!snapshot)return new NextResponse('Not found',{status:404});
  const photo=normalizeMeasureData(snapshot?.data??sheet.data).photos[index];
  if(!photo||!photo.path.startsWith(`${sheet.job_id}/`)||photo.path.includes('..'))return new NextResponse('Not found',{status:404});
  const record=(await getPhotos(sheet.job_id)).find(p=>p.url===photo.path);
  if(!record || (record.category===PRICE_CATEGORY&&!worker.is_admin))return new NextResponse('Not found',{status:404});
  const url=await signPhotoUrl(photo.path,300);
  if(!url)return new NextResponse('Photo unavailable',{status:404});
  const response=NextResponse.redirect(url);response.headers.set('Cache-Control','private, no-store');return response;
}
