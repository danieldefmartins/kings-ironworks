import {describe,it,expect} from 'vitest';
import {MEASURE_SHAPES,newMeasureData,normalizeMeasureData} from './measure';
import {actionTotals,blankSurvey,deliveryWarnings,newCondition,setSurveyJobType,reconcileFireSurvey,secondResult,surveyDimensions,surveyFor,verifiedBy,type SecondMeasure} from './measure-survey';
import {MeasureSurveySchema} from './measure-survey-schema';
import {nativeGeometrySignature} from './measure-native-steel';
import {surveyText} from './measure-survey-i18n';
const row=(patch:Partial<SecondMeasure>={}):SecondMeasure=>({id:'v1',label:'Width',source:'',original:'36',value:'36 1/4',who:'Alex',when:'2026-10-11T14:00:00.000Z',tolerance:'widthVar',...patch});
describe('sheet surveys',()=>{
  it.each(MEASURE_SHAPES)('persists through normalization and validation for %s',shape=>{
    const d=newMeasureData(shape,4);d.survey=blankSurvey();d.survey.jobType='restore';d.survey.conditions=[newCondition('c1')];d.survey.access.maxLength="6'";d.survey.verify=[row()];
    expect(MeasureSurveySchema.parse(normalizeMeasureData(d).survey)).toEqual(d.survey);
  });
  it('retains legacy fire inspection and repair condition data',()=>{
    const d=newMeasureData('fire_escape',2);d.fire!.purpose='repair';expect(surveyFor(d).jobType).toBe('repair');d.survey=blankSurvey();d.survey.jobType='restore';expect(normalizeMeasureData(d).fire).toEqual(d.fire);
  });
  it('aligns job type and fire purpose without changing inspection or condition records',()=>{
    const d=newMeasureData('fire_escape',2);setSurveyJobType(d,'restore');expect(d.fire!.purpose).toBe('repair');
    d.fire!.purpose='new';reconcileFireSurvey(d);expect(d.survey!.jobType).toBe('new');
    d.fire!.purpose='inspect';reconcileFireSurvey(d);expect(d.survey!.jobType).toBe('inspect');
    setSurveyJobType(d,'inspect');expect(d.fire!.purpose).toBe('inspect');
    setSurveyJobType(d,'replace');expect(d.fire!.purpose).toBe('new');
  });
  it('sums quantities and per-item fractional lengths, flags unknowns',()=>{
    const a=newCondition('a'),b=newCondition('b'),c=newCondition('c');a.quantity='2';a.length="3' 4-1/2\"";b.quantity='3';b.length='10';c.action='galvanize';
    expect(actionTotals([a,b,c])).toEqual([{action:'weld_repair',quantity:5,length:111,incomplete:false},{action:'galvanize',quantity:0,length:0,incomplete:true}]);
    b.length='';expect(actionTotals([a,b])[0].incomplete).toBe(true);
    a.quantity='bad';expect(actionTotals([a])[0]).toMatchObject({quantity:0,length:0,incomplete:true});
  });
  it('grades inclusive shop tolerance boundaries and incomplete evidence',()=>{
    const d=newMeasureData('straight',4);
    expect(secondResult(d,row({value:'36 3/8'})).level).toBe('green');
    expect(secondResult(d,row({value:'37'})).level).toBe('yellow');
    expect(secondResult(d,row({value:'37 1/16'})).level).toBe('red');
    expect(secondResult(d,row({who:''})).level).toBe('pending');
    expect(secondResult(d,row({when:''})).level).toBe('pending');
    expect(secondResult(d,row({value:'bad'})).delta).toBe(null);
  });
  it('invalidates source changes and deletion, preserving stable identities after reorder',()=>{
    const d=newMeasureData('straight',4);const flight=d.segments[0];if(flight.kind!=='flight')throw new Error('Expected flight');flight.id='flight-a';flight.width='36';
    const source=surveyDimensions(d).find(v=>v.keys.at(-1)==='width')!.source;const v=row({source});
    expect(secondResult(d,v).level).toBe('green');d.segments.unshift({...flight,id:'flight-b',width:'42'});
    expect(secondResult(d,v).level).toBe('green');flight.width='40';expect(secondResult(d,v).level).toBe('stale');
    d.segments.splice(1,1);expect(secondResult(d,v).level).toBe('stale');
  });
  it('requires three to five green checks for a verified badge',()=>{
    const d=newMeasureData('straight',4);d.survey=blankSurvey();d.survey.verify=[row(),row({id:'v2',label:'Height'})];expect(verifiedBy(d)).toBe(null);
    d.survey.verify.push(row({id:'v3',label:'Depth',who:'Jordan'}));expect(verifiedBy(d)).toBe('Alex, Jordan');
    d.survey.verify[1].value='38';expect(verifiedBy(d)).toBe(null);
  });
  it('checks manual cuts, rail spans and assembled pieces without treating route length as a piece',()=>{
    const d=newMeasureData('straight',4);d.survey=blankSurvey();d.survey.access.maxLength="6'";d.survey.access.maxWeight='150';
    d.survey.access.pieces=[{id:'p1',label:'Gate leaf',length:"8'",weight:'200'},{id:'p2',label:'Fits',length:'72',weight:'150'}];
    d.steelPlan={kerf:'',trim:'',rows:[{id:'r',label:'Rail',role:'toprail',source:'',item:null,stock:"20'",checked:'',cuts:[{id:'c',mark:'T1',qty:2,length:'80'}]}]};
    expect(deliveryWarnings(d)).toMatchObject([{id:'cut:r:c',splice:true,overweight:false},{id:'p1',splice:true,overweight:true}]);
    d.survey.access.maxLength='';d.survey.access.maxWeight='';expect(deliveryWarnings(d)).toEqual([]);
  });
  it('rejects malformed payloads and excess critical dimensions',()=>{
    const s=blankSurvey();s.verify=Array.from({length:6},(_,i)=>row({id:String(i)}));expect(MeasureSurveySchema.safeParse(s).success).toBe(false);
    s.verify=[row({when:'yesterday'})];expect(MeasureSurveySchema.safeParse(s).success).toBe(false);s.verify=[];
    s.conditions=[{...newCondition('x'),sectionLoss:'101'}];expect(MeasureSurveySchema.safeParse(s).success).toBe(false);
    s.conditions[0].sectionLoss='20';s.conditions[0].quantity='-1';expect(MeasureSurveySchema.safeParse(s).success).toBe(false);
  });
  it('keeps fitted cuts current when access or second-measure evidence changes',()=>{
    const d=newMeasureData('straight',4);const signature=nativeGeometrySignature(d);
    d.nativeSteel={signature,sourceUpdatedAt:'2026-10-11T14:00:00Z',drawingId:'b3000000-0000-4000-8000-000000000001',pending:[],sources:[{key:'native:T1',label:'T1',role:'toprail',length:96,profile:'bar',signature}]};
    d.survey=blankSurvey();d.survey.access.maxLength='72';expect(deliveryWarnings(d)).toMatchObject([{id:'native:T1',splice:true}]);
    d.survey.verify=[row()];expect(deliveryWarnings(d)).toHaveLength(1);
  });
  it('carries forward the existing maximum transport piece length',()=>{
    const d=newMeasureData('straight',4);d.fab.maxPiece="6'";expect(surveyFor(d).access.maxLength).toBe("6'");
  });
  it('does not verify repeated or unnamed checks',()=>{
    const d=newMeasureData('straight',4);d.survey=blankSurvey();d.survey.verify=[row(),row({id:'v2'}),row({id:'v3'})];expect(verifiedBy(d)).toBe(null);
    expect(secondResult(d,row({label:''})).level).toBe('pending');
  });
  it('translates all core controls',()=>{expect(surveyText('pt','splice')).toBe('Adicionar emenda');expect(surveyText('es','verify')).toBe('Segunda medición');});
});
