// Scheduled payroll clock check: "still clocked in after the work day" texts
// and the forgotten clock-out alert, without waiting for crew traffic.
//
// Railway cron (every 10 minutes):
//   curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://<host>/shop/api/cron/clock-check
// Both checks are deduplicated in the audit log, so running it more often, or
// alongside the opportunistic callers, never double-alerts.

import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runClockChecks } from "@/lib/shop/stale-alert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || req.headers.get("x-cron-secret") || "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runClockChecks(Date.now(), { force: true });
  return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
}
