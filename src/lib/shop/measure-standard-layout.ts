import type {MeasureData} from './measure';
import {parseMeas} from './measure-parse';

/** Explicit user-selected standard. Offsets align the flights to opposite outer
 * landing edges; existing dimensions and individual wall omissions are retained. */
export function applyStandardReturn(data:MeasureData,wall:'left'|'right'){
  const direction=wall==='right'?'left':'right';
  data.datums.orientation=wall==='right'?'right_wall':'left_wall';
  const railingPosts=data.posts.filter(p=>p.pointType==='railing_post');
  if(new Set(railingPosts.map(p=>p.side).filter(Boolean)).size<=1){
    data.rail.side=direction==='left'?'Left':'Right';
    railingPosts.forEach(p=>{p.side=direction;});
  }
  data.segments.forEach((s,i)=>{
    if(s.kind==='flight'||s.kind==='platform')s.wallSide=wall;
    if(s.kind!=='platform')return;
    s.turn='u';s.uDirection=direction;s.exitOffset='0';
    const before=data.segments[i-1];
    const width=before&&'width' in before?parseMeas(before.width):null;
    const landingWidth=parseMeas(s.depth);
    s.entryOffset=direction==='right'?'0':width!==null&&landingWidth!==null&&landingWidth>=width?String(landingWidth-width):'';
  });
}
