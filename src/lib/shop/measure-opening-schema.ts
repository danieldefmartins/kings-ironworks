// Server-side validation for the opening sheet. zod strips unknown keys, so
// every OpeningData / OpeningUnit field must be listed here or it is silently
// dropped on save.
import { z } from "zod";
import { SubstrateSchema } from "./measure-substrate-schema";
import { OPENING_ANCHORS, OPENING_MOUNTS, OPENING_PRODUCTS, OPENING_SUBSTRATES } from "./measure-opening";

const meas = z.string().max(60);
const short = z.string().max(300);
const note = z.string().max(2000);
const yn = z.enum(["", "yes", "no"]);
const side = z.enum(["", "left", "right"]);

const OpeningUnitSchema = z.object({
  id: z.string().max(40),
  label: z.string().max(80),
  qty: z.string().max(4),
  wTop: meas, wMid: meas, wBot: meas,
  hLeft: meas, hCenter: meas, hRight: meas,
  diagA: meas, diagB: meas,
  reveal: meas, sillSlope: meas, sillProjection: meas,
  egress: yn,
  quickRelease: yn,
  sillAff: meas.optional(), dropOutside: meas.optional(),
  squareFix: z.enum(["", "rect", "template"]),
  note: short,
});

export const OpeningSchema = z
  .object({
    product: z.enum(["", ...OPENING_PRODUCTS]),
    mount: z.enum(["", ...OPENING_MOUNTS]),
    clearance: meas,
    overlap: meas,
    units: z.array(OpeningUnitSchema).max(40),
    substrate: z.enum(["", ...OPENING_SUBSTRATES]),
    substrateCondition: short,
    sub: SubstrateSchema.optional(),
    anchor: z.enum(["", ...OPENING_ANCHORS]),
    anchorNote: short,
    design: short,
    julietSill: meas,
    julietGuard: z.enum(["", "36", "42"]),
    julietProjection: meas,
    julietDoorSwing: z.enum(["", "in", "out"]),
    julietDoorClears: yn,
    doorHinge: side,
    doorSwing: z.enum(["", "in", "out"]),
    threshold: meas,
    jambMaterial: short,
    lockSide: side,
    notes: note,
  })
  .nullable();
