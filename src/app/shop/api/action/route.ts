import { NextRequest, NextResponse } from "next/server";
import { getSessionWorker, touchSession } from "@/lib/shop/session";
import {
  sbSelect,
  sbUpdate,
  sbInsert,
  sbDelete,
  STAGES,
  clockIn,
  clockOut,
  startBreak,
  endBreak,
  transferJob,
  stopTimeEntry,
  deletePhotoObject,
  ORG_ID,
  audit,
  saveOrgSettings,
  getOrgSettings,
  setJobArchived,
} from "@/lib/shop/db";

export const runtime = "nodejs";

function punchLocation(body: Record<string, unknown>) {
  if (typeof body.lat !== "number" || typeof body.lng !== "number") return null;
  const targetLat = Number(process.env.SHOP_GEOFENCE_LAT);
  const targetLng = Number(process.env.SHOP_GEOFENCE_LNG);
  const radius = Number(process.env.SHOP_GEOFENCE_RADIUS_M || 250);
  let status: "verified" | "outside" | "unknown" = "unknown";
  if (Number.isFinite(targetLat) && Number.isFinite(targetLng) && Number.isFinite(radius)) {
    const rad = Math.PI / 180;
    const a = Math.sin(((body.lat - targetLat) * rad) / 2) ** 2 +
      Math.cos(targetLat * rad) * Math.cos(body.lat * rad) *
      Math.sin(((body.lng - targetLng) * rad) / 2) ** 2;
    const distance = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    status = distance <= radius ? "verified" : "outside";
  }
  return { lat: body.lat, lng: body.lng, accuracy: Number(body.accuracy) || null, status };
}

export async function POST(req: NextRequest) {
  const worker = await getSessionWorker();
  if (!worker) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  // An active shift keeps its session alive; an abandoned tablet does not.
  await touchSession();

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

      // Take a finished job off the shop floor, or bring one back. The jobs
      // list has always filtered on this column; until now nothing could set
      // it, so a completed job stayed on every worker's list forever.
      case "job_archive": {
        if (!worker.is_admin) {
          return NextResponse.json({ error: "Admin only" }, { status: 403 });
        }
        const { jobId, archived } = body;
        if (typeof jobId !== "string" || !jobId) {
          return NextResponse.json({ error: "Bad job id" }, { status: 400 });
        }
        const updated = await setJobArchived(jobId, !!archived);
        if (!updated) {
          return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }
        await audit(archived ? "job_archive" : "job_restore", {
          workerId: worker.id,
          entity: "job",
          entityId: jobId,
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
        const { jobId, profile, size, qty, length, catalogId } = body;
        await sbInsert("kiw_shop_cut_items", {
          org_id: ORG_ID,
          job_id: jobId,
          profile: profile || null,
          size: size || null,
          qty: qty ? Number(qty) : 1,
          length: length || null,
          // Points at a real SKU when the line came from the catalog. Null for
          // every line typed before the catalog existed, which stays readable.
          catalog_id: typeof catalogId === "string" && catalogId ? catalogId : null,
          status: "pending",
        });
        break;
      }

      // Steel nobody has catalogued yet. It is recorded as a REQUEST and does
      // not join the job or the stock count, so four spellings of one profile
      // can never reach inventory. The office turns it into a SKU.
      case "catalog_request": {
        const { jobId, description, roleKey } = body;
        if (typeof description !== "string" || !description.trim()) break;
        await sbInsert("kiw_catalog_requests", {
          org_id: ORG_ID,
          description: description.trim().slice(0, 300),
          role_key: typeof roleKey === "string" ? roleKey : null,
          job_id: jobId || null,
          requested_by: worker.id,
          status: "pending",
        });
        break;
      }

      // Quantity is edited on the line after it exists, not asked for during
      // the add flow — the flow is three taps and the third one saves.
      case "cut_qty": {
        const { id, qty } = body;
        const n = Number(qty);
        if (!Number.isFinite(n) || n < 0 || n > 100000) break;
        await sbUpdate("kiw_shop_cut_items", `org_id=eq.${ORG_ID}&id=eq.${id}`, { qty: n });
        break;
      }

      // Counting stock. Every change also lands in kiw_inventory_moves so a
      // count can always be explained later.
      case "inv_set": {
        const { id, onHand } = body;
        const n = Number(onHand);
        if (!Number.isFinite(n) || n < 0 || n > 1000000) break;
        const prior = await sbSelect<{ on_hand: number; catalog_id: string }[]>(
          "kiw_inventory", `select=on_hand,catalog_id&org_id=eq.${ORG_ID}&id=eq.${id}`);
        const before = prior?.[0];
        await sbUpdate("kiw_inventory", `org_id=eq.${ORG_ID}&id=eq.${id}`,
          { on_hand: n, updated_at: now });
        if (before) {
          await sbInsert("kiw_inventory_moves", {
            org_id: ORG_ID, catalog_id: before.catalog_id,
            delta: n - Number(before.on_hand), reason: "adjust",
            worker_id: worker.id,
          });
        }
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

      case "profile_update": {
        const clean = (value: unknown, max: number) =>
          typeof value === "string" ? value.trim().slice(0, max) || null : null;
        const name = clean(body.name, 100);
        const lang = clean(body.lang, 2);
        if (!name || !lang || !["en", "pt", "es"].includes(lang)) {
          return NextResponse.json({ error: "Name and language are required" }, { status: 400 });
        }
        await sbUpdate("kiw_shop_workers", `org_id=eq.${ORG_ID}&id=eq.${worker.id}`, {
          name, lang, phone: clean(body.phone, 40), email: clean(body.email, 160),
          emergency_contact_name: clean(body.emergencyContactName, 100),
          emergency_contact_phone: clean(body.emergencyContactPhone, 40),
        });
        await audit("worker_profile_update", { workerId: worker.id, entity: "worker", entityId: worker.id });
        break;
      }

      // Payroll shift. It deliberately has no project: paid presence and job
      // costing are separate clocks.
      case "shift_start": {
        const loc = punchLocation(body);
        await clockIn(worker.id, loc);
        await audit("shift_clock_in", { workerId: worker.id, entity: "shift", detail: { locationStatus: loc?.status || "unavailable" } });
        break;
      }

      case "shift_stop": {
        const loc = punchLocation(body);
        await clockOut(worker.id, loc);
        await audit("shift_clock_out", { workerId: worker.id, entity: "shift", detail: { locationStatus: loc?.status || "unavailable" } });
        break;
      }

      // Project-cost clock. It only allocates part of an already-open payroll
      // shift to a project and never clocks the employee in or out of payroll.
      case "time_start": {
        if (!body.jobId) return NextResponse.json({ error: "Choose a project" }, { status: 400 });
        const loc = punchLocation(body);
        await transferJob(worker.id, String(body.jobId), loc);
        await audit("project_clock_start", { workerId: worker.id, entity: "job", entityId: body.jobId });
        break;
      }

      case "time_stop": {
        if (!body.jobId) return NextResponse.json({ error: "Choose a project" }, { status: 400 });
        const loc = punchLocation(body);
        await stopTimeEntry(worker.id, String(body.jobId), loc);
        await audit("project_clock_stop", { workerId: worker.id, entity: "job", entityId: body.jobId });
        break;
      }

      case "time_break_start": {
        await startBreak(worker.id);
        await audit("shift_break_start", { workerId: worker.id, entity: "shift" });
        break;
      }

      case "time_break_end": {
        await endBreak(worker.id, body.jobId ? String(body.jobId) : null);
        await audit("shift_break_end", { workerId: worker.id, entity: "shift", detail: { resumedJobId: body.jobId || null } });
        break;
      }

      case "time_transfer": {
        if (!body.jobId) return NextResponse.json({ error: "Choose a job" }, { status: 400 });
        const loc = punchLocation(body);
        await transferJob(worker.id, String(body.jobId), loc);
        await audit("shift_job_transfer", { workerId: worker.id, entity: "shift", detail: { jobId: body.jobId } });
        break;
      }

      case "time_correction_request": {
        const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
        if (!body.shiftId || reason.length < 3) {
          return NextResponse.json({ error: "Explain the correction" }, { status: 400 });
        }
        const own = await sbSelect<{ id: string }[]>("kiw_shop_shifts",
          `select=id&org_id=eq.${ORG_ID}&id=eq.${body.shiftId}&worker_id=eq.${worker.id}&limit=1`);
        if (!own[0]) return NextResponse.json({ error: "Shift not found" }, { status: 404 });
        await sbInsert("kiw_shop_time_corrections", {
          org_id: ORG_ID, shift_id: body.shiftId, worker_id: worker.id,
          requested_started_at: body.startedAt || null, requested_ended_at: body.endedAt || null,
          reason, status: "pending",
        });
        await audit("time_correction_requested", { workerId: worker.id, entity: "shift", entityId: body.shiftId, detail: { reason } });
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

      case "shift_review": {
        if (!worker.is_admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });
        if (!body.shiftId || !["approved", "rejected"].includes(body.status)) {
          return NextResponse.json({ error: "Bad review" }, { status: 400 });
        }
        await sbUpdate("kiw_shop_shifts", `org_id=eq.${ORG_ID}&id=eq.${body.shiftId}&ended_at=not.is.null`, {
          status: body.status, approved_by: worker.id, approved_at: now,
          manager_note: typeof body.note === "string" ? body.note.slice(0, 500) : null,
          updated_at: now,
        });
        await audit("shift_review", { workerId: worker.id, entity: "shift", entityId: body.shiftId, detail: { status: body.status } });
        break;
      }

      case "correction_review": {
        if (!worker.is_admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });
        if (!body.id || !["approved", "rejected"].includes(body.status)) {
          return NextResponse.json({ error: "Bad review" }, { status: 400 });
        }
        const rows = await sbSelect<{ id: string; shift_id: string; requested_started_at: string | null; requested_ended_at: string | null }[]>(
          "kiw_shop_time_corrections", `select=*&org_id=eq.${ORG_ID}&id=eq.${body.id}&status=eq.pending&limit=1`);
        const correction = rows[0];
        if (!correction) return NextResponse.json({ error: "Request not found" }, { status: 404 });
        if (body.status === "approved") {
          const patch: Record<string, unknown> = { updated_at: now, status: "submitted" };
          if (correction.requested_started_at) patch.started_at = correction.requested_started_at;
          if (correction.requested_ended_at) patch.ended_at = correction.requested_ended_at;
          await sbUpdate("kiw_shop_shifts", `org_id=eq.${ORG_ID}&id=eq.${correction.shift_id}`, patch);
        }
        await sbUpdate("kiw_shop_time_corrections", `org_id=eq.${ORG_ID}&id=eq.${body.id}`, {
          status: body.status, reviewed_by: worker.id, reviewed_at: now,
          review_note: typeof body.note === "string" ? body.note.slice(0, 500) : null,
        });
        await audit("time_correction_review", { workerId: worker.id, entity: "shift", entityId: correction.shift_id, detail: { status: body.status } });
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
