import type {MeasureData} from './measure';
import {stairGeometry,type Point3} from './measure-geometry';
import {parseMeas} from './measure-parse';
export type HouseContext={vertices:Point3[];faces:number[][];roof:Point3[][];label:Point3;referenceOnly:true};
/** Deliberately illustrative. The house is not a site mesh, measurement anchor,
 * connection host or fabricated member. It stays put when the railing moves. */
export function houseContext(data:MeasureData):HouseContext|null{
 const house=data.sceneSetup?.house;if(!house)return null;
 const unplaced:MeasureData={...data,sceneSetup:data.sceneSetup?{...data.sceneSetup,placement:undefined}:undefined};
 const points=stairGeometry(unplaced)?.treads.flatMap(t=>t.corners)||[{x:0,y:0,z:0},{x:72,y:36,z:36}];
 const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y)),maxZ=Math.max(...points.map(p=>p.z));
 const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
 const parsed=house.offset?.trim()?parseMeas(house.offset):12,gap=parsed!==null&&Number.isFinite(parsed)&&parsed>=0?clamp(parsed,0,1200):12;
 const alongX=house.side==='left'||house.side==='right',span=clamp((alongX?maxX-minX:maxY-minY)+24,72,144),depth=60,height=clamp(maxZ+48,96,144);
 const width=alongX?span:depth,length=alongX?depth:span;
 const x=alongX?(minX+maxX-span)/2:house.side==='front'?minX-gap-depth:maxX+gap;
 const y=!alongX?(minY+maxY-span)/2:house.side==='left'?minY-gap-depth:maxY+gap;
 const vertices:Point3[]=[{x,y,z:0},{x:x+width,y,z:0},{x:x+width,y:y+length,z:0},{x,y:y+length,z:0},{x,y,z:height},{x:x+width,y,z:height},{x:x+width,y:y+length,z:height},{x,y:y+length,z:height}];
 const ridgeA=alongX?{x,y:y+length/2,z:height+24}:{x:x+width/2,y,z:height+24};
 const ridgeB=alongX?{x:x+width,y:y+length/2,z:height+24}:{x:x+width/2,y:y+length,z:height+24};
 return {vertices,faces:[[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]],roof:alongX?[[vertices[4],ridgeA,vertices[7]],[vertices[5],ridgeB,vertices[6]],[ridgeA,ridgeB],[vertices[4],vertices[5]],[vertices[7],vertices[6]]]:[[vertices[4],ridgeA,vertices[5]],[vertices[7],ridgeB,vertices[6]],[ridgeA,ridgeB],[vertices[4],vertices[7]],[vertices[5],vertices[6]]],label:{x:x+width/2,y:y+length/2,z:height+36},referenceOnly:true};
}
