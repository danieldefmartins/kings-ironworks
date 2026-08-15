import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { getOrgSettings } from "@/lib/shop/db";
import ShopTopBar from "../../ShopTopBar";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function OrgSettingsPage() {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  if (!worker.is_admin) redirect("/shop");

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
