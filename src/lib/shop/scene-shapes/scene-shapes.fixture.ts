// Realistic seeded sheets for the gate / fence / deck / balcony / well scene
// adapters. The same values are used to seed the TEST org for screenshots.
import {newMeasureData,newDeckSide,newFenceSegment,newWallBand,type MeasureData} from '../measure';

const steel=(d:MeasureData)=>{Object.assign(d.materials,{post:'2x2',topRail:'1-1/2 x 1-1/2',bottomRail:'1-1/2 x 1-1/2',picket:'3/4 sq',picketSpacing:'3 7/8'});return d;};

export function gateFixture(){
 const d=steel(newMeasureData('gate',1));d.materials.post='4x4';
 Object.assign(d.gate!,{use:'driveway',operation:'double_swing',widthTop:'143 7/8',widthBottom:'144',heightHinge:'60',heightLatch:'60 1/4',groundClearance:'2 1/2',gradeRise:'1 1/2',swingDir:'in',hingeSide:'left',postSize:'4x4',footingDepth:'42',infill:'pickets',picketSpacing:'3 3/4'});
 return d;
}
export function fenceFixture(){
 const d=steel(newMeasureData('fence',3)),f=d.fence!;
 f.segments=[
  {...newFenceSegment('A'),length:'16\' 0"',height:'',turnDeg:'90',gradeChange:'-8',followsGrade:'racked'},
  {...newFenceSegment('B'),length:'192',height:'',turnDeg:'-90',gradeChange:'-18',followsGrade:'stepped'},
  {...newFenceSegment('C'),length:'96',height:'',turnDeg:'',gradeChange:'0',followsGrade:''},
 ];
 Object.assign(f,{postSpacing:'72',postSize:'2x2',height:'48',footingDepth:'36',picketSpacing:'3 7/8'});
 return d;
}
export function deckFixture(){
 const d=steel(newMeasureData('deck',3)),k=d.deck!;
 k.sides=[
  {...newDeckSide('1'),length:'192',railed:true,turnDeg:'90',heightAboveGrade:'36'},
  {...newDeckSide('2'),length:'144',railed:true,turnDeg:'90',heightAboveGrade:'48',opening:'stairs',openingWidth:'42'},
  {...newDeckSide('3'),length:'192',railed:true,turnDeg:'',heightAboveGrade:'40'},
 ];
 Object.assign(k,{surface:'composite',guardHeight:'36',picketSpacing:'3 7/8',postSpacing:'72',mount:'fascia',deckingThickness:'1',rimJoistSize:'2x10'});
 return d;
}
export function balconyFixture(){
 const d=steel(newMeasureData('balcony',1));
 Object.assign(d.balcony!,{kind:'balcony',mount:'core_drill',edgeLength:'120',projection:'60',slabThickness:'6',slabMaterial:'concrete',guardHeight:'42',picketSpacing:'3 7/8',edgeDistance:'4',anchorEmbedment:'3',returns:'Into the wall both ends'});
 return d;
}
export function julietFixture(){
 const d=steel(newMeasureData('balcony',1));
 Object.assign(d.balcony!,{kind:'juliet',mount:'fascia',edgeLength:'',doorOpening:'60',projection:'4',guardHeight:'42',picketSpacing:'3 7/8'});
 return d;
}
export function wellFixture(){
 const d=steel(newMeasureData('window_well',1)),w=d.well!;
 Object.assign(w,{construction:'poured_concrete',lengthAtHouse:'72',projection:'40',insideLength:'60',insideProjection:'34',wallThickness:'6',depth:'48',topToGrade:'4',windowW:'36',windowH:'30',sillToFloor:'12',deliverables:['guard','gate','ladder'],guardHeight:'36',gateWidth:'30',gateSwing:'out',gateHinge:'left',ladderWidth:'16',ladderRungs:'4',ladderSpacing:'12',ladderStandoff:'7',ladderTopExt:'12',postToWall:'2'});
 w.bands=[
  {...newWallBand('Water table'),setback:'0',fromTop:'-14',toTop:'-8'},
  {...newWallBand('Lap siding'),setback:'1 1/2',fromTop:'-60',toTop:'-14'},
  {...newWallBand('Foundation'),setback:'3',fromTop:'-8',toTop:'48'},
 ];
 return d;
}
