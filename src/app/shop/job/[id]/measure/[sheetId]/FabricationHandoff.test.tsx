import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {newMeasureData} from '@/lib/shop/measure';
import {newSteelPlan,newSteelRow} from '@/lib/shop/measure-steel';
import FabricationHandoff from './FabricationHandoff';
afterEach(cleanup);
it('flags missing dimensions and no material assignments rather than claiming completion',()=>{
 const onReview=vi.fn(),onPrint=vi.fn();render(<FabricationHandoff data={newMeasureData('straight',1)} shape="straight" lang="en" onMaterials={()=>{}} onReview={onReview} onPrint={onPrint}/>);
 expect(screen.getByText('Items still need attention')).toBeTruthy();expect(screen.getByText(/empty takeoff is not a complete material list/)).toBeTruthy();expect(screen.getByText(/does not approve fabrication/)).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Open full shop review'}));expect(onReview).toHaveBeenCalledOnce();fireEvent.click(screen.getByRole('button',{name:'Print current package'}));expect(onPrint).toHaveBeenCalledOnce();
});
it('keeps incomplete material assignments visible as pending',()=>{
 const data=newMeasureData('straight',1);data.steelPlan=newSteelPlan();data.steelPlan.kerf='0';data.steelPlan.trim='0';data.steelPlan.rows=[newSteelRow('row','Top rail','toprail')];
 render(<FabricationHandoff data={data} shape="straight" lang="en" onMaterials={()=>{}} onReview={()=>{}} onPrint={()=>{}}/>);expect(screen.getByText(/1 assignments pending/)).toBeTruthy();expect(screen.getByText('Top rail: Choose a catalog material.')).toBeTruthy();
});
