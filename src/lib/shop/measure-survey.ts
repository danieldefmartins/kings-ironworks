import type { MeasureData } from './measure';
import { parseMeas } from './measure-parse';
import { TOLERANCES, type Tol } from './measure-checks';
import { steelSources } from './measure-steel';

export const JOB_TYPES = ['new', 'repair', 'restore', 'replace'] as const;
export const DEFECTS = ['rust_through', 'section_loss', 'broken_weld', 'missing_picket', 'missing_scroll', 'failed_anchor', 'cracked_substrate', 'paint_failure', 'bent_member'] as const;
export const ACTIONS = ['weld_repair', 'replace_member', 're_anchor', 'blast_prime_dtm', 'galvanize'] as const;
export const ROUTES = ['street', 'driveway', 'stairs', 'elevator', 'house'] as const;
export type JobType = typeof JOB_TYPES[number] | 'inspect';
export interface ConditionItem {
  id: string; location: string; defect: typeof DEFECTS[number]; severity: 'minor' | 'major' | 'unsafe';
  sectionLoss: string; action: typeof ACTIONS[number]; quantity: string; length: string; photoSlot: string;
}
export interface InstallAccess {
  route: '' | typeof ROUTES[number]; doorWidth: string; stairWidth: string; turningRoom: string;
  maxLength: string; maxWeight: string; lift: boolean; crane: boolean; scaffold: boolean;
  parking: string; permit: '' | 'yes' | 'no' | 'unknown'; power: '' | '120' | '240' | 'both' | 'none'; generator: boolean;
  /** Explicit assembled pieces supplement the material cut list. */
  pieces: { id: string; label: string; length: string; weight: string }[];
}
export interface SecondMeasure {
  id: string; label: string; source: string; original: string; value: string; who: string; when: string;
  tolerance: 'riseSum' | 'runSum' | 'rake' | 'widthVar';
}
export interface MeasureSurvey { jobType: JobType; conditions: ConditionItem[]; access: InstallAccess; verify: SecondMeasure[] }
export const blankSurvey = (): MeasureSurvey => ({jobType:'new',conditions:[],verify:[],access:{route:'',doorWidth:'',stairWidth:'',turningRoom:'',maxLength:'',maxWeight:'',lift:false,crane:false,scaffold:false,parking:'',permit:'',power:'',generator:false,pieces:[]}});
export function surveyFor(data: MeasureData): MeasureSurvey {
  const blank=blankSurvey();
  return data.survey || {...blank,jobType:data.fire?.purpose==='inspect'?'inspect':data.fire?.purpose==='repair'?'repair':'new',access:{...blank.access,maxLength:data.fab.maxPiece||''}};
}
/** Keep the existing fire-escape workflow aligned, without replacing inspection. */
export function setSurveyJobType(data:MeasureData,jobType:JobType){
  data.survey ||= surveyFor(data);data.survey.jobType=jobType;
  if(data.fire)data.fire.purpose=jobType==='inspect'?'inspect':jobType==='repair'||jobType==='restore'?'repair':'new';
}
export function reconcileFireSurvey(data:MeasureData){
  if(!data.survey||!data.fire)return;
  if(data.fire.purpose==='inspect')data.survey.jobType='inspect';
  if(data.fire.purpose==='repair'&&!['repair','restore'].includes(data.survey.jobType))data.survey.jobType='repair';
  if(data.fire.purpose==='new'&&!['new','replace'].includes(data.survey.jobType))data.survey.jobType='new';
}
export const newCondition = (id: string): ConditionItem => ({id,location:'',defect:'rust_through',severity:'major',sectionLoss:'',action:'weld_repair',quantity:'',length:'',photoSlot:`survey_${id}`});
/** Blank quantities stay unknown; never silently assume one or sum unlike units. Length is per item. */
export function actionTotals(items: ConditionItem[]) {
  return ACTIONS.flatMap(action => {
    const rows=items.filter(i=>i.action===action); if(!rows.length)return [];
    let quantity=0,length=0,incomplete=rows.some(r=>r.length.trim())&&rows.some(r=>!r.length.trim());
    for(const row of rows){const q=Number(row.quantity);const n=parseMeas(row.length);const valid=row.quantity.trim()!==''&&Number.isInteger(q)&&q>0;
      if(valid)quantity+=q;else incomplete=true;
      if(n!==null&&n>0&&valid)length+=n*q;else if(row.length.trim())incomplete=true;
    }
    return [{action,quantity,length,incomplete}];
  });
}
// Stable identity segments make a reordered member keep its verification. Legacy
// index-only children are tied to their parent identity and original value.
const DIMENSIONS = new Set(['width','height','length','depth','rise','run','rake','ctrlRise','ctrlRun','totalRise','totalRun','floorToFloor','rakeLength','diameter','clearWidth','widthTop','widthBottom','heightHinge','heightLatch','diagA','diagB','groundClearance','panelWidth','postSpacing','totalPerimeter','guardHeight','edgeLength','lengthAtHouse','projection','topSpan','lowerSpan','span','cutLength','overallLength','bearingLength','openingWidth','openingHeight','capWidth','drop','railHeight','wBack','wFront','wTop','wBottom','hLeft','hRight','hBack','dTop','dBottom']);
const EXCLUDE = new Set(['survey','signoff','photos','annotations','nativeSteel','steelPlan','code','sceneSetup','materials']);
export interface SurveyDimension { source: string; keys: string[]; value: string }
export function surveyDimensions(data: MeasureData): SurveyDimension[] {
  const result: SurveyDimension[]=[];
  function walk(v: unknown,path: string[],keys: string[],depth: number){
    if(depth>9||!v||typeof v!=='object')return;
    if(Array.isArray(v)){v.forEach((item,i)=>walk(item,[...path,typeof item?.id==='string'?`@${item.id}`:String(i)],[...keys,String(i+1)],depth+1));return;}
    for(const [k,x] of Object.entries(v)){if(EXCLUDE.has(k))continue;
      if(DIMENSIONS.has(k)&&typeof x==='string'&&parseMeas(x)!==null)result.push({source:JSON.stringify([...path,k]),keys:[...keys,k],value:x});
      else if(typeof x==='object')walk(x,[...path,k],[...keys,k],depth+1);
    }
  }
  walk(data,[],[],0);return result;
}
export function secondResult(data: MeasureData, item: SecondMeasure, tolerance: Tol = TOLERANCES[item.tolerance]) {
  const current=item.source?surveyDimensions(data).find(d=>d.source===item.source)?.value:item.original;
  const original=parseMeas(item.original), value=parseMeas(item.value);
  const stale=current===undefined||parseMeas(current)!==original;
  const delta=original!==null&&value!==null?Math.abs(original-value):null;
  const level=stale?'stale':delta===null||!item.label.trim()||!item.who.trim()||!item.when||!Number.isFinite(Date.parse(item.when))?'pending':delta<=tolerance.green?'green':delta<=tolerance.yellow?'yellow':'red';
  return {level,delta,current};
}
export function verifiedBy(data: MeasureData): string | null {
  const rows=data.survey?.verify||[];
  if(rows.length<3||rows.length>5||new Set(rows.map(r=>r.source||r.label.trim().toLocaleLowerCase())).size!==rows.length||rows.some(r=>secondResult(data,r).level!=='green'))return null;
  return [...new Set(rows.map(r=>r.who.trim()))].join(', ');
}
/** Uses actual cut sources plus explicitly measured assembled delivery pieces. */
export function deliveryWarnings(data: MeasureData) {
  const a=surveyFor(data).access,max=parseMeas(a.maxLength),maxWeight=Number(a.maxWeight);
  const pieces=[...steelSources(data).map(s=>({id:s.key,label:s.label,length:s.length,weight:null as number|null})),
    ...data.spans.map(s=>({id:`span:${s.id}`,label:s.label,length:parseMeas(s.topSpan),weight:null as number|null})),
    ...(data.steelPlan?.rows||[]).filter(r=>!r.source).flatMap(r=>r.cuts.map(c=>({id:`cut:${r.id}:${c.id}`,label:c.mark||r.label,length:parseMeas(c.length),weight:null as number|null}))),
    ...a.pieces.map(p=>({id:p.id,label:p.label,length:parseMeas(p.length),weight:p.weight.trim()?Number(p.weight):null}))];
  return pieces.flatMap(p=>{
    const splice=max!==null&&max>0&&p.length!==null&&p.length>max;
    const overweight=maxWeight>0&&p.weight!==null&&p.weight>maxWeight;
    return splice||overweight?[{...p,splice,overweight}]:[];
  });
}
