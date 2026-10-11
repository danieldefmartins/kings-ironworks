// Server-side validation for the shared substrate and future-finish models.
// zod strips unknown keys, so every Substrate / FutureFinish field must be
// listed here or it is silently dropped on save.
import { z } from "zod";
import { FINISH_TYPES, SUB_CONDITIONS, SUB_HIDDEN, SUB_MATERIALS, SUB_MOUNTS } from "./measure-substrate";

const meas = z.string().max(60);

export const SubstrateSchema = z.object({
  material: z.enum(["", ...SUB_MATERIALS]),
  condition: z.enum(["", ...SUB_CONDITIONS]),
  edgeDist: meas,
  depth: meas,
  mount: z.enum(["", ...SUB_MOUNTS]),
  hidden: z.enum(["", ...SUB_HIDDEN]),
  scanned: z.boolean(),
  standoff: z.boolean(),
  blocking: z.boolean(),
  anchor: z.string().max(120),
  note: z.string().max(300),
});

export const FutureFinishSchema = z.object({
  installed: z.enum(["", "yes", "no"]),
  type: z.enum(["", ...FINISH_TYPES]),
  thickness: meas,
});

export const SurfacesSchema = z.object({
  bottom: FutureFinishSchema.optional(),
  treads: FutureFinishSchema.optional(),
  landing: FutureFinishSchema.optional(),
  top: FutureFinishSchema.optional(),
  floor: FutureFinishSchema.optional(),
  deck: FutureFinishSchema.optional(),
  ground: FutureFinishSchema.optional(),
  wall: FutureFinishSchema.optional(),
  slab: FutureFinishSchema.optional(),
});
