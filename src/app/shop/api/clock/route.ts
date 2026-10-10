import { NextResponse } from "next/server";
import { getSessionWorker, touchSession } from "@/lib/shop/session";
import { loadClockState } from "@/lib/shop/clock-state";
export async function GET() {
  try {
    const worker = await getSessionWorker();
    if (!worker) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    await touchSession();
    return NextResponse.json({ workerId: worker.id, ...await loadClockState(worker) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Clock status unavailable" }, { status: 503 }); }
}
