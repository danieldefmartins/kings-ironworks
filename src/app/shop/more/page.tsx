import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { canViewOwnerFinancials } from "@/lib/shop/shared";
import { t } from "@/lib/shop/i18n";
import ShopTopBar from "../ShopTopBar";
import MenuDirectory from "../MenuDirectory";

export const dynamic = "force-dynamic";

export default async function MorePage() {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  const lang = worker.lang || "en";
  return <div>
    <ShopTopBar workerName={worker.name} title={t(lang, "menuCrew")} lang={lang} adminLink={canViewOwnerFinancials(worker)} />
    <main className="mx-auto max-w-3xl space-y-5 px-4 pb-28 pt-5">
      <header><h1 className="text-2xl font-semibold">{t(lang, "menuCrew")}</h1><p className="mt-1 text-sm text-neutral-400">{t(lang, "menuCrewHint")}</p></header>
      <MenuDirectory scope="crew" lang={lang} />
    </main>
  </div>;
}
