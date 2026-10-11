import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import type {Job} from '@/lib/shop/shared';
const mocks=vi.hoisted(()=>({push:vi.fn()}));
vi.mock('next/navigation',()=>({useRouter:()=>({push:mocks.push})}));
import MeasureListClient from './MeasureListClient';
import {MEASURE_PRESETS} from '@/lib/shop/measure';
import {mt} from '@/lib/shop/measure-i18n';
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.clearAllMocks();});
it('creates from visual environment/project choices without a second project picker',async()=>{
 const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({id:'new-sheet'})});vi.stubGlobal('fetch',fetcher);
 render(<MeasureListClient job={{id:'job',job_number:'KIW-TEST',address:'Test site'} as Job} sheets={[]} lang="en" nameById={{}}/>);
 fireEvent.click(screen.getByRole('button',{name:/New Measure Sheet/}));expect(screen.queryByText('Count it before you measure it')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:/ExteriorOutside/}));fireEvent.click(screen.getByRole('button',{name:'Grate'}));fireEvent.click(screen.getByRole('button',{name:/Build the site/}));
 expect(screen.queryByText('Layout options · all tools')).toBeNull();expect(screen.queryByText('Special staircase layouts')).toBeNull();expect(screen.queryByText('Count it before you measure it')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Create sheet'}));await waitFor(()=>expect(mocks.push).toHaveBeenCalledWith('/shop/job/job/measure/new-sheet'));
 const payload=JSON.parse(fetcher.mock.calls[0][1].body);expect(payload.sceneSetup).toEqual({environment:'exterior',projectType:'grate'});expect(payload.shape).toBe('custom');
});

it.each([['Gate','gate'],['Fence','fence'],['Balcony','balcony'],['Deck','deck'],['Fire escape','fire_escape'],['Spiral stair','spiral'],['Wall handrail','wall_rail']])('creates %s directly in its matching measurement shape',async(label,shape)=>{
 const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({id:'new-sheet'})});vi.stubGlobal('fetch',fetcher);render(<MeasureListClient job={{id:'job'} as Job} sheets={[]} lang="en" nameById={{}}/>);fireEvent.click(screen.getByRole('button',{name:/New Measure Sheet/}));fireEvent.click(screen.getByRole('button',{name:/ExteriorOutside/}));fireEvent.click(screen.getByRole('button',{name:label}));fireEvent.click(screen.getByRole('button',{name:/Build the site/}));expect(screen.queryByText('Special staircase layouts')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Create sheet'}));await waitFor(()=>expect(fetcher).toHaveBeenCalledOnce());const body=JSON.parse(fetcher.mock.calls[0][1].body);expect(body.shape).toBe(shape);expect(body.sceneSetup.projectType).toBe(shape);
});
it('retains every staircase preset within the chosen stairs configuration',async()=>{
 const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({id:'new-sheet'})});vi.stubGlobal('fetch',fetcher);render(<MeasureListClient job={{id:'job'} as Job} sheets={[]} lang="en" nameById={{}}/>);fireEvent.click(screen.getByRole('button',{name:/New Measure Sheet/}));fireEvent.click(screen.getByRole('button',{name:/InteriorInside/}));fireEvent.click(screen.getByRole('button',{name:'Stairs'}));fireEvent.click(screen.getByRole('button',{name:/Build the site/}));for(const preset of MEASURE_PRESETS.filter(p=>p!=='multi_flight'))expect(screen.getByRole('button',{name:mt('en',`preset_${preset}`)})).toBeTruthy();expect(screen.getByRole('button',{name:new RegExp(mt('en','multiFlight'))})).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:mt('en','preset_winder_u')}));fireEvent.click(screen.getByRole('button',{name:'Create sheet'}));await waitFor(()=>expect(fetcher).toHaveBeenCalledOnce());const body=JSON.parse(fetcher.mock.calls[0][1].body);expect(body.shape).toBe('u_shape');expect(body.preset).toBe('winder_u');expect(body.sceneSetup.projectType).toBe('stairs');
});
