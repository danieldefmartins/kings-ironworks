import { NextRequest, NextResponse } from "next/server";
import { getSessionWorker } from "@/lib/shop/session";
import {
  sbUpdate,
  sbInsert,
  sbDelete,
  STAGES,
  startTimeEntry,
  stopTimeEntry,
} from "@/lib/shop/db";

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

      // Worker picks their interface language (persists on their profile)
      case "lang_set": {
        const lang = body.lang as string;
        if (!["en", "pt", "es"].includes(lang)) {
          return NextResponse.json({ error: "Bad language" }, { status: 400 });
        }
        await sbUpdate("kiw_shop_workers", `id=eq.${worker.id}`, { lang });
        break;
      }

      // Job time clock — START (auto-closes any running timer for this worker)
      case "time_start": {
        const loc =
          typeof body.lat === "number" && typeof body.lng === "number"
            ? { lat: body.lat, lng: body.lng }
            : null;
        await startTimeEntry(worker.id, String(body.jobId), loc);
        break;
      }

      // Job time clock — DONE
      case "time_stop": {
        const loc =
          typeof body.lat === "number" && typeof body.lng === "number"
            ? { lat: body.lat, lng: body.lng }
            : null;
        await stopTimeEntry(worker.id, String(body.jobId), loc);
        break;
      }

      // ---- Admin-only (Daniel) --------------------------------------------
      case "rate_set": {
        if (!worker.is_admin) {
          return NextResponse.json({ error: "Admin only" }, { status: 403 });
        }
        const rate = body.rate === null || body.rate === "" ? null : Number(body.rate);
        await sbUpdate("kiw_shop_workers", `id=eq.${body.workerId}`, {
          hourly_rate: rate,
        });
        break;
      }

      case "entry_stop": {
        if (!worker.is_admin) {
          return NextResponse.json({ error: "Admin only" }, { status: 403 });
        }
        await sbUpdate("kiw_shop_time_entries", `id=eq.${body.id}`, {
          ended_at: new Date().toISOString(),
        });
        break;
      }

      case "entry_delete": {
        if (!worker.is_admin) {
          return NextResponse.json({ error: "Admin only" }, { status: 403 });
        }
        await sbDelete("kiw_shop_time_entries", `id=eq.${body.id}`);
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
