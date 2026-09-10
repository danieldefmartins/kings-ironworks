// @vitest-environment node
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
import {newMeasureData} from '@/lib/shop/measure';
const m=vi.hoisted(()=>({worker:vi.fn(),sheet:vi.fn(),job:vi.fn(),revision:vi.fn(),photos:vi.fn(),sign:vi.fn()}));
vi.mock('@/lib/shop/session',()=>({getSessionWorker:m.worker}));
vi.mock('@/lib/shop/db',()=>({getMeasureSheet:m.sheet,getJob:m.job,getMeasureRevision:m.revision,getPhotos:m.photos,signPhotoUrl:m.sign,PRICE_CATEGORY:'Approved Estimate'}));
import {GET} from './route';
const id='a0000000-0000-4000-8000-000000000001';
const request=(suffix='')=>GET(new NextRequest(`http://localhost/shop/api/measure-photo?sheetId=${id}&index=0${suffix}`));
beforeEach(()=>{vi.clearAllMocks();m.worker.mockResolvedValue({is_admin:false});m.job.mockResolvedValue({id:'job'});const data=newMeasureData('straight',1);data.photos=[{slot:'overall',path:'job/photo.jpg',takenAt:''}];m.sheet.mockResolvedValue({job_id:'job',data});m.photos.mockResolvedValue([{url:'job/photo.jpg',category:'Measurements'}]);m.sign.mockResolvedValue('https://example.com/signed');});
describe('drawing photo references',()=>{
  it('requires a session',async()=>{m.worker.mockResolvedValue(null);expect((await request()).status).toBe(401);});
  it('requires access to the parent job',async()=>{m.job.mockResolvedValue(null);expect((await request()).status).toBe(404);expect(m.sign).not.toHaveBeenCalled();});
  it('does not expose price-sensitive photos to workers',async()=>{m.photos.mockResolvedValue([{url:'job/photo.jpg',category:'Approved Estimate'}]);expect((await request()).status).toBe(404);expect(m.sign).not.toHaveBeenCalled();});
  it('uses a private short-lived redirect for a valid reference',async()=>{const r=await request();expect(r.status).toBe(307);expect(r.headers.get('Cache-Control')).toBe('private, no-store');expect(m.sign).toHaveBeenCalledWith('job/photo.jpg',300);});
  it('never substitutes live photos for an absent locked revision',async()=>{m.revision.mockResolvedValue(null);expect((await request('&rev=2')).status).toBe(404);expect(m.sign).not.toHaveBeenCalled();});
});

it('never signs a PDF disguised as a measurement photo',async()=>{m.photos.mockResolvedValue([{url:'job/photo.jpg',kind:'document',category:'Original Estimate'}]);expect((await request()).status).toBe(404);expect(m.sign).not.toHaveBeenCalled();});
it('blocks operational admins from signing financial images',async()=>{m.worker.mockResolvedValue({is_admin:true,can_see_prices:false});m.photos.mockResolvedValue([{url:'job/photo.jpg',category:'Approved Estimate'}]);expect((await request()).status).toBe(404);expect(m.sign).not.toHaveBeenCalled();});
