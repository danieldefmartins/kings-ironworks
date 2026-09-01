import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { listCatalog, listInventory, listSupplierPrices, signPhotoUrls } from "@/lib/shop/db";
import ShopTopBar from "../ShopTopBar";
import InventoryClient from "./InventoryClient";
import { t } from "@/lib/shop/i18n";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  const lang = worker.lang || "en";

  const [catalog, inventory, prices] = await Promise.all([
    listCatalog(), listInventory(), listSupplierPrices(),
  ]);
  // Cheapest per unit first, so the row shows the best price we know of.
  const bestBy = new Map<string, (typeof prices)[number]>();
  for (const p of prices) {
    const cur = bestBy.get(p.catalog_id);
    if (!cur || (p.preferred && !cur.preferred)) bestBy.set(p.catalog_id, p);
  }
  const byId = new Map(catalog.map((c) => [c.id, c]));
  // Only rows whose catalog item still exists and is active — a retired SKU
  // should drop off the count rather than linger as a mystery line.
  const rows = inventory
    .map((r) => ({ ...r, item: byId.get(r.catalog_id)!, buy: bestBy.get(r.catalog_id) || null, imageUrl: null as string | null }))
    .filter((r) => r.item)
    .sort((a, b) => {
      const aShort = a.min_qty != null && Number(a.on_hand) < Number(a.min_qty);
      const bShort = b.min_qty != null && Number(b.on_hand) < Number(b.min_qty);
      if (aShort !== bShort) return aShort ? -1 : 1;
      return a.item.display.localeCompare(b.item.display);
    });

  // One signature per distinct picture, cached across requests. Rows share
  // photos (every size of an angle is the same picture), so signing per row
  // would be ~617 round trips for ~230 images.
  const signed = await signPhotoUrls(rows.map((r) => r.item.image_url));
  for (const r of rows) {
    if (r.item.image_url) r.imageUrl = signed.get(r.item.image_url) ?? null;
  }

  return (
    <div>
      <ShopTopBar
        title={t(lang, "tileInventory")}
        workerName={worker.name}
        lang={lang}
        adminLink={!!worker.is_admin}
        back="/shop"
      />
      <InventoryClient rows={rows} lang={lang} canEdit />
    </div>
  );
}
