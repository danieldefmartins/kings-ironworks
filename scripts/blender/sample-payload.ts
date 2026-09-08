// Synthetic fixture only. Never reads or edits customer sheets.
import {writeFileSync} from 'node:fs';
import {newPresetMeasureData,newPost,blankLandingTransition,type FlightSegment} from '../../src/lib/shop/measure';
import {landingConnectionGeometry} from '../../src/lib/shop/measure-landings';
import {blenderPayload,type DrawingRequest} from '../../src/lib/shop/shop-drawings';
const {data}=newPresetMeasureData('multi_flight',5,5);
data.rail.height='36';data.rail.side='Left';data.datums.postRef='centerline';data.materials.post='2 x 2 square';data.materials.topRail='2 x 1';
data.segments.forEach((s,index)=>{
  if(s.kind==='flight') {
    s.width='36';s.wallSide='right';s.angleDeg='32.47';s.rake='65.19';
    s.steps.forEach(step=>{step.rise='7';step.run='11';step.nosing='1';});
    for(const step of [0,4])data.posts.push({...newPost(index,step),side:'left',fromNosing:'2',fromEdge:'3 1/2',firstStepToPostEdge:step?'46':'2',mount:'Core-drill',anchor:'Concrete'});
  } else if(s.kind==='platform')Object.assign(s,{length:'48',depth:'48',entryOffset:'0',exitOffset:'6',slope:'0',turn:'left'});
});
(data.segments[0] as FlightSegment).steps[2].wallSide='none';
data.landingTransitions=[];
for(let landing=1;landing<8;landing+=2){
 const t={...blankLandingTransition(landing,landing-1,landing+1,'left'),kind:'drop' as const,lowerPostId:data.posts.filter(p=>p.segIdx===landing-1).at(-1)!.id,upperPostId:data.posts.find(p=>p.segIdx===landing+1)!.id,lowerReach:'0',upperReach:'0',verticalAt:'upper' as const,higherEnd:'upper' as const,heightDifference:'7',horizontalSpan:'0'};
 const geometry=landingConnectionGeometry(data,t)!;t.horizontalSpan=geometry.horizontalSpan.toFixed(3);data.landingTransitions.push(t);
}
data.joints.forEach(j=>{j.method='weld';j.gap='1/8';j.carriedBy='lower';});
const request={id:'f0000000-0000-4000-8000-000000000005',source_updated_at:'2026-09-08T00:00:00Z',snapshot:{name:'SYNTHETIC - five-flight railing',shape:'builder',data}} as DrawingRequest;
writeFileSync(process.argv[2]||'/tmp/kiw-blender-sample.json',JSON.stringify(blenderPayload(request),null,2));
console.log('Synthetic five-flight fixture written');
