// Job time API: the gate's Start, the bar's Stop, the bar's state poll, and
// the owner's labor budget. Payroll is never written here — starting job time
// does not clock anyone in (the client offers that as a separate tap).
import { NextRequest, NextResponse } from "next/server";
import { getSessionWorker, touchSession } from "@/lib/shop/session";
import { audit, closeStaleProjectEntries, getJob, getOpenShift, startProjectEntry } from "@/lib/shop/db";
import { canViewOwnerFinancials } from "@/lib/shop/shared";
import { alertForgottenJobTimers, getRunningJob, setLaborBudget, stopRunningJobTime } from "@/lib/shop/job-timer-db";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function loc(body: Record<string, unknown>) {
  return typeof body.lat === "number" && typeof body.lng === "number" ? { lat: body.lat, lng: body.lng } : null;
}

export async function GET() {
  const worker = await getSessionWorker();
  if (!worker) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    const running = await getRunningJob(worker.id);
    // The bar polls this every minute on every open phone — the cheapest
    // reliable heartbeat for the forgotten-timer sweep. Throttled inside.
    void alertForgottenJobTimers();
    return NextResponse.json({ running }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Job time unavailable" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const worker = await getSessionWorker();
  if (!worker) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  await touchSession();
  try {
    const body = (await req.json()) as Record<string, unknown>;
    switch (body.type) {
      case "start": {
        const jobId = body.jobId;
        if (typeof jobId !== "string" || !UUID_RE.test(jobId)) return NextResponse.json({ error: "Bad job" }, { status: 400 });
        if (!(await getJob(jobId))) return NextResponse.json({ error: "Job not found" }, { status: 404 });
        await closeStaleProjectEntries(worker.id);
        // One job at a time: this closes any other running entry first.
        await startProjectEntry(worker.id, jobId, loc(body));
        await audit("project_clock_start", { workerId: worker.id, entity: "job", entityId: jobId, detail: { via: "gate" } });
        const payrollOpen = canViewOwnerFinancials(worker) ? true : !!(await getOpenShift(worker.id));
        return NextResponse.json({ ok: true, payrollOpen, running: await getRunningJob(worker.id) });
      }
      case "stop": {
        const stopped = await stopRunningJobTime(worker.id, loc(body));
        if (stopped) await audit("project_clock_stop", { workerId: worker.id, entity: "job", entityId: typeof body.jobId === "string" && UUID_RE.test(body.jobId) ? body.jobId : undefined, detail: { via: "bar" } });
        return NextResponse.json({ ok: true, running: null });
      }
      case "budget_set": {
        if (!canViewOwnerFinancials(worker)) return NextResponse.json({ error: "Owner only" }, { status: 403 });
        const jobId = body.jobId;
        if (typeof jobId !== "string" || !UUID_RE.test(jobId)) return NextResponse.json({ error: "Bad job" }, { status: 400 });
        const raw = body.hours;
        const hours = raw == null || raw === "" ? null : Number(raw);
        if (hours != null && (!Number.isFinite(hours) || hours < 0 || hours > 100000)) return NextResponse.json({ error: "Bad hours" }, { status: 400 });
        try {
          await setLaborBudget(jobId, hours == null ? null : Math.round(hours * 100) / 100);
        } catch (e) {
          if (e instanceof Error && e.message.includes("labor_budget_hours")) {
            return NextResponse.json({ error: "Run migration 20261011000001_kiw_job_labor_budget.sql first." }, { status: 409 });
          }
          throw e;
        }
        await audit("job_labor_budget_set", { workerId: worker.id, entity: "job", entityId: jobId, detail: { hours } });
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Action failed" }, { status: 500 });
  }
}
