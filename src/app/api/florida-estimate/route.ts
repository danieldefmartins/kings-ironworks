import { NextResponse } from "next/server";
import { floridaCrmConfig, SMS_CONSENT } from "@/lib/florida/config";
export function GET() {
  const config = floridaCrmConfig();
  if (!config) return NextResponse.json({ error: "Online requests are temporarily unavailable. Please call or text (754) 240-0082." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  return NextResponse.json({ config, smsConsent: SMS_CONSENT }, { headers: { "Cache-Control": "private, no-store" } });
}
