// Structural steel in 3D: every member at its true section (an I-beam is an
// I-beam), at the length the sheet computes for it.
//
//   moment frame   columns at their centre-to-centre, each standing on the
//                  slab at its own measured height (so a sloping slab shows),
//                  base and cap plates, the beam across the tops, the clear
//                  opening walls either side
//   beam           the clear span between two bearing walls, the beam running
//                  into a pocket in each by its bearing length
//   lintel         in its wall over the opening, bearing on both jambs
//   column / post  on its slab at its readings, plates top and bottom
//   ledger / brace on its wall / as a straight member
//
// Members that are not part of the frame stand in rows behind it, one row per
// member, so a mixed sheet reads as a member list. Viewed from −y.
import type {MeasureData} from '../measure';
import type {Point3} from '../measure-geometry';
import {memberCut,memberQty,heightReadings,spanReadings,isSpanning,isVertical,type StructMember,type StructuralData,type StructBearing} from '../measure-structural';
import {steelSection,sweepSection} from './steel-sections';
import {P,box,emptyScene,line,merge,mesh,num,slab,type ShapeScene} from './kit';
import {preMirrorScene} from './pre-mirror';

const ROW=72;

/** "12x12x3/8" → plan size and thickness. Null for blank / none. */
export function plateDims(spec:string|null|undefined):{a:number;b:number;t:number}|null{
 const s=(spec||'').trim().toLowerCase().replace(/^pl\s*/,'');if(!s||/^(none|no|n\/a|-|0)$/.test(s))return null;
 const parts=s.split(/\s*[x×*]\s*/).map(p=>num(p.replace(/"/g,'')));
 if(parts.length===3&&parts.every(n=>n!==null))return {a:parts[0]!,b:parts[1]!,t:parts[2]!};
 return null;
}

type Ctx={out:ShapeScene;s:StructuralData};

function label(m:StructMember){return `${m.mark||m.role}${m.profile?` · ${m.profile}`:''}`;}

/** Sweep a member, or a centre line when its profile is unknown. */
function member(ctx:Ctx,m:StructMember,id:string,a:Point3,b:Point3,up:Point3,provisional:boolean){
 const section=steelSection(m.profile),entity={part:`member:${m.id}`};
 if(!section){ctx.out.lines.push(line(`struct:${id}`,label(m),'attached',[a,b],{provisional:true,entity}));return;}
 ctx.out.meshes.push(mesh(`struct:${id}`,label(m),'attached',sweepSection(section,a,b,up),{provisional,entity}));
}

/** A column standing on the slab: base plate, shaft, cap plate, and a pad of slab under it tilted by its readings. */
function column(ctx:Ctx,m:StructMember,id:string,x:number,y:number,underside:number,height:number|null,tilt:number){
 const cut=memberCut(m,ctx.s),bp=plateDims(m.basePlate),cp=plateDims(m.capPlate),section=steelSection(m.profile);
 const h=height??96,base=underside-h,provisional=height===null||cut.length===null;
 const half=Math.max(bp?.a??0,section?.width??4,section?.depth??4)/2+10,entity={part:`member:${m.id}`};
 // Slab pad: top at the column base, falling across it by the spread between readings.
 const pad=[P(x-half,y-half,base),P(x+half,y-half,base),P(x+half,y+half,base-tilt),P(x-half,y+half,base-tilt)].map(p=>({...p,z:p.z-4}));
 ctx.out.meshes.push(mesh(`struct:slab:${id}`,`${m.mark} · slab`,'site',slab(pad,P(0,0,1),4),{referenceOnly:true,entity}));
 let z0=base,z1=underside;
 if(bp){ctx.out.meshes.push(mesh(`struct:bp:${id}`,`${m.mark} · base plate ${m.basePlate}`,'attached',box(P(x-bp.b/2,y-bp.a/2,z0),P(x+bp.b/2,y+bp.a/2,z0+bp.t)),{provisional,entity}));z0+=bp.t;}
 if(cp){ctx.out.meshes.push(mesh(`struct:cp:${id}`,`${m.mark} · cap plate ${m.capPlate}`,'attached',box(P(x-cp.b/2,y-cp.a/2,z1-cp.t),P(x+cp.b/2,y+cp.a/2,z1)),{provisional,entity}));z1-=cp.t;}
 const shim=num(m.shim,true)??0;z0+=shim;
 member(ctx,m,id,P(x,y,z0),P(x,y,z1),P(1,0,0),provisional);
 return base;
}

/** Pocketed bearing wall at one beam end: pier below, block above, cheeks either side. */
function pocketWall(ctx:Ctx,id:string,x0:number,x1:number,y:number,zb:number,zt:number,width:number,provisional:boolean){
 const half=30,cheek=width/2+.5,top=zt+16,parts=[box(P(x0,y-half,0),P(x1,y+half,zb)),box(P(x0,y-half,zt+.5),P(x1,y+half,top)),box(P(x0,y-half,zb),P(x1,y-cheek,zt+.5)),box(P(x0,y+cheek,zb),P(x1,y+half,zt+.5))];
 ctx.out.meshes.push(mesh(`struct:wall:${id}`,'Bearing wall','site',merge(...parts),{referenceOnly:true,provisional}));
}

function bearingWall(b:StructBearing,length:number){return num(b.wall)??Math.max(8,length+4);}

function spanning(ctx:Ctx,m:StructMember,y:number,restOn:number|null){
 const spans=spanReadings(m),span=spans.length?Math.max(...spans):null,section=steelSection(m.profile);
 const bl=num(m.bearingL.length,true),br=num(m.bearingR.length,true);
 const S=span??120,L=bl??(m.role==='lintel'?4:8),R=br??(m.role==='lintel'?4:8),depth=section?.depth??8,width=section?.width??4;
 const provisional=memberCut(m,ctx.s).length===null;
 if(span===null)ctx.out.pending.push(`${m.mark} · span`);
 if(m.role==='beam'||m.role==='lintel')if(bl===null||br===null)ctx.out.pending.push(`${m.mark} · bearing`);
 const elev=num(m.elevation,true);
 if(m.role==='lintel'){
  // Lintel: the wall it carries, over the opening, bearing on both jambs.
  const top=elev??restOn??(84+depth),zb=top-depth,wall=Math.max(bearingWall(m.bearingL,L),bearingWall(m.bearingR,R)),side=24,head=top+30;
  const parts=[box(P(-L-side,y,0),P(-L,y+wall,head)),box(P(S+R,y,0),P(S+R+side,y+wall,head)),box(P(-L,y,0),P(0,y+wall,zb)),box(P(S,y,0),P(S+R,y+wall,zb)),box(P(-L,y,top),P(S+R,y+wall,head))];
  ctx.out.meshes.push(mesh(`struct:wall:${m.id}`,`${m.mark} · wall`,'site',merge(...parts),{referenceOnly:true}));
  const n=Math.min(memberQty(m),3);
  for(let i=0;i<n;i++){const yy=y+(n===1?(section?.width??4)/2:(i+.5)*wall/n);member(ctx,m,`${m.id}:${i}`,P(-L,yy,zb+depth/2),P(S+R,yy,zb+depth/2),P(0,0,1),provisional);}
  return;
 }
 if(m.role==='ledger'){
  const top=elev??restOn??96,wall=12;
  ctx.out.meshes.push(mesh(`struct:wall:${m.id}`,`${m.mark} · wall`,'site',box(P(-12,y+(section?.width??4)/2,0),P(S+12,y+(section?.width??4)/2+wall,top+24)),{referenceOnly:true}));
  member(ctx,m,m.id,P(0,y,top-depth/2),P(S,y,top-depth/2),P(0,0,1),provisional);
  return;
 }
 if(m.role==='brace'){member(ctx,m,m.id,P(0,y,(elev??restOn??60)-depth/2),P(S,y,(elev??restOn??60)-depth/2),P(0,0,1),provisional);return;}
 // Beam: clear span between two bearing walls, into a pocket at each end.
 const top=elev??restOn??(96+depth),zb=top-depth;
 pocketWall(ctx,`${m.id}:L`,-bearingWall(m.bearingL,L),0,y,zb,top,width,num(m.bearingL.wall)===null);
 pocketWall(ctx,`${m.id}:R`,S,S+bearingWall(m.bearingR,R),y,zb,top,width,num(m.bearingR.wall)===null);
 member(ctx,m,m.id,P(-L,y,zb+depth/2),P(S+R,y,zb+depth/2),P(0,0,1),provisional);
}

export function structuralScene(data:MeasureData):ShapeScene{return preMirrorScene(build(data));}
function build(data:MeasureData):ShapeScene{
 const out=emptyScene(),s=data.structural;
 if(!s)return out;
 if(!s.members.length){out.pending.push('Members');return out;}
 const ctx:Ctx={out,s};
 for(const m of s.members)if(!steelSection(m.profile))out.pending.push(`${m.mark} · profile`);
 const used=new Set<string>();let row=0;
 const frameBeam=s.frame.on?s.members.find(m=>m.role==='beam'):undefined;
 const frameCols=s.frame.on?s.members.filter(m=>m.role==='column'||m.role==='post'):[];
 if(s.frame.on&&frameBeam&&frameCols.length){
  // Two column positions: two members, or one member with qty 2.
  const cols:{m:StructMember;h:number|null}[]=[];
  for(const m of frameCols){const hs=heightReadings(m),n=Math.min(memberQty(m),2-cols.length);for(let i=0;i<n;i++)cols.push({m,h:hs.length?(n>1&&frameCols.length===1?hs[Math.min(i,hs.length-1)]:Math.min(...hs)):null});used.add(m.id);if(cols.length>=2)break;}
  while(cols.length<2)cols.push({...cols[0]});
  const cc=num(s.frame.cc),ccv=cc??120,colSec=steelSection(cols[0].m.profile),colD=colSec?.depth??6;
  if(cc===null)out.pending.push('Frame · column c/c');
  const hs=cols.map(c=>c.h),underside=Math.max(...hs.map(h=>h??96));
  const xs=[0,ccv];
  cols.forEach((c,i)=>{if(c.h===null)out.pending.push(`${c.m.mark} · height`);const spread=(()=>{const r=heightReadings(c.m);return r.length>1&&frameCols.length>1?Math.max(...r)-Math.min(...r):0;})();column(ctx,c.m,`${c.m.id}:f${i}`,xs[i],0,underside,c.h,spread);});
  // The slab between the columns, at each column's base.
  const bases=cols.map(c=>underside-(c.h??96));
  out.meshes.push(mesh('struct:slab:frame','Slab','site',slab([P(-30,-30,bases[0]-4),P(ccv+30,-30,bases[1]-4),P(ccv+30,30,bases[1]-4),P(-30,30,bases[0]-4)],P(0,0,1),4),{referenceOnly:true}));
  const beamSec=steelSection(frameBeam.profile),bd=beamSec?.depth??8;used.add(frameBeam.id);
  const cut=memberCut(frameBeam,s).length,beamLen=cut??ccv+colD,x0=ccv/2-beamLen/2;
  member(ctx,frameBeam,frameBeam.id,P(x0,0,underside+bd/2),P(x0+beamLen,0,underside+bd/2),P(0,0,1),cut===null);
  // The clear opening the frame stands in.
  const open=num(s.frame.opening);
  if(open!==null){const top=underside+bd+18,half=open/2,c=ccv/2,parts=[box(P(c-half-16,-6,0),P(c-half,6,top)),box(P(c+half,-6,0),P(c+half+16,6,top)),box(P(c-half-16,-6,top),P(c+half+16,6,top+10))];out.meshes.push(mesh('struct:frame:opening','Frame · opening','wall-preview',merge(...parts),{referenceOnly:true}));}
  else out.pending.push('Frame · opening');
  row=1;
 }
 // Columns and posts under a lone beam: their tallest reading sets the beam underside.
 const verticals=s.members.filter(m=>isVertical(m.role)&&!used.has(m.id));
 const tallest=verticals.flatMap(m=>heightReadings(m));
 const restOn=tallest.length?Math.max(...tallest):null;
 for(const m of s.members){
  if(used.has(m.id))continue;
  const y=row*ROW;row++;
  if(isSpanning(m.role)){spanning(ctx,m,y,restOn===null?null:restOn+(steelSection(m.profile)?.depth??0));continue;}
  // Vertical: one per piece (up to six), each at its own reading where there are several.
  const hs=heightReadings(m),n=Math.min(memberQty(m),6),section=steelSection(m.profile),pitch=Math.max(36,(section?.width??4)+30);
  if(!hs.length)out.pending.push(`${m.mark} · height`);
  const spread=hs.length>1?Math.max(...hs)-Math.min(...hs):0,underside=restOn??(hs.length?Math.max(...hs):96);
  for(let i=0;i<n;i++)column(ctx,m,`${m.id}:${i}`,i*pitch,y,underside,hs.length?Math.min(...hs):null,spread);
 }
 return out;
}
