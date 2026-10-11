import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import type {Job} from '@/lib/shop/shared';
const mocks=vi.hoisted(()=>({push:vi.fn()}));
vi.mock('next/navigation',()=>({useRouter:()=>({push:mocks.push})}));
import MeasureListClient from './MeasureListClient';
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.clearAllMocks();});
it('creates from visual environment/project choices while retaining advanced layouts',async()=>{
 const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({id:'new-sheet'})});vi.stubGlobal('fetch',fetcher);
 render(<MeasureListClient job={{id:'job',job_number:'KIW-TEST',address:'Test site'} as Job} sheets={[]} lang="en" nameById={{}}/>);
 fireEvent.click(screen.getByRole('button',{name:/New Measure Sheet/}));expect(screen.queryByText('Count it before you measure it')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:/ExteriorOutside/}));fireEvent.click(screen.getByRole('button',{name:'Grate'}));fireEvent.click(screen.getByRole('button',{name:/Build the site/}));
 expect(screen.getByText('Layout options · all tools')).toBeTruthy();fireEvent.click(screen.getByText('Layout options · all tools'));expect(screen.getByText('Special staircase layouts')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Create sheet'}));await waitFor(()=>expect(mocks.push).toHaveBeenCalledWith('/shop/job/job/measure/new-sheet'));
 const payload=JSON.parse(fetcher.mock.calls[0][1].body);expect(payload.sceneSetup).toEqual({environment:'exterior',projectType:'grate'});expect(payload.shape).toBe('custom');
});
