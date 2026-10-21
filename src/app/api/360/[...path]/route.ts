import { NextRequest, NextResponse } from "next/server";
import { floridaCrmConfig } from "@/lib/florida/config";
const API = "https://api.get360crm.com/public/website/";
const failure = (status: number) => NextResponse.json({ error: { code: "unavailable", message: "Please call or text (754) 240-0082." } }, { status });
async function relay(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const config = floridaCrmConfig(); if (!config) return failure(503);
  const path = (await context.params).path.join("/");
  const suffix = path.replace(/^public\/website\//, "");
  const isForm = request.method === "GET" && suffix === `forms/${config.formSlug}`;
  const isSubmit = request.method === "POST" && ["direct-submit", "direct-uploads", "activity"].includes(suffix);
  if (!path.startsWith("public/website/") || (!isForm && !isSubmit)) return failure(404);
  let body: string | undefined;
  if (isSubmit) {
    const origin=request.headers.get("origin");
    if(origin && origin!==request.nextUrl.origin && origin!=="https://kingsironworks.com" && origin!=="https://www.kingsironworks.com") return failure(403);
    if(Number(request.headers.get("content-length")||0)>15_000_000) return failure(413);
    const reader=request.body?.getReader(); if(!reader)return failure(400);
    const chunks:Uint8Array[]=[];let bytes=0;
    for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>15_000_000){await reader.cancel();return failure(413);}chunks.push(value);}
    body=Buffer.concat(chunks).toString("utf8");
    try {
      const data=JSON.parse(body);
      const claims=JSON.parse(Buffer.from(String(data.token).split(".")[0],"base64url").toString());
      if(claims.ws!==config.workspaceId || claims.kind!=="form")return failure(400);
    } catch { return failure(400); }
  }
  try {
    const upstream = await fetch(API + suffix, { method: request.method, headers: { "Content-Type": "application/json" }, body, cache: "no-store", signal: AbortSignal.timeout(55000) });
    return new NextResponse(await upstream.text(), { status: upstream.status, headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store", ...(upstream.headers.get("retry-after")?{"Retry-After":upstream.headers.get("retry-after")!}:{}) } });
  } catch { return failure(502); }
}
export const GET = relay;
export const POST = relay;
