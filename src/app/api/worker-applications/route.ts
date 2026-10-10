import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applicationSchema } from "@/lib/shop/worker-application";
import { ORG_ID, sbRpc } from "@/lib/shop/db";
const submission = z.object({ requestId: z.uuid(), website: z.string().max(200).default(""), application: applicationSchema });
export async function POST(req: NextRequest) {
  if (Number(req.headers.get("content-length") || 0) > 20000) return NextResponse.json({ error: "The form is too large." }, { status: 413 });
  const origin = req.headers.get("origin");
  if (origin && ![req.nextUrl.origin, "https://kingsironworks.com", "https://www.kingsironworks.com"].includes(origin)) return NextResponse.json({ error: "Submit the form from our website." }, { status: 403 });
  let body: unknown;
  try { const raw = await req.text(); if (raw.length > 20000) return NextResponse.json({ error: "The form is too large." }, { status: 413 }); body = JSON.parse(raw); }
  catch { return NextResponse.json({ error: "Invalid form." }, { status: 400 }); }
  const parsed = submission.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  if (parsed.data.website) return NextResponse.json({ ok: true });
  const secret = process.env.SHOP_SESSION_SECRET;
  if (!secret) return NextResponse.json({ error: "Applications are temporarily unavailable. Please try again later." }, { status: 503 });
  const source = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const hash = createHmac("sha256", secret).update(`application:${source}`).digest("hex");
  try {
    const id = await sbRpc<string | null>("kiw_submit_worker_application", { p_org: ORG_ID, p_id: parsed.data.requestId, p_data: parsed.data.application, p_source: hash });
    if (!id) return NextResponse.json({ error: "Too many submissions. Please try again in an hour." }, { status: 429, headers: { "Retry-After": "3600" } });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Your application could not be saved. Your answers are still here; please try again." }, { status: 503 }); }
}
