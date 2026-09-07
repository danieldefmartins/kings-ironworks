import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { newMeasureData, newPost, normalizeMeasureData } from '@/lib/shop/measure';
import DrawingWorkspace from './DrawingWorkspace';
afterEach(cleanup);
describe('drawing workspace', () => {
  it('shows independent first-step to post-edge measurements in every view', () => {
    const data=newMeasureData('straight',6);
    data.posts=[0,2,5].map((step,index)=>({...newPost(0,step),firstStepToPostEdge:['2','24 1/2','58'][index]}));
    render(<DrawingWorkspace data={data} lang="en" onMeasureStep={vi.fn()}/>);
    for(const view of ['Side view','Top view','3D view']) {
      fireEvent.click(screen.getByRole('button',{name:view}));
      const labels=Array.from(document.querySelectorAll('[data-post-distance]'));
      expect(labels).toHaveLength(3);
      for(let i=0;i<3;i++) {
        expect(labels[i].textContent).toContain(`First-step edge → post edge · P${i+1}`);
        expect(labels[i].textContent).toContain(data.posts[i].firstStepToPostEdge);
      }
    }
  });
  it('does not reinterpret an older tread-edge measurement as a post-edge measurement', () => {
    const data=newMeasureData('straight',2);
    data.posts=[{...newPost(0,1),distanceFromFirst:'11'}];
    delete (data.posts[0] as Partial<typeof data.posts[0]>).firstStepToPostEdge;
    const normalized=normalizeMeasureData(data);
    expect(normalized.posts[0].firstStepToPostEdge).toBe('');
    expect(normalized.posts[0].distanceFromFirst).toBe('11');
  });
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
