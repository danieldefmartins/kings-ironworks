import {z} from 'zod';
const dimension=z.string().max(40);
export const SpecialtySteelSchema=z.object({
 id:z.string().max(80),label:z.string().max(100),kind:z.enum(['grate','ladder']),
 width:dimension,length:dimension,sideWidth:dimension,endWidth:dimension,
 barWidth:dimension,endGap:dimension,maxSpace:dimension,checked:z.string().max(4000),
});
export type SpecialtySteel=z.infer<typeof SpecialtySteelSchema>;
export const SpecialtySteelListSchema=z.array(SpecialtySteelSchema).max(20);
