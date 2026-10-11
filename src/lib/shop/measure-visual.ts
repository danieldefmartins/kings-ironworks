import type {MeasureData} from './measure';
import {parseMeas} from './measure-parse';
/** Derived pitch never fills or replaces the measured angle. */
export function visualPitch(data:MeasureData,segment:number):number|null{
 const s=data.segments[segment];if(!s)return null;
 if(s.kind==='flight'){
  const pairs=s.steps.map(t=>[parseMeas(t.rise),parseMeas(t.run)]);
  if(!pairs.length||pairs.some(([r,u])=>r===null||u===null||r<=0||u<=0))return null;
  return Math.atan2(pairs.reduce((n,p)=>n+p[0]!,0),pairs.reduce((n,p)=>n+p[1]!,0))*180/Math.PI;
 }
 if(s.kind==='ramp'){const rise=parseMeas(s.rise),run=parseMeas(s.runH);return rise!==null&&run!==null&&run>0?Math.atan2(rise,run)*180/Math.PI:null;}
 return null;
}
