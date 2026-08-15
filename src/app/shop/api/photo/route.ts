import { NextRequest, NextResponse } from "next/server";
import { getSessionWorker } from "@/lib/shop/session";
import {
  uploadPhotoObject,
  insertPhoto,
  getJob,
  audit,
  PRICE_CATEGORY,
} from "@/lib/shop/db";

export const runtime = "nodejs";
// allow larger photo uploads
export const maxDuration = 60;

const MAX_BYTES = 200 * 1024 * 1024; // 200MB (allows short videos)

export async function POST(req: NextRequest) {
  const worker = await getSessionWorker();
  if (!worker) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const jobId = String(form.get("jobId") || "");
    const category = String(form.get("category") || "Other").trim() || "Other";
    const label = (form.get("label") as string | null)?.trim() || null;
    const caption = (form.get("caption") as string | null)?.trim() || null;

    if (!file || !jobId) {
      return NextResponse.json({ error: "Missing file or job" }, { status: 400 });
    }
    // the job must exist in THIS organization
    if (!(await getJob(jobId))) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Price-sensitive category is restricted.
    if (category === PRICE_CATEGORY && !worker.is_admin) {
      return NextResponse.json(
        { error: "Not allowed to add Approved Estimate photos" },
        { status: 403 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File too large (max 200MB)" },
        { status: 413 }
      );
    }

    const isVideo = (file.type || "").startsWith("video");
    const bytes = await file.arrayBuffer();
    const ext = (file.name.split(".").pop() || (isVideo ? "mp4" : "jpg"))
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 5);
    const rand = Math.random().toString(36).slice(2, 8);
    const path = `${jobId}/${Date.now()}-${rand}.${ext || "jpg"}`;

    await uploadPhotoObject(
      path,
      bytes,
      file.type || (isVideo ? "video/mp4" : "image/jpeg")
    );
    const row = await insertPhoto({
      job_id: jobId,
      url: path,
      kind: isVideo ? "video" : "image",
      category,
      label,
      caption,
      uploaded_by: worker.id,
    });

    await audit("photo_upload", {
      workerId: worker.id,
      entity: "photo",
      entityId: row?.id || undefined,
      detail: { jobId, category, label },
    });
    // Path + id let callers (measure sheets) link the photo to a checklist slot.
    return NextResponse.json({ ok: true, path, id: row?.id || null });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}
