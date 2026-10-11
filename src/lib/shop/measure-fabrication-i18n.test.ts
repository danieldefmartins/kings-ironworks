import {expect,it} from 'vitest';
import {fabricationText} from './measure-fabrication-i18n';
it('translates domain diagnostics without translating user names',()=>{
 expect(fabricationText('pt','Escolha personalizada: Choose a catalog material.')).toBe('Escolha personalizada: Escolha um material do catálogo.');
 expect(fabricationText('es','R1: Add cut lengths.')).toBe('R1: Añada las longitudes de corte.');
 expect(fabricationText('pt','Custom site instruction')).toBe('Custom site instruction');
});

it('preserves measured numbers when translating generated profile descriptions',()=>{
 expect(fabricationText('pt','0.5 in plan width; 0.125 in clearance at each end')).toBe('0.5 pol. de largura em planta; 0.125 pol. de folga em cada ponta');
 expect(fabricationText('es','2 in plan width; full profile must be checked')).toBe('2 pulg. de ancho en planta; verificar el perfil completo');
 expect(fabricationText('pt','Custom in plan width; keep this instruction')).toBe('Custom in plan width; keep this instruction');
});
