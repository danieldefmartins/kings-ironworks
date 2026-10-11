import {describe,it,expect} from 'vitest';
import {attachedFabricationFixture} from './measure-site.fixture';
import {normalizeMeasureData} from './measure';
import {SteelPlanSchema,newSteelPlan,newSteelRow,rowPieces,steelRowChecked,steelSources,steelTakeoff,steelCatalog,steelCsv,type SteelCatalogItem} from './measure-steel';
const item:SteelCatalogItem={id:'flat',sku:'FB-1',display:'Flat bar',spec:'1 x 1/4',category:'flat_bar',grade:'A36',unit:'ft',stock_length_ft:20};
function setup(lengths:number[],stock="20'"){
 const d=attachedFabricationFixture();d.steelPlan=newSteelPlan();d.steelPlan.kerf='1/8';d.steelPlan.trim='1/4';
 const r=newSteelRow('row','Top rail','toprail');r.item=item;r.stock=stock;r.cuts=lengths.map((n,i)=>({id:String(i),mark:'M'+i,length:String(n),qty:1}));d.steelPlan.rows.push(r);r.checked=rowPieces(d,r).signature;return d;
}
describe('material stock planning',()=>{
 it('packs actual pieces rather than dividing total footage and rounds quantities up',()=>{
  const d=setup([130,130,130]);const g=steelTakeoff(d).groups[0];expect(g.bars).toHaveLength(3);expect(g.feet).toBe(60);
  expect(g.bars.every(b=>b.cuts.length===1&&b.remaining===109.375)).toBe(true);
 });
 it('combines matching SKUs across roles while respecting kerf, trim and catalog stock choices',()=>{
  const d=setup([120,100]);const r=newSteelRow('bottom','Bottom rail','bottomrail');r.item=item;r.stock="20'";r.cuts=[{id:'1',mark:'B',length:'10',qty:1}];d.steelPlan!.rows.push(r);r.checked=rowPieces(d,r).signature;
  const result=steelTakeoff(d);expect(result.issues).toEqual([]);expect(result.groups[0].bars).toHaveLength(1);expect(result.groups[0].bars[0].remaining).toBe(9.125);
  r.stock="24'";r.checked=rowPieces(d,r).signature;expect(steelTakeoff(d).groups).toHaveLength(2);
 });
 it('rejects oversized cuts and missing allowances instead of reporting a complete order',()=>{
  const d=setup([240]);expect(steelTakeoff(d).groups).toEqual([]);expect(steelTakeoff(d).issues.join()).toContain('exceeds usable');
  d.steelPlan!.kerf='';expect(steelTakeoff(d).pending).toBe(1);expect(steelTakeoff(d).groups).toEqual([]);
 });
 it('does not mix grades or treat sheet materials as linear bars',()=>{
  const d=setup([30]);const r=structuredClone(d.steelPlan!.rows[0]);r.id='other';r.item={...item,grade:'304'};d.steelPlan!.rows.push(r);r.checked=rowPieces(d,r).signature;
  expect(steelTakeoff(d).groups).toHaveLength(2);r.item.unit='sheet';r.checked=rowPieces(d,r).signature;expect(steelTakeoff(d).pending).toBe(1);
 });
 it('links measured pieces and revokes checks when their source or catalog selection changes',()=>{
  const d=setup([]),source=steelSources(d)[0],r=d.steelPlan!.rows[0];r.source=source.key;r.checked=rowPieces(d,r).signature;
  expect(steelRowChecked(d,r)).toBe(true);expect(rowPieces(d,r).pieces[0].length).toBe(source.length);
  d.site!.rails![0].fabrication!.startGap='1/2';expect(steelRowChecked(d,r)).toBe(false);
  r.checked=rowPieces(d,r).signature;r.item={...item,id:'new'};expect(steelRowChecked(d,r)).toBe(false);
  d.site!.rails=[];expect(rowPieces(d,r).error).toContain('unresolved');
 });
 it('does not count one linked member twice',()=>{
  const d=setup([]),r=d.steelPlan!.rows[0];r.source=steelSources(d)[0].key;r.checked=rowPieces(d,r).signature;
  d.steelPlan!.rows.push({...r,id:'duplicate'});const result=steelTakeoff(d);expect(result.pending).toBe(1);expect(result.groups[0].bars.flatMap(b=>b.cuts)).toHaveLength(1);
 });
 it('bounds quantity and schema sizes, preserves saved plans and escapes CSV formulas',()=>{
  const d=setup([40]);d.steelPlan!.rows[0].label='=bad';d.steelPlan!.rows[0].item={...item,display:'=SUM(1,1)'};
  d.steelPlan!.rows[0].checked=rowPieces(d,d.steelPlan!.rows[0]).signature;
  expect(steelCsv(d)).toContain("'=SUM");expect(normalizeMeasureData(d).steelPlan).toEqual(d.steelPlan);
  const copy=structuredClone(d.steelPlan!);copy.rows[0].cuts[0].qty=1001;expect(SteelPlanSchema.safeParse(copy).success).toBe(false);
 });
 it('never exposes catalog pricing or private notes',()=>{
  const result=steelCatalog([{...item,active:true,role_keys:[],dim_a:1,dim_b:.25,wall:null,weight_per_ft:1,unit_cost:123,notes:'private pricing'}]);
  expect(JSON.stringify(result)).not.toMatch(/unit_cost|private pricing|weight_per_ft/);
  const d=setup([40]);expect(SteelPlanSchema.parse({...d.steelPlan,rows:[{...d.steelPlan!.rows[0],item:{...item,unit_cost:123}}]}).rows[0].item).not.toHaveProperty('unit_cost');
 });
});
