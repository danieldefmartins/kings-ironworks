"use client";
import {useState} from 'react';
import type {AnnotationStroke} from '@/lib/shop/measure';
import {dimGeometry} from '@/lib/shop/measure-shots';
/** Stored markup uses the capture canvas, whose longest side is at most 2000px. */
export default function DrawingPhoto({src,label,strokes}: {src:string;label:string;strokes:AnnotationStroke[]}) {
  const [size,setSize]=useState<[number,number]|null>(null);
  const [failed,setFailed]=useState(false);
  return <a href={src} target="_blank" rel="noreferrer" style={{display:'block',position:'relative'}}>
    {/* Private redirects and print output require the original image, without the image optimizer. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={src} alt={label} onError={()=>setFailed(true)} onLoad={e=>{const img=e.currentTarget,k=Math.min(1,2000/Math.max(img.naturalWidth,img.naturalHeight));setSize([Math.round(img.naturalWidth*k),Math.round(img.naturalHeight*k)]);}} style={{width:'100%',maxHeight:180,objectFit:'contain'}}/>
    {failed&&<span>{label} · ?</span>}
    {size&&strokes.length>0&&<svg viewBox={`0 0 ${size[0]} ${size[1]}`} aria-label={label} style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}}>
      {strokes.filter(s=>s.points.length).map((s,i)=>{
        const a=s.points[0],b=s.points[s.points.length-1],lw=Math.max(2.5,size[0]/260),angle=Math.atan2(b.y-a.y,b.x-a.x),n=lw*4.5;
        return <g key={i} fill="none" stroke={s.color} strokeWidth={lw} strokeLinecap="round" strokeLinejoin="round">
          {s.tool==='dim'?<DimSvg a={a} b={b} lw={lw} color={s.color} text={s.text} font={Math.max(18,size[0]/24)}/>:s.tool==='text'?<text x={a.x} y={a.y} fill={s.color} stroke="none" fontSize={Math.max(18,size[0]/24)} fontWeight="bold">{s.text}</text>:<polyline points={s.points.map(p=>`${p.x},${p.y}`).join(' ')}/>}
          {s.tool==='arrow'&&<path d={`M ${b.x-n*Math.cos(angle-.45)} ${b.y-n*Math.sin(angle-.45)} L ${b.x} ${b.y} L ${b.x-n*Math.cos(angle+.45)} ${b.y-n*Math.sin(angle+.45)}`}/>}
        </g>;
      })}
    </svg>}
  </a>;
}

/** A dimension line marked on a photo: ticks, arrowheads and the typed value. */
function DimSvg({a,b,lw,color,text,font}:{a:{x:number;y:number};b:{x:number;y:number};lw:number;color:string;text?:string;font:number}) {
  const g=dimGeometry(a,b,lw),w=(text?.length||0)*font*0.6+font*0.8,h=font*1.35;
  return <>
    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}/>
    {g.ticks.map((t,i)=><line key={i} x1={t[0]} y1={t[1]} x2={t[2]} y2={t[3]}/>)}
    {g.heads.map((hd,i)=><polyline key={i} points={hd.map(p=>p.join(',')).join(' ')}/>)}
    {text&&<g transform={`translate(${g.label.x} ${g.label.y}) rotate(${g.label.angle})`}>
      <rect x={-w/2} y={-h/2} width={w} height={h} rx={h/2} fill={color} stroke="none"/>
      <text x={0} y={0} textAnchor="middle" dominantBaseline="central" fontSize={font} fontWeight="bold" stroke="none" fill={color==='#ffffff'||color==='#ffd400'?'#000':'#fff'}>{text}</text>
    </g>}
  </>;
}
