import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { newMeasureData } from '@/lib/shop/measure';
import DrawingWorkspace from './DrawingWorkspace';
afterEach(cleanup);
describe('drawing workspace', () => {
  it('targets the same step in each view without changing measurements', () => {
    const data = newMeasureData('straight', 4), before = JSON.stringify(data), edit = vi.fn();
    render(<DrawingWorkspace data={data} lang="en" onMeasureStep={edit}/>);
    for (const view of ['Side view','Top view','3D view']) {
      fireEvent.click(screen.getByRole('button',{name:view}));
      fireEvent.click(screen.getByRole('button',{name:'Step 3'}));
      expect(edit).toHaveBeenLastCalledWith(0,2);
    }
    expect(JSON.stringify(data)).toBe(before);
  });
  it('keeps the chosen view on expand and restores scrolling on Escape', () => {
    render(<DrawingWorkspace data={newMeasureData('straight',3)} lang="en" onMeasureStep={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button',{name:'3D view'}));
    fireEvent.click(screen.getByRole('button',{name:'Expand'}));
    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getByRole('button',{name:'3D view'}).getAttribute('aria-pressed')).toBe('true');
    fireEvent.keyDown(window,{key:'Escape'});
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(screen.getByRole('button',{name:'Expand'}));
  });
  it('allows keyboard selection of a tread', () => {
    const edit=vi.fn();render(<DrawingWorkspace data={newMeasureData('straight',3)} lang="pt" onMeasureStep={edit}/>);
    fireEvent.keyDown(document.querySelectorAll('rect[role="button"]')[1],{key:'Enter'});
    expect(edit).toHaveBeenCalledWith(0,1);
  });
});
