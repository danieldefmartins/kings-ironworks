import { NextRequest, NextResponse } from "next/server";
import { verifyWorkerPin } from "@/lib/shop/db";
import { makeToken, SHOP_COOKIE } from "@/lib/shop/session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { workerId, pin } = await req.json();
    if (!workerId || !pin) {
      return NextResponse.json({ error: "Missing worker or PIN" }, { status: 400 });
    }
    const worker = await verifyWorkerPin(String(workerId), String(pin));
    if (!worker) {
      return NextResponse.json({ error: "Wrong PIN" }, { status: 401 });
    }
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
