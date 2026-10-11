import {z} from 'zod';
import type {MeasureData} from './measure';
import type {CatalogItem} from './shared';
import {attachedCuts} from './measure-attached-fab';
import {siteRailLayout,siteRailSignature} from './measure-site-rails';
import {siteNumber} from './measure-site';

// Explicit allowlist: no supplier prices, costs, or private catalog notes reach measuring clients.
export const SteelCatalogSchema=z.object({id:z.string().max(80),sku:z.string().max(100),display:z.string().max(240),spec:z.string().max(240),category:z.string().max(100),grade:z.string().max(100).nullable(),unit:z.string().max(20),stock_length_ft:z.number().positive().max(1000).nullable()});
export type SteelCatalogItem=z.infer<typeof SteelCatalogSchema>;
export function steelCatalog(items:CatalogItem[]):SteelCatalogItem[]{return items.filter(i=>i.active&&!i.is_tool).map(({id,sku,display,spec,category,grade,unit,stock_length_ft})=>({id,sku,display,spec,category,grade,unit,stock_length_ft}));}
const cutSchema=z.object({id:z.string().max(80),mark:z.string().max(100),length:z.string().max(40),qty:z.number().int().min(1).max(1000)});
export const SteelRowSchema=z.object({id:z.string().max(80),label:z.string().max(120),role:z.string().max(60),source:z.string().max(140),item:SteelCatalogSchema.nullable(),stock:z.string().max(40),cuts:z.array(cutSchema).max(100),checked:z.string().max(40000)});
export const SteelPlanSchema=z.object({kerf:z.string().max(40),trim:z.string().max(40),rows:z.array(SteelRowSchema).max(200)});
export type SteelPlan=z.infer<typeof SteelPlanSchema>;
export type SteelRow=z.infer<typeof SteelRowSchema>;
export const newSteelPlan=():SteelPlan=>({kerf:'',trim:'',rows:[]});
export const newSteelRow=(id:string,label:string,role:string,source=''):SteelRow=>({id,label,role,source,item:null,stock:"20'",cuts:source?[]:[{id:id+'-cut',mark:label,length:'',qty:1}],checked:''});
export type SteelPiece={key:string;mark:string;length:number};
export function steelSources(data:MeasureData){
 return (data.site?.rails||[]).flatMap(r=>{
  const result=attachedCuts(data.site,r,siteRailLayout(data.site,r));
  return result.parts.map(p=>({key:`${r.id}:${p.mark.split('-').at(-1)}`,label:`${r.label} · ${p.mark}`,role:p.kind==='top'?'toprail':p.kind==='bottom'?'bottomrail':'picket',length:p.stockLength,profile:p.profile,signature:siteRailSignature(data.site,r)}));
 });
}
export function rowPieces(data:MeasureData,row:SteelRow,sources?:ReturnType<typeof steelSources>):{pieces:SteelPiece[];error:string|null;signature:string}{
 if(row.source){
  const source=(sources||steelSources(data)).find(s=>s.key===row.source);
  if(!source)return {pieces:[],error:'Source member is unresolved. Check its measurements.',signature:''};
  return {pieces:[{key:source.key,mark:source.label,length:source.length}],error:null,signature:JSON.stringify([source.signature,source.key,source.length,row.item,row.stock])};
 }
 const pieces:SteelPiece[]=[];
 for(const c of row.cuts){const n=siteNumber(c.length);if(n===null||n<=0||!Number.isInteger(c.qty)||c.qty<1||c.qty>1000)return {pieces:[],error:'Enter a finished cut length and quantity for every line.',signature:''};if(pieces.length+c.qty>10000)return {pieces:[],error:'Split schedules exceeding 10,000 pieces.',signature:''};for(let i=0;i<c.qty;i++)pieces.push({key:`${row.id}:${c.id}:${i}`,mark:c.mark||row.label,length:n});}
 return {pieces,error:pieces.length?null:'Add cut lengths.',signature:JSON.stringify([row.cuts,row.item,row.stock])};
}
export function steelRowChecked(data:MeasureData,row:SteelRow,sources?:ReturnType<typeof steelSources>){const r=rowPieces(data,row,sources);return !!row.item&&!r.error&&!!r.signature&&row.checked===r.signature;}
export type StockBar={cuts:SteelPiece[];remaining:number};
export type StockGroup={key:string;item:SteelCatalogItem;stock:number;bars:StockBar[];feet:number};
/** Best-fit decreasing gives a practical cutting layout, not a claim of global optimum.
 * Reserve kerf for EVERY piece and trim at BOTH stock ends. Never join an oversize piece. */
export function steelTakeoff(data:MeasureData,sources?:ReturnType<typeof steelSources>){
 const plan=data.steelPlan,issues:string[]=[],groups=new Map<string,StockGroup>(),used=new Set<string>();
 if(!plan)return {issues,groups:[],pending:0};
 const kerf=siteNumber(plan.kerf),trim=siteNumber(plan.trim);
 if(kerf===null||trim===null||kerf<0||trim<0||kerf>2||trim>24)return {issues:['Enter saw kerf and end trim in inches (enter 0 only when intended).'],groups:[],pending:plan.rows.length};
 const measured=sources||steelSources(data);
 let pending=0,total=0;
 for(const row of plan.rows){
  const resolved=rowPieces(data,row,measured),stock=siteNumber(row.stock);
  const issue=(message:string)=>{issues.push(`${row.label}: ${message}`);pending++;};
  if(!row.item){issue('Choose a catalog material.');continue;}
  if(row.item.unit!=='ft'){issue('Sheet/each materials need a separate area or item takeoff; not counted as bars.');continue;}
  if(resolved.error){issue(resolved.error);continue;}
  if(!resolved.signature||row.checked!==resolved.signature){issue('Check the selected profile and cut dimensions.');continue;}
  if(stock===null||stock<=2*trim||stock>12000){issue('Enter a usable stock length.');continue;}
  if(resolved.pieces.some(p=>p.length+kerf>stock-2*trim+1e-8)){issue('A piece exceeds usable stock length. Choose longer stock or detail a joint.');continue;}
  if(resolved.pieces.some(p=>used.has(p.key))){issue('This measured member is already assigned. Remove the duplicate assignment.');continue;}
  total+=resolved.pieces.length;if(total>10000){issue('Takeoff exceeds 10,000 pieces. Split the schedule.');continue;}
  resolved.pieces.forEach(p=>used.add(p.key));
  const key=JSON.stringify([row.item.id,row.item.spec,row.item.grade,stock]);
  let group=groups.get(key);if(!group){group={key,item:row.item,stock,bars:[],feet:0};groups.set(key,group);}
  // Accumulate before sorting all matching profiles together.
  group.bars.push({cuts:resolved.pieces,remaining:0});
 }
 for(const g of groups.values()){
  const pieces=g.bars.flatMap(b=>b.cuts).sort((a,b)=>b.length-a.length||a.key.localeCompare(b.key));g.bars=[];
  for(const p of pieces){const need=p.length+kerf;let bar:StockBar|undefined;
   for(const candidate of g.bars)if(candidate.remaining+1e-8>=need&&(!bar||candidate.remaining<bar.remaining))bar=candidate;
   if(!bar){bar={cuts:[],remaining:g.stock-2*trim};g.bars.push(bar);}bar.cuts.push(p);bar.remaining=Math.max(0,bar.remaining-need);
  }g.feet=g.bars.length*g.stock/12;
 }
 return {issues,groups:[...groups.values()],pending};
}
export function steelCsv(data:MeasureData){
 const result=steelTakeoff(data),rows:(string|number)[][]=[['DRAFT MATERIAL TAKEOFF - assigned members only; review before ordering'],['Pending rows',result.pending],['Saw kerf (in)',data.steelPlan?.kerf||''],['Trim each stock end (in)',data.steelPlan?.trim||''],['SKU','Material','Grade','Stock length (in)','Bar','Cuts (in)','Remaining (in)']];
 for(const g of result.groups)g.bars.forEach((b,i)=>rows.push([g.item.sku,g.item.display,g.item.grade||'',g.stock,i+1,b.cuts.map(c=>`${c.mark}: ${c.length.toFixed(4)}`).join('; '),Number(b.remaining.toFixed(4))]));
 result.issues.forEach(s=>rows.push(['PENDING',s]));
 return rows.map(r=>r.map(v=>{let s=String(v);if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}).join(',')).join('\r\n');
}
