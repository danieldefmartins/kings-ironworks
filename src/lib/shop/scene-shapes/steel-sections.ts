// True cross-sections for the profiles profileInfo() understands, so a W8x15
// looks like an I-beam, an angle like an angle and a lally like a round column.
// Overall depth / width come from measure-structural's table; flange and web
// thicknesses are the AISC values for the same shapes. A shape outside the
// table keeps its real depth and width and gets proportionate plate
// thicknesses — the outline is right, only the wall thickness is drawn.
import {profileInfo,type ProfileInfo} from '../measure-structural';
import {pipe,cylinder,sweepRects,type Geo,type Rect} from './kit';
import type {Point3} from '../measure-geometry';

/** [tf, tw] for the W shapes in W_DIMS. */
const W_T:Record<string,[number,number]>={
 W4x13:[.345,.28],W5x16:[.36,.24],W5x19:[.43,.27],
 W6x9:[.215,.17],W6x12:[.28,.23],W6x15:[.26,.23],W6x16:[.405,.26],W6x20:[.365,.26],W6x25:[.455,.32],
 W8x10:[.205,.17],W8x13:[.255,.23],W8x15:[.315,.245],W8x18:[.33,.23],W8x21:[.4,.25],W8x24:[.4,.245],W8x28:[.465,.285],W8x31:[.435,.285],W8x35:[.495,.31],W8x40:[.56,.36],
 W10x12:[.21,.19],W10x15:[.27,.23],W10x17:[.33,.24],W10x19:[.395,.25],W10x22:[.36,.24],W10x26:[.44,.26],W10x30:[.51,.3],W10x33:[.435,.29],W10x39:[.53,.315],W10x45:[.62,.35],
 W12x14:[.225,.2],W12x16:[.265,.22],W12x19:[.35,.235],W12x22:[.425,.26],W12x26:[.38,.23],W12x30:[.44,.26],W12x35:[.52,.3],W12x40:[.515,.295],W12x45:[.575,.335],W12x50:[.64,.37],
 W14x22:[.335,.23],W14x26:[.42,.255],W14x30:[.385,.27],W14x34:[.455,.285],
 W16x26:[.345,.25],W16x31:[.44,.275],W16x36:[.43,.295],W16x40:[.505,.305],
 W18x35:[.425,.3],W18x40:[.525,.315],W18x46:[.605,.36],
};
/** Channels: [bf, tf, tw]. */
const C_T:Record<string,[number,number,number]>={
 'C3x4.1':[1.41,.273,.17],'C3x5':[1.5,.273,.258],'C4x5.4':[1.58,.296,.184],'C4x7.25':[1.72,.296,.321],'C5x6.7':[1.75,.32,.19],'C5x9':[1.89,.32,.325],
 'C6x8.2':[1.92,.343,.2],'C6x10.5':[2.03,.343,.314],'C6x13':[2.16,.343,.437],'C7x9.8':[2.09,.366,.21],'C8x11.5':[2.26,.39,.22],'C8x13.75':[2.34,.39,.303],'C8x18.75':[2.53,.39,.487],
 'C9x13.4':[2.43,.413,.233],'C10x15.3':[2.6,.436,.24],'C10x20':[2.74,.436,.379],'C12x20.7':[2.94,.501,.282],'C12x25':[3.05,.501,.387],
 'MC6x12':[2.5,.375,.31],'MC8x8.5':[1.87,.311,.179],'MC8x18.7':[2.98,.432,.353],'MC10x22':[3.32,.575,.29],'MC12x10.6':[1.5,.309,.19],
};
/** Standard-weight pipe wall by OD. */
const PIPE_WALL:Record<string,number>={'2.375':.154,'2.875':.203,'3.5':.216,'4':.226,'4.5':.237,'5.563':.258,'6.625':.28};

const fracNum=(t:string)=>{const m=t.match(/^(\d+)(?:-(\d+)\/(\d+))?$|^(\d+)\/(\d+)$/);if(!m)return null;return m[4]?+m[4]/+m[5]:+m[1]+(m[2]?+m[2]/+m[3]:0);};

export type Section={kind:'rects';rects:Rect[];depth:number;width:number}|{kind:'round';r:number;wall:number|null;depth:number;width:number};

/**
 * The section in its own (u, v) plane, centred on its bounding box. v is the
 * depth direction (vertical on a beam), u the flange / leg width.
 */
export function steelSection(profile:string|null|undefined):(Section&{info:ProfileInfo})|null{
 const info=profileInfo(profile);if(!info)return null;
 const d=info.depth,w=info.width;
 switch(info.family){
  case 'W':case 'S':case 'M':case 'HP':{
   if(d===null)return null;
   const bf=w??d*.5,[tf,tw]=W_T[info.label]??[Math.max(.2,d/26),Math.max(.17,d/38)];
   return {info,kind:'rects',depth:d,width:bf,rects:[[-bf/2,d/2-tf,bf/2,d/2],[-bf/2,-d/2,bf/2,-d/2+tf],[-tw/2,-d/2+tf,tw/2,d/2-tf]]};
  }
  case 'C':case 'MC':{
   if(d===null)return null;
   const [bf,tf,tw]=C_T[info.label]??[Math.max(1.4,d*.28),Math.max(.27,d*.045),Math.max(.17,d*.028)];
   return {info,kind:'rects',depth:d,width:bf,rects:[[-bf/2,d/2-tf,bf/2,d/2],[-bf/2,-d/2,bf/2,-d/2+tf],[-bf/2,-d/2+tf,-bf/2+tw,d/2-tf]]};
  }
  case 'HSS':{
   const t=fracNum(info.label.split('x')[2]||'')??.25,a=d??4,b=w??a;
   return {info,kind:'rects',depth:a,width:b,rects:[[-b/2,a/2-t,b/2,a/2],[-b/2,-a/2,b/2,-a/2+t],[-b/2,-a/2+t,-b/2+t,a/2-t],[b/2-t,-a/2+t,b/2,a/2-t]]};
  }
  case 'L':{
   const t=fracNum(info.label.slice(1).split('x')[2]||'')??.375,a=d??4,b=w??a;
   // Vertical leg a, horizontal leg b: the heel at bottom-left, as a lintel angle sits.
   return {info,kind:'rects',depth:a,width:b,rects:[[-b/2,-a/2,b/2,-a/2+t],[-b/2,-a/2+t,-b/2+t,a/2]]};
  }
  case 'PL':{
   const t=w??.5,depth=d??6;
   return {info,kind:'rects',depth,width:t,rects:[[-t/2,-depth/2,t/2,depth/2]]};
  }
  case 'PIPE':{const od=d??4;return {info,kind:'round',r:od/2,wall:PIPE_WALL[String(od)]??od*.06,depth:od,width:od};}
  case 'LALLY':{const od=d??3.5;return {info,kind:'round',r:od/2,wall:null,depth:od,width:od};}
 }
 return null;
}

/** The member swept a → b. `up` orients the depth direction. */
export function sweepSection(s:Section,a:Point3,b:Point3,up:Point3):Geo{
 if(s.kind==='round')return s.wall===null?cylinder(a,b,s.r,24,up):pipe(a,b,s.r,s.wall,24,up);
 return sweepRects(a,b,s.rects,up);
}
