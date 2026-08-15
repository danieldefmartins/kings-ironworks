import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionWorker } from "@/lib/shop/session";
import { sbSelect, sbInsert, sbUpdate, sbDelete } from "@/lib/shop/db";
import {
  MEASURE_SHAPES,
  newMeasureData,
  type MeasureShape,
  type MeasureSheet,
} from "@/lib/shop/measure";

export const runtime = "nodejs";

// ---- Payload validation (server-only; keep zod out of client bundles) ------

const meas = z.string().max(60); // one measurement or short value
const note = z.string().max(2000);
const uuid = z.string().uuid();

const StepSchema = z.object({ rise: meas, run: meas, nosing: meas });
const FlightSchema = z.object({
  kind: z.literal("flight"),
  steps: z.array(StepSchema).min(1).max(60),
  width: meas,
  angleDeg: meas,
  angleBreak: z.string().max(300),
});
const PlatformSchema = z.object({
  kind: z.literal("platform"),
  length: meas,
  depth: meas,
  slope: meas,
  slopeDir: z.string().max(120),
  turn: z.enum(["none", "left", "right", "u"]),
});
const RampSchema = z.object({
  kind: z.literal("ramp"),
  length: meas,
  rise: meas,
  angleDeg: meas,
  width: meas,
});
const PostSchema = z.object({
  id: z.string().max(40),
  segIdx: z.number().int().min(0).max(30),
  stepIdx: z.number().int().min(0).max(120).nullable(),
  pos: meas,
  fromNosing: meas,
  fromEdge: meas,
  mount: z.string().max(40),
  anchor: z.string().max(60),
});
const SpiralSchema = z
  .object({
    floorToFloor: meas,
    treads: meas,
    rotationDeg: meas,
    direction: z.enum(["cw", "ccw"]),
    diameter: meas,
    columnSize: meas,
    clearWidth: meas,
    landingNote: z.string().max(300),
  })
  .nullable();
const MeasureDataSchema = z.object({
  segments: z
    .array(z.discriminatedUnion("kind", [FlightSchema, PlatformSchema, RampSchema]))
    .max(12),
  posts: z.array(PostSchema).max(120),
  spiral: SpiralSchema,
  rail: z.object({
    kind: z.string().max(40),
    height: meas,
    side: z.string().max(20),
    extensions: z.string().max(200),
    returns: z.string().max(200),
    brackets: z.string().max(200),
  }),
  materials: z.object({
    post: z.string().max(120),
    topRail: z.string().max(120),
    picket: z.string().max(120),
    picketSpacing: meas,
    bottomRail: z.string().max(120),
    finish: z.string().max(60),
    color: z.string().max(60),
    notes: note,
  }),
  overall: z.object({ totalRise: meas, totalRun: meas, rakeLength: meas, notes: note }),
  units: z.enum(["in", "ftin"]).optional(),
});

const TABLE = "kiw_shop_measure_sheets";

// Sheet filter: always by id; also by job when the client sends it, so a
// request can never touch a sheet on a different job than the page it came from.
function sheetFilter(id: string, jobId?: string): string {
  return `id=eq.${id}${jobId ? `&job_id=eq.${jobId}` : ""}`;
}

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: NextRequest) {
  const worker = await getSessionWorker();
  if (!worker) return bad("Not signed in", 401);

  try {
    const body = await req.json();
    const type = body.type as string;
    const now = new Date().toISOString();

    switch (type) {
      // New sheet: shape + step counts seed the blank sketch.
      case "create": {
        const shape = body.shape as MeasureShape;
        if (!MEASURE_SHAPES.includes(shape)) return bad("Bad shape");
        if (!uuid.safeParse(body.jobId).success) return bad("Bad job id");
        const steps1 = Math.min(40, Math.max(1, Number(body.steps1) || 1));
        const steps2 = Math.min(40, Math.max(0, Number(body.steps2) || 0));
        const rows = await sbInsert<MeasureSheet[]>(TABLE, {
          job_id: body.jobId,
          name: String(body.name || "").trim().slice(0, 200) || null,
          shape,
          status: "in_progress",
          data: newMeasureData(shape, steps1, steps2),
          created_by: worker.id,
          updated_by: worker.id,
        });
        return NextResponse.json({ ok: true, id: rows[0]?.id });
      }

      // Autosave: full validated payload, optimistic-concurrency via updated_at.
      case "update": {
        if (!uuid.safeParse(body.id).success) return bad("Bad sheet id");
        const parsed = MeasureDataSchema.safeParse(body.data);
        if (!parsed.success) {
          return bad(`Bad payload: ${parsed.error.issues[0]?.message || "invalid"}`);
        }
        const baseFilter = sheetFilter(
          body.id,
          uuid.safeParse(body.jobId).success ? body.jobId : undefined
        );
        const base = typeof body.baseUpdatedAt === "string" ? body.baseUpdatedAt : null;
        const filter = base
          ? `${baseFilter}&updated_at=eq.${encodeURIComponent(base)}`
          : baseFilter;
        const rows = await sbUpdate<MeasureSheet[]>(TABLE, filter, {
          data: parsed.data,
          updated_by: worker.id,
          updated_at: now,
        });
        if (rows.length === 0) {
          // Distinguish "someone else saved first" from "sheet is gone".
          const exists = await sbSelect<{ id: string }[]>(
            TABLE,
            `select=id&${baseFilter}&limit=1`
          );
          return exists.length > 0
            ? bad("Sheet was changed elsewhere", 409)
            : bad("Sheet not found", 404);
        }
        return NextResponse.json({ ok: true, updated_at: rows[0].updated_at });
      }

      case "rename": {
        if (!uuid.safeParse(body.id).success) return bad("Bad sheet id");
        const rows = await sbUpdate<MeasureSheet[]>(
          TABLE,
          sheetFilter(body.id, uuid.safeParse(body.jobId).success ? body.jobId : undefined),
          {
            name: String(body.name || "").trim().slice(0, 200) || null,
            updated_by: worker.id,
            updated_at: now,
          }
        );
        if (rows.length === 0) return bad("Sheet not found", 404);
        return NextResponse.json({ ok: true, updated_at: rows[0].updated_at });
      }

      // in_progress <-> ready (ready = approved to fabricate from)
      case "status": {
        if (!uuid.safeParse(body.id).success) return bad("Bad sheet id");
        const status = body.status === "ready" ? "ready" : "in_progress";
        const rows = await sbUpdate<MeasureSheet[]>(
          TABLE,
          sheetFilter(body.id, uuid.safeParse(body.jobId).success ? body.jobId : undefined),
          { status, updated_by: worker.id, updated_at: now }
        );
        if (rows.length === 0) return bad("Sheet not found", 404);
        return NextResponse.json({ ok: true, updated_at: rows[0].updated_at });
      }

      case "delete": {
        if (!uuid.safeParse(body.id).success) return bad("Bad sheet id");
        const rows = await sbDelete<MeasureSheet[]>(
          TABLE,
          sheetFilter(body.id, uuid.safeParse(body.jobId).success ? body.jobId : undefined)
        );
        if (!Array.isArray(rows) || rows.length === 0) return bad("Sheet not found", 404);
        return NextResponse.json({ ok: true });
      }

      default:
        return bad("Unknown action");
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Action failed" },
      { status: 500 }
    );
  }
}
