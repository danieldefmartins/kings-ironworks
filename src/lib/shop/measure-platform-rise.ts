import type {PlatformSegment,Segment} from './measure';
import {parseMeas} from './measure-parse';

/** Resolves the measured step onto a platform. Fallbacks are display-only. */
export function platformEntryRise(segment:PlatformSegment,previous?:Segment):{rise:number;provisional:boolean;measured:boolean;label:string}{
 const raw=segment.entryRise?.trim()??'';
 const parsed=parseMeas(raw);
 if(raw&&parsed!==null&&Number.isFinite(parsed)&&parsed>=0)return {rise:parsed,provisional:false,measured:true,label:segment.entryRise!};
 const afterFlight=previous?.kind==='flight';
 if(!raw&&!afterFlight)return {rise:0,provisional:false,measured:false,label:''};
 const prior=afterFlight?[...previous.steps].reverse().map(step=>parseMeas(step.rise)).find(n=>n!==null&&Number.isFinite(n)&&n>0):undefined;
 return {rise:afterFlight?(prior??7):0,provisional:true,measured:false,label:'?'};
}
