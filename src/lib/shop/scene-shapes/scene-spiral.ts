// Spiral stair in 3D: centre column, wedge treads at the measured diameter,
// each one riser (floor-to-floor ÷ treads) above the last and turned by the
// measured total rotation ÷ treads, the top tread squared off as the landing,
// a baluster per tread and the handrail helix at the outside edge. Column at
// the origin; the stair starts facing −y (toward the default front view).
import type {MeasureData} from '../measure';
import type {Point3} from '../measure-geometry';
import {P,cylinder,emptyScene,flat,leadingNumber,merge,mesh,num,pipe,polyTube,type Geo,type ShapeScene} from './kit';

export function spiralScene(data:MeasureData):ShapeScene{
 const out=emptyScene(),s=data.spiral;
 if(!s)return out;
 const ftf=num(s.floorToFloor),count=num(s.treads)!==null?Math.round(num(s.treads)!):null,rot=num(s.rotationDeg),dia=num(s.diameter);
 const col=leadingNumber(s.columnSize),railH=num(data.rail.height);
 if(ftf===null)out.pending.push('Floor to floor');
 if(count===null)out.pending.push('Treads');
 if(rot===null)out.pending.push('Rotation');
 if(dia===null)out.pending.push('Diameter');
 if(col===null)out.pending.push('Column');
 const n=Math.max(2,Math.min(40,count??12)),H=ftf??n*8.5,R=(dia??60)/2,turn=(rot??360)*Math.PI/180,cr=(col??4)/2;
 const riser=H/n,step=turn/n,sign=s.direction==='cw'?-1:1,start=-Math.PI/2;
 const geomProvisional=ftf===null||count===null||rot===null||dia===null;
 // Centre column: floor to rail height above the landing.
 out.meshes.push(mesh('spiral:column','Centre column','attached',pipe(P(0,0,0),P(0,0,H+(railH??36)),cr,Math.min(.3,cr/3),24,P(1,0,0)),{provisional:col===null||ftf===null,entity:{part:'spiral:column'}}));
 const at=(a:number,r:number,z:number):Point3=>P(r*Math.cos(a),r*Math.sin(a),z);
 const treadT=1.5,treads:Geo[]=[],balusters:Geo[]=[],helix:Point3[]=[];
 for(let i=0;i<n;i++){
  const a0=start+sign*step*i,a1=a0+sign*step,z=riser*(i+1),last=i===n-1;
  const arc=Array.from({length:7},(_,k)=>a0+(a1-a0)*k/6);
  let outline:Point3[];
  if(last){
   // Landing: the last tread squared to the column's tangent lines, a quarter platform.
   const q0=a0,q1=a0+sign*Math.PI/2,corner=at((q0+q1)/2,R*Math.SQRT2,z);
   outline=[at(q0,cr,z),at(q0,R,z),corner,at(q1,R,z),at(q1,cr,z)];
  }else outline=[at(a0,cr,z),...arc.map(a=>at(a,R,z)),at(a1,cr,z)];
  if(sign<0)outline.reverse();
  const bottom=outline.map(p=>({...p,z:z-treadT})),k=outline.length;
  treads.push(flat([...bottom,...outline],[Array.from({length:k},(_,j)=>k-1-j),Array.from({length:k},(_,j)=>k+j),...outline.map((_,j)=>[j,(j+1)%k,(j+1)%k+k,j+k])]));
  const bx=at(a0+sign*step*.5,R-1.25,z);balusters.push(cylinder(bx,{...bx,z:z+(railH??36)},.375,10));
  if(!last)for(let j=0;j<6;j++)helix.push(at(a0+sign*step*(j/6+.5),R-1.25,z+riser*j/6+(railH??36)));
 }
 helix.push(at(start+sign*step*(n-.5),R-1.25,H+(railH??36)));
 out.meshes.push(mesh('spiral:treads','Treads','surface',merge(...treads),{provisional:geomProvisional,entity:{part:'spiral:treads'}}));
 out.meshes.push(mesh('spiral:balusters','Balusters','rail',merge(...balusters),{provisional:geomProvisional||railH===null,entity:{part:'spiral:rail'}}));
 out.meshes.push(mesh('spiral:handrail','Handrail','rail',polyTube(helix,.84,12),{provisional:geomProvisional||railH===null,entity:{part:'spiral:rail'}}));
 if(railH===null)out.pending.push('Rail height');
 return out;
}
