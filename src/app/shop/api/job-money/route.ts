import { NextRequest, NextResponse } from "next/server";
import { getSessionWorker } from "@/lib/shop/session";
import { canViewOwnerFinancials } from "@/lib/shop/shared";
import { sbRpc, ORG_ID } from "@/lib/shop/db";
import { moneyChangeSchema } from "@/lib/shop/money-ledger";
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
  const parsed = moneyChangeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the amount, date and description. Use dollars and cents." }, { status: 400 });
  try {
    const { jobId, change } = parsed.data;
    await sbRpc("kiw_shop_money_change", { p_org: ORG_ID, p_worker: worker.id, p_job: jobId, p_action: change.action, p_data: change });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Job money change failed", err);
    return NextResponse.json({ error: "Could not save. Refresh and check the ledger before retrying. A refund or credit cannot exceed the recorded total, and an estimate can only be added once." }, { status: 409 });
  }
}
