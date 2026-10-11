import {siteNumber} from './measure-site';
import type {SpecialtySteel} from './measure-specialty-steel-schema';
export type SpecialtyPiece={key:string;label:string;role:string;length:number;profile:string;signature:string;planWidth:number;x:number;y:number;width:number;height:number};
export function newSpecialtySteel(id:string,kind:SpecialtySteel['kind']):SpecialtySteel{return {id,kind,label:kind==='grate'?'Grate':'Ladder',width:'',length:'',sideWidth:'',endWidth:'',barWidth:'',endGap:'',maxSpace:'',checked:''};}
export function specialtySignature(a:SpecialtySteel){return JSON.stringify([a.id,a.label,a.kind,a.width,a.length,a.sideWidth,a.endWidth,a.barWidth,a.endGap,a.maxSpace]);}
/** Square-cut butt joints only. Grate side rails run the full length;
 * end rails and bearing bars fit between them. Ladder rungs fit between
 * full-length straight stringers. No structural adequacy is inferred. */
export function specialtyLayout(a:SpecialtySteel):{issues:string[];pieces:SpecialtyPiece[];spacing:number|null;count:number;width:number;length:number}{
 const number=(text:string)=>siteNumber(text.trim().replace(/^([+-]?)\./,'$10.'));
 const W=number(a.width),L=number(a.length),S=number(a.sideWidth),E=a.kind==='grate'?number(a.endWidth):0,B=number(a.barWidth),G=number(a.endGap),M=number(a.maxSpace);
 const fail=(message:string)=>({issues:[message],pieces:[],spacing:null,count:0,width:W||0,length:L||0});
 if([W,L,S,B,M].some(n=>n===null||n<=0||n>12000)||E===null||E<0||(a.kind==='grate'&&E===0)||G===null||G<0)return fail('Enter positive measured dimensions and an explicit end gap (0 when intended).');
 const w=W!,l=L!,s=S!,e=E!,b=B!,g=G!,m=M!;
 if(s>24||e>24||b>24||g>24||m>1200)return fail('Member widths, gaps or spacing exceed the supported range.');
 const inside=w-2*s,cut=inside-2*g;
 if(cut<=0||l-2*e<=0)return fail('Members and end gaps do not fit inside the measured overall size.');
 // Grate: equally spaced bars across length, max clear opening includes frame edges.
 // Ladder: equally spaced rung centers along length, first/last center are half a pitch from ends.
 const n=a.kind==='grate'?Math.max(1,Math.ceil((l-2*e-m)/(b+m)-1e-10)):Math.max(1,Math.ceil(l/m-1e-10));
 if(n>100)return fail('This assembly exceeds 100 bars or rungs. Split it into measured sections.');
 const spacing=a.kind==='grate'?(l-2*e-n*b)/(n+1):l/n;
 if(spacing<0||(a.kind==='ladder'&&spacing<b))return fail('The selected bars or rungs overlap. Check spacing and member width.');
 const signature=specialtySignature(a),pieces:SpecialtyPiece[]=[];
 function add(mark:string,role:string,length:number,x:number,y:number,width:number,height:number,profile:string){pieces.push({key:`specialty-${a.id}:${mark}`,label:`${a.label} · ${mark}`,role,length,profile,signature,planWidth:mark.startsWith('S')?s:mark.startsWith('E')?e:b,x,y,width,height});}
 const sideRole=a.kind==='grate'?'frame':'stringer';
 add('S1',sideRole,l,0,0,s,l,`${s} in plan width; full profile must be checked`);add('S2',sideRole,l,w-s,0,s,l,`${s} in plan width; full profile must be checked`);
 if(a.kind==='grate'){add('E1','frame',cut,s+g,0,cut,e,`${e} in plan width; square butt ends`);add('E2','frame',cut,s+g,l-e,cut,e,`${e} in plan width; square butt ends`);}
 for(let i=0;i<n;i++){const y=a.kind==='grate'?e+spacing+i*(b+spacing):(i+.5)*spacing-b/2;add(`${a.kind==='grate'?'B':'R'}${i+1}`,a.kind==='grate'?'bearing':'rung',cut,s+g,y,cut,b,`${b} in plan width; ${g} in clearance at each end`);}
 return {issues:[],pieces,spacing,count:n,width:w,length:l};
}
export function specialtyChecked(a:SpecialtySteel){return a.checked===specialtySignature(a)&&!specialtyLayout(a).issues.length;}
export function specialtySteelSources(assemblies:SpecialtySteel[]=[]){return assemblies.flatMap(a=>specialtyChecked(a)?specialtyLayout(a).pieces:[]);}
