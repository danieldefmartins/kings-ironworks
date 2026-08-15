import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionWorker } from "@/lib/shop/session";
import { sbSelect, sbInsert, sbUpdate, sbDelete } from "@/lib/shop/db";
import {
  MEASURE_SHAPES,
  newMeasureData,
  normalizeMeasureData,
  type MeasureShape,
  type MeasureSheet,
} from "@/lib/shop/measure";
import { submitBlockers } from "@/lib/shop/measure-checks";

export const runtime = "nodejs";

// ---- Payload validation (server-only; keep zod out of client bundles) ------

const meas = z.string().max(60); // one measurement or short value
const short = z.string().max(300);
const note = z.string().max(2000);
const uuid = z.string().uuid();

const StepSchema = z.object({ rise: meas, run: meas, nosing: meas });
const FlightSchema = z.object({
  kind: z.literal("flight"),
  steps: z.array(StepSchema).min(1).max(60),
  width: meas,
  angleDeg: meas,
  angleBreak: short,
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
  plate: z.string().max(200),
  anchors: z.string().max(200),
  substrate: z.string().max(200),
  edgeDist: z.string().max(200),
  obstruction: z.string().max(200),
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
    landingNote: short,
  })
  .nullable();
const DatumsSchema = z.object({
  orientation: z.enum(["", "left_wall", "right_wall", "both_open", "both_wall"]),
  bottomDatum: short,
  topDatum: short,
  nosingRef: short,
  postRef: z.enum(["", "centerline", "face"]),
  surfaceState: z.enum(["", "finished", "unfinished", "mixed"]),
});
const FinishSchema = z.object({
  bottomSurface: short,
  topSurface: short,
  futureTopping: short,
  treadCovering: short,
  wallFinish: short,
  demoPending: short,
  verifyAfterFinishes: z.boolean(),
  notes: note,
});
const FabSchema = z.object({
  corners: short,
  flightConnection: short,
  bottomClearance: short,
  infill: short,
  splices: short,
  maxPiece: short,
  access: short,
  gate: short,
  touchup: short,
});
const PhotoSchema = z.object({
  slot: z.string().max(60),
  path: z.string().max(300),
  takenAt: z.string().max(40),
});
const StrokeSchema = z.object({
  tool: z.string().max(12),
  color: z.string().max(24),
  points: z.array(z.object({ x: z.number(), y: z.number() })).max(2000),
  text: z.string().max(200).optional(),
});
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
  overall: z.object({
    totalRise: meas,
    totalRun: meas,
    rakeLength: meas,
    floorToFloor: meas,
    widthBottom: meas,
    widthMid: meas,
    widthTop: meas,
    notes: note,
  }),
  datums: DatumsSchema,
  finish: FinishSchema,
  fab: FabSchema,
  photos: z.array(PhotoSchema).max(80),
  annotations: z.record(z.string().max(300), z.array(StrokeSchema).max(300)),
  units: z.enum(["in", "ftin"]).optional(),
});

const TABLE = "kiw_shop_measure_sheets";
const REV_TABLE = "kiw_shop_measure_revisions";

// Sheet filter: always by id; also by job when the client sends it, so a
// request can never touch a sheet on a different job than the page it came from.
function sheetFilter(id: string, jobId?: string): string {
  return `id=eq.${id}${jobId ? `&job_id=eq.${jobId}` : ""}`;
}

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

async function loadSheet(id: string, jobId?: string): Promise<MeasureSheet | null> {
  const rows = await sbSelect<MeasureSheet[]>(
    TABLE,
    `select=*&${sheetFilter(id, jobId)}&limit=1`
  );
  return rows[0] || null;
}

export async function POST(req: NextRequest) {
  const worker = await getSessionWorker();
  if (!worker) return bad("Not signed in", 401);

  try {
    const body = await req.json();
    const type = body.type as string;
    const now = new Date().toISOString();
    const jobOk = uuid.safeParse(body.jobId).success ? (body.jobId as string) : undefined;

    switch (type) {
      // New sheet: shape + step counts seed the blank sketch.
      case "create": {
        const shape = body.shape as MeasureShape;
        if (!MEASURE_SHAPES.includes(shape)) return bad("Bad shape");
        if (!jobOk) return bad("Bad job id");
        const steps1 = Math.min(40, Math.max(1, Number(body.steps1) || 1));
        const steps2 = Math.min(40, Math.max(0, Number(body.steps2) || 0));
        const rows = await sbInsert<MeasureSheet[]>(TABLE, {
          job_id: jobOk,
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
      // Any edit takes the sheet back to "in_progress" — an approved record can
      // never silently drift from what fabrication started with.
      case "update": {
        if (!uuid.safeParse(body.id).success) return bad("Bad sheet id");
        const parsed = MeasureDataSchema.safeParse(body.data);
        if (!parsed.success) {
          return bad(`Bad payload: ${parsed.error.issues[0]?.message || "invalid"}`);
        }
        const baseFilter = sheetFilter(body.id, jobOk);
        const base = typeof body.baseUpdatedAt === "string" ? body.baseUpdatedAt : null;
        const filter = base
          ? `${baseFilter}&updated_at=eq.${encodeURIComponent(base)}`
          : baseFilter;
        const rows = await sbUpdate<MeasureSheet[]>(TABLE, filter, {
          data: parsed.data,
          status: "in_progress",
          submitted_by: null,
          submitted_at: null,
          approved_by: null,
          approved_at: null,
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
        return NextResponse.json({
          ok: true,
          updated_at: rows[0].updated_at,
          status: rows[0].status,
        });
      }

      case "rename": {
        if (!uuid.safeParse(body.id).success) return bad("Bad sheet id");
        const rows = await sbUpdate<MeasureSheet[]>(TABLE, sheetFilter(body.id, jobOk), {
          name: String(body.name || "").trim().slice(0, 200) || null,
          updated_by: worker.id,
          updated_at: now,
        });
        if (rows.length === 0) return bad("Sheet not found", 404);
        return NextResponse.json({ ok: true, updated_at: rows[0].updated_at });
      }

      // Measurer finishes: gate on completeness + geometry, then queue for review.
      case "submit": {
        if (!uuid.safeParse(body.id).success) return bad("Bad sheet id");
        const sheet = await loadSheet(body.id, jobOk);
        if (!sheet) return bad("Sheet not found", 404);
        const data = normalizeMeasureData(sheet.data);
        const blockers = submitBlockers(data, sheet.shape);
        if (blockers.gaps.length > 0 || blockers.redChecks.length > 0) {
          return NextResponse.json(
            {
              error: "Sheet is not ready to submit",
              gaps: blockers.gaps,
              redChecks: blockers.redChecks.map((c) => c.key),
            },
            { status: 422 }
          );
        }
        const rows = await sbUpdate<MeasureSheet[]>(TABLE, sheetFilter(body.id, jobOk), {
          status: "submitted",
          submitted_by: worker.id,
          submitted_at: now,
          review_comment: null,
          updated_by: worker.id,
          updated_at: now,
        });
        return NextResponse.json({ ok: true, updated_at: rows[0]?.updated_at });
      }

      // Admin approves: snapshot an immutable revision the shop fabricates from.
      case "approve": {
        if (!worker.is_admin) return bad("Admin only", 403);
        if (!uuid.safeParse(body.id).success) return bad("Bad sheet id");
        const sheet = await loadSheet(body.id, jobOk);
        if (!sheet) return bad("Sheet not found", 404);
        if (sheet.status !== "submitted") {
          return bad("Sheet must be submitted before approval", 409);
        }
        const revNo = (sheet.current_rev || 0) + 1;
        await sbUpdate(REV_TABLE, `sheet_id=eq.${sheet.id}&superseded=eq.false`, {
          superseded: true,
        });
        await sbInsert(REV_TABLE, {
          sheet_id: sheet.id,
          rev_no: revNo,
          name: sheet.name,
          shape: sheet.shape,
          data: normalizeMeasureData(sheet.data),
          approved_by: worker.id,
          approved_at: now,
        });
        const rows = await sbUpdate<MeasureSheet[]>(TABLE, sheetFilter(body.id, jobOk), {
          status: "approved",
          approved_by: worker.id,
          approved_at: now,
          current_rev: revNo,
          updated_by: worker.id,
          updated_at: now,
        });
        return NextResponse.json({ ok: true, rev: revNo, updated_at: rows[0]?.updated_at });
      }

      // Admin sends a submitted sheet back to the measurer with a comment.
      case "sendback": {
        if (!worker.is_admin) return bad("Admin only", 403);
        if (!uuid.safeParse(body.id).success) return bad("Bad sheet id");
        const rows = await sbUpdate<MeasureSheet[]>(TABLE, sheetFilter(body.id, jobOk), {
          status: "in_progress",
          review_comment: String(body.comment || "").trim().slice(0, 1000) || null,
          submitted_by: null,
          submitted_at: null,
          approved_by: null,
          approved_at: null,
          updated_by: worker.id,
          updated_at: now,
        });
        if (rows.length === 0) return bad("Sheet not found", 404);
        return NextResponse.json({ ok: true, updated_at: rows[0].updated_at });
      }

      case "delete": {
        if (!uuid.safeParse(body.id).success) return bad("Bad sheet id");
        const rows = await sbDelete<MeasureSheet[]>(TABLE, sheetFilter(body.id, jobOk));
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
