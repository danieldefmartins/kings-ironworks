import { newMeasureData, newPost, newPlatformSegment, type FlightSegment } from './measure';
import { newSiteModel, newSiteObject, type SiteObject } from './measure-site';

/** Synthetic porch; never a customer record. */
export function porchSiteFixture() {
  const data=newMeasureData('stair_platform',4);
  const f=data.segments[0] as FlightSegment;f.width='48';f.ctrlRise='28';f.ctrlRun='44';f.rake='52.15';
  f.steps.forEach(s=>Object.assign(s,{rise:'7',run:'11',levelGap:'0',nosing:'1'}));
  Object.assign(data.segments[1],newPlatformSegment('none'),{length:'72',depth:'96',entryOffset:'24',exitOffset:'0',slope:'0',diag:'120'});
  data.rail.height='36';data.rail.side='Both';data.datums.postRef='centerline';
  data.materials.post='2" sq tube';data.materials.topRail='Flat bar 1-1/2x3/8';
  data.materials.bottomRail='1" sq tube';data.materials.picket='1/2" sq solid';data.materials.picketSpacing='3 1/2';
  Object.assign(data.fab,{topRailConstruction:'continuous_per_flight',railHeightDatum:'finished_top_at_post',topRailStartExtension:'1',topRailEndExtension:'1',topRailEndCut:'plumb',postTopGap:'1/16',bottomRailConstruction:'between_posts',bottomRailEndGap:'1/16',bottomClearance:'2',picketEndGap:'1/32',picketSpacingDatum:'max_clear_horizontal',infill:'vertical pickets'});
  data.posts=(['left','right'] as const).flatMap(side=>[0,3].map(step=>Object.assign(newPost(0,step),{side,fromNosing:'3',fromEdge:'3',mount:'Core-drill',anchor:'Concrete',embedment:'4'})));
  data.site=newSiteModel();data.site.datum='Bottom-left of first stair at finished ground level';
  const object=(kind:SiteObject['kind'],id:string,label:string,values:Partial<SiteObject>)=>Object.assign(newSiteObject(kind,id,label),{source:'tape',verified:true,x:'0',y:'0',z:'0'},values);
  data.site.objects=[
    object('wall','wall-1','House wall',{x:'116',y:'-24',z:'28',length:'6',depth:'96',height:'84'}),
    object('column','column-1','Left column',{x:'44',y:'-24',z:'28',length:'8',depth:'8',height:'84'}),
    object('column','column-2','Right column',{x:'44',y:'64',z:'28',length:'8',depth:'8',height:'84'}),
    object('slab','slab-1','Lower walkway',{x:'-48',y:'-12',z:'-4',length:'48',depth:'72',height:'4'}),
  ];
  return data;
}
