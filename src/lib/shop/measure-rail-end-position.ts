import type {SiteObject} from './measure-site';
import type {SiteRailEnd} from './measure-site-rails-schema';
import {parseMeas} from './measure-parse';
/** Same local face axes as resolveRailEnd; rotation never changes this distance. */
export function railFaceSpan(host:SiteObject|undefined,face:SiteRailEnd['face']):{length:number;datum:'left'|'near'}|null{
 if(!host||host.section==='round'||face==='radial')return null;
 const datum=face==='near'||face==='far'?'left':'near';
 const length=parseMeas(datum==='left'?host.length:host.depth);
 return length!==null&&Number.isFinite(length)&&length>0?{length,datum}:null;
}
export function railAlongFromDistance(distance:string,span:number):number|null{
 const value=parseMeas(distance);
 return value!==null&&Number.isFinite(value)&&Number.isFinite(span)&&span>0&&value>=0&&value<=span?value/span:null;
}
