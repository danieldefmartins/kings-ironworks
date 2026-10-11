import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {useState} from 'react';
import {newMeasureData,type MeasureData} from '@/lib/shop/measure';
import {blankSurvey,newCondition} from '@/lib/shop/measure-survey';
import SurveySection,{SurveyPrint} from './SurveySection';
afterEach(cleanup);
function Harness(){const [data,setData]=useState(newMeasureData('gate',4));return <SurveySection data={data} lang="en" sheetId="test" slotBusy={null} slotErr={null} directSlotPhoto={vi.fn()} set={fn=>setData(old=>{const next=structuredClone(old);fn(next);return next;})}/>;}
describe('survey section',()=>{
 it('adds a repair condition with unsafe emphasis and action totals',()=>{
  render(<Harness/>);fireEvent.change(screen.getByLabelText('Job type'),{target:{value:'restore'}});fireEvent.click(screen.getByText('+ Add condition'));
  fireEvent.change(screen.getByLabelText('Location'),{target:{value:'Front landing'}});fireEvent.change(screen.getByLabelText('Severity'),{target:{value:'unsafe'}});
  fireEvent.change(screen.getByLabelText('Quantity'),{target:{value:'2'}});fireEvent.change(screen.getByLabelText('Length each (in)'),{target:{value:'12'}});
  expect(screen.getByText('01 · Unsafe').className).toContain('text-red-700');expect(screen.getByText(/2 items · 24/)).toBeTruthy();
 });
 it('shows delivery warnings outside the collapsed section',()=>{
  render(<Harness/>);fireEvent.click(screen.getByText('Install access & delivery'));fireEvent.change(screen.getByLabelText('Max piece length (in)'),{target:{value:'72'}});fireEvent.click(screen.getByText('+ Add piece'));
  fireEvent.change(screen.getByLabelText('Piece / mark'),{target:{value:'G1'}});fireEvent.change(screen.getByLabelText('Length each (in)'),{target:{value:'96'}});
  expect(screen.getByRole('status').textContent).toContain('Add splice');
 });
 it('prints conditions, access and verification with no editable controls',()=>{
  const d:MeasureData=newMeasureData('gate',4);d.survey=blankSurvey();d.survey.jobType='repair';d.survey.conditions=[{...newCondition('a'),location:'Landing',severity:'unsafe',quantity:'2'}];
  const {container}=render(<SurveyPrint data={d} lang="pt" sheetId="s"/>);
  expect(screen.getByText('Tipo de serviço: Reparar existente')).toBeTruthy();expect(screen.getByText('1. Landing · Inseguro')).toBeTruthy();expect(container.querySelector('input,select,button')).toBe(null);
 });
});
