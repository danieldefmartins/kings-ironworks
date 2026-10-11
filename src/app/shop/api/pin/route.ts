// Sign-in PIN: the worker's own change, and an owner's reset of someone else's.
// Bodies carry PINs, so this handler never logs a body and never echoes input:
// errors are codes only.
import { NextRequest, NextResponse } from "next/server";
import { getWorkerAuthState } from "@/lib/shop/db";
import { credentialFingerprint, getSessionWorker, makeToken, sessionCookieOptions, SHOP_COOKIE } from "@/lib/shop/session";
import { changeOwnPin, checkCurrentPin, PinError, resetWorkerPin } from "@/lib/shop/pin-service";
import { pinDeps } from "@/lib/shop/pin-deps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const noStore = { "Cache-Control": "no-store, private, max-age=0" };
const fail = (status: number, code: string) => NextResponse.json({ code, error: code }, { status, headers: noStore });

export async function POST(req: NextRequest) {
  const worker = await getSessionWorker();
  if (!worker) return fail(401, "auth");
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, "invalid");
  }
  const deps = pinDeps();
  const actor = { id: worker.id, name: worker.name, is_admin: worker.is_admin, can_see_prices: worker.can_see_prices };
  const ua = req.headers.get("user-agent");
  try {
    switch (body.type) {
      case "verify": {
        await checkCurrentPin(deps, actor, body.current, ua);
        return NextResponse.json({ ok: true }, { headers: noStore });
      }
      case "change": {
        // Only ever the session's own worker. A request naming anyone else is
        // refused outright rather than quietly redirected to the caller.
        if (body.workerId !== undefined && body.workerId !== worker.id) return fail(403, "forbidden");
        await changeOwnPin(deps, actor, { current: body.current, next: body.next, confirm: body.confirm }, ua);
        // The session fingerprint is derived from the PIN, so the old cookie is
        // now void everywhere. Re-issue this device's so the worker stays in.
        const res = NextResponse.json({ ok: true }, { headers: noStore });
        const state = await getWorkerAuthState(worker.id);
        if (state) res.cookies.set(SHOP_COOKIE, makeToken(worker.id, credentialFingerprint(state)), sessionCookieOptions());
        return res;
      }
      case "reset": {
        const target = typeof body.workerId === "string" && UUID.test(body.workerId) ? body.workerId : "";
        await resetWorkerPin(deps, actor, target, { pin: body.pin });
        return NextResponse.json({ ok: true }, { headers: noStore });
      }
      default:
        return fail(400, "invalid");
    }
  } catch (e) {
    if (e instanceof PinError) return fail(e.status, e.code);
    console.error("[pin] request failed:", e instanceof Error ? e.name : "error");
    return fail(500, "server");
  }
}
