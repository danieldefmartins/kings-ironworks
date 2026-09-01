import { NextRequest, NextResponse } from "next/server";
import { getSessionWorker } from "@/lib/shop/session";
import { listCatalog, listInventory, listSupplierPrices, audit } from "@/lib/shop/db";
import { sendTelegram, tgEscape } from "@/lib/shop/notify";

export const runtime = "nodejs";

interface Line {
  catalogId: string;
  qty: number;
}

// "We need this" from the shop floor, delivered to Daniel on Telegram.
//
// The quantities and links are read from the database HERE, never taken from
// the browser — a tablet in the shop should not be able to dictate what the
// message says about price or where to buy it. The client sends only which
// items, and how many.
export async function POST(req: NextRequest) {
  const worker = await getSessionWorker();
  if (!worker) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let lines: Line[];
  try {
    const body = await req.json();
    lines = Array.isArray(body?.lines) ? body.lines : [];
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const wanted = new Map<string, number>();
  for (const l of lines) {
    const qty = Math.floor(Number(l?.qty));
    if (!l?.catalogId || !Number.isFinite(qty) || qty < 1 || qty > 9999) continue;
    wanted.set(String(l.catalogId), qty);
  }
  if (wanted.size === 0) {
    return NextResponse.json({ error: "Nothing to order" }, { status: 400 });
  }

  const [catalog, inventory, prices] = await Promise.all([
    listCatalog(),
    listInventory(),
    listSupplierPrices(),
  ]);
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const stockBy = new Map(inventory.map((r) => [r.catalog_id, r]));
  const buyBy = new Map<string, (typeof prices)[number]>();
  for (const p of prices) {
    const cur = buyBy.get(p.catalog_id);
    if (!cur || (p.preferred && !cur.preferred)) buyBy.set(p.catalog_id, p);
  }

  const rows = [...wanted.entries()]
    .map(([id, qty]) => ({ item: byId.get(id), qty, stock: stockBy.get(id), buy: buyBy.get(id) }))
    .filter((r) => r.item);
  if (rows.length === 0) {
    return NextResponse.json({ error: "Nothing to order" }, { status: 400 });
  }

  const when = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const lineText = rows.map((r) => {
    const name = tgEscape(r.item!.display);
    const onHand = r.stock ? Number(r.stock.on_hand) : null;
    const have = onHand == null ? "" : `  <i>have ${onHand}</i>`;
    const link = r.buy?.url ? `\n   <a href="${r.buy.url}">${tgEscape(r.buy.supplier)}</a>` : "";
    return `• <b>${r.qty} ×</b> ${name}${have}${link}`;
  });

  // Telegram rejects anything over 4096 characters, and "order everything that
  // is low" is a realistic tap on a shop floor that has never been counted —
  // 200+ lines. Split rather than fail, and number the parts so the order can
  // be read as one thing.
  const LIMIT = 3500;
  const chunks: string[] = [];
  let cur = "";
  for (const line of lineText) {
    if (cur && cur.length + line.length + 1 > LIMIT) {
      chunks.push(cur);
      cur = "";
    }
    cur = cur ? `${cur}\n${line}` : line;
  }
  if (cur) chunks.push(cur);

  const head =
    `🛒 <b>Shop order — materials needed</b>\n${tgEscape(worker.name)} · ${when}`;

  let sent = true;
  for (let i = 0; i < chunks.length; i++) {
    const part = chunks.length > 1 ? ` (${i + 1}/${chunks.length})` : "";
    const tail =
      i === chunks.length - 1
        ? `\n\n<i>${rows.length} item${rows.length === 1 ? "" : "s"} from the inventory screen.</i>`
        : "";
    const ok = await sendTelegram(`${head}${part}\n\n${chunks[i]}${tail}`);
    if (!ok) sent = false;
  }

  await audit("material_order", {
    workerId: worker.id,
    entity: "material_order",
    detail: {
      sent,
      lines: rows.map((r) => ({ sku: r.item!.sku, display: r.item!.display, qty: r.qty })),
    },
  });

  if (!sent) {
    // Say so. A worker who thinks the order went out and it did not is worse
    // off than one who knows to walk over and tell somebody.
    return NextResponse.json({ error: "Telegram send failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, count: rows.length });
}
