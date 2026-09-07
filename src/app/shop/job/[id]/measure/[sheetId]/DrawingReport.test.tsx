import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { newPresetMeasureData } from '@/lib/shop/measure';
import DrawingWorkspace from './DrawingWorkspace';
import DrawingReport from './DrawingReport';

describe('keep shop schedules out of measurement entry',()=>{
  const data=()=>newPresetMeasureData('multi_flight',5,5).data;
  it('does not expose the placeholder report in the measuring workspace',()=>{
    render(<DrawingWorkspace data={data()} lang="en" onMeasureStep={()=>{}}/>);
    fireEvent.click(screen.getByText('Drawing options'));
    expect(screen.queryByText('Drawing items to resolve')).toBeNull();
    expect(screen.queryByText('Connection schedule')).toBeNull();
    expect(screen.queryByText('Details & schedules')).toBeNull();
    expect(screen.getByRole('group',{name:'3D view'})).toBeTruthy();
  });
  it('shows the full report only when requested during review',()=>{
    render(<DrawingReport data={data()} lang="en" sheetId="test"/>);
    expect(screen.queryByText('Connection schedule')).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:/View technical report/}));
    expect(screen.getByText('Connection schedule')).toBeTruthy();
    expect(screen.getByRole('button',{name:/Hide technical report/}).getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(screen.getByRole('button',{name:/Hide technical report/}));
    expect(screen.queryByText('Connection schedule')).toBeNull();
  });
});
