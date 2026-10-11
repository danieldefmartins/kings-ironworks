// Server-side validation for the canopy payload. zod strips unknown keys, so
// every CanopyData field must be listed here or it is lost on save.
import { z } from "zod";
import {
  CANOPY_BACKINGS,
  CANOPY_DATUMS,
  CANOPY_DRAINS,
  CANOPY_FINISHES,
  CANOPY_FLASHINGS,
  CANOPY_GUTTERS,
  CANOPY_KINDS,
  CANOPY_OBSTRUCTIONS,
  CANOPY_ROOFS,
  CANOPY_SIDES,
  CANOPY_SUBSTRATES,
  CANOPY_SUPPORTS,
  CANOPY_SWINGS,
} from "./measure-canopy";

const meas = z.string().max(60);
const short = z.string().max(200);
const opt = <T extends readonly [string, ...string[]]>(v: T) => z.enum(["", ...v] as [string, ...string[]]);

export const CanopySchema = z
  .object({
    kind: opt(CANOPY_KINDS),
    substrate: opt(CANOPY_SUBSTRATES),
    backing: opt(CANOPY_BACKINGS),
    datum: opt(CANOPY_DATUMS),
    width: meas,
    projection: meas,
    depth: meas,
    soffitL: meas,
    soffitR: meas,
    mount: meas,
    fall: meas,
    drain: opt(CANOPY_DRAINS),
    support: opt(CANOPY_SUPPORTS),
    rodRise: meas,
    posts: z.array(z.object({ id: z.string().max(40), label: z.string().max(40), height: meas })).max(24),
    door: z.object({ swing: opt(CANOPY_SWINGS), width: meas, head: meas }),
    roof: opt(CANOPY_ROOFS),
    snow: z.boolean(),
    engineer: z.enum(["", "yes", "no"]),
    flashing: opt(CANOPY_FLASHINGS),
    ledgerNote: short,
    obstructions: z.array(z.enum(CANOPY_OBSTRUCTIONS)).max(CANOPY_OBSTRUCTIONS.length),
    obstructionNote: short,
    gutter: opt(CANOPY_GUTTERS),
    downspout: opt(CANOPY_SIDES),
    gutterDrop: meas,
    curb: meas,
    finish: opt(CANOPY_FINISHES),
    notes: z.string().max(2000),
  })
  .nullable();
