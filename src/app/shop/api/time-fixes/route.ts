// Time fixes waiting for review (and, on request, the read-only history).
// The office admin and the owners only; a reviewer never sees their own
// pending requests here — nobody approves their own time.
import { NextRequest, NextResponse } from "next/server";
import { getSessionWorker } from "@/lib/shop/session";
import { canApproveTime } from "@/lib/shop/time-fix";
import { listFixHistory, listPendingFixes } from "@/lib/shop/time-fix-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const worker = await getSessionWorker();
  if (!worker) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!canApproveTime(worker)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  try {
    const history = req.nextUrl.searchParams.get("history") === "1";
    const [pending, past] = await Promise.all([listPendingFixes(worker.id), history ? listFixHistory() : Promise.resolve(undefined)]);
    return NextResponse.json({ pending, ...(past ? { history: past } : {}) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not load time fixes" }, { status: 503 });
  }
}
