import { NextRequest, NextResponse } from "next/server";

const REGION_COOKIE = "kiw-site-region";
const COOKIE_AGE = 60 * 60 * 24 * 30;

/** Route home requests before rendering, keeping each regional page's own SEO URL. */
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const prefetch = request.headers.has("next-router-prefetch") || /prefetch/i.test(request.headers.get("purpose") || request.headers.get("sec-purpose") || "");
  const choice = searchParams.get("region");
  const selected = choice === "florida" || choice === "all" ? choice : null;
  const remembered = request.cookies.get(REGION_COOKIE)?.value;
  const country = request.headers.get("cf-ipcountry")?.toUpperCase();
  const region = (request.headers.get("cf-region-code") || request.headers.get("cf-region") || "").toLowerCase();
  const inFlorida = country === "US" && (region === "fl" || region === "florida");
  const preference = selected || remembered;
  const floridaHome = preference === "florida" || (preference !== "all" && inFlorida);
  let response: NextResponse;
  if (pathname === "/" && floridaHome) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/florida";
    destination.searchParams.delete("region");
    response = NextResponse.redirect(destination, 307);
  } else {
    response = NextResponse.next();
  }
  // No shared cache may serve one visitor's regional decision to another.
  response.headers.set("Cache-Control", "private, no-store");
  const save = selected || (pathname === "/florida" || (pathname === "/" && floridaHome) ? "florida" : null);
  if (!prefetch && request.method === "GET" && save) {
    response.cookies.set(REGION_COOKIE, save, {
      httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax", path: "/", maxAge: COOKIE_AGE,
    });
  }
  return response;
}

export const config = { matcher: ["/", "/florida"] };
