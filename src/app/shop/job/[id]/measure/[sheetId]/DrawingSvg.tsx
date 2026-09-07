"use client";
import { drawingProjection, drawingPointOccluded } from '@/lib/shop/measure-projection';
import type { CSSProperties } from 'react';
import { railSideSetback, flightWalls } from "@/lib/shop/measure";
import { parseMeas } from "@/lib/shop/measure-parse";
import { landingConnections,landingConnectionGeometry } from "@/lib/shop/measure-landings";
import type { MeasureData } from '@/lib/shop/measure';
import { stairGeometry, surfacePoint, type Point3 } from '@/lib/shop/measure-geometry';
import { drawingPosts } from '@/lib/shop/measure-drawing';
import { mt } from '@/lib/shop/measure-i18n';
export type DrawingView='side'|'plan'|'iso';
export default function DrawingSvg({data,lang,focusSeg,view,azimuth=0,light=false,details=true,onMeasureStep,onTapPost,onTapPlatform,style}: {
  data:MeasureData;lang:string;focusSeg?:number;view:DrawingView;azimuth?:number;light?:boolean;details?:boolean;
  onTapPlatform?:(segIdx:number)=>void;
  onMeasureStep?:(segIdx:number,stepIdx:number)=>void;onTapPost?:(id:string)=>void;style?:CSSProperties;
}) {
  const model=stairGeometry(data,focusSeg);if(!model)return null;
  const camera=drawingProjection(view,azimuth);
  const {project,depth}=camera;
  const surfaces=model.treads.map(t=>t.corners);
  const hidden=(p:Point3)=>view!=="side"&&drawingPointOccluded(p,surfaces,camera);
  const posts=details?drawingPosts(data,model).filter(p=>p.base&&p.top):[];
  const postDistances=posts.filter(p=>p.post.firstStepToPostEdge?.trim());
  const transitions=details&&focusSeg===undefined?landingConnections(data).map((t,i)=>({t,i,geometry:landingConnectionGeometry(data,t)})).filter(x=>x.geometry&&(x.t.kind==='drop'||x.t.kind==='level')):[];
  const distanceOrder=[...postDistances].sort((a,b)=>project(a.base!)[1]-project(b.base!)[1]);
  const all=[...model.treads.flatMap(t=>[...t.corners,{...t.corners[0],z:t.corners[0].z-t.rise}]),...posts.flatMap(p=>[p.base!,p.top!]),...transitions.flatMap(x=>x.geometry!.path)].map(project);
  const minX=Math.min(...all.map(p=>p[0]))-70,minY=Math.min(...all.map(p=>p[1]))-80;
  const geometryRight=Math.max(...all.map(p=>p[0]))+70;
  const width=geometryRight-minX+(postDistances.length?270:0),height=Math.max(Math.max(...all.map(p=>p[1]))-minY+80,postDistances.length*54+100);
  const ink=light?'#222':'#e5e5e5',accent=light?'#854d0e':'#fcd34d';
  const pts=(p:Point3[])=>p.map(project).map(p=>p.join(',')).join(' ');
  const title=mt(lang,view==='side'?'sideView':view==='plan'?'planView':'drawing3d');
  return <svg xmlns="http://www.w3.org/2000/svg" role="group" aria-label={title} viewBox={`${minX} ${minY} ${width} ${height}`} style={{width:'100%',display:'block',...style}}>
    <title>{title}</title>
    <rect x={minX} y={minY} width={width} height={height} fill={light?'#fff':'#171717'}/>
    {view!=='side'&&model.treads.flatMap(t=>{
      const [a,b,c,d]=t.corners;
      const faces=[{key:`${t.segIdx}-${t.stepIdx}-${a.x}-${a.y}-top`,points:[a,b,c,d],action:t.stepIdx===null?(onTapPlatform?()=>onTapPlatform(t.segIdx):undefined):(onMeasureStep?()=>onMeasureStep(t.segIdx,t.stepIdx!):undefined),fill:light?'#f5f5f4':t.provisional?'#292524':'#25362f',provisional:t.provisional}];
      if(view==='iso'&&t.rise>0)faces.push({key:faces[0].key+'-riser',points:[{...a,z:a.z-t.rise},a,d,{...d,z:d.z-t.rise}],action:undefined,fill:light?'#e5e5e5':'#404040',provisional:t.provisional});
      return faces;
    }).sort((a,b)=>depth(a.points)-depth(b.points)).map(face=><polygon key={face.key} points={pts(face.points)} fill={face.fill} stroke={face.provisional?accent:ink} strokeWidth={1.5} strokeDasharray={face.provisional?'5 4':undefined} onClick={face.action} style={{cursor:face.action?'pointer':undefined}} data-tread-surface={face.action?'true':undefined}/>)}
    {model.treads.map((t,index)=>{
      const [a,b,c,d]=t.corners,low={...a,z:a.z-t.rise};
      const pa=project(a),pb=project(b),pl=project(low);
      const center={x:(a.x+b.x+c.x+d.x)/4,y:(a.y+b.y+c.y+d.y)/4,z:(a.z+b.z+c.z+d.z)/4};
      const mid=project(center),covered=hidden(center);
      if(view==='side')mid[1]+=20;
      const action=t.stepIdx===null?(onTapPlatform?()=>onTapPlatform(t.segIdx):undefined):(onMeasureStep?()=>onMeasureStep(t.segIdx,t.stepIdx!):undefined);
      return <g key={`${t.segIdx}-${t.stepIdx}-${index}`} pointerEvents="none">
        {view==='side'&&<polyline points={pts([low,a,b])} fill="none" stroke={t.provisional?accent:ink} strokeWidth={2.5} strokeDasharray={t.provisional?'5 4':undefined}/>}
        {!hidden({x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:(a.z+b.z)/2})&&<text x={(pa[0]+pb[0])/2} y={(pa[1]+pb[1])/2-12} textAnchor="middle" fontSize={12} fill={accent}>{t.runLabel}</text>}
        {view==='side'&&t.rise>0&&<text x={pa[0]+12} y={(pa[1]+pl[1])/2} textAnchor="start" fontSize={11} fill={accent}>{t.riseLabel}</text>}
        {view!=='side'&&!hidden(d)&&t.widthLabel&&(focusSeg!==undefined||t.stepIdx===0||t.stepIdx===null)&&<text x={project(d)[0]-8} y={project(d)[1]} textAnchor="end" fontSize={11} fill={ink}>{t.widthLabel}</text>}
        {!covered&&(t.number!==null||data.segments[t.segIdx].kind!=='curve')&&<><circle cx={mid[0]} cy={mid[1]} r={13} fill={light?'white':'#171717'} stroke={ink}/><text x={mid[0]} y={mid[1]+4} textAnchor="middle" fontSize={11} fill={ink}>{t.number??`S${t.segIdx+1}`}</text></>}
        {action&&!covered&&<rect x={mid[0]-22} y={mid[1]-22} width={44} height={44} fill="transparent" pointerEvents="all" role="button" tabIndex={0} aria-label={`${mt(lang,'step')} ${t.number}`} style={{cursor:'pointer'}} onClick={action} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();action();}}}/>}
      </g>;
    })}
    {details&&data.segments.map((seg,segIdx)=>{
      if(seg.kind!=='flight')return null;
      const inset=parseMeas(railSideSetback(data)),treads=model.treads.filter(t=>t.segIdx===segIdx);
      if(inset===null||!Number.isFinite(inset)||!treads.length||inset>treads[0].width)return null;
      const sides=data.rail.side==='Left'?['left']:data.rail.side==='Right'?['right']:['left','right'];
      return sides.flatMap(side=>treads.flatMap((t,i)=>{
        const start=surfacePoint(t,0,side==='right'?t.width-inset:inset),end=surfacePoint(t,t.run,side==='right'?t.width-inset:inset);
        if(hidden({x:(start.x+end.x)/2,y:(start.y+end.y)/2,z:(start.z+end.z)/2}))return [];
        return [<polyline key={`layout-${segIdx}-${side}-${i}`} points={pts([start,end])} fill="none" stroke={light?'#0369a1':'#7dd3fc'} strokeWidth={1.5} strokeDasharray="4 5"><title>{`${mt(lang,'railSideSetback')}: ${railSideSetback(data)}`}</title></polyline>];
      }));
    })}
    {transitions.map(({t,i,geometry:g})=>{
      const label=project(g!.path[1]);
      return <g key={`transition-${i}`}><polyline points={pts(g!.path)} fill="none" stroke={accent} strokeWidth={4} strokeDasharray={g!.provisional?'6 4':undefined}/><text x={label[0]+10} y={label[1]-14} fill={accent} fontSize={13}>T{i+1} · ↕ {t.heightDifference||'?'} · ↔ {t.horizontalSpan||'?'}</text></g>;
    })}
    {details&&data.joints.map((j,index)=>{
      const tread=model.treads.find(t=>t.segIdx===j.afterSegment+1);
      if(!tread)return null;
      const a=project(tread.corners[0]);
      return <g key={`joint-${index}`}><circle cx={a[0]} cy={a[1]} r={8} fill={light?'#fff':'#171717'} stroke={accent}/><text x={a[0]-12} y={a[1]-12} textAnchor="end" fill={accent} fontSize={12}>J{index+1}</text></g>;
    })}
    {model.treads.flatMap((t,index)=>{
      const seg=data.segments[t.segIdx];
      const override=seg.kind==='flight'&&t.stepIdx!==null?seg.steps[t.stepIdx].wallSide:undefined;
      const walls=override?{left:override==='left'||override==='both',right:override==='right'||override==='both'}:flightWalls(seg,data.datums.orientation);
      return (['left','right'] as const).filter(side=>walls[side]).map(side=><polyline key={`wall-${index}-${side}`} data-wall-segment={`${t.segIdx}-${t.stepIdx}-${side}`} points={pts(side==='left'?[t.corners[0],t.corners[1]]:[t.corners[3],t.corners[2]])} stroke={light?'#64748b':'#94a3b8'} strokeWidth={8} strokeLinecap="butt" opacity={0.7} fill="none" pointerEvents="none"><title>{mt(lang,'drawingWalls')} · {mt(lang,side==='left'?'leftLookingUp':'rightLookingUp')}</title></polyline>);
    })}
    {postDistances.map(p=>{
      const base=project(p.base!),labelY=minY+80+distanceOrder.indexOf(p)*54;
      return <g key={`distance-${p.post.id}`} pointerEvents="none" data-post-distance={p.post.id}>
        <polyline points={`${base[0]},${base[1]} ${geometryRight-15},${labelY} ${geometryRight},${labelY}`} fill="none" stroke={accent} strokeWidth={1} strokeDasharray="3 3"/>
        <text x={geometryRight+8} y={labelY-6} fill={ink} fontSize={11}>{mt(lang,'firstStepToPostEdge')} · {p.label}</text>
        <text x={geometryRight+8} y={labelY+13} fill={accent} fontSize={15} fontWeight="bold">{p.post.firstStepToPostEdge}{data.units==='in'?'″':''}</text>
      </g>;
    })}
    {posts.map((p,index)=>{
      const a=project(p.base!),b=project(p.top!);
      const next=posts.slice(index+1).find(q=>q.post.segIdx===p.post.segIdx&&q.post.side===p.post.side&&q.post.pointType==='railing_post');
      const photos=data.photos.map((ph,i)=>ph.slot===`post_${p.post.id}`?`F${i+1}`:null).filter(Boolean);
      return <g key={p.post.id} stroke={accent}>
        {p.post.pointType==='railing_post'&&next&&<line x1={b[0]} y1={b[1]} x2={project(next.top!)[0]} y2={project(next.top!)[1]} strokeWidth={3} strokeDasharray={p.provisional||next.provisional?'5 4':undefined}/>}
        <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} strokeWidth={4} strokeDasharray={p.provisional?'5 4':undefined}/>
        <circle cx={a[0]} cy={a[1]} r={5} fill={accent}/>
        <text x={b[0]+8} y={b[1]-8} fontSize={12} fill={accent} stroke="none">{p.label}{photos.length?` · ${photos.join(', ')}`:''}</text>
        {onTapPost&&<rect x={b[0]-22} y={b[1]-22} width={44} height={44} fill="transparent" stroke="none" role="button" tabIndex={0} aria-label={p.label} onClick={()=>onTapPost(p.post.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onTapPost(p.post.id);}}}/>}
      </g>;
    })}
  </svg>;
}
