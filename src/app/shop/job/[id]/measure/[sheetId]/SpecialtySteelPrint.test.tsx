import {afterEach,expect,it} from 'vitest';
import {cleanup,render,screen,within} from '@testing-library/react';
import {newSpecialtySteel,specialtySignature} from '@/lib/shop/measure-specialty-steel';
import SpecialtySteelPrint from './SpecialtySteelPrint';
afterEach(cleanup);
it('prints exact grouped cuts and measured dimensions without claiming full profiles or approval',()=>{
 const a={...newSpecialtySteel('g','grate'),width:'36',length:'48',sideWidth:'2',endWidth:'2',barWidth:'0.5',endGap:'0.125',maxSpace:'3'};a.checked=specialtySignature(a);
 render(<SpecialtySteelPrint assemblies={[a]} lang="en"/>);
 expect(screen.getByRole('img',{name:'Grate measured member layout'})).toBeTruthy();
 const table=screen.getByRole('table');expect(within(table).getByText('S1 – S2')).toBeTruthy();expect(within(table).getAllByText('31.7500')).toHaveLength(2);expect(within(table).getByText('48.0000')).toBeTruthy();
 expect(screen.getByText(/Geometry checked · shop approval still required/)).toBeTruthy();expect(screen.getByText(/not complete steel profiles/)).toBeTruthy();
});
it('prints missing geometry as unresolved with no fabricated cut table',()=>{render(<SpecialtySteelPrint assemblies={[newSpecialtySteel('l','ladder')]} lang="en"/>);expect(screen.queryByRole('table')).toBeNull();expect(screen.getByText(/NOT CHECKED/)).toBeTruthy();});
