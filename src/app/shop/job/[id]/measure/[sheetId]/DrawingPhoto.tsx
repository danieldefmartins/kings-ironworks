"use client";
import {useState} from 'react';
import type {AnnotationStroke} from '@/lib/shop/measure';
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
          {s.tool==='text'?<text x={a.x} y={a.y} fill={s.color} stroke="none" fontSize={Math.max(18,size[0]/24)} fontWeight="bold">{s.text}</text>:<polyline points={s.points.map(p=>`${p.x},${p.y}`).join(' ')}/>}
          {s.tool==='arrow'&&<path d={`M ${b.x-n*Math.cos(angle-.45)} ${b.y-n*Math.sin(angle-.45)} L ${b.x} ${b.y} L ${b.x-n*Math.cos(angle+.45)} ${b.y-n*Math.sin(angle+.45)}`}/>}
        </g>;
      })}
    </svg>}
  </a>;
}
