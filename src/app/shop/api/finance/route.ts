import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionWorker } from "@/lib/shop/session";
import { canViewOwnerFinancials } from "@/lib/shop/shared";
import { addCashEntry, applyVendorRule, getFinTransaction, importChaseCsv, tagFinTransactions } from "@/lib/shop/finance-db";

const tagShape = z
  .object({
    grp: z.enum(["revenue", "expense", "owner", "transfer", "review"]),
    owner: z.enum(["kiw", "daniel", "reginaldo"]).nullable(),
    category: z.string().trim().min(1).max(80),
    note: z.string().trim().max(500).nullable().optional(),
  })
  .refine(
    (t) =>
      (t.grp === "owner" && (t.owner === "daniel" || t.owner === "reginaldo")) ||
      (t.grp === "expense" && t.owner === "kiw") ||
      (["revenue", "transfer", "review"].includes(t.grp) && t.owner === null),
    { message: "Owner does not match the group" }
  );

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("tag"), ids: z.array(z.string().uuid()).min(1).max(500), tag: tagShape, applyToVendor: z.boolean().optional() }),
  z.object({ action: z.literal("import"), account: z.string().regex(/^\d{4}$/), csv: z.string().min(10).max(5_000_000) }),
  z.object({
    action: z.literal("cash"),
    id: z.string().uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    description: z.string().trim().min(3).max(200),
    amount: z.number().finite().refine((n) => n !== 0 && Math.abs(n) <= 9_999_999 && Math.round(n * 100) === n * 100),
    tag: tagShape,
  }),
]);

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl.host).split(",")[0].trim();
  try { return new URL(origin).host === host; } catch { return false; }
}

export async function POST(req: NextRequest) {
  const worker = await getSessionWorker();
  if (!worker) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!canViewOwnerFinancials(worker)) return NextResponse.json({ error: "Owner access required" }, { status: 403 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "That request was not valid. Refresh and try again." }, { status: 400 });
  const data = parsed.data;

  try {
    if (data.action === "cash") {
      if (data.date > new Date().toISOString().slice(0, 10)) return NextResponse.json({ error: "The date cannot be in the future." }, { status: 400 });
      const created = await addCashEntry({ id: data.id, date: data.date, description: data.description, amount: data.amount, tag: data.tag }, worker.id);
      return NextResponse.json({ ok: true, created });
    }
    if (data.action === "import") {
      const result = await importChaseCsv(data.account, data.csv, worker.id);
      return NextResponse.json({ ok: true, result });
    }
    let applied = 0;
    if (data.applyToVendor && data.tag.grp !== "review") {
      const first = await getFinTransaction(data.ids[0]);
      if (!first) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
      applied = await applyVendorRule(first.vendor, first.amount < 0 ? "out" : "in", data.tag, worker.id);
    }
    const tagged = await tagFinTransactions(data.ids, data.tag, worker.id);
    return NextResponse.json({ ok: true, tagged, applied });
  } catch (err) {
    console.error("Finance change failed", err);
    const msg = err instanceof Error && /Chase|Account|Daniel joined|Choose who/.test(err.message) ? err.message : "Could not save. Refresh and try again.";
    return NextResponse.json({ error: msg }, { status: 409 });
  }
}
