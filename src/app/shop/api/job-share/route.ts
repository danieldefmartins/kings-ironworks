import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionWorker } from "@/lib/shop/session";
import { getJob, listShareRecipients } from "@/lib/shop/db";
import { getJobEstimates } from "@/lib/shop/job-estimates-db";
import { loadJobGate } from "@/lib/shop/job-timer-db";
import { toE164 } from "@/lib/shop/job-timer";
import { sendSms, smsLang } from "@/lib/shop/sms";
import { buildJobShareText } from "@/lib/shop/job-share";

// Text one job to chosen crew members (address, maps link, scope, job link).
// Anyone who can open the job can share it; recipients must be active crew in
// this shop with a phone on file. Each text goes in the recipient's language.

const schema = z.object({
  jobId: z.string().uuid(),
  workerIds: z.array(z.string().uuid()).min(1).max(30),
});

function requestHost(req: NextRequest): string {
  return (req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl.host).split(",")[0].trim();
}

export async function POST(req: NextRequest) {
  const worker = await getSessionWorker();
  if (!worker) return NextResponse.json({ error: "Not signed in. Log in again and retry." }, { status: 401 });
  const host = requestHost(req);
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== host) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    } catch { return NextResponse.json({ error: "Invalid origin" }, { status: 403 }); }
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pick at least one person to send the job to." }, { status: 400 });
  const { jobId, workerIds } = parsed.data;

  const job = await getJob(jobId).catch(() => null);
  if (!job) return NextResponse.json({ error: "Job not found. Go back to the job list and open it again." }, { status: 404 });
  const gate = await loadJobGate(worker, jobId);
  if (gate.locked) return NextResponse.json({ error: "Start time on this job before sharing it." }, { status: 403 });

  const crew = await listShareRecipients();
  const wanted = new Set(workerIds);
  const chosen = crew.filter((w) => wanted.has(w.id));
  if (chosen.length !== wanted.size) return NextResponse.json({ error: "Someone you picked is no longer active. Refresh and pick again." }, { status: 400 });

  // Crew-level estimate view: descriptions only, no amounts.
  const items = await getJobEstimates(jobId, false)
    .then((es) => es.flatMap((e) => e.items.map((i) => i.description)))
    .catch(() => []);
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim() || req.nextUrl.protocol.replace(":", "");
  const jobUrl = `${proto}://${host}/shop/job/${job.id}`;

  const results = await Promise.all(chosen.map(async (w) => {
    const phone = toE164(w.phone);
    if (!phone) return { id: w.id, name: w.name, ok: false, reason: "no_phone" as const };
    const text = buildJobShareText(job, { lang: smsLang(w.lang), senderName: worker.name, jobUrl, items });
    const ok = await sendSms(phone, text);
    return { id: w.id, name: w.name, ok, reason: ok ? undefined : ("send_failed" as const) };
  }));
  return NextResponse.json({ ok: results.every((r) => r.ok), results });
}
