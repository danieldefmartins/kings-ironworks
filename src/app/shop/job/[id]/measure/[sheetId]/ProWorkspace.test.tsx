import {useEffect} from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {porchSiteFixture} from '@/lib/shop/measure-site.fixture';
import ProWorkspace,{WorkspaceScene} from './ProWorkspace';
import SiteWorkspace from './SiteWorkspace';
import VisualMeasureWorkspace from './VisualMeasureWorkspace';
import SteelWorkspace from './SteelWorkspace';
import type {SceneViewportProps} from './SceneViewport';
const lifecycle=vi.hoisted(()=>({mount:vi.fn(),unmount:vi.fn()}));
vi.mock('./SceneViewport',()=>({default:function MockScene(props:SceneViewportProps){useEffect(()=>{lifecycle.mount();return()=>lifecycle.unmount();},[]);return <div data-testid="renderer"><span>{props.selectedId}</span><button onClick={()=>props.onSelect?.({siteId:'wall-1'})}>Pick wall</button></div>;}}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
const data=porchSiteFixture();
function First({select}:{select:SceneViewportProps['onSelect']}){return <WorkspaceScene data={data} lang="en" selectedId="first" onSelect={select}/>;}
function Second({select}:{select:SceneViewportProps['onSelect']}){return <WorkspaceScene data={data} lang="en" selectedId="second" onSelect={select}/>;}
it('keeps exactly one renderer mounted across contextual editor changes and geometry edits',()=>{
 const first=vi.fn(),second=vi.fn();const {rerender}=render(<ProWorkspace data={data} lang="en"><First select={first}/></ProWorkspace>);
 expect(screen.getAllByTestId('renderer')).toHaveLength(1);expect(screen.getByText('first')).toBeTruthy();fireEvent.click(screen.getByText('Pick wall'));expect(first).toHaveBeenCalledOnce();
 rerender(<ProWorkspace data={data} lang="en"><Second select={second}/></ProWorkspace>);expect(screen.getByText('second')).toBeTruthy();fireEvent.click(screen.getByText('Pick wall'));expect(second).toHaveBeenCalledOnce();expect(first).toHaveBeenCalledOnce();
 rerender(<ProWorkspace data={structuredClone(data)} lang="en"><Second select={second}/></ProWorkspace>);expect(lifecycle.mount).toHaveBeenCalledTimes(1);expect(lifecycle.unmount).not.toHaveBeenCalled();
});
it('clears old editor interactions and uses global routing for details without a scene bridge',()=>{
 const old=vi.fn(),fallback=vi.fn();const {rerender}=render(<ProWorkspace data={data} lang="en" onSelect={fallback}><First select={old}/></ProWorkspace>);
 rerender(<ProWorkspace data={data} lang="en" onSelect={fallback}><div>Project details</div></ProWorkspace>);fireEvent.click(screen.getByText('Pick wall'));expect(fallback).toHaveBeenCalledWith({siteId:'wall-1'});expect(old).not.toHaveBeenCalled();expect(lifecycle.mount).toHaveBeenCalledTimes(1);
});
it('supports standalone rendering without a shared host',()=>{render(<WorkspaceScene data={data} lang="en"/>);expect(screen.getAllByTestId('renderer')).toHaveLength(1);});

it('embeds site and measurement tools without duplicate scenes, fixed inspectors or workflow navigation',()=>{
 const {rerender}=render(<ProWorkspace data={data} lang="en"><SiteWorkspace embedded data={data} set={()=>{}} lang="en" onContinue={()=>{}} onMeasure={()=>{}} onDetails={()=>{}}/></ProWorkspace>);
 expect(screen.getAllByTestId('renderer')).toHaveLength(1);expect(screen.queryByRole('button',{name:'3D workspace'})).toBeNull();expect(screen.queryByRole('button',{name:/Measure the sketch/})).toBeNull();fireEvent.click(screen.getByText('Pick wall'));const inspector=screen.getByRole('region',{name:'Selected site object'});expect(inspector.className).not.toContain('fixed');
 rerender(<ProWorkspace data={data} lang="en"><VisualMeasureWorkspace embedded data={data} set={()=>{}} lang="en" shape="stair_platform" initialPostId={data.posts[0].id}/></ProWorkspace>);expect(screen.getAllByTestId('renderer')).toHaveLength(1);expect(screen.getByRole('complementary').className).not.toContain('fixed');expect(lifecycle.mount).toHaveBeenCalledTimes(1);
});
it('embeds materials with one scene and contextual stock review, preserving custom member tools',()=>{
 render(<ProWorkspace data={data} lang="en"><SteelWorkspace embedded data={data} set={()=>{}} lang="en" catalog={[]}/></ProWorkspace>);expect(screen.getAllByTestId('renderer')).toHaveLength(1);expect(screen.queryByRole('navigation',{name:'Material workflow'})).toBeNull();expect(screen.getByText('Custom members')).toBeTruthy();expect(screen.getByText('Stock & review')).toBeTruthy();expect(screen.queryByText('Build a measured grate or ladder')).toBeNull();
});
