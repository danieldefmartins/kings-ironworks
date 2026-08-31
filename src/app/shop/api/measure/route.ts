import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionWorker } from "@/lib/shop/session";
import {
  sbSelect,
  sbInsert,
  sbUpdate,
  sbDelete,
  sbRpc,
  getJob,
  getOrgSettings,
  audit,
  ORG_ID,
} from "@/lib/shop/db";
import {
  MEASURE_SHAPES,
  MEASURE_PRESETS,
  newMeasureData,
  newPresetMeasureData,
  normalizeMeasureData,
  type MeasureShape,
  type MeasurePreset,
  type MeasureSheet,
} from "@/lib/shop/measure";
import { runChecks, submitBlockers, mergeTolerances } from "@/lib/shop/measure-checks";

export const runtime = "nodejs";

// ---- Payload validation (server-only; keep zod out of client bundles) ------

const meas = z.string().max(60); // one measurement or short value
const short = z.string().max(300);
const note = z.string().max(2000);
const uuid = z.string().uuid();

const StepSchema = z.object({
  rise: meas,
  run: meas,
  nosing: meas,
  levelGap: meas.optional(),
  winder: z.boolean().optional(),
  runIn: meas.optional(),
  runOut: meas.optional(),
  turnDeg: meas.optional(),
});
const FlightSchema = z.object({
  kind: z.literal("flight"),
  branch: z.enum(["left", "right"]).optional(),
  steps: z.array(StepSchema).min(1).max(60),
  width: meas,
  angleDeg: meas,
  angleBreak: short,
  rake: meas,
  ctrlRise: meas,
  ctrlRun: meas,
});
const PlatformSchema = z.object({
  kind: z.literal("platform"),
  length: meas,
  depth: meas,
  diag: meas,
  slope: meas,
  slopeDir: z.string().max(120),
  turn: z.enum(["none", "left", "right", "u"]),
});
const RampSchema = z.object({
  kind: z.literal("ramp"),
  length: meas,
  runH: meas,
  rise: meas,
  angleDeg: meas,
  width: meas,
});
const CurveSchema = z.object({
  kind: z.literal("curve"),
  radius: meas,
  chord: meas,
  arc: meas,
  sweepDeg: meas,
  rise: meas,
  direction: z.enum(["left", "right"]),
  width: meas,
});
const PostSchema = z.object({
  id: z.string().max(40),
  pointType: z.enum(["railing_post", "existing_post", "concrete_wall", "clip"]).optional(),
  side: z.enum(["", "left", "right"]).optional(),
  segIdx: z.number().int().min(0).max(30),
  stepIdx: z.number().int().min(0).max(120).nullable(),
  pos: meas,
  distanceFromFirst: meas.optional(),
  fromNosing: meas,
  fromEdge: meas,
  mount: z.string().max(40),
  anchor: z.string().max(60),
  plate: z.string().max(200),
  anchors: z.string().max(200),
  substrate: z.string().max(200),
  edgeDist: z.string().max(200),
  obstruction: z.string().max(200),
  existingW: meas.optional(),
  existingD: meas.optional(),
  skirtProjection: meas.optional(),
  skirtHeight: meas.optional(),
  columnToWall: meas.optional(),
  columnToPlatformEdge: meas.optional(),
  clipDetail: z.string().max(300).optional(),
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
const GateSchema = z
  .object({
    use: z.enum(["", "driveway", "walk", "service", "pool"]),
    operation: z.enum(["", "single_swing", "double_swing", "slide", "bifold"]),
    widthTop: meas, widthBottom: meas, heightHinge: meas, heightLatch: meas,
    diagA: meas, diagB: meas, groundClearance: meas, gradeRise: meas,
    swingDir: z.enum(["", "in", "out", "both"]),
    hingeSide: z.enum(["", "left", "right"]),
    surface: short,
    postsExisting: z.boolean(), postSize: short, postMaterial: short, footingDepth: meas,
    leafCount: meas, infill: short, picketSpacing: meas, hinges: short, latch: short, dropRod: short,
    automated: z.boolean(), opener: short,
    powerAtGate: z.enum(["", "yes", "no", "unknown"]),
    safetyDevices: short, notes: short,
  })
  .nullable();
const FenceSegmentSchema = z.object({
  id: z.string().max(40), label: z.string().max(60), length: meas, panels: meas, height: meas,
  turnDeg: meas, gradeChange: meas,
  followsGrade: z.enum(["", "racked", "stepped"]),
  obstruction: short,
});
const FenceSchema = z
  .object({
    segments: z.array(FenceSegmentSchema).max(40),
    totalRun: meas, panelWidth: meas, postSpacing: meas, postSize: short, footingDepth: meas,
    height: meas, picketSpacing: meas, gates: short, startTerm: short, endTerm: short,
    utilities: short, notes: short,
  })
  .nullable();
const BalconySchema = z
  .object({
    kind: z.enum(["", "balcony", "juliet", "deck_edge", "roof_edge"]),
    mount: z.enum(["", "top", "fascia", "core_drill", "embedded"]),
    edgeLength: meas, projection: meas, slabThickness: meas, slabMaterial: short,
    edgeCondition: short, guardHeight: meas, picketSpacing: meas, returns: short, corners: short,
    anchorType: short, anchorEmbedment: meas, edgeDistance: meas, minCover: meas, platePlan: short,
    doorOpening: meas, finishedFloor: short, drainage: short, notes: short,
  })
  .nullable();
const ConditionSchema = z.object({
  rating: z.enum(["", "pass", "monitor", "fail"]),
  rust: short,
  sectionLoss: short,
  cracks: short,
  deck: short,
  guards: short,
  anchors: short,
  notes: short,
});
const FireLevelSchema = z.object({
  id: z.string().max(40),
  label: z.string().max(60),
  floorToFloor: meas,
  heightAboveGrade: meas,
  platLength: meas,
  platWidth: meas,
  deck: short,
  openingType: z.enum(["", "window", "door"]),
  openingW: meas,
  openingH: meas,
  sillToPlatform: meas,
  stairRisers: meas,
  stairRise: meas,
  stairRun: meas,
  stairWidth: meas,
  stairAngle: meas,
  guardHeight: meas,
  picketSpacing: meas,
  anchorType: short,
  anchorCount: meas,
  anchorSpacing: meas,
  condition: ConditionSchema,
});
const FireEscapeSchema = z
  .object({
    purpose: z.enum(["", "inspect", "repair", "new"]),
    levels: z.array(FireLevelSchema).max(16),
    ladder: z.object({
      present: z.boolean(),
      type: z.enum(["", "drop", "swing", "counterbalance", "fixed"]),
      length: meas,
      width: meas,
      rungSpacing: meas,
      stowedAboveGrade: meas,
      deployedAboveGrade: meas,
      landingSurface: short,
      obstructions: short,
      operates: z.enum(["", "yes", "stiff", "seized"]),
    }),
    stories: meas,
    wallMaterial: short,
    totalHeight: meas,
    access: short,
    overall: ConditionSchema,
    loadTest: short,
    paintSystem: short,
    violations: short,
    notes: short,
  })
  .nullable();
const WallBandSchema = z.object({
  id: z.string().max(40),
  label: z.string().max(120),
  setback: meas,
  fromTop: meas,
  toTop: meas,
});
const WellSchema = z
  .object({
    construction: z.enum(["", "poured_concrete", "block", "corrugated", "stone", "timber"]),
    lengthAtHouse: meas,
    projection: meas,
    insideLength: meas,
    insideProjection: meas,
    wallThickness: meas,
    diagA: meas,
    diagB: meas,
    depth: meas,
    topToGrade: meas,
    windowW: meas,
    windowH: meas,
    sillToFloor: meas,
    windowSwing: z.enum(["", "in", "out", "slider", "fixed"]),
    deliverables: z.array(z.enum(["grate", "guard", "gate", "ladder"])).max(4),
    guardHeight: meas,
    gateWidth: meas,
    gateSwing: z.enum(["", "in", "out"]),
    gateHinge: z.enum(["", "left", "right"]),
    gateLatch: short,
    ladderWidth: meas,
    ladderRungs: meas,
    ladderSpacing: meas,
    ladderStandoff: meas,
    ladderTopExt: meas,
    grateBearing: z.enum(["", "surface", "recessed", "angle_frame"]),
    grateHinged: z.boolean(),
    grateLoad: short,
    grateInfill: short,
    wallRef: z.string().max(120),
    bands: z.array(WallBandSchema).max(12),
    postToWall: meas,
    maxSphere: meas,
    notes: short,
  })
  .nullable();
const DatumsSchema = z.object({
  orientation: z.enum(["", "left_wall", "right_wall", "both_open", "both_wall"]),
  bottomDatum: short,
  topDatum: short,
  nosingRef: short,
  walkline: meas,
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
  floorChange: z.enum(["", "none", "bottom", "top", "both"]),
  bottomAdjustment: meas,
  topAdjustment: meas,
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
const PlanSchema = z
  .object({
    points: z.array(z.object({ x: z.number(), y: z.number() })).max(80),
    closed: z.boolean(),
    segs: z.array(z.object({
      len: meas,
      note: z.string().max(200),
      kind: z.enum(["", "flight", "landing", "level", "ramp", "curve"]).optional(),
      steps: meas.optional(),
      rise: meas.optional(),
      run: meas.optional(),
      width: meas.optional(),
      stepMeasures: z.array(StepSchema).max(60).optional(),
    })).max(80),
  })
  .nullable()
  .optional();

const HardwareSchema = z.object({
  fastener: z.string().max(200),
  qty: meas,
  elevation: meas,
  shopField: z.enum(["", "shop_weld", "field_bolt"]),
  profile: z.string().max(200),
  thickness: meas,
  holeDia: meas,
  holeSpacing: meas,
  edgeDist: meas,
  embedment: meas,
  orientation: z.string().max(120),
  weldSize: meas,
});
const TerminationSchema = z.object({
  attachTo: z.enum(["", "free_post", "wall", "existing_post", "floor", "continue", "splice", "open"]),
  postId: z.string().max(40),
  spanRef: z.string().max(40),
  method: z.enum([
    "", "clip", "wall_plate", "anchor", "plate", "bolt_through", "weld",
    "base_plate", "core_drill", "embedded", "field_bolt",
  ]),
  material: z.string().max(80),
  backing: z.string().max(300),
  columnW: meas,
  columnD: meas,
  molding: meas,
  moldingHeight: meas,
  plumb: z.string().max(120),
  hardware: HardwareSchema,
  note: z.string().max(300),
});
const SpanSchema = z.object({
  id: z.string().max(40),
  label: z.string().max(120),
  topSpan: meas,
  lowerSpan: meas,
  start: TerminationSchema,
  end: TerminationSchema,
  note: z.string().max(300),
});

const MeasureDataSchema = z.object({
  segments: z
    .array(z.discriminatedUnion("kind", [FlightSchema, PlatformSchema, RampSchema, CurveSchema]))
    .max(12),
  posts: z.array(PostSchema).max(120),
  spiral: SpiralSchema,
  well: WellSchema.optional(),
  fire: FireEscapeSchema.optional(),
  gate: GateSchema.optional(),
  fence: FenceSchema.optional(),
  balcony: BalconySchema.optional(),
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
  plan: PlanSchema,
  spans: z.array(SpanSchema).max(40),
  units: z.enum(["in", "ftin"]).optional(),
});

const TABLE = "kiw_shop_measure_sheets";

// Sheet filter: always by id; also by job when the client sends it, so a
// request can never touch a sheet on a different job than the page it came from.
function sheetFilter(id: string, jobId?: string): string {
  return `org_id=eq.${ORG_ID}&id=eq.${id}${jobId ? `&job_id=eq.${jobId}` : ""}`;
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
        const preset = body.preset as MeasurePreset | undefined;
        if (preset && !MEASURE_PRESETS.includes(preset)) return bad("Bad preset");
        if (!jobOk) return bad("Bad job id");
        if (!(await getJob(jobOk))) return bad("Job not found", 404);
        const steps1 = Math.min(40, Math.max(1, Number(body.steps1) || 1));
        const steps2 = Math.min(40, Math.max(0, Number(body.steps2) || 0));
        const steps3 = Math.min(40, Math.max(0, Number(body.steps3) || 0));
        const seeded = preset
          ? newPresetMeasureData(preset, steps1, steps2, steps3)
          : { shape, data: newMeasureData(shape, steps1, steps2) };
        const rows = await sbInsert<MeasureSheet[]>(TABLE, {
          org_id: ORG_ID,
          job_id: jobOk,
          name: String(body.name || "").trim().slice(0, 200) || null,
          shape: seeded.shape,
          status: "in_progress",
          data: seeded.data,
          created_by: worker.id,
          updated_by: worker.id,
        });
        await audit("sheet_create", {
          workerId: worker.id,
          entity: "measure_sheet",
          entityId: rows[0]?.id,
          detail: { shape: seeded.shape, preset: preset || null, jobId: jobOk },
        });
        // The row goes back too, so a caller does not have to re-fetch the
        // sheet just to learn what the shape seeded.
        return NextResponse.json({ ok: true, id: rows[0]?.id, sheet: rows[0] ?? null });
      }

      // Seller convenience: turn the device's GPS fix into a street address
      // via OpenStreetMap Nominatim (free; requires an identifying UA, so it
      // must be proxied here rather than called from the browser).
      case "reverse_geocode": {
        const lat = Number(body.lat);
        const lng = Number(body.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
          return bad("Bad coordinates");
        }
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            {
              headers: { "User-Agent": "KIW-ShopFloor/1.0 (info@kingsironworks.com)" },
              cache: "no-store",
            }
          );
          if (!res.ok) return bad("Geocoder unavailable", 502);
          const g = (await res.json()) as {
            address?: Record<string, string>;
            display_name?: string;
          };
          const a = g.address || {};
          const street = [a.house_number, a.road].filter(Boolean).join(" ");
          const city = a.city || a.town || a.village || a.hamlet || "";
          const address =
            [street, city, [a.state, a.postcode].filter(Boolean).join(" ")]
              .filter(Boolean)
              .join(", ") || g.display_name || "";
          if (!address) return bad("No address at this location", 404);
          return NextResponse.json({ ok: true, address });
        } catch {
          return bad("Geocoder unavailable", 502);
        }
      }

      // Seller flow: start a field measurement for a project that is not in
      // the shop yet. Creates a lightweight lead job (stage "Lead") that the
      // measure sheets hang off; closing the deal later just moves its stage.
      case "create_lead": {
        const customer = String(body.customer || "").trim().slice(0, 120);
        if (!customer) return bad("Customer name required");
        const stamp = new Date().toISOString().slice(2, 16).replace(/[-T:]/g, "");
        const rows = await sbInsert<{ id: string }[]>("kiw_shop_jobs", {
          org_id: ORG_ID,
          job_number: `FM-${stamp}`,
          customer_name: customer,
          address: String(body.address || "").trim().slice(0, 300) || null,
          phone: String(body.phone || "").trim().slice(0, 40) || null,
          project_type: String(body.projectType || "").trim().slice(0, 80) || null,
          scope: String(body.notes || "").trim().slice(0, 1000) || null,
          current_stage: "Lead",
        });
        if (!rows[0]?.id) return bad("Could not create lead", 500);
        await audit("lead_create", {
          workerId: worker.id,
          entity: "job",
          entityId: rows[0].id,
          detail: { customer },
        });
        return NextResponse.json({ ok: true, jobId: rows[0].id });
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
        await audit("sheet_update", {
          workerId: worker.id,
          entity: "measure_sheet",
          entityId: body.id,
        });
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
        const orgSettings = await getOrgSettings();
        const blockers = submitBlockers(
          data,
          sheet.shape,
          mergeTolerances(orgSettings.tolerances)
        );
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
        // Photo entries must reference real uploads that belong to THIS job —
        // a JSON path alone is not evidence.
        const paths = [...new Set(data.photos.map((ph) => ph.path))];
        if (paths.length > 0) {
          const found = await sbSelect<{ url: string }[]>(
            "kiw_shop_photos",
            `select=url&org_id=eq.${ORG_ID}&job_id=eq.${sheet.job_id}&url=in.(${paths
              .map((x) => `"${x.replace(/"/g, "")}"`)
              .join(",")})`
          );
          const have = new Set(found.map((f) => f.url));
          const missingPaths = paths.filter((x) => !have.has(x));
          if (missingPaths.length > 0) {
            return NextResponse.json(
              { error: "Photos missing from job records", missingPhotos: missingPaths.length },
              { status: 422 }
            );
          }
        }
        const rows = await sbUpdate<MeasureSheet[]>(TABLE, sheetFilter(body.id, jobOk), {
          status: "submitted",
          submitted_by: worker.id,
          submitted_at: now,
          review_comment: null,
          updated_by: worker.id,
          updated_at: now,
        });
        await audit("sheet_submit", {
          workerId: worker.id,
          entity: "measure_sheet",
          entityId: body.id,
        });
        return NextResponse.json({ ok: true, updated_at: rows[0]?.updated_at });
      }

      // Admin approves. The database function does the whole thing in one
      // transaction (row lock, supersede, snapshot, mark approved) and
      // enforces that the measurer cannot approve their own submission.
      case "approve": {
        if (!worker.is_admin) return bad("Admin only", 403);
        if (!uuid.safeParse(body.id).success) return bad("Bad sheet id");
        const sheet = await loadSheet(body.id, jobOk);
        if (!sheet) return bad("Sheet not found", 404);
        if (sheet.status !== "submitted") {
          return bad("Sheet must be submitted before approval", 409);
        }
        const data = normalizeMeasureData(sheet.data);
        const orgSettings = await getOrgSettings();
        // yellow warnings need an explicit reviewer acknowledgment
        const yellows = runChecks(
          data,
          sheet.shape,
          mergeTolerances(orgSettings.tolerances)
        ).filter((c) => c.level === "yellow");
        if (yellows.length > 0 && body.ackWarnings !== true) {
          return NextResponse.json(
            { error: "Warnings need acknowledgment", needsAck: true, warnings: yellows.map((c) => c.key) },
            { status: 409 }
          );
        }
        // drawn custom shapes are reference geometry — reviewer must confirm
        if (sheet.shape === "custom" && body.confirmReference !== true) {
          return NextResponse.json(
            { error: "Custom drawing is reference geometry — confirm before approving", needsReference: true },
            { status: 409 }
          );
        }
        try {
          const revNo = await sbRpc<number>("kiw_shop_approve_measure_sheet", {
            p_sheet_id: sheet.id,
            p_worker_id: worker.id,
            p_org_id: ORG_ID,
            p_allow_self: orgSettings.rules.allowSelfApproval === true,
          });
          await audit("sheet_approve", {
            workerId: worker.id,
            entity: "measure_sheet",
            entityId: sheet.id,
            detail: {
              rev: revNo,
              ackWarnings: body.ackWarnings === true,
              confirmReference: body.confirmReference === true,
              warnings: yellows.map((c) => c.key),
            },
          });
          const after = await loadSheet(sheet.id, jobOk);
          return NextResponse.json({
            ok: true,
            rev: revNo,
            updated_at: after?.updated_at,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "";
          if (msg.includes("SELF_APPROVAL")) {
            return bad("The person who submitted a sheet cannot approve it — a second reviewer must approve", 409);
          }
          if (msg.includes("NOT_SUBMITTED")) return bad("Sheet must be submitted before approval", 409);
          if (msg.includes("SHEET_NOT_FOUND")) return bad("Sheet not found", 404);
          throw e;
        }
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
        await audit("sheet_sendback", {
          workerId: worker.id,
          entity: "measure_sheet",
          entityId: body.id,
          detail: { comment: String(body.comment || "").slice(0, 500) },
        });
        return NextResponse.json({ ok: true, updated_at: rows[0].updated_at });
      }

      // client notifies when a fabrication sheet is printed
      case "log_print": {
        if (!uuid.safeParse(body.id).success) return bad("Bad sheet id");
        await audit("sheet_print", {
          workerId: worker.id,
          entity: "measure_sheet",
          entityId: body.id,
          detail: { rev: typeof body.rev === "number" ? body.rev : null },
        });
        return NextResponse.json({ ok: true });
      }

      case "delete": {
        if (!uuid.safeParse(body.id).success) return bad("Bad sheet id");
        const rows = await sbDelete<MeasureSheet[]>(TABLE, sheetFilter(body.id, jobOk));
        if (!Array.isArray(rows) || rows.length === 0) return bad("Sheet not found", 404);
        await audit("sheet_delete", {
          workerId: worker.id,
          entity: "measure_sheet",
          entityId: body.id,
        });
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
