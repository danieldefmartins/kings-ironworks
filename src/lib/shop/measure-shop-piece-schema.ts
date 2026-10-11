// Server-side validation for the shop-piece payload. zod strips unknown keys,
// so every ShopPieceData field must be listed here or it is lost on save.
import { z } from "zod";
import { SubstrateSchema } from "./measure-substrate-schema";
import { SP_FINISHES, SP_LOADS, SP_MOUNTS, SP_SUBSTRATES, SP_TYPES } from "./measure-shop-piece";

const meas = z.string().max(60);
const opt = <const T extends readonly [string, ...string[]]>(v: T) => z.enum(["", ...v] as unknown as readonly ["", ...T]);

const Piece = z.object({
  id: z.string().max(40),
  label: z.string().max(60),
  type: opt(SP_TYPES),
  qty: z.string().max(6),
  wBack: meas, wFront: meas, wTop: meas, wBottom: meas,
  hLeft: meas, hRight: meas, hBack: meas,
  dTop: meas, dBottom: meas,
  diagA: meas, diagB: meas,
  squareFix: z.enum(["", "smallest", "template"]),
  notes: z.string().max(600),
  fabW: meas.optional(), fabH: meas.optional(), fabD: meas.optional(),
});

export const ShopPieceSchema = z
  .object({
    mount: opt(SP_MOUNTS),
    niche: z.boolean(),
    clearance: meas,
    substrate: opt(SP_SUBSTRATES),
    fastener: z.string().max(200),
    materials: z
      .array(z.object({ id: z.string().max(40), profile: z.string().max(120), use: z.string().max(120), qty: z.string().max(40) }))
      .max(40),
    finish: opt(SP_FINISHES),
    color: z.string().max(60),
    load: opt(SP_LOADS),
    bottles: z.string().max(8),
    loadNote: z.string().max(300),
    drawingRef: z.string().max(200),
    sub: SubstrateSchema.optional(),
    pieces: z.array(Piece).max(40),
    notes: z.string().max(2000),
  })
  .nullable();
