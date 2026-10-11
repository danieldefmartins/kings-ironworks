import type {MeasureData} from './measure';
import type {Point3} from './measure-geometry';
import {newSiteObject,siteMesh,siteNumber,type SiteObject,type SiteMesh} from './measure-site';
export type PlaceableSiteKind='wall'|'column'|'post'|'slab'|'opening'|'obstruction';
const sizes:Record<PlaceableSiteKind,[number,number,number]>={wall:[36,6,84],column:[6,6,84],post:[6,6,84],slab:[36,36,4],opening:[36,6,80],obstruction:[6,6,6]};
const isKind=(kind:string):kind is PlaceableSiteKind=>Object.prototype.hasOwnProperty.call(sizes,kind);
const snap=(n:number)=>{const value=Math.sign(n)*Math.round(Math.abs(n)*16)/16;return value===0?'0':value.toFixed(4).replace(/\.?0+$/,'');};
/** A picked scene position is a sketch placement, never a surveyed dimension.
 * All sizes stay blank until entered; this helper does not mutate the sheet. */
export function placeSiteObject(data:MeasureData,kind:PlaceableSiteKind,point:Point3,label:string,id:string):SiteObject|null{
 if(!isKind(kind)||!id.trim()||id.length>60||!label.trim()||label.length>80||(data.site?.objects.length||0)>=100||data.site?.objects.some(o=>o.id===id))return null;
 if([point.x,point.y,point.z].some(n=>!Number.isFinite(n)||Math.abs(n)>120000))return null;
 return {...newSiteObject(kind,id,label.trim()),x:snap(point.x),y:snap(point.y),z:snap(point.z)};
}
/** Display-only geometry for a positioned object whose size is still blank.
 * Never insert this mesh into siteMeshes, anchors, quantities or fabrication.
 * Complete measured geometry is returned by siteMesh instead of this helper. */
export function previewSiteObject(object:SiteObject):SiteMesh|null{
 if(!isKind(object.kind)||object.wallAnchor||[object.x,object.y,object.z,object.riseX,object.riseY].some(v=>siteNumber(v)===null)||!Number.isFinite(object.rotation)||Math.abs(object.rotation)>360)return null;
 if(siteMesh(object))return null;
 const dimensions=(object.section==='round'?['length','height']:['length','depth','height']) as ('length'|'depth'|'height')[];
 if(!dimensions.some(key=>!object[key].trim()))return null;
 const draft={...object,verified:false},defaults=sizes[object.kind];
 for(const key of dimensions){const text=object[key].trim(),value=siteNumber(text);if(text&&(value===null||value<=0))return null;if(!text)draft[key]=String(defaults[key==='length'?0:key==='depth'?1:2]);}
 const mesh=siteMesh(draft);return mesh?{...mesh,provisional:true}:null;
}
