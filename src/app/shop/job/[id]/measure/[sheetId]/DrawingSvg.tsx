"use client";
import {resolveSite,previewWall} from '@/lib/shop/measure-wall-placement';
import {useShopAppearance} from "../../../../ShopAppearance";
import { drawingProjection, drawingPointOccluded } from '@/lib/shop/measure-projection';
import type { CSSProperties } from 'react';
import { railSideSetback, flightWalls } from "@/lib/shop/measure";
import { parseMeas, showMeas } from "@/lib/shop/measure-parse";
import { landingConnections,landingConnectionGeometry } from "@/lib/shop/measure-landings";
import type { MeasureData } from '@/lib/shop/measure';
import { stairGeometry, surfacePoint, type Point3 } from '@/lib/shop/measure-geometry';
import { drawingPosts } from '@/lib/shop/measure-drawing';
import {houseContext} from '@/lib/shop/measure-house-context';
import {siteMeshes} from '@/lib/shop/measure-site';
import { mt } from '@/lib/shop/measure-i18n';
export type DrawingView='side'|'plan'|'iso';
export default function DrawingSvg({data,lang,focusSeg,view,azimuth=0,light=false,details=true,showSiteContext=false,draftSiteObjects=false,onDimension,onMeasureStep,onTapPost,onTapPlatform,style}: {
  data:MeasureData;lang:string;focusSeg?:number;view:DrawingView;azimuth?:number;light?:boolean;details?:boolean;showSiteContext?:boolean;draftSiteObjects?:boolean;
  onDimension?:(segment:number,step:number|null,key:'run'|'rise'|'width')=>void;
  onTapPlatform?:(segIdx:number)=>void;
  onMeasureStep?:(segIdx:number,stepIdx:number)=>void;onTapPost?:(id:string)=>void;style?:CSSProperties;
}) {
  const appearance=useShopAppearance();
  light = light || appearance==='light';
  const model=stairGeometry(data,focusSeg);if(!model)return null;
  const camera=drawingProjection(view,azimuth);
  const {project,depth}=camera;
  const surfaces=model.treads.map(t=>t.corners);
  const hidden=(p:Point3)=>view!=="side"&&drawingPointOccluded(p,surfaces,camera);
  const posts=details?drawingPosts(data,model).filter(p=>p.base&&p.top):[];
  const boundary=(p:typeof posts[number])=>p.post.pointType==='railing_post'||('terminal'in p&&!!p.terminal);
  const railSegments:{start:typeof posts[number];end:typeof posts[number]}[]=[];
  const railGroups=new Map<string,typeof posts>();for(const p of posts.filter(boundary)){const key=`${p.post.segIdx}:${p.post.side}`;railGroups.set(key,[...(railGroups.get(key)||[]),p]);}
  for(const group of railGroups.values()){const tread=model.treads.find(t=>t.segIdx===group[0].post.segIdx);if(!tread)continue;const [a,b]=tread.corners;group.sort((p,q)=>(p.base!.x-q.base!.x)*(b.x-a.x)+(p.base!.y-q.base!.y)*(b.y-a.y));for(let i=1;i<group.length;i++)railSegments.push({start:group[i-1],end:group[i]});}
  const postDistances=posts.filter(p=>p.post.firstStepToPostEdge?.trim());
  const transitions=details&&focusSeg===undefined?landingConnections(data).map((t,i)=>({t,i,geometry:landingConnectionGeometry(data,t)})).filter(x=>x.geometry&&(x.t.kind==='drop'||x.t.kind==='level')):[];
  const distanceOrder=[...postDistances].sort((a,b)=>project(a.base!)[1]-project(b.base!)[1]);
  const context=showSiteContext?siteMeshes(resolveSite(data)):[],house=showSiteContext?houseContext(data):null;
  const draftWalls=showSiteContext&&draftSiteObjects?(data.site?.objects||[]).filter(o=>o.wallAnchor&&!context.some(m=>m.id===o.id)).flatMap(o=>{const m=previewWall(data,o);return m?[m]:[];}):[];
  const all=[...(house?[...house.vertices,...house.roof.flat(),house.label]:[]),...context.flatMap(m=>m.vertices),...draftWalls.flatMap(m=>m.vertices),...model.treads.flatMap(t=>[...t.corners,{...t.corners[0],z:t.corners[0].z-t.rise}]),...posts.flatMap(p=>[p.base!,p.top!]),...transitions.flatMap(x=>x.geometry!.path)].map(project);
  const minX=Math.min(...all.map(p=>p[0]))-70,minY=Math.min(...all.map(p=>p[1]))-80;
  const geometryRight=Math.max(...all.map(p=>p[0]))+70;
  const width=geometryRight-minX+(postDistances.length?270:0),height=Math.max(Math.max(...all.map(p=>p[1]))-minY+80,postDistances.length*54+100);
  const ink=light?'#222':'#e5e5e5',accent=light?'#854d0e':'#fcd34d';
  const pts=(p:Point3[])=>p.map(project).map(p=>p.join(',')).join(' ');
  const title=mt(lang,view==='side'?'sideView':view==='plan'?'planView':'drawing3d');
  return <svg xmlns="http://www.w3.org/2000/svg" role="group" aria-label={title} viewBox={`${minX} ${minY} ${width} ${height}`} style={{width:'100%',display:'block',...style}}>
    <title>{title}</title>
    <rect x={minX} y={minY} width={width} height={height} fill={light?'#fff':'#171717'}/>
    {house&&<g data-house-reference pointerEvents="none" aria-label={lang==='pt'?'Casa ilustrativa — sem medidas':lang==='es'?'Casa ilustrativa — sin medidas':'Illustrative house — not measured'}>{house.faces.map((face,i)=><polygon key={i} points={pts(face.map(j=>house.vertices[j]))} fill={light?'#e2e8f0':'#334155'} fillOpacity={.25} stroke={light?'#94a3b8':'#64748b'} strokeWidth={.8} strokeDasharray="5 4"/>)}{house.roof.map((line,i)=><polyline key={i} points={pts(line)} fill="none" stroke={light?'#94a3b8':'#64748b'} strokeWidth={1.2} strokeDasharray="5 4"/>)}<text x={project(house.label)[0]} y={project(house.label)[1]} textAnchor="middle" fontSize={10} fill={light?'#64748b':'#94a3b8'}>{lang==='pt'?'CASA · REFERÊNCIA SEM MEDIDAS':lang==='es'?'CASA · REFERENCIA SIN MEDIDAS':'HOUSE · UNMEASURED REFERENCE'}</text></g>}
    {draftWalls.map(m=><g key={`draft-wall-${m.id}`} data-draft-wall={m.id} pointerEvents="none"><title>{m.label} · Not measured</title>{m.faces.map((face,i)=><polygon key={i} points={pts(face.map(v=>m.vertices[v]))} fill={light?'#fef3c7':'#854d0e'} fillOpacity=".22" stroke={accent} strokeDasharray="5 4" strokeWidth="1"/>)}<text x={project(m.vertices[4])[0]} y={project(m.vertices[4])[1]-10} fill={accent} fontSize="11">{m.label} · {lang==='pt'?'Não medido':lang==='es'?'Sin medir':'Not measured'}</text></g>)}
    {context.flatMap(mesh=>mesh.faces.map((face,index)=>({mesh,index,points:face.map(i=>mesh.vertices[i])}))).sort((a,b)=>depth(a.points)-depth(b.points)).map(({mesh,index,points})=><polygon key={`site-${mesh.id}-${index}`} data-site-context={mesh.id} points={pts(points)} fill={light?'#cbd5e1':'#475569'} fillOpacity={mesh.kind==='opening'?.12:.4} stroke={mesh.provisional?accent:light?'#64748b':'#94a3b8'} strokeWidth={.8} strokeDasharray={mesh.provisional?'5 4':undefined} pointerEvents="none"><title>{mesh.label}</title></polygon>)}
    {context.map(mesh=>{const at=project(mesh.vertices[mesh.vertices.length/2]);return <text key={`site-label-${mesh.id}`} x={at[0]+4} y={at[1]-10} fill={light?'#475569':'#cbd5e1'} fontSize={11} pointerEvents="none">{mesh.label}</text>;})}
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
        {onDimension&&!covered&&(['run','rise','width'] as const).filter(k=>k==='run'&&!!t.runLabel&&!hidden({x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:(a.z+b.z)/2})||k==='rise'&&view==='side'&&t.rise>0||k==='width'&&view!=='side'&&!hidden(d)&&!!t.widthLabel&&(focusSeg!==undefined||t.stepIdx===0||t.stepIdx===null)).map(k=>{const at=k==='run'?[(pa[0]+pb[0])/2,(pa[1]+pb[1])/2-12]:k==='rise'?[pa[0]+24,(pa[1]+pl[1])/2]:[project(d)[0]-18,project(d)[1]];return <rect key={k} x={at[0]-22} y={at[1]-18} width={44} height={36} fill="transparent" pointerEvents="all" role="button" tabIndex={0} aria-label={`Edit ${k} · ${t.number===null?'segment '+(t.segIdx+1):'step '+t.number}`} style={{cursor:'pointer'}} onClick={()=>onDimension(t.segIdx,t.stepIdx,k)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onDimension(t.segIdx,t.stepIdx,k);}}}/>;})}
        {action&&!covered&&<rect x={mid[0]-22} y={mid[1]-22} width={44} height={44} fill="transparent" pointerEvents="all" role="button" tabIndex={0} aria-label={t.number===null?`${lang==='pt'?'Trecho':lang==='es'?'Tramo':'Segment'} ${t.segIdx+1}`:`${mt(lang,'step')} ${t.number}`} style={{cursor:'pointer'}} onClick={action} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();action();}}}/>}
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
        <text x={geometryRight+8} y={labelY+13} fill={accent} fontSize={15} fontWeight="bold">{showMeas(p.post.firstStepToPostEdge,data.units||'in')}</text>
      </g>;
    })}
    {railSegments.map(({start,end})=>{const a=project(start.top!),b=project(end.top!);return <line key={`${start.post.id}:${end.post.id}`} data-native-rail={`${start.post.id}:${end.post.id}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={accent} strokeWidth={3} strokeDasharray={start.provisional||end.provisional?'5 4':undefined}/>;})}
    {posts.map(p=>{
      const a=project(p.base!),b=project(p.top!);
      const terminal='terminal'in p&&!!p.terminal;
      const photos=data.photos.map((ph,i)=>ph.slot===`post_${p.post.id}`?`F${i+1}`:null).filter(Boolean);
      return <g key={p.post.id} data-support-terminal={terminal?p.post.id:undefined} stroke={accent}>

        {terminal?<circle cx={b[0]} cy={b[1]} r={5} fill={light?'#fff':'#171717'} strokeWidth={2} strokeDasharray={p.provisional?'3 2':undefined}/>:<><line data-post-axis={p.post.id} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} strokeWidth={4} strokeDasharray={p.provisional?'5 4':undefined}/><circle cx={a[0]} cy={a[1]} r={5} fill={accent}/></>}
        <text x={b[0]+8} y={b[1]-8} fontSize={12} fill={accent} stroke="none">{p.label}{photos.length?` · ${photos.join(', ')}`:''}</text>
        {onTapPost&&<rect x={b[0]-22} y={b[1]-22} width={44} height={44} fill="transparent" stroke="none" role="button" tabIndex={0} aria-label={p.label} onClick={()=>onTapPost(p.post.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onTapPost(p.post.id);}}}/>}
      </g>;
    })}
  </svg>;
}
