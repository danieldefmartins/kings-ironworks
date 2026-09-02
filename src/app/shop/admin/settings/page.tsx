import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { getOrgSettings } from "@/lib/shop/db";
import { canViewOwnerFinancials } from "@/lib/shop/shared";
import ShopTopBar from "../../ShopTopBar";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function OrgSettingsPage() {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  // Settings hangs off /shop/admin and links back to it, so it carries the same
  // owner gate — a half-open admin section is worse than a closed one.
  if (!canViewOwnerFinancials(worker)) redirect("/shop");

  const settings = await getOrgSettings();

  return (
    <div>
      <ShopTopBar
        workerName={worker.name}
        title="Organization Settings"
        back="/shop/admin"
        lang={worker.lang || "en"}
        adminLink={false}
      />
      <SettingsClient initial={settings} />
    </div>
  );
}
