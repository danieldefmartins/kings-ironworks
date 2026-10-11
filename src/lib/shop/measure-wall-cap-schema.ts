// Server-side validation for the wall-cap railing payload. zod strips unknown
// keys, so every WallCapData field must be listed here or it is lost on save.
import { z } from "zod";
import { WC_FINISHES, WC_KINDS, WC_MATERIALS, WC_MOUNTS, WC_RAILS } from "./measure-wall-cap";

const meas = z.string().max(60);
const opt = <const T extends readonly [string, ...string[]]>(v: T) => z.enum(["", ...v] as unknown as readonly ["", ...T]);
const yn = z.enum(["", "yes", "no"]);

const Post = z.object({
  id: z.string().max(40),
  at: meas,
  capWidth: meas,
  top: meas,
  edgeHigh: meas,
  edgeLow: meas,
  material: opt(WC_MATERIALS),
});

const Run = z.object({
  id: z.string().max(40),
  length: meas,
  turn: meas,
  turnDir: z.enum(["", "left", "right"]),
  rail: opt(WC_RAILS),
  posts: z.array(Post).max(60),
});

export const WallCapSchema = z
  .object({
    kind: opt(WC_KINDS),
    material: opt(WC_MATERIALS),
    dropSide: z.enum(["", "left", "right"]),
    drop: meas,
    capAboveWalk: meas,
    railHeight: meas,
    occupancy: z.enum(["", "residential", "commercial"]),
    datum: z.string().max(200),
    mount: opt(WC_MOUNTS),
    coreDia: meas,
    coreDepth: meas,
    plateSize: z.string().max(60),
    faceDepth: meas,
    loose: yn,
    cracked: yn,
    membrane: yn,
    noPenetration: yn,
    flashBy: z.enum(["", "roofer", "kiw", "others"]),
    runs: z.array(Run).max(40),
    finish: opt(WC_FINISHES),
    color: z.string().max(60),
    notes: z.string().max(2000),
  })
  .nullable();
