import { NextRequest, NextResponse } from "next/server";
import { getSessionWorker } from "@/lib/shop/session";
import {
  uploadPhotoObject,
  insertPhoto,
  PRICE_CATEGORY,
} from "@/lib/shop/db";

export const runtime = "nodejs";
// allow larger photo uploads
export const maxDuration = 60;

const MAX_BYTES = 15 * 1024 * 1024; // 15MB

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

    // Price-sensitive category is restricted.
    if (category === PRICE_CATEGORY && !worker.can_see_prices) {
      return NextResponse.json(
        { error: "Not allowed to add Approved Estimate photos" },
        { status: 403 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image too large (max 15MB)" },
        { status: 413 }
      );
    }

    const bytes = await file.arrayBuffer();
    const ext = (file.name.split(".").pop() || "jpg")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 5);
    const rand = Math.random().toString(36).slice(2, 8);
    const path = `${jobId}/${Date.now()}-${rand}.${ext || "jpg"}`;

    await uploadPhotoObject(path, bytes, file.type || "image/jpeg");
    await insertPhoto({
      job_id: jobId,
      url: path,
      category,
      label,
      caption,
      uploaded_by: worker.id,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}
