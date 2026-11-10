'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {X} from 'lucide-react';
import type {MeasureData} from '@/lib/shop/measure';
import {orderedPosts} from '@/lib/shop/measure-checks';
import {editSiteObject} from '@/lib/shop/measure-site';
import {applyPostPoint} from '@/lib/shop/measure-scene-edit';
import {useShopAppearance} from '../../../../ShopAppearance';
import type {ScenePick} from './ProWorkspace';
import type {PostDropTarget,SceneSelection} from './SceneViewport';

type Picked={kind:'post'|'site'|'rail';id:string};
type Moving={kind:'post';id:string|null}|{kind:'site';id:string};
const WORDS={
 en:{post:'Post',rail:'Railing',move:'Move',remove:'Remove',details:'Details',cancel:'Cancel',tapStep:'Tap a step',tapGround:'Tap the ground',cant:'Can’t place there',first:'Measure the steps first'},
 pt:{post:'Poste',rail:'Corrimão',move:'Mover',remove:'Remover',details:'Detalhes',cancel:'Cancelar',tapStep:'Toque num degrau',tapGround:'Toque no chão',cant:'Não cabe aí',first:'Meça os degraus primeiro'},
 es:{post:'Poste',rail:'Barandilla',move:'Mover',remove:'Quitar',details:'Detalles',cancel:'Cancelar',tapStep:'Toque un escalón',tapGround:'Toque el suelo',cant:'No cabe ahí',first:'Mida los escalones primero'},
} as const;
/** Tools sit beside the drawing (tablet landscape, desktop): a tap can open them without hiding anything. */
const besideDrawing=()=>typeof window==='undefined'||!window.matchMedia||window.matchMedia('(min-width: 1024px)').matches;

/**
 * What a tap on the 3D drawing does, right where the finger is. Picking a post,
 * an existing structure or a railing shows its few actions on the drawing
 * (Move · Remove · Details) instead of opening tools far down the page;
 * "Details" is what opens them. Move waits for one tap on a step (or the
 * ground); a post dragged with the finger lands the same way. Anything the tap
 * needs or refuses is said in a few words on the drawing and goes away by itself.
 */
export function useSceneActions({data,current,set,lang,enabled,onDetails,onRoute}:{data:MeasureData;/** The latest sheet data at the moment of a tap. */current:()=>MeasureData;set:(fn:(d:MeasureData)=>void)=>void;lang:string;/** Off while a tool owns the taps (materials, panels) or the sheet has no drawing to pick from. */enabled:boolean;/** Open the full tools for the picked item and bring them into view. */onDetails:(target:SceneSelection)=>void;/** Open the tools without scrolling, where they sit beside the drawing. */onRoute:(target:SceneSelection)=>void}):ScenePick&{/** Start placing a new post (null) or moving an existing one on the drawing. */placePost:(postId:string|null)=>void}{
 const w=WORDS[lang==='pt'?'pt':lang==='es'?'es':'en'],dark=useShopAppearance()==='dark';
 const [picked,setPicked]=useState<Picked|null>(null),[moving,setMoving]=useState<Moving|null>(null),[note,setNote]=useState('');
 const timer=useRef<number|null>(null);
 const say=useCallback((text:string)=>{setNote(text);if(timer.current!==null)window.clearTimeout(timer.current);timer.current=window.setTimeout(()=>{timer.current=null;setNote('');},2200);},[]);
 useEffect(()=>()=>{if(timer.current!==null)window.clearTimeout(timer.current);},[]);
 const post=picked?.kind==='post'?data.posts.find(p=>p.id===picked.id):undefined,object=picked?.kind==='site'?data.site?.objects.find(o=>o.id===picked.id):undefined;
 const live=enabled&&picked&&(picked.kind==='rail'||post||object)?picked:null,mode=enabled?moving:null;
 const target=useCallback((p:Picked):SceneSelection=>p.kind==='post'?{postId:p.id}:p.kind==='site'?{siteId:p.id}:{railId:p.id},[]);
 const landPost=useCallback((postId:string|null,at:{segmentIndex:number;stepIndex?:number|null;point:{x:number;y:number;z:number}})=>{
  const draft=structuredClone(current()),result=applyPostPoint(draft,postId,{segmentIndex:at.segmentIndex,stepIndex:at.stepIndex??null,worldPoint:at.point}),moved=result.ok?draft.posts.find(p=>p.id===result.postId):undefined;
  if(!result.ok||!moved){say(w.cant);return false;}
  set(d=>{const existing=d.posts.find(p=>p.id===moved.id);if(existing)Object.assign(existing,moved);else d.posts.push(moved);if(!d.datums.postRef)d.datums.postRef='centerline';});
  setPicked({kind:'post',id:moved.id});setMoving(null);setNote('');if(besideDrawing())onRoute({postId:moved.id});return true;
 },[current,set,say,w.cant,onRoute]);
 const onPick=useCallback((selection:SceneSelection)=>{
  if(!enabled)return false;
  if(moving?.kind==='post'){if(selection.segmentIndex!==undefined&&selection.point)landPost(moving.id,{segmentIndex:selection.segmentIndex,stepIndex:selection.stepIndex,point:selection.point});return true;}
  if(moving?.kind==='site'){const point=selection.point,id=moving.id;if(point){set(d=>{if(d.site)d.site.objects=d.site.objects.map(o=>o.id===id?editSiteObject(o,{x:String(point.x),y:String(point.y)}):o);});setMoving(null);}return true;}
  const next:Picked|null=selection.postId?(selection.postId.startsWith('sg-')?null:{kind:'post',id:selection.postId}):selection.siteId?{kind:'site',id:selection.siteId}:selection.railId?{kind:'rail',id:selection.railId}:null;
  setPicked(next);
  // Beside the drawing the tools open as well; under it (phone, tablet upright) they wait for "Details".
  return !!next&&!besideDrawing();
 },[enabled,moving,landPost,set]);
 const onClear=useCallback(()=>setPicked(null),[]);
 const onMiss=useCallback((unmeasured:boolean)=>{if(unmeasured)say(w.first);else if(!moving)say(w.cant);},[moving,say,w.first,w.cant]);
 const onPostDrop=useCallback((drop:PostDropTarget)=>{const original=current().posts.find(p=>p.id===drop.postId);if(!original||original.pointType!=='railing_post'){say(w.cant);return;}landPost(drop.postId,drop);},[current,landPost,say,w.cant]);
 const placePost=useCallback((postId:string|null)=>{setPicked(postId?{kind:'post',id:postId}:null);setMoving({kind:'post',id:postId});},[]);
 const actions=useMemo(()=>{
  const shell=`flex max-w-full items-center gap-0.5 rounded-2xl border p-1 shadow-lg backdrop-blur-xl ${dark?'border-white/10 bg-slate-900/85 text-slate-100':'border-slate-900/10 bg-white/95 text-slate-900'}`;
  const button='min-h-11 shrink-0 rounded-xl px-3 text-[15px] font-semibold transition-transform active:scale-[.96]';
  const name='min-w-0 truncate px-3 text-[15px] font-semibold';
  if(mode)return <div data-scene-actions="moving" className={shell}><span className={name}>{mode.kind==='post'?w.tapStep:w.tapGround}</span><button type="button" aria-label={w.cancel} className={`${button} grid w-11 place-items-center px-0 ${dark?'bg-white/10':'bg-slate-100'}`} onClick={()=>setMoving(null)}><X aria-hidden className="h-5 w-5"/></button></div>;
  if(!live)return undefined;
  const label=post?`${w.post} ${orderedPosts(data).findIndex(p=>p.id===post.id)+1}`:object?object.label:w.rail;
  const canMove=post?post.pointType==='railing_post'&&!post.pathId&&!post.supportAttachment:object?!object.wallAnchor:false;
  const accent=dark?'text-indigo-300':'text-indigo-700';
  return <div data-scene-actions={live.kind} role="toolbar" aria-label={label} className={shell}>
   <span className={name}>{label}</span>
   {canMove&&<button type="button" data-scene-action="move" className={`${button} ${accent}`} onClick={()=>setMoving(post?{kind:'post',id:post.id}:{kind:'site',id:live.id})}>{w.move}</button>}
   {(post||object)&&<button type="button" data-scene-action="remove" className={`${button} ${dark?'text-red-300':'text-red-600'}`} onClick={()=>{const id=live.id;set(d=>{if(post)d.posts=d.posts.filter(p=>p.id!==id);else if(d.site)d.site.objects=d.site.objects.filter(o=>o.id!==id);});setPicked(null);}}>{w.remove}</button>}
   <button type="button" data-scene-action="details" className={`${button} ${accent}`} onClick={()=>onDetails(target(live))}>{w.details}</button>
  </div>;
 },[mode,live,post,object,data,dark,w,set,onDetails,target]);
 return {selectedId:mode?.id?(mode.kind==='post'?`post:${mode.id}`:mode.id):live?(live.kind==='post'?`post:${live.id}`:live.id):undefined,actions,note:note||undefined,surfacePick:mode?.kind==='post',groundPick:mode?.kind==='site',onPick,onClear,onMiss,onPostDrop,placePost};
}
