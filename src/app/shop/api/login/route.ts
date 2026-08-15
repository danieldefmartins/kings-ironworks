import { NextRequest, NextResponse } from "next/server";
import { verifyWorkerPin, audit, recentLoginFailures } from "@/lib/shop/db";
import { makeToken, SHOP_COOKIE } from "@/lib/shop/session";

const MAX_FAILURES = 5;
const WINDOW_MIN = 15;

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { workerId, pin } = await req.json();
    if (!workerId || !pin) {
      return NextResponse.json({ error: "Missing worker or PIN" }, { status: 400 });
    }
    // throttle: 5 failed PINs in 15 minutes locks the account temporarily
    const failures = await recentLoginFailures(String(workerId), WINDOW_MIN);
    if (failures >= MAX_FAILURES) {
      await audit("login_locked", { workerId: String(workerId) });
      return NextResponse.json(
        { error: `Too many attempts — locked for ${WINDOW_MIN} minutes` },
        { status: 429 }
      );
    }
    const worker = await verifyWorkerPin(String(workerId), String(pin));
    if (!worker) {
      await audit("login_fail", {
        workerId: String(workerId),
        detail: { ua: req.headers.get("user-agent")?.slice(0, 200) || null },
      });
      return NextResponse.json({ error: "Wrong PIN" }, { status: 401 });
    }
    await audit("login_ok", {
      workerId: worker.id,
      detail: { ua: req.headers.get("user-agent")?.slice(0, 200) || null },
    });
    const res = NextResponse.json({ ok: true, worker });
    res.cookies.set(SHOP_COOKIE, makeToken(worker.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/shop",
      maxAge: 60 * 60 * 12, // 12h shift
    });
    return res;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Login failed" },
      { status: 500 }
    );
  }
}
