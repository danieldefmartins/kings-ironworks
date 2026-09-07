"use client";
import {landingConnections} from "@/lib/shop/measure-landings";
import {railSideSetback} from "@/lib/shop/measure";
import DrawingPhoto from "./DrawingPhoto";
import type { MeasureData } from '@/lib/shop/measure';
import { drawingIssues, drawingPosts, drawingJointSource } from '@/lib/shop/measure-drawing';
import { stairGeometry } from '@/lib/shop/measure-geometry';
import { mt } from '@/lib/shop/measure-i18n';

export default function DrawingDetails({data,lang,light=false,sheetId,rev}: {data:MeasureData;lang:string;light?:boolean;sheetId?:string;rev?:number}) {
  const model=stairGeometry(data);if(!model)return null;
  const posts=drawingPosts(data,model),issues=drawingIssues(data);
  const border=light?'#ccc':'#525252';
  const cell={padding:'6px 8px',borderBottom:`1px solid ${border}`,verticalAlign:'top' as const,overflowWrap:'anywhere' as const};
  const profiles=[['matPost',data.materials.post],['matTopRail',data.materials.topRail],['matBottomRail',data.materials.bottomRail],['matPicket',data.materials.picket],['railHeight',data.rail.height],['railSideSetback',railSideSetback(data)],['finish',data.materials.finish],['color',data.materials.color]];
  return <div className="mt-3 space-y-3 text-xs" style={{color:light?'#222':undefined}}>
    <p>{mt(lang,'drawingCenterlines')}</p>
    {issues.length>0&&<div style={{border:`1px solid ${border}`,padding:8}}><strong>{mt(lang,'drawingOpenItems')}</strong><ul className="list-disc pl-5">{issues.map(key=><li key={key}>{mt(lang,key)}</li>)}</ul></div>}
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{profiles.map(([key,v])=><div key={key}><span>{mt(lang,key)}: </span><strong>{v||'—'}</strong></div>)}</div>
    {data.materials.notes&&<p>{data.materials.notes}</p>}
    {posts.length>0&&<div className="overflow-x-auto"><table className="w-full" style={{borderCollapse:'collapse',tableLayout:'fixed'}}><caption className="text-left font-bold">{mt(lang,'drawingPostSchedule')}</caption>
      <thead><tr>{['drawingReference','drawingLocation','drawingConnection'].map(k=><th key={k} style={cell}>{mt(lang,k)}</th>)}</tr></thead>
      <tbody>{posts.map(({post:p,label,provisional})=><tr key={p.id}>
        <td style={cell}><strong>{label}</strong> · {mt(lang,`point_${p.pointType}`)}{provisional?' · ?':''}</td>
        <td style={cell}>S{p.segIdx+1} · {p.stepIdx===null?mt(lang,'landing'):`${mt(lang,'step')} ${model.treads.find(t=>t.segIdx===p.segIdx&&t.stepIdx===p.stepIdx)?.number??'?'}`} · {p.side?mt(lang,p.side==='left'?'turnLeft':'turnRight'):'?'}<br/>{mt(lang,'drawingSetbacks')}: {p.stepIdx===null?p.pos||'?':p.fromNosing||'?'} / {p.fromEdge||'?'}{p.firstStepToPostEdge&&<><br/>{mt(lang,'firstStepToPostEdge')}: {p.firstStepToPostEdge}</>}</td>
        <td style={cell}>{[p.mount,p.anchor,p.plate,p.anchors,p.substrate,p.edgeDist,p.clipDetail,p.obstruction].filter(Boolean).join(' · ')||'—'}</td>
      </tr>)}</tbody></table></div>}
    {landingConnections(data).length>0&&<div className="overflow-x-auto"><table className="w-full" style={{borderCollapse:'collapse',tableLayout:'fixed'}}><caption className="text-left font-bold">{mt(lang,'landingTransitionTitle')}</caption><thead><tr>{['drawingReference','landingHeightDifference','landingHorizontalSpan'].map(k=><th key={k} style={cell}>{mt(lang,k)}</th>)}</tr></thead><tbody>{landingConnections(data).map((t,i)=><tr key={i}><td style={cell}>T{i+1} · S{t.lowerFlightIdx+1} / S{t.upperFlightIdx+1} · {mt(lang,t.side==='left'?'turnLeft':'turnRight')}<br/>{t.kind?mt(lang,`landingKind_${t.kind}`):'?'}<br/>{posts.find(p=>p.post.id===t.lowerPostId)?.label||'?'} → {posts.find(p=>p.post.id===t.upperPostId)?.label||'?'}</td><td style={cell}>{t.heightDifference||'?'} · {t.higherEnd?mt(lang,`landingEnd_${t.higherEnd}`):'?'}<br/>{mt(lang,'landingVerticalAt')}: {t.verticalAt?mt(lang,`landingEnd_${t.verticalAt}`):'—'}</td><td style={cell}>{t.horizontalSpan||'?'}<br/>{mt(lang,'landingReachShort')}: {t.lowerReach||'?'} / {t.upperReach||'?'}<br/>{t.note}</td></tr>)}</tbody></table></div>}
    {data.joints.length>0&&<div className="overflow-x-auto"><table className="w-full" style={{borderCollapse:'collapse',tableLayout:'fixed'}}><caption className="text-left font-bold">{mt(lang,'drawingJointSchedule')}</caption>
      <thead><tr>{['drawingReference','drawingConnection','drawingJointDimensions'].map(k=><th key={k} style={cell}>{mt(lang,k)}</th>)}</tr></thead>
      <tbody>{data.joints.map((j,i)=>{
        const before=data.segments[j.afterSegment],after=data.segments[j.afterSegment+1];
        const branchBoundary=before?.kind==='flight'&&after?.kind==='flight'&&before.branch&&after.branch&&before.branch!==after.branch;
        return <tr key={j.afterSegment}><td style={cell}>J{i+1} · S{drawingJointSource(data,j.afterSegment)+1} / S{j.afterSegment+2}{branchBoundary?` · ${mt(lang,'drawingBranchJoint')}`:''}</td><td style={cell}>{j.method?mt(lang,`jointMethod_${j.method}`):'?'} · {j.carriedBy||'?'}<br/>{j.note}</td><td style={cell}>{[j.gap,j.offsetV,j.offsetH,j.angleChange,j.leaveLong].map(v=>v||'?').join(' / ')}</td></tr>;
      })}</tbody></table></div>}
    {[data.fab.flightConnection,data.fab.corners,data.fab.splices,data.fab.maxPiece,data.fab.access].filter(Boolean).map((v,i)=><p key={i}>{v}</p>)}
    {data.photos.length>0&&<div><h3 className="font-bold">{mt(lang,'drawingPhotoCallouts')}</h3><div className="grid grid-cols-2 gap-3">
      {data.photos.map((photo,index)=>{
        const post=posts.find(p=>photo.slot===`post_${p.post.id}`);
        const label=`F${index+1} · ${post?post.label:mt(lang,`slot_${photo.slot}`)}`;
        const src=sheetId?`/shop/api/measure-photo?sheetId=${encodeURIComponent(sheetId)}&index=${index}${rev?`&rev=${rev}`:''}`:undefined;
        return <figure key={`${photo.slot}-${index}`} style={{breakInside:'avoid'}}>
          {src&&<DrawingPhoto src={src} label={label} strokes={data.annotations[photo.path]||[]}/>}
          <figcaption>{label} · {photo.takenAt.slice(0,10)}</figcaption>
        </figure>;
      })}
    </div></div>}
  </div>;
}
