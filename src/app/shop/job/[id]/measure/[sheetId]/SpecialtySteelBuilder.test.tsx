import {useState} from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {newSpecialtySteel} from '@/lib/shop/measure-specialty-steel';
import SpecialtySteelBuilder from './SpecialtySteelBuilder';
afterEach(cleanup);
it('releases measured cuts only after review and invalidates after a dimensional change',()=>{
 const picked=vi.fn();
 function Harness(){const [items,setItems]=useState([{...newSpecialtySteel('test','ladder'),width:'24',length:'120',sideWidth:'2',barWidth:'1',endGap:'1/8',maxSpace:'12'}]);return <SpecialtySteelBuilder assemblies={items} onChange={setItems} lang="en" onSelect={picked}/>;}
 render(<Harness/>);fireEvent.change(screen.getByLabelText('Measured assembly'),{target:{value:'test'}});
 const member=screen.getAllByRole('button',{name:'Ladder · R1'})[0];fireEvent.click(member);expect(picked).not.toHaveBeenCalled();
 const review=screen.getByRole('checkbox',{name:/Measured dimensions/});fireEvent.click(review);fireEvent.click(member);expect(picked).toHaveBeenCalledWith('specialty-test:R1');
 fireEvent.click(screen.getByText('Measured dimensions · inches'));
 fireEvent.change(screen.getByLabelText('Overall width'),{target:{value:'25'}});expect((review as HTMLInputElement).checked).toBe(false);
 picked.mockClear();fireEvent.click(member);expect(picked).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Remove assembly'}));expect(screen.queryByRole('checkbox')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Undo removal'}));expect((screen.getByLabelText('Overall width') as HTMLInputElement).value).toBe('25');
});
