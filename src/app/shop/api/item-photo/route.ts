import { NextRequest, NextResponse } from "next/server";
import { getSessionWorker } from "@/lib/shop/session";
import { uploadPhotoObject, setCatalogImage } from "@/lib/shop/db";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 20 * 1024 * 1024;

// A picture of the actual item, so a worker recognises the box on the shelf
// rather than reading a size off a label. One image per catalog item, stored
// under its SKU so re-uploading simply replaces it.
export async function POST(req: NextRequest) {
  const worker = await getSessionWorker();
  if (!worker) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const catalogId = String(form.get("catalogId") || "");
    const sku = String(form.get("sku") || "").replace(/[^A-Za-z0-9._-]/g, "");
    if (!file || !catalogId || !sku) {
      return NextResponse.json({ error: "Missing file or item" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image too large (max 20MB)" }, { status: 413 });
    }

    const ext = (file.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const path = `catalog/${sku}.${ext}`;
    await uploadPhotoObject(path, await file.arrayBuffer(), file.type || "image/jpeg");
    await setCatalogImage(catalogId, path);

    return NextResponse.json({ ok: true, path });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}
