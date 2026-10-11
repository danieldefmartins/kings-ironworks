// Worker profile + W-9 actions. Request bodies can carry a full TIN, so this
// handler never logs a body and never echoes input back: errors are codes,
// successes are the public profile view (last 4 digits at most).
import { NextRequest, NextResponse } from "next/server";
import { getSessionWorker, touchSession } from "@/lib/shop/session";
import { W9KeyError } from "@/lib/shop/w9-crypto";
import { prepareTin, requestProfiles, saveProfile, signW9, W9Error } from "@/lib/shop/w9-service";
import { clientIp, w9Deps } from "@/lib/shop/w9-deps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const noStore = { "Cache-Control": "no-store, private, max-age=0" };

function w9ErrorResponse(e: unknown) {
  if (e instanceof W9KeyError) return NextResponse.json({ code: "key", error: e.message }, { status: 503, headers: noStore });
  if (e instanceof W9Error) return NextResponse.json({ code: e.code, error: e.code, field: e.message !== e.code ? e.message : undefined }, { status: e.status, headers: noStore });
  console.error("[w9] request failed:", e instanceof Error ? e.name : "error");
  return NextResponse.json({ code: "server", error: "Could not save. Try again." }, { status: 500, headers: noStore });
}

export async function POST(req: NextRequest) {
  const worker = await getSessionWorker();
  if (!worker) return NextResponse.json({ code: "auth", error: "Not signed in" }, { status: 401, headers: noStore });
  await touchSession();
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ code: "invalid", error: "Invalid request" }, { status: 400, headers: noStore });
  }
  const deps = w9Deps();
  const actor = { id: worker.id, name: worker.name, is_admin: worker.is_admin, can_see_prices: worker.can_see_prices };
  const target = typeof body.workerId === "string" && UUID.test(body.workerId) ? body.workerId : worker.id;
  try {
    switch (body.type) {
      case "profile": {
        const profile = await saveProfile(deps, actor, target, body.fields);
        return NextResponse.json({ ok: true, profile }, { headers: noStore });
      }
      case "request": {
        const ids = Array.isArray(body.workerIds) ? body.workerIds.filter((v): v is string => typeof v === "string" && UUID.test(v)) : [];
        const result = await requestProfiles(deps, actor, { workerIds: ids, all: body.all === true });
        return NextResponse.json({ ok: true, ...result }, { headers: noStore });
      }
      case "prepare": {
        const result = await prepareTin(deps, actor, target, { tinType: body.tinType, tin: body.tin, tinConfirm: body.tinConfirm });
        return NextResponse.json({ ok: true, ...result }, { headers: noStore });
      }
      case "sign": {
        const profile = await signW9(deps, actor, body.form, { ip: clientIp(req.headers), userAgent: req.headers.get("user-agent") });
        return NextResponse.json({ ok: true, profile }, { headers: noStore });
      }
      default:
        return NextResponse.json({ code: "invalid", error: "Unknown action" }, { status: 400, headers: noStore });
    }
  } catch (e) {
    return w9ErrorResponse(e);
  }
}
