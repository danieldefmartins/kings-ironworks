import { NextRequest, NextResponse } from "next/server";
export function GET(request: NextRequest) {
  // Cloudflare-managed location headers only personalize a served city with an existing page.
  const city = request.headers.get("cf-ipcity");
  const region = request.headers.get("cf-region-code") || request.headers.get("cf-region");
  const country = request.headers.get("cf-ipcountry");
  return NextResponse.json({ city: country === "US" && (region === "Florida" || region === "FL") && city?.toLowerCase() === "miami" ? "Miami" : null }, { headers: { "Cache-Control": "private, no-store" } });
}
