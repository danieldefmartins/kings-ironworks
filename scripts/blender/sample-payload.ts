// Synthetic fixture only. Never reads or edits customer sheets.
import {writeFileSync} from 'node:fs';
import {newPresetMeasureData,newPost,blankLandingTransition,type FlightSegment} from '../../src/lib/shop/measure';
import {landingConnectionGeometry} from '../../src/lib/shop/measure-landings';
import {applyStandardReturn} from '../../src/lib/shop/measure-standard-layout';
import {blenderPayload,type DrawingRequest} from '../../src/lib/shop/shop-drawings';
const wall=process.argv[3]==='left'?'left':'right';
const side=wall==='right'?'left':'right';
const {data}=newPresetMeasureData('multi_flight',5,5);
data.rail.height='36';data.rail.side='Left';data.datums.postRef='centerline';data.materials.post='2 x 2 square';data.materials.topRail='2 x 1';data.materials.bottomRail='1 x 1';data.materials.picket='1/2 square';data.materials.picketSpacing='3 1/2';data.fab.bottomClearance='2';Object.assign(data.fab,{topRailConstruction:'continuous_per_flight',railHeightDatum:'finished_top_at_post',topRailStartExtension:'0',topRailEndExtension:'0',topRailEndCut:'plumb',postTopGap:'1/16'});data.materials.notes='SYNTHETIC example fitting values: zero overhang at free ends, landing reaches from calculated alignment, plumb ends and 1/16 vertical post fitting gap. Not approved shop standards.';
data.segments.forEach((s,index)=>{
  if(s.kind==='flight') {
    s.width='36';s.wallSide='right';s.angleDeg='32.47';s.rake='65.19';
    s.steps.forEach(step=>{step.rise='7';step.run='11';step.nosing='1';});
    for(const step of [index===0?0:1,index===8?4:3])data.posts.push({...newPost(index,step),side:'left',fromNosing:'2',fromEdge:'3 1/2',firstStepToPostEdge:String(step*11+1),mount:'Core-drill',anchor:'Concrete'});
  } else if(s.kind==='platform')Object.assign(s,{length:'48',depth:'84',entryOffset:'0',exitOffset:'0',slope:'0',turn:'left'});
});
applyStandardReturn(data,wall);
(data.segments[0] as FlightSegment).steps[2].wallSide='none';
data.landingTransitions=[];
for(let landing=1;landing<8;landing+=2){
 const t={...blankLandingTransition(landing,landing-1,landing+1,side),kind:'drop' as const,lowerPostId:data.posts.filter(p=>p.segIdx===landing-1).at(-1)!.id,upperPostId:data.posts.find(p=>p.segIdx===landing+1)!.id,lowerReach:'1',upperReach:'1',verticalAt:'lower' as const,higherEnd:'upper' as const,heightDifference:'7',horizontalSpan:'0'};
 const alignment=landingConnectionGeometry(data,t)!.layout.lowerReachForSquareBridge!;t.lowerReach=alignment.toFixed(4);
 const geometry=landingConnectionGeometry(data,t)!;t.horizontalSpan=geometry.horizontalSpan.toFixed(4);t.heightDifference=geometry.heightDifference.toFixed(4);data.landingTransitions.push(t);
}
data.joints.forEach(j=>{j.method='weld';j.gap='1/8';j.carriedBy='lower';});
const request={id:'f0000000-0000-4000-8000-000000000005',source_updated_at:'2026-09-08T00:00:00Z',snapshot:{name:`SYNTHETIC - 5 flight U stair / wall ${wall}`,shape:'builder',data}} as DrawingRequest;
writeFileSync(process.argv[2]||'/tmp/kiw-blender-sample.json',JSON.stringify(blenderPayload(request),null,2));
console.log('Synthetic five-flight fixture written');
