// Fence run: the measured segments chained in plan (turning at each end by the
// measured angle, + = left), the grade carried post to post by each segment's
// measured rise/fall, posts at the bay spacing, and panels that either rake
// with the slope or step level between posts — the choice that changes every
// panel on a hill. Layout: run starts at the origin heading +X; outside is −Y.
import type {MeasureData} from '../measure';
import {fenceSpacing} from '../measure-post-suggest-fence';
import {Geo,Guard,SceneOut,emptyScene,guardBay,len,p3,section,signed,type ShapeSceneOutput} from './build-kit';

export function fenceScene(data:MeasureData):ShapeSceneOutput{
 const f=data.fence;if(!f)return emptyScene();
 const out=new SceneOut(),m=data.materials;
 const post=section(f.postSize)??section(m.post),pw=post?.width??0;
 const topRail=section(m.topRail),bottomRail=section(m.bottomRail),picket=section(m.picket),gap=len(f.picketSpacing)??len(m.picketSpacing);
 const spacing=len(f.postSpacing)??len(f.panelWidth),footing=len(f.footingDepth);
 if(gap===null)out.need('Fence · picket spacing');
 let x=0,y=0,z=0,heading=0;
 const ground=new Geo();
 for(const [i,seg] of f.segments.entries()){
  const tag=seg.label||String(i+1),L=len(seg.length);
  if(L===null){out.need(`Fence segment ${tag} · length`);break;}
  const H=len(seg.height)??len(f.height),rise=signed(seg.gradeChange)??0,racked=seg.followsGrade!=='stepped';
  const unsure=rise!==0&&!seg.followsGrade;if(unsure)out.need(`Fence segment ${tag} · follows grade`);
  if(H===null)out.need(`Fence segment ${tag} · height`);
  const ux=Math.cos(heading),uy=Math.sin(heading),start=p3(x,y,z),end=p3(x+ux*L,y+uy*L,z+rise);
  // No panel count yet: the suggested equal panels (measure-post-suggest-fence), drawn as amber ghosts.
  const own=Math.round(len(seg.panels)??0),panels=own||Math.max(1,Math.ceil(L/(spacing??fenceSpacing(data))-1e-6));
  if(!own&&!spacing)out.need(`Fence segment ${tag} · post spacing`);
  const n=Math.max(1,panels),at=(k:number)=>p3(start.x+ux*L*k/n,start.y+uy*L*k/n,start.z+rise*k/n);
  // Grade ribbon either side of the line, following the measured fall.
  const nx=-uy*18,ny=ux*18;ground.quad(p3(start.x-nx,start.y-ny,start.z),p3(end.x-nx,end.y-ny,end.z),p3(end.x+nx,end.y+ny,end.z),p3(start.x+nx,start.y+ny,start.z));
  const guard=new Guard(),posts=new Guard(),entity={part:`fence-segment-${seg.id}`};
  for(let k=0;k<n;k++){
   const a=at(k),b=at(k+1);if(H===null)continue;
   // Stepped: each panel is level, hung from its uphill end. Racked: it parallels the grade.
   const bottomA=racked?a.z:Math.max(a.z,b.z),bottomB=racked?b.z:Math.max(a.z,b.z);
   guardBay(guard,{a,b,bottomA,bottomB,height:H,topRail,bottomRail,picket,gap,postWidth:pw});
  }
  // Posts from grade to the panel tops either side of them.
  for(let k=i===0?0:1;k<=n;k++){
   const p=at(k);if(H===null){continue;}
   const tops=[k>0?(racked?p.z:Math.max(at(k-1).z,p.z)):null,k<n?(racked?p.z:Math.max(p.z,at(k+1).z)):null].filter((v):v is number=>v!==null);
   posts.add(p3(p.x,p.y,p.z),p3(p.x,p.y,Math.max(...tops)+H),post,{x:ux,y:uy,z:0});
   if(footing)posts.add(p3(p.x,p.y,p.z),p3(p.x,p.y,p.z-footing),null);
  }
  const label=`Fence segment ${tag}`;
  guard.emit(out,`fence:segment:${seg.id}`,label,{provisional:unsure,entity});
  out.mesh(`fence:posts:${seg.id}`,`${label} · posts`,'post',posts.geo,{entity,provisional:!own});
  posts.axes.forEach(points=>out.line(`fence:posts:${seg.id}`,`${label} · posts`,'post',points,{entity,provisional:!own}));
  if(H===null)out.line(`fence:line:${seg.id}`,label,'rail',[start,end],{provisional:true,entity});
  x=end.x;y=end.y;z=end.z;
  const turn=signed(seg.turnDeg);heading+=((turn??0)*Math.PI)/180;
 }
 if(!f.segments.length)out.need('Fence · segments');
 out.mesh('fence:grade','Grade along the run','site',ground,{referenceOnly:true,entity:{part:'fence-grade'}});
 return out.done();
}
