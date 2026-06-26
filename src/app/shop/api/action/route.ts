import { NextRequest, NextResponse } from "next/server";
import { getSessionWorker } from "@/lib/shop/session";
import { sbUpdate, sbInsert, sbDelete, STAGES } from "@/lib/shop/db";

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
      // Cut list: cycle/clear a member's status (pending -> cut -> welded)
      case "cut_set": {
        const { id, status } = body;
        const done = status === "cut" || status === "welded";
        await sbUpdate("kiw_shop_cut_items", `id=eq.${id}`, {
          status,
          done_by: done ? worker.id : null,
          done_at: done ? now : null,
        });
        break;
      }

      // Material pull checkbox
      case "material_toggle": {
        const { id, pulled } = body;
        await sbUpdate("kiw_shop_materials", `id=eq.${id}`, {
          pulled: !!pulled,
          pulled_by: pulled ? worker.id : null,
          pulled_at: pulled ? now : null,
        });
        break;
      }

      // Advance / set the job stage (logs who moved it)
      case "stage_set": {
        const { jobId, stage } = body;
        if (!STAGES.includes(stage)) {
          return NextResponse.json({ error: "Bad stage" }, { status: 400 });
        }
        await sbUpdate("kiw_shop_jobs", `id=eq.${jobId}`, { current_stage: stage });
        await sbInsert("kiw_shop_stage_log", {
          job_id: jobId,
          stage,
          worker_id: worker.id,
          entered_at: now,
        });
        break;
      }

      // QC sign-off: record measured value + pass/fail + who/when
      case "qc_save": {
        const { id, measured, passed } = body;
        await sbUpdate("kiw_shop_qc_checks", `id=eq.${id}`, {
          measured: measured ?? null,
          passed: passed === null ? null : !!passed,
          checked_by: passed === null ? null : worker.id,
          checked_at: passed === null ? null : now,
        });
        break;
      }

      // Add a material line to the job
      case "cut_add": {
        const { jobId, profile, size, qty, length } = body;
        await sbInsert("kiw_shop_cut_items", {
          job_id: jobId,
          profile: profile || null,
          size: size || null,
          qty: qty ? Number(qty) : 1,
          length: length || null,
          status: "pending",
        });
        break;
      }

      case "cut_delete": {
        await sbDelete("kiw_shop_cut_items", `id=eq.${body.id}`);
        break;
      }

      // Set fabrication specs (finish / color / mounting) on the job
      case "job_spec_set": {
        const { jobId, finish_type, finish_sheen, color, mounting } = body;
        await sbUpdate("kiw_shop_jobs", `id=eq.${jobId}`, {
          finish_type: finish_type ?? null,
          finish_sheen: finish_sheen ?? null,
          color: color ?? null,
          mounting: mounting ?? null,
        });
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
