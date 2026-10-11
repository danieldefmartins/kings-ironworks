// The signed W-9, decrypted on the fly for the worker it belongs to or an
// owner with finance access. Streamed directly (no signed URL that could be
// forwarded), never cached, and every view is written to the audit trail.
import { NextRequest, NextResponse } from "next/server";
import { getSessionWorker } from "@/lib/shop/session";
import { W9KeyError } from "@/lib/shop/w9-crypto";
import { openW9Pdf, W9Error } from "@/lib/shop/w9-service";
import { w9Deps } from "@/lib/shop/w9-deps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const noStore = { "Cache-Control": "no-store, private, max-age=0", Pragma: "no-cache" };

export async function GET(req: NextRequest) {
  const worker = await getSessionWorker();
  if (!worker) return NextResponse.json({ error: "Not signed in" }, { status: 401, headers: noStore });
  const param = req.nextUrl.searchParams.get("worker");
  const workerId = param && UUID.test(param) ? param : worker.id;
  try {
    const { pdf, filename } = await openW9Pdf(w9Deps(), worker, workerId);
    const disposition = req.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline";
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        ...noStore,
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${filename}"`,
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (e) {
    if (e instanceof W9KeyError) return NextResponse.json({ error: e.message }, { status: 503, headers: noStore });
    if (e instanceof W9Error) return NextResponse.json({ error: e.code }, { status: e.status, headers: noStore });
    console.error("[w9] pdf failed:", e instanceof Error ? e.name : "error");
    return NextResponse.json({ error: "W-9 unavailable" }, { status: 500, headers: noStore });
  }
}
