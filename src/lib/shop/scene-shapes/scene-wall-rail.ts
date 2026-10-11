// Wall-mounted handrail in 3D: the stair itself comes from the stair scene;
// this adds the wall plane along the wall side, the rail on its brackets at the
// measured height above the nosing line, the measured extensions past the top
// and bottom nosings and, where the sheet says so, returns back to the wall.
import type {MeasureData} from '../measure';
import type {Point3} from '../measure-geometry';
import {stairGeometry} from '../measure-geometry';
import {P,cylinder,emptyScene,flat,leadingNumber,memberSize,merge,mesh,num,polyTube,vec,type Geo,type ShapeScene} from './kit';

/** "5 @ 48"", "4", "48" o.c." → bracket count and/or spacing. */
export function bracketPlan(text:string):{count:number|null;spacing:number|null}{
 const s=(text||'').trim();if(!s)return {count:null,spacing:null};
 const at=s.match(/^\(?(\d+)\)?\s*(?:@|at|x|×)\s*(.+)$/i);
 if(at)return {count:+at[1],spacing:leadingNumber(at[2])};
 if(/o\.?c|spac|"|'/i.test(s))return {count:null,spacing:leadingNumber(s)};
 const n=leadingNumber(s);return n!==null&&Number.isInteger(n)&&n<40?{count:n,spacing:null}:{count:null,spacing:null};
}

export function wallRailScene(data:MeasureData):ShapeScene{
 const out=emptyScene(),model=stairGeometry(data);
 const steps=model?.treads.filter(t=>t.stepIdx!==null)||[];
 if(!steps.length)return out;
 // Which side is the wall: the rail side when one is named, else the wall the stair records.
 const side=/right/i.test(data.rail.side)?'right':/left/i.test(data.rail.side)?'left':data.datums.orientation==='right_wall'?'right':'left';
 const edge=(t:typeof steps[number])=>side==='left'?[t.corners[0],t.corners[1]]:[t.corners[3],t.corners[2]];
 const first=edge(steps[0])[0],last=edge(steps[steps.length-1])[0],topNose=edge(steps[steps.length-1])[1];
 const along=vec.unit(vec.sub(last,first)),horiz=vec.unit(P(along.x,along.y,0));
 // From the wall into the stair.
 const across=vec.unit(vec.sub(side==='left'?steps[0].corners[3]:steps[0].corners[0],first));
 const h=num(data.rail.height),H=h??36;
 if(h===null)out.pending.push('Rail height');
 const plan=bracketPlan(data.rail.brackets);
 if(plan.count===null&&plan.spacing===null)out.pending.push('Brackets');
 const rail=memberSize(data.materials.topRail)??{size:1.66,round:true};
 const offset=1.5+rail.size/2; // 1-1/2" clear to the wall
 const lift=(p:Point3)=>({...vec.add(p,vec.mul(across,offset)),z:p.z+H}),toWall=(p:Point3)=>vec.sub(p,vec.mul(across,offset));
 // Extensions: one number = both ends; two numbers = top, bottom.
 const ext=(data.rail.extensions||'').match(/\d+(?:[\s-]+\d+\/\d+)?(?:\.\d+)?/g)?.map(x=>num(x)??0)??[];
 const topExt=ext[0]??0,botExt=ext[1]??ext[0]??0;
 const a=lift(first),b=lift(last),pts:Point3[]=[];
 if(botExt>0)pts.push({...vec.sub(a,vec.mul(horiz,botExt)),z:a.z});
 pts.push(a,b);
 if(topExt>0)pts.push({...vec.add(b,vec.mul(horiz,topExt)),z:b.z});
 const ret=data.rail.returns.trim(),returns=!!ret&&!/^(no|none|n\/a|-)$/i.test(ret);
 if(returns){pts.unshift(toWall(pts[0]));pts.push(toWall(pts[pts.length-1]));}
 out.meshes.push(mesh('wall-rail:rail','Handrail','rail',polyTube(pts,rail.size/2),{provisional:h===null,entity:{part:'wall-rail:rail'}}));
 // Brackets along the sloped run: wall rosette, arm, saddle.
 const runLen=vec.len(vec.sub(b,a)),count=plan.count??(plan.spacing?Math.floor(runLen/plan.spacing)+1:3);
 const n=Math.max(2,Math.min(30,count)),pitch=plan.spacing?Math.min(plan.spacing,runLen/(n-1)):runLen/(n-1);
 const start=(runLen-pitch*(n-1))/2,parts:Geo[]=[];
 for(let i=0;i<n;i++){
  const c=vec.add(a,vec.mul(along,start+pitch*i)),w={...toWall(c),z:c.z-rail.size/2-1.5},elbow={...c,z:w.z};
  parts.push(cylinder(w,vec.add(w,vec.mul(across,.375)),1.25,18,P(0,0,1)),cylinder(w,elbow,.3,12),cylinder(elbow,{...c,z:c.z-rail.size/2},.3,12));
 }
 out.meshes.push(mesh('wall-rail:brackets','Brackets','attached',merge(...parts),{provisional:plan.count===null&&plan.spacing===null,entity:{part:'wall-rail:brackets'}}));
 // The wall (context): floor to well above the rail, along the whole run, 4" thick behind the stair edge.
 const lo={...vec.sub(first,vec.mul(horiz,botExt+18)),z:0},hi={...vec.add(topNose,vec.mul(horiz,topExt+18)),z:0},zTop=b.z+30;
 const face=[lo,hi,{...hi,z:zTop},{...lo,z:zTop}],back=face.map(p=>vec.sub(p,vec.mul(across,4)));
 // See-through: on a left-wall stair the wall stands between the camera and the rail.
 out.meshes.push(mesh('wall-rail:wall','Wall','wall-preview',flat([...face,...back],[[0,1,2,3],[7,6,5,4],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]]),{referenceOnly:true}));
 return out;
}
