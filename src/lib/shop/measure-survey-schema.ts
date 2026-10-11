import {z} from 'zod';
import {ACTIONS,DEFECTS,JOB_TYPES,ROUTES} from './measure-survey';
const meas=z.string().max(60), label=z.string().max(300), id=z.string().min(1).max(100);
const positiveText=meas.refine(v=>!v.trim()||(Number.isFinite(Number(v))&&Number(v)>0),'Expected a positive number');
export const MeasureSurveySchema=z.object({
  jobType:z.enum([...JOB_TYPES,'inspect']),
  conditions:z.array(z.object({id,location:label,defect:z.enum(DEFECTS),severity:z.enum(['minor','major','unsafe']),sectionLoss:meas.refine(v=>!v.trim()||(Number.isFinite(Number(v))&&Number(v)>=0&&Number(v)<=100),'Expected 0–100%'),action:z.enum(ACTIONS),quantity:positiveText.refine(v=>!v.trim()||Number.isInteger(Number(v)),'Expected a whole quantity'),length:meas,photoSlot:id})).max(100),
  access:z.object({route:z.enum(['',...ROUTES]),doorWidth:meas,stairWidth:meas,turningRoom:label,maxLength:meas,maxWeight:positiveText,lift:z.boolean(),crane:z.boolean(),scaffold:z.boolean(),parking:label,permit:z.enum(['','yes','no','unknown']),power:z.enum(['','120','240','both','none']),generator:z.boolean(),pieces:z.array(z.object({id,label,length:meas,weight:positiveText})).max(100)}),
  verify:z.array(z.object({id,label,source:z.string().max(2000),original:meas,value:meas,who:z.string().max(120),when:z.union([z.literal(''),z.iso.datetime()]),tolerance:z.enum(['riseSum','runSum','rake','widthVar'])})).max(5),
});
