'use client';
import {useEffect,useReducer,useRef,useState,type RefObject} from 'react';
import type {MeasureData} from '@/lib/shop/measure';
type Edit=(data:MeasureData)=>void;
type State={current:MeasureData;key:string;observed:string;observedData:MeasureData;undo:MeasureData[];redo:MeasureData[];path:string|null;time:number};
const clone=(data:MeasureData)=>structuredClone(data);
function initial(data:MeasureData):State {const key=JSON.stringify(data);return {current:clone(data),key,observed:key,observedData:data,undo:[],redo:[],path:null,time:0};}
/** Coalesce typing in one existing leaf only. Structural or multi-field edits
 * (adding posts, moving an assembly, choosing a preset) stay discrete actions. */
function changedLeaf(before:unknown,after:unknown):string|null{
 const paths:string[]=[];let structural=false;
 function walk(a:unknown,b:unknown,path:string){if(Object.is(a,b)||paths.length>1||structural)return;
  if(a&&b&&typeof a==='object'&&typeof b==='object'){
   if(Array.isArray(a)!==Array.isArray(b)){structural=true;return;}
   const left=Object.keys(a),right=Object.keys(b);if(left.length!==right.length||left.some(k=>!Object.prototype.hasOwnProperty.call(b,k))){structural=true;return;}
   for(const key of left)walk((a as Record<string,unknown>)[key],(b as Record<string,unknown>)[key],`${path}/${key}`);
  }else paths.push(path);
 }
 walk(before,after,'');return !structural&&paths.length===1?paths[0]:null;
}
function replace(draft:MeasureData,snapshot:MeasureData){const record=draft as unknown as Record<string,unknown>;for(const key of Object.keys(record))delete record[key];Object.assign(draft,clone(snapshot));}

/** Wrap useSheetSync.set only. Pass its rendered `data` as the third argument
 * so external server/offline recovery immediately clears this local history.
 * Never writes dataRef, sheet status, metadata, revision tokens or network state.
 * syncSet still owns autosave and its normal optimistic concurrency protocol. */
export function useMeasureHistory(dataRef:RefObject<MeasureData>,syncSet:(fn:Edit)=>void,data:MeasureData){
 const [seed]=useState(()=>initial(data)),history=useRef<State>(seed),owned=useRef(new WeakSet<MeasureData>());
 const [availability,publish]=useReducer((_: {canUndo:boolean;canRedo:boolean},next:{canUndo:boolean;canRedo:boolean})=>next,{canUndo:false,canRedo:false});
 function refresh(){publish({canUndo:history.current.undo.length>0,canRedo:history.current.redo.length>0});}
 useEffect(()=>{const h=history.current!,key=JSON.stringify(data);if(key!==h.key||(data!==h.observedData&&!owned.current.has(data))){history.current=initial(data);refresh();}else {h.observed=key;h.observedData=data;}},[data]);
 function current(){const h=history.current!,observed=JSON.stringify(dataRef.current);if((dataRef.current!==h.observedData&&!owned.current.has(dataRef.current))||(observed!==h.observed&&observed!==h.key)){history.current=initial(dataRef.current);}else if(observed===h.key){h.observed=observed;h.observedData=dataRef.current;}return history.current!;}
 function set(fn:Edit){const h=current(),next=clone(h.current);fn(next);const key=JSON.stringify(next);if(key===h.key)return;
  const path=changedLeaf(h.current,next),now=Date.now(),coalesce=path!==null&&path===h.path&&now-h.time>=0&&now-h.time<=500&&h.redo.length===0;
  if(!coalesce){h.undo.push(clone(h.current));if(h.undo.length>40)h.undo.shift();}
  h.redo=[];h.current=clone(next);h.key=key;h.path=path;h.time=now;syncSet(draft=>{replace(draft,next);owned.current.add(draft);});refresh();
 }
 function travel(direction:'undo'|'redo'){const h=current(),source=h[direction],snapshot=source.pop();if(!snapshot){refresh();return;}const destination=direction==='undo'?h.redo:h.undo;destination.push(clone(h.current));if(destination.length>40)destination.shift();h.current=clone(snapshot);h.key=JSON.stringify(snapshot);h.path=null;h.time=0;syncSet(draft=>{replace(draft,snapshot);owned.current.add(draft);});refresh();}
 return {set,undo:()=>travel('undo'),redo:()=>travel('redo'),...availability};
}
