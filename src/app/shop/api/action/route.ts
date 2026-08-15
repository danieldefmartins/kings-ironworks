import { NextRequest, NextResponse } from "next/server";
import { getSessionWorker } from "@/lib/shop/session";
import {
  sbSelect,
  sbUpdate,
  sbInsert,
  sbDelete,
  STAGES,
  startTimeEntry,
  stopTimeEntry,
  deletePhotoObject,
  ORG_ID,
  audit,
  saveOrgSettings,
  getOrgSettings,
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
        await sbUpdate("kiw_shop_cut_items", `org_id=eq.${ORG_ID}&id=eq.${id}`, {
          status,
          done_by: done ? worker.id : null,
          done_at: done ? now : null,
        });
        break;
      }

      // Material pull checkbox
      case "material_toggle": {
        const { id, pulled } = body;
        await sbUpdate("kiw_shop_materials", `org_id=eq.${ORG_ID}&id=eq.${id}`, {
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
        await sbUpdate("kiw_shop_jobs", `org_id=eq.${ORG_ID}&id=eq.${jobId}`, { current_stage: stage });
        await sbInsert("kiw_shop_stage_log", {
          org_id: ORG_ID,
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
        await sbUpdate("kiw_shop_qc_checks", `org_id=eq.${ORG_ID}&id=eq.${id}`, {
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
          org_id: ORG_ID,
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
        await sbDelete("kiw_shop_cut_items", `org_id=eq.${ORG_ID}&id=eq.${body.id}`);
        break;
      }

      // Set fabrication specs (finish / color / mounting) on the job
      case "job_spec_set": {
        const { jobId, finish_type, finish_sheen, color, mounting } = body;
        await sbUpdate("kiw_shop_jobs", `org_id=eq.${ORG_ID}&id=eq.${jobId}`, {
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
        await sbUpdate("kiw_shop_workers", `org_id=eq.${ORG_ID}&id=eq.${worker.id}`, { lang });
        await audit("worker_lang_change", { workerId: worker.id, detail: { lang } });
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
      // Delete a photo record + its storage object (cleanup of bad uploads).
      case "photo_delete": {
        if (!worker.is_admin) {
          return NextResponse.json({ error: "Admin only" }, { status: 403 });
        }
        const rows = await sbSelect<{ id: string; url: string }[]>(
          "kiw_shop_photos",
          `select=id,url&org_id=eq.${ORG_ID}&id=eq.${body.id}&limit=1`
        );
        if (rows[0]) {
          await deletePhotoObject(rows[0].url);
          await sbDelete("kiw_shop_photos", `org_id=eq.${ORG_ID}&id=eq.${rows[0].id}`);
          await audit("photo_delete", {
            workerId: worker.id,
            entity: "photo",
            entityId: rows[0].id,
            detail: { path: rows[0].url },
          });
        }
        break;
      }

      // Organization settings (branding, tolerances, presets, rules) — the
      // change itself is audited with previous and new values.
      case "org_settings_set": {
        if (!worker.is_admin) {
          return NextResponse.json({ error: "Admin only" }, { status: 403 });
        }
        const prev = await getOrgSettings();
        const inb = (body.settings || {}) as Record<string, unknown>;
        const str = (v: unknown, max = 200) =>
          typeof v === "string" ? v.slice(0, max) : "";
        const list = (v: unknown, max = 30) =>
          Array.isArray(v)
            ? v.filter((x) => typeof x === "string").map((x) => (x as string).slice(0, 120)).slice(0, max)
            : [];
        const tolPair = (v: unknown, fb: { green: number; yellow: number }) => {
          const o = (v || {}) as Record<string, unknown>;
          const g = Number(o.green);
          const y = Number(o.yellow);
          return Number.isFinite(g) && Number.isFinite(y) && g > 0 && y >= g && y < 100
            ? { green: g, yellow: y }
            : fb;
        };
        const inBranding = (inb.branding || {}) as Record<string, unknown>;
        const inTol = (inb.tolerances || {}) as Record<string, unknown>;
        const inPresets = (inb.presets || {}) as Record<string, unknown>;
        const inOptions = (inb.options || {}) as Record<string, unknown>;
        const inRules = (inb.rules || {}) as Record<string, unknown>;
        const next = {
          branding: {
            name: str(inBranding.name) || prev.branding.name,
            address: str(inBranding.address, 300) || prev.branding.address,
            phone: str(inBranding.phone, 60) || prev.branding.phone,
            website: str(inBranding.website) || prev.branding.website,
          },
          tolerances: {
            riseSum: tolPair(inTol.riseSum, prev.tolerances.riseSum),
            runSum: tolPair(inTol.runSum, prev.tolerances.runSum),
            rake: tolPair(inTol.rake, prev.tolerances.rake),
            angle: tolPair(inTol.angle, prev.tolerances.angle),
            widthVar: tolPair(inTol.widthVar, prev.tolerances.widthVar),
          },
          presets: {
            post: list(inPresets.post).length ? list(inPresets.post) : prev.presets.post || [],
            topRail: list(inPresets.topRail).length ? list(inPresets.topRail) : prev.presets.topRail || [],
            picket: list(inPresets.picket).length ? list(inPresets.picket) : prev.presets.picket || [],
            bottomRail: list(inPresets.bottomRail).length ? list(inPresets.bottomRail) : prev.presets.bottomRail || [],
          },
          options: {
            anchors: list(inOptions.anchors).length ? list(inOptions.anchors) : prev.options.anchors || [],
            finishes: list(inOptions.finishes).length ? list(inOptions.finishes) : prev.options.finishes || [],
            colors: list(inOptions.colors).length ? list(inOptions.colors) : prev.options.colors || [],
          },
          rules: { allowSelfApproval: inRules.allowSelfApproval === true },
          defaults: prev.defaults,
        };
        await saveOrgSettings(next, worker.id);
        await audit("org_settings_change", {
          workerId: worker.id,
          entity: "org_settings",
          detail: { prev, next },
        });
        break;
      }

      case "rate_set": {
        if (!worker.is_admin) {
          return NextResponse.json({ error: "Admin only" }, { status: 403 });
        }
        const rate = body.rate === null || body.rate === "" ? null : Number(body.rate);
        await sbUpdate("kiw_shop_workers", `org_id=eq.${ORG_ID}&id=eq.${body.workerId}`, {
          hourly_rate: rate,
        });
        await audit("worker_rate_change", {
          workerId: worker.id,
          entity: "worker",
          entityId: body.workerId,
          detail: { rate },
        });
        break;
      }

      case "entry_stop": {
        if (!worker.is_admin) {
          return NextResponse.json({ error: "Admin only" }, { status: 403 });
        }
        await sbUpdate("kiw_shop_time_entries", `org_id=eq.${ORG_ID}&id=eq.${body.id}`, {
          ended_at: new Date().toISOString(),
        });
        break;
      }

      case "entry_delete": {
        if (!worker.is_admin) {
          return NextResponse.json({ error: "Admin only" }, { status: 403 });
        }
        await sbDelete("kiw_shop_time_entries", `org_id=eq.${ORG_ID}&id=eq.${body.id}`);
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
