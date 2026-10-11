// Realistic seeded sheets for the opening / structural / fire-escape / spiral /
// wall-rail / custom 3D adapters. Used by the unit tests.
import {newMeasureData,newPlanPath,newPlanPost,type MeasureData} from '../measure';
import {newOpeningUnit} from '../measure-opening';
import {newMember,newReading} from '../measure-structural';

/** Three basement window guards in brick, inside the reveal; one badly out of square. */
export function openingFixture():MeasureData{
 const d=newMeasureData('opening',1),o=d.opening!;
 Object.assign(o,{product:'guard',mount:'reveal',clearance:'1/4',substrate:'brick',anchor:'sleeve'});
 o.units=[
  {...newOpeningUnit('Basement W1'),wTop:'32',wMid:'32 1/8',wBot:'32 1/4',hLeft:'18',hCenter:'18 1/8',hRight:'18 1/4',diagA:'36 3/4',diagB:'36 5/8',reveal:'8',sillProjection:'1 1/2',sillSlope:'1/2',dropOutside:'6'},
  {...newOpeningUnit('Basement W2'),wTop:'32',wMid:'32',wBot:'32',hLeft:'18',hCenter:'18',hRight:'18',diagA:'36 3/4',diagB:'36 3/4',reveal:'8'},
  {...newOpeningUnit('Basement W3'),wTop:'30 1/2',wMid:'31',wBot:'31 3/4',hLeft:'17 1/2',hCenter:'18',hRight:'19',diagA:'36',diagB:'37',reveal:'8 1/2'},
 ];
 return d;
}

/** Lincoln moment frame: W8x15 beam on two W6x20 columns, slab falls 3/4" across. */
export function structuralFixture():MeasureData{
 const d=newMeasureData('structural',1),s=d.structural!;
 const beam=newMember('beam','B1','W8x15'),c1=newMember('column','C1','W6x20'),c2=newMember('column','C2','W6x20');
 for(const [c,a,b] of [[c1,'92 1/2','92 5/8'],[c2,'93 1/4','93 3/8']] as const){c.heights=[{...newReading('front'),value:a},{...newReading('back'),value:b}];c.basePlate='10x10x1/2';c.capPlate='8x8x3/8';c.shim='0';}
 s.members=[beam,c1,c2];
 s.frame={on:true,opening:'150',cc:'138',diagA:'',diagB:'',dwgOpening:'',dwgCc:''};
 return d;
}

/** A three-storey fire escape on brick, ladder off the second floor. */
export function fireFixture():MeasureData{
 const d=newMeasureData('fire_escape',3),f=d.fire!;
 f.purpose='new';
 f.levels.forEach((l,i)=>Object.assign(l,{heightAboveGrade:String(14+(2-i)*9.5)+"'",floorToFloor:i<2?"9' 6":'',platLength:'144',platWidth:'42',openingType:'window',openingW:'34',openingH:'60',sillToPlatform:'26',
  stairRisers:i<2?'15':'',stairRise:i<2?'7 5/8':'',stairRun:i<2?'7':'',stairWidth:i<2?'22':'',guardHeight:'42',picketSpacing:'4',anchorCount:'3',anchorSpacing:'60'}));
 Object.assign(f.ladder,{present:true,type:'drop',length:"12'",width:'16',rungSpacing:'12',stowedAboveGrade:"9' 6"});
 return d;
}

/** A 5' spiral: 12 treads, 104" floor to floor, 360° counter-clockwise. */
export function spiralFixture():MeasureData{
 const d=newMeasureData('spiral',12);
 Object.assign(d.spiral!,{floorToFloor:'104',rotationDeg:'360',diameter:'60',columnSize:'4" pipe'});
 d.rail.height='36';
 return d;
}

/** Wall rail on a 6-riser interior stair, brackets 4 @ 48", extensions both ends, returns. */
export function wallRailFixture():MeasureData{
 const d=newMeasureData('wall_rail',6);
 const f=d.segments[0];if(f.kind!=='flight')throw new Error('flight');
 f.width='36';f.steps.forEach(s=>{s.rise='7 1/2';s.run='10 1/2';});
 Object.assign(d.rail,{kind:'Handrail',height:'35',side:'Left',extensions:'12',returns:'Return to wall',brackets:'4 @ 32'});
 d.materials.topRail='1-1/2" Sch40 pipe';
 return d;
}

/** Custom drawn L-shaped run: 10' then 6' with a 3-step flight, two posts placed. */
export function customFixture():MeasureData{
 const d=newMeasureData('custom',1),path=newPlanPath('Porch');
 path.points=[{x:0,y:0},{x:100,y:0},{x:100,y:60},{x:100,y:90}];
 const seg=(len:string,kind:''|'flight'='',extra={})=>({len,note:'',kind,steps:'',rise:'',run:'',width:'',stepMeasures:[],...extra});
 path.segs=[seg('120'),seg('72'),seg('33','flight',{steps:'3',rise:'7',run:'11'})];
 d.plan={points:[],closed:false,segs:[],paths:[path]};
 d.rail.height='36';
 Object.assign(d.materials,{post:'2" sq tube',topRail:'1-1/2" sq tube',picket:'1/2" sq solid',picketSpacing:'3 7/8'});
 const p1=newPlanPost(path.id,0);p1.pos='0';const p2=newPlanPost(path.id,1);p2.pos='72';
 d.posts=[p1,p2];
 return d;
}
