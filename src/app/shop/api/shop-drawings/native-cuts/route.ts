import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {getSessionWorker} from '@/lib/shop/session';
import {ORG_ID,sbSelect} from '@/lib/shop/db';
import {drawingDownloadUrl} from '@/lib/shop/drawing-storage';
import {drawingAssemblyZip} from '@/lib/shop/drawing-assembly-zip';
import {nativeGeometrySignature,parseNativeCutSources,NativeSteelSnapshotSchema} from '@/lib/shop/measure-native-steel';
import {normalizeMeasureData,type MeasureData} from '@/lib/shop/measure';
import {platformEntryRise} from '@/lib/shop/measure-platform-rise';
import type {DrawingRequest} from '@/lib/shop/shop-drawings';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store'};
export async function GET(req:NextRequest){
 if(!await getSessionWorker())return NextResponse.json({error:'Not signed in'},{status:401,headers});
 const id=req.nextUrl.searchParams.get('sheet');if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Bad sheet'},{status:400,headers});
 try{
  const sheets=await sbSelect<{id:string;job_id:string;updated_at:string;shape:string;data:MeasureData}[]>('kiw_shop_measure_sheets',`select=id,job_id,updated_at,shape,data&org_id=eq.${ORG_ID}&id=eq.${id}&limit=1`),sheet=sheets[0];
  if(!sheet)return NextResponse.json({error:'Measurement sheet not found'},{status:404,headers});
  const data=normalizeMeasureData(sheet.data);
  if(data.segments.some((segment,index)=>segment.kind==='platform'&&platformEntryRise(segment,data.segments[index-1]).provisional))return NextResponse.json({error:'Measure the rise to the platform and generate a new drawing before importing its cuts.'},{status:409,headers});
  const rows=await sbSelect<DrawingRequest[]>('kiw_shop_drawing_requests',`select=id,job_id,sheet_id,status,artifact_path,source_updated_at,snapshot&org_id=eq.${ORG_ID}&sheet_id=eq.${id}&job_id=eq.${sheet.job_id}&status=in.(ready,approved)&order=requested_at.desc&limit=50`);
  const signature=nativeGeometrySignature(data);
  // Submitting a drawing changes the sheet revision without changing its geometry.
  const row=rows.find(r=>r.artifact_path?.endsWith('.zip')&&r.snapshot.shape===sheet.shape&&signature===nativeGeometrySignature(normalizeMeasureData(r.snapshot.data)));
  if(!row)return NextResponse.json({error:'Save your measurements and generate a new drawing before importing its cuts.'},{status:409,headers});
  if(!row.artifact_path?.startsWith(`${ORG_ID}/${row.id}/`)||row.artifact_path.includes('..'))throw new Error('Invalid artifact');
  const response=await fetch(await drawingDownloadUrl(row.artifact_path),{cache:'no-store',signal:AbortSignal.timeout(30000)});
  if(!response.ok||!response.body||Number(response.headers.get('content-length'))>100*1024*1024)throw new Error('Drawing file unavailable');
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
  try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>100*1024*1024)throw new Error('Drawing too large');chunks.push(value);}}finally{await reader.cancel();}
  const parsed=parseNativeCutSources(drawingAssemblyZip(Buffer.concat(chunks)),{sourceUpdatedAt:row.source_updated_at,currentUpdatedAt:row.source_updated_at,signature:row.id});
  // Recheck after download: a concurrent field edit must not receive stale cuts.
  const latest=await sbSelect<{updated_at:string}[]>('kiw_shop_measure_sheets',`select=updated_at&org_id=eq.${ORG_ID}&id=eq.${id}&limit=1`);
  if(latest[0]?.updated_at!==sheet.updated_at)return NextResponse.json({error:'Measurements changed during import. Save and generate a new drawing.'},{status:409,headers});
  const snapshot=NativeSteelSnapshotSchema.parse({signature,sourceUpdatedAt:row.source_updated_at,drawingId:row.id,...parsed});
  return NextResponse.json({snapshot},{headers});
 }catch{return NextResponse.json({error:'Could not read the drawing cuts. Generate a new drawing and try again.'},{status:503,headers});}
}
