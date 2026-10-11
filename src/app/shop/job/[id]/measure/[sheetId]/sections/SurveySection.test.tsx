import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {useEffect,useState} from 'react';
import {newMeasureData,type MeasureData} from '@/lib/shop/measure';
import {blankSurvey,newCondition} from '@/lib/shop/measure-survey';
import SurveySection,{SurveyPrint} from './SurveySection';
afterEach(cleanup);
let latest:MeasureData;
function Harness({init}:{init?:(d:MeasureData)=>void}){const [data,setData]=useState(()=>{const d=newMeasureData('gate',4);init?.(d);return d;});useEffect(()=>{latest=data;},[data]);return <SurveySection data={data} lang="en" sheetId="test" slotBusy={null} slotErr={null} directSlotPhoto={vi.fn()} set={fn=>setData(old=>{const next=structuredClone(old);fn(next);return next;})}/>;}
describe('survey section',()=>{
 it('job type is a segmented control',()=>{
  render(<Harness/>);const group=screen.getByRole('radiogroup',{name:'Job type'});
  expect(within(group).getAllByRole('radio').map(r=>r.textContent)).toEqual(['New','Repair','Restore','Replace']);
  expect(screen.queryByText('Condition survey')).toBeNull();
  fireEvent.click(within(group).getByRole('radio',{name:'Restore'}));
  expect(within(group).getByRole('radio',{name:'Restore'}).getAttribute('aria-checked')).toBe('true');
  expect(latest.survey?.jobType).toBe('restore');expect(screen.getByText('Condition survey')).toBeTruthy();
 });
 it('adds a condition in a sheet with chips and a stepper, then lists it compactly with action totals',()=>{
  render(<Harness/>);fireEvent.click(screen.getByRole('radio',{name:'Restore'}));fireEvent.click(screen.getByText('Add condition'));
  const sheet=screen.getByRole('dialog',{name:'Condition 01'});
  fireEvent.change(within(sheet).getByLabelText('Location'),{target:{value:'Front landing'}});
  fireEvent.click(within(within(sheet).getByRole('radiogroup',{name:'Severity'})).getByRole('radio',{name:'Unsafe'}));
  fireEvent.click(within(sheet).getByRole('radio',{name:'Broken weld'}));
  fireEvent.click(within(sheet).getByRole('button',{name:'Quantity +'}));fireEvent.click(within(sheet).getByRole('button',{name:'Quantity +'}));
  expect((within(sheet).getByLabelText('Quantity') as HTMLInputElement).value).toBe('2');
  fireEvent.change(within(sheet).getByLabelText('Length each (in)'),{target:{value:'12.5'}});
  fireEvent.click(within(sheet).getByRole('button',{name:'Done'}));
  expect(screen.queryByRole('dialog')).toBeNull();
  const row=document.querySelector('[data-condition-row]') as HTMLElement;
  expect(within(row).getByText('Front landing').className).toContain('text-red-700');
  expect(within(row).getByText('Broken weld → Weld repair')).toBeTruthy();
  expect(within(row).getByText('2 × 12 1/2"')).toBeTruthy();
  expect(screen.getByText(/2 items · 25"/)).toBeTruthy();
  expect(latest.survey?.conditions[0]).toMatchObject({location:'Front landing',severity:'unsafe',defect:'broken_weld',quantity:'2',length:'12.5'});
 });
 it('removes a condition from its sheet',()=>{
  render(<Harness init={d=>{d.survey=blankSurvey();d.survey.jobType='repair';d.survey.conditions=[{...newCondition('a'),location:'Landing'}];}}/>);
  fireEvent.click(screen.getByText('Landing'));fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Remove'}));
  expect(latest.survey?.conditions).toEqual([]);expect(screen.queryByRole('dialog')).toBeNull();
 });
 it('shows delivery warnings as chips outside the collapsed section, with switches and segmented choices',()=>{
  render(<Harness/>);fireEvent.click(screen.getByText('Install access & delivery'));fireEvent.change(screen.getByLabelText('Max piece length (in)'),{target:{value:'72'}});fireEvent.click(screen.getByText('Add piece'));
  fireEvent.change(screen.getByLabelText('Piece / mark'),{target:{value:'G1'}});fireEvent.change(screen.getByLabelText('Length each (in)'),{target:{value:'96'}});
  expect(screen.getByRole('status').textContent).toContain('Add splice');
  fireEvent.click(screen.getByRole('switch',{name:'Crane'}));expect(latest.survey?.access.crane).toBe(true);
  fireEvent.click(within(screen.getByRole('radiogroup',{name:'Welding power'})).getByRole('radio',{name:'240 V'}));expect(latest.survey?.access.power).toBe('240');
  fireEvent.click(within(screen.getByRole('radiogroup',{name:'Access route'})).getByRole('radio',{name:'Through house'}));expect(latest.survey?.access.route).toBe('house');
 });
 it('second measure: one row per dimension with a Δ chip, added from a sheet, verified badge in the header',()=>{
  render(<Harness init={d=>{d.gate!.widthTop='48.125';}}/>);
  expect(screen.queryByText(/ⓘ/)).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Mark dimension'}));
  const add=screen.getByRole('dialog',{name:'Mark dimension'});expect(within(add).getByText('48 1/8"')).toBeTruthy();
  fireEvent.click(within(add).getByText('48 1/8"'));
  const edit=screen.getByRole('dialog');fireEvent.change(within(edit).getByLabelText('Second measure (in)'),{target:{value:'48 1/4'}});fireEvent.change(within(edit).getByLabelText('Measured by'),{target:{value:'Alex'}});
  expect(within(edit).getByRole('status').textContent).toContain('Within tolerance');
  fireEvent.click(within(edit).getByRole('button',{name:'Done'}));
  const row=document.querySelector('[data-verify-row]') as HTMLElement;
  expect(row.textContent).toContain('48 1/8" → 48 1/4"');expect(within(row).getByText('Δ 1/8"').className).toContain('bg-green-50');
 });
 it('shows "Verified by" in the header once 3 rows are green',()=>{
  render(<Harness init={d=>{d.survey=blankSurvey();d.survey.verify=['A','B','C'].map((label,i)=>({id:'v'+i,label,source:'',original:'48',value:'48.0625',who:'Alex',when:'2026-10-11T13:45:00.000Z',tolerance:'widthVar'}));}}/>);
  expect(screen.getByText('✓ Verified by Alex')).toBeTruthy();expect(document.querySelectorAll('[data-verify-row]').length).toBe(3);
  expect(document.querySelector('[data-verify-row]')!.textContent).toContain('48" → 48 1/16"');
 });
 it('prints conditions, access and verification with no editable controls',()=>{
  const d:MeasureData=newMeasureData('gate',4);d.survey=blankSurvey();d.survey.jobType='repair';d.survey.conditions=[{...newCondition('a'),location:'Landing',severity:'unsafe',quantity:'2',length:'6.25'}];
  const {container}=render(<SurveyPrint data={d} lang="pt" sheetId="s"/>);
  expect(screen.getByText('Tipo de serviço: Reparar existente')).toBeTruthy();expect(screen.getByText('1. Landing · Inseguro')).toBeTruthy();expect(container.textContent).toContain('6 1/4"');expect(container.querySelector('input,select,button')).toBe(null);
 });
});
