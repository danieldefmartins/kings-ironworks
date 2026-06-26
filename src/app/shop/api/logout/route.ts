import { NextResponse } from "next/server";
import { SHOP_COOKIE } from "@/lib/shop/session";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SHOP_COOKIE, "", { path: "/shop", maxAge: 0 });
  return res;
}
