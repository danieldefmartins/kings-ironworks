import { NextRequest, NextResponse } from "next/server";
import { getSessionWorker } from "@/lib/shop/session";
import { canViewOwnerFinancials } from "@/lib/shop/shared";
import { getJob, listJobs, audit } from "@/lib/shop/db";
import { importGhlForJob, reviewCustomerNote, reviewImportedPhoto, type ImportResult } from "@/lib/shop/customer-import";

export const runtime = "nodejs";
export const maxDuration = 300;

// Owner-only: importing and reviewing customer files decides what the crew
// will see, and the raw imports have not been checked for prices yet.
export async function POST(req: NextRequest) {
  const worker = await getSessionWorker();
  if (!worker) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!canViewOwnerFinancials(worker)) return NextResponse.json({ error: "Owner access required" }, { status: 403 });
  const origin = req.headers.get("origin");
  if (origin) {
    const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl.host).split(",")[0].trim();
    try {
      if (new URL(origin).host !== host) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    } catch { return NextResponse.json({ error: "Invalid origin" }, { status: 403 }); }
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const action = String(body?.action || "");
  const jobId = String(body?.jobId || "");

  try {
    if (action === "pull_all") {
      const jobs = await listJobs();
      const totals = { jobs: 0, photos: 0, notes: 0, errors: 0 };
      for (const job of jobs) {
        if (!job.phone && !job.email) continue;
        const r = await importGhlForJob(job).catch((e): ImportResult => ({ source: "ghl", photos: 0, notes: 0, skipped: 0, errors: [String(e?.message || e)] }));
        totals.jobs++;
        totals.photos += r.photos;
        totals.notes += r.notes;
        totals.errors += r.errors.length;
      }
      await audit("customer_import_ghl_all", { workerId: worker.id, entity: "job", detail: totals });
      return NextResponse.json({ ok: true, ...totals });
    }

    if (!/^[0-9a-f-]{36}$/i.test(jobId)) return NextResponse.json({ error: "Missing job" }, { status: 400 });
    const job = await getJob(jobId);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    if (action === "pull") {
      const result = await importGhlForJob(job);
      await audit("customer_import_ghl", { workerId: worker.id, entity: "job", entityId: job.id, detail: result });
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "review") {
      const id = String(body?.id || "");
      const decision = body?.decision === "keep" ? "keep" : body?.decision === "reject" ? "reject" : null;
      if (!/^[0-9a-f-]{36}$/i.test(id) || !decision) return NextResponse.json({ error: "Bad review request" }, { status: 400 });
      const ok = body?.kind === "note"
        ? await reviewCustomerNote(job.id, id, decision)
        : await reviewImportedPhoto(job.id, id, decision, typeof body?.category === "string" ? body.category : undefined);
      if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await audit("customer_file_review", { workerId: worker.id, entity: body?.kind === "note" ? "customer_note" : "photo", entityId: id, detail: { jobId: job.id, decision, category: body?.category ?? null } });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("customer-files", e);
    return NextResponse.json({ error: e instanceof Error ? e.message.slice(0, 300) : "Failed" }, { status: 500 });
  }
}
