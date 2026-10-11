import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
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
 fireEvent.click(screen.getByRole('button',{name:"Exterior"}));fireEvent.click(screen.getByRole('button',{name:'Grate'}));
 expect(screen.queryByText('Layout options · all tools')).toBeNull();expect(screen.queryByText('Special staircase layouts')).toBeNull();expect(screen.queryByText('Count it before you measure it')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Create sheet'}));await waitFor(()=>expect(mocks.push).toHaveBeenCalledWith('/shop/job/job/measure/new-sheet'));
 const payload=JSON.parse(fetcher.mock.calls[0][1].body);expect(payload.sceneSetup).toEqual({environment:'exterior',projectType:'grate'});expect(payload.shape).toBe('custom');
});

it.each([['Gate','gate'],['Fence','fence'],['Balcony','balcony'],['Deck','deck'],['Fire escape','fire_escape'],['Spiral stair','spiral'],['Wall handrail','wall_rail']])('creates %s directly in its matching measurement shape',async(label,shape)=>{
 const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({id:'new-sheet'})});vi.stubGlobal('fetch',fetcher);render(<MeasureListClient job={{id:'job'} as Job} sheets={[]} lang="en" nameById={{}}/>);fireEvent.click(screen.getByRole('button',{name:/New Measure Sheet/}));fireEvent.click(screen.getByRole('button',{name:"Exterior"}));fireEvent.click(screen.getByRole('button',{name:label}));expect(screen.queryByText('Special staircase layouts')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Create sheet'}));await waitFor(()=>expect(fetcher).toHaveBeenCalledOnce());const body=JSON.parse(fetcher.mock.calls[0][1].body);expect(body.shape).toBe(shape);expect(body.sceneSetup.projectType).toBe(shape);
});
it('retains every staircase preset within the chosen stairs configuration',async()=>{
 const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({id:'new-sheet'})});vi.stubGlobal('fetch',fetcher);render(<MeasureListClient job={{id:'job'} as Job} sheets={[]} lang="en" nameById={{}}/>);fireEvent.click(screen.getByRole('button',{name:/New Measure Sheet/}));fireEvent.click(screen.getByRole('button',{name:"Interior"}));fireEvent.click(screen.getByRole('button',{name:'Stairs'}));fireEvent.click(screen.getByText(mt('en','commonSpecialLayouts')));for(const preset of MEASURE_PRESETS.filter(p=>p!=='multi_flight'))expect(screen.getByRole('button',{name:mt('en',`preset_${preset}`)})).toBeTruthy();expect(screen.getByRole('button',{name:'Multi-flight'})).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:mt('en','preset_winder_u')}));fireEvent.click(screen.getByRole('button',{name:'Create sheet'}));await waitFor(()=>expect(fetcher).toHaveBeenCalledOnce());const body=JSON.parse(fetcher.mock.calls[0][1].body);expect(body.shape).toBe('u_shape');expect(body.preset).toBe('winder_u');expect(body.sceneSetup.projectType).toBe('stairs');
});
it('uses one Create action and preserves name, counts and selected layout while changing location',async()=>{
 const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({id:'new-sheet'})});vi.stubGlobal('fetch',fetcher);
 render(<MeasureListClient job={{id:'job'} as Job} sheets={[]} lang="en" nameById={{}}/>);
 fireEvent.click(screen.getByRole('button',{name:/New Measure Sheet/}));
 const create=screen.getByRole('button',{name:'Create sheet'}) as HTMLButtonElement;
 expect(create.disabled).toBe(true);expect(screen.queryByRole('button',{name:/Continue|Build the site|Change project/})).toBeNull();
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'North entry'}});
 fireEvent.click(screen.getByRole('button',{name:'Stairs'}));
 fireEvent.click(screen.getByText(mt('en','commonSpecialLayouts')));fireEvent.click(screen.getByRole('button',{name:mt('en','preset_winder_u')}));
 expect(create.disabled).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'Exterior'}));
 fireEvent.click(screen.getByRole('button',{name:'Interior'}));
 expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('North entry');
 expect(fetcher).not.toHaveBeenCalled();
 fireEvent.click(create);await waitFor(()=>expect(fetcher).toHaveBeenCalledOnce());
 const body=JSON.parse(fetcher.mock.calls[0][1].body);expect(body).toMatchObject({name:'North entry',shape:'u_shape',preset:'winder_u',steps1:5,steps2:5,sceneSetup:{environment:'interior',projectType:'stairs'}});
});
it('clears an incompatible preset without clearing the entered name when switching project',async()=>{
 const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({id:'new-sheet'})});vi.stubGlobal('fetch',fetcher);
 render(<MeasureListClient job={{id:'job'} as Job} sheets={[]} lang="en" nameById={{}}/>);
 fireEvent.click(screen.getByRole('button',{name:/New Measure Sheet/}));fireEvent.click(screen.getByRole('button',{name:'Interior'}));fireEvent.click(screen.getByRole('button',{name:'Stairs'}));fireEvent.click(screen.getByText(mt('en','commonSpecialLayouts')));fireEvent.click(screen.getByRole('button',{name:mt('en','preset_winder_u')}));fireEvent.change(screen.getByRole('textbox'),{target:{value:'North entry'}});fireEvent.click(screen.getByRole('button',{name:'Gate'}));
 fireEvent.click(screen.getByRole('button',{name:'Create sheet'}));await waitFor(()=>expect(fetcher).toHaveBeenCalledOnce());expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({name:'North entry',shape:'gate',preset:null,steps1:5,sceneSetup:{environment:'interior',projectType:'gate'}});
});
it('offers three direct stair layouts and keeps specialty layouts collapsed until requested',()=>{
 render(<MeasureListClient job={{id:'job'} as Job} sheets={[]} lang="en" nameById={{}}/>);
 fireEvent.click(screen.getByRole('button',{name:/New Measure Sheet/}));fireEvent.click(screen.getByRole('button',{name:'Stairs'}));
 const specialty=screen.getByText(mt('en','commonSpecialLayouts')).closest('details')!;expect(specialty.open).toBe(false);
 expect(screen.queryByRole('button',{name:new RegExp(mt('en','singleFlight'))})).toBeNull();
 expect(screen.getByRole('button',{name:'Multi-flight'})).toBeTruthy();
 expect(screen.getByText('Treads & flights')).toBeTruthy();expect(screen.queryByText(mt('en','countsHint'))).toBeNull();
 fireEvent.click(screen.getByText(mt('en','commonSpecialLayouts')));expect(specialty.open).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:mt('en','preset_winder_u')}));expect(specialty.open).toBe(true);
});
it('keeps flight count independent from upper-flight treads and defaults to two flights',async()=>{
 const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({id:'new-sheet'})});vi.stubGlobal('fetch',fetcher);
 render(<MeasureListClient job={{id:'job'} as Job} sheets={[]} lang="en" nameById={{}}/>);
 fireEvent.click(screen.getByRole('button',{name:/New Measure Sheet/}));fireEvent.click(screen.getByRole('button',{name:'Exterior'}));fireEvent.click(screen.getByRole('button',{name:'Stairs'}));fireEvent.click(screen.getByRole('button',{name:'Multi-flight'}));
 const flights=()=>within(screen.getByRole('group',{name:mt('en','howManyFlights')}));
 expect(flights().getByText('2')).toBeTruthy();fireEvent.click(flights().getByRole('button',{name:'−'}));expect(flights().getByText('2')).toBeTruthy();fireEvent.click(flights().getByRole('button',{name:'+'}));expect(flights().getByText('3')).toBeTruthy();
 fireEvent.click(screen.getByText(mt('en','commonSpecialLayouts')));fireEvent.click(screen.getByRole('button',{name:mt('en','preset_winder_u')}));
 const upper=()=>within(screen.getByRole('group',{name:mt('en','stepsFlight2')}));expect(upper().getByText('5')).toBeTruthy();fireEvent.click(upper().getByRole('button',{name:'+'}));expect(upper().getByText('6')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Multi-flight'}));expect(flights().getByText('3')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Interior'}));expect(flights().getByText('3')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:mt('en','preset_winder_u')}));expect(upper().getByText('6')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Multi-flight'}));fireEvent.click(screen.getByRole('button',{name:'Create sheet'}));await waitFor(()=>expect(fetcher).toHaveBeenCalledOnce());expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({preset:'multi_flight',steps1:5,steps2:3});
});
