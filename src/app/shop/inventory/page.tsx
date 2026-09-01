import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { listCatalog, listInventory } from "@/lib/shop/db";
import ShopTopBar from "../ShopTopBar";
import InventoryClient from "./InventoryClient";
import { t } from "@/lib/shop/i18n";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  const lang = worker.lang || "en";

  const [catalog, inventory] = await Promise.all([listCatalog(), listInventory()]);
  const byId = new Map(catalog.map((c) => [c.id, c]));
  // Only rows whose catalog item still exists and is active — a retired SKU
  // should drop off the count rather than linger as a mystery line.
  const rows = inventory
    .map((r) => ({ ...r, item: byId.get(r.catalog_id)! }))
    .filter((r) => r.item)
    .sort((a, b) => {
      const aShort = a.min_qty != null && Number(a.on_hand) < Number(a.min_qty);
      const bShort = b.min_qty != null && Number(b.on_hand) < Number(b.min_qty);
      if (aShort !== bShort) return aShort ? -1 : 1;
      return a.item.display.localeCompare(b.item.display);
    });

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
