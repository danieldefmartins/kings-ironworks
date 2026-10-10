import {z} from 'zod';

const measurement = z.string().max(40);
export const SiteRailEndSchema = z.object({
  objectId: z.string().max(60),
  face: z.enum(['left', 'right', 'near', 'far', 'radial']),
  along: z.number().finite().min(0).max(1),
  angle: z.number().finite().min(-360).max(360),
  elevation: measurement,
  connection: z.string().max(1000),
});
export const SiteRailSchema = z.object({
  id: z.string().min(1).max(60), label: z.string().min(1).max(80),
  start: SiteRailEndSchema, end: SiteRailEndSchema,
  height: measurement, bottomClearance: measurement,
  infill: z.enum(['', 'pickets', 'glass', 'cable', 'mesh', 'solid', 'custom']),
  profiles: z.string().max(1000), notes: z.string().max(1000),
  checkedSignature: z.string().max(16000),
});
export type SiteRailEnd = z.infer<typeof SiteRailEndSchema>;
export type SiteRail = z.infer<typeof SiteRailSchema>;
