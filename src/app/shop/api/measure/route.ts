import { NextRequest, NextResponse } from "next/server";
import { getSessionWorker } from "@/lib/shop/session";
import { sbInsert, sbUpdate, sbDelete } from "@/lib/shop/db";
import {
  MEASURE_SHAPES,
  newMeasureData,
  type MeasureShape,
  type MeasureSheet,
} from "@/lib/shop/measure";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const worker = await getSessionWorker();
  if (!worker) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const type = body.type as string;
    const now = new Date().toISOString();

    switch (type) {
      // New sheet: shape + step counts seed the blank sketch.
      case "create": {
        const shape = body.shape as MeasureShape;
        if (!MEASURE_SHAPES.includes(shape)) {
          return NextResponse.json({ error: "Bad shape" }, { status: 400 });
        }
        const steps1 = Math.min(40, Math.max(1, Number(body.steps1) || 1));
        const steps2 = Math.min(40, Math.max(0, Number(body.steps2) || 0));
        const rows = await sbInsert<MeasureSheet[]>("kiw_shop_measure_sheets", {
          job_id: String(body.jobId),
          name: (body.name as string | null)?.trim() || null,
          shape,
          status: "in_progress",
          data: newMeasureData(shape, steps1, steps2),
          created_by: worker.id,
          updated_by: worker.id,
        });
        return NextResponse.json({ ok: true, id: rows[0]?.id });
      }

      // Autosave: the client sends the whole data payload.
      case "update": {
        await sbUpdate("kiw_shop_measure_sheets", `id=eq.${body.id}`, {
          data: body.data,
          updated_by: worker.id,
          updated_at: now,
        });
        break;
      }

      case "rename": {
        await sbUpdate("kiw_shop_measure_sheets", `id=eq.${body.id}`, {
          name: (body.name as string | null)?.trim() || null,
          updated_by: worker.id,
          updated_at: now,
        });
        break;
      }

      // in_progress <-> ready (ready = approved to fabricate from)
      case "status": {
        const status = body.status === "ready" ? "ready" : "in_progress";
        await sbUpdate("kiw_shop_measure_sheets", `id=eq.${body.id}`, {
          status,
          updated_by: worker.id,
          updated_at: now,
        });
        break;
      }

      case "delete": {
        await sbDelete("kiw_shop_measure_sheets", `id=eq.${body.id}`);
        break;
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Action failed" },
      { status: 500 }
    );
  }
}
