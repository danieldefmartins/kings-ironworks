import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { newMeasureData } from '@/lib/shop/measure';
import MeasurementProgress from './MeasurementProgress';
import StepEditor from './overlays/StepEditor';
import { EDITOR_STAGES } from './fields';

function Harness() {
  const [data, setData] = useState(() => newMeasureData('straight', 2));
  return <><MeasurementProgress data={data} lang="en" stage="steps"/><StepEditor data={data} lang="en" target={{segIdx:0, stepIdx:0, number:1, total:2}} onClose={()=>{}} onMove={()=>{}} set={fn=>setData(previous=>{const next=structuredClone(previous);fn(next);return next;})}/></>;
}
describe('feedback during measurement', () => {
  it('updates the visible drawing and progress while the step editor stays open', () => {
    render(<Harness/>);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
    const inputs = document.querySelectorAll<HTMLInputElement>('[data-step-editor] input[data-m="1"]');
    fireEvent.change(inputs[0], { target: { value: '7' } });
    fireEvent.change(inputs[1], { target: { value: '11' } });
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('1');
    expect(screen.getByRole('status').textContent).toContain('Step dimensions recorded');
    expect(screen.getByRole('img').textContent).toContain('11');
    fireEvent.change(inputs[1], { target: { value: '' } });
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
  });
  it('establishes railing basics before locating connections', () => {
    const order = EDITOR_STAGES.map(s=>s.id);
    expect(order[0]).toBe('steps');
    expect(order.indexOf('posts')).toBeLessThan(order.indexOf('locations'));
    expect(order.indexOf('photos')).toBeLessThan(order.indexOf('review'));
  });
});
