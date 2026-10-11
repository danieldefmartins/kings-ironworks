// Server-side validation for the structural steel payload. zod strips unknown
// keys, so every StructuralData field must be listed here or it is lost on save.
import { z } from "zod";
import {
  STRUCT_CARRIES,
  STRUCT_CONDITIONS,
  STRUCT_FINISHES,
  STRUCT_FOOTINGS,
  STRUCT_LIFTS,
  STRUCT_ROLES,
  STRUCT_SHORING,
  STRUCT_SUBSTRATES,
} from "./measure-structural";

const meas = z.string().max(60);
const short = z.string().max(200);
const opt = <T extends readonly [string, ...string[]]>(v: T) => z.enum(["", ...v] as [string, ...string[]]);

const Bearing = z.object({
  substrate: opt(STRUCT_SUBSTRATES),
  condition: opt(STRUCT_CONDITIONS),
  length: meas,
  wall: meas,
});

const Member = z.object({
  id: z.string().max(40),
  mark: z.string().max(12),
  role: z.enum(STRUCT_ROLES),
  profile: z.string().max(80),
  qty: z.string().max(6),
  spanA: meas,
  spanB: meas,
  bearingL: Bearing,
  bearingR: Bearing,
  minBearing: meas,
  existing: short,
  elevation: meas,
  carries: opt(STRUCT_CARRIES),
  shoring: opt(STRUCT_SHORING),
  heights: z.array(z.object({ id: z.string().max(40), label: z.string().max(60), value: meas })).max(24),
  plumb: meas,
  base: Bearing,
  footing: opt(STRUCT_FOOTINGS),
  footingSize: short,
  basePlate: z.string().max(60),
  capPlate: z.string().max(60),
  anchors: short,
  shim: meas,
  finishFloor: meas,
  dwgSpan: meas,
  dwgHeight: meas,
  dwgElevation: meas,
  notes: z.string().max(600),
});

export const StructuralSchema = z
  .object({
    datum: short,
    members: z.array(Member).max(60),
    frame: z.object({
      on: z.boolean(),
      opening: meas, cc: meas, diagA: meas, diagB: meas, dwgOpening: meas, dwgCc: meas,
    }),
    eng: z.object({
      stamped: z.enum(["", "yes", "no"]),
      drawingNo: z.string().max(60),
      revision: z.string().max(20),
      engineer: short,
      required: z.enum(["", "yes", "no"]),
      permit: z.enum(["", "yes", "no", "others"]),
      connection: short,
    }),
    finish: opt(STRUCT_FINISHES),
    fireRating: z.string().max(60),
    color: z.string().max(60),
    access: z.object({
      path: short, doorWidth: meas, stairWidth: meas, maxLength: meas,
      maxWeight: meas, lift: opt(STRUCT_LIFTS), splice: short,
    }),
    notes: z.string().max(2000),
  })
  .nullable();
