import { NextRequest, NextResponse } from "next/server";
import { getSessionWorker } from "@/lib/shop/session";
import { canViewOwnerFinancials } from "@/lib/shop/shared";
import { ORG_ID, sbRpc } from "@/lib/shop/db";
import { applicationReviewSchema } from "@/lib/shop/worker-application";
export async function POST(req: NextRequest) {
  const worker = await getSessionWorker();
  if (!worker) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!canViewOwnerFinancials(worker)) return NextResponse.json({ error: "Owner only" }, { status: 403 });
  let body: unknown; try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const parsed = applicationReviewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const data = parsed.data;
  try {
    const result = await sbRpc<{ status: string; workerId: string | null }>("kiw_review_worker_application", { p_org: ORG_ID, p_actor: worker.id, p_id: data.id, p_decision: data.decision, p_role: data.decision === "approved" ? data.role : null, p_rate: data.decision === "approved" ? data.hourlyRate : null, p_pin: data.decision === "approved" ? data.pin : null, p_note: data.note || null });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    const known = [["Worker already exists", "A worker with this name, email, or phone already exists. Check the team before approving; no duplicate was created."], ["PIN already in use", "That PIN is already in use. Choose another PIN."], ["Application already reviewed", "This application was already reviewed. Refresh the list."], ["Application not found", "Application not found."]].find(([key]) => message.includes(key));
    return NextResponse.json({ error: known?.[1] || "Could not save the review. Please try again." }, { status: known ? 409 : 503 });
  }
}
