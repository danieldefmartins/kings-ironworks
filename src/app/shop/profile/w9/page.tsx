import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { getTeamRecord } from "@/lib/shop/team-db";
import { profileView } from "@/lib/shop/w9-service";
import { w9t } from "@/lib/shop/w9-i18n";
import ShopTopBar from "../../ShopTopBar";
import W9Status from "./W9Status";

export const dynamic = "force-dynamic";

export default async function MyW9Page() {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  const rec = await getTeamRecord(worker.id);
  if (!rec) redirect("/shop/login");
  const lang = worker.lang || "en";
  return (
    <div>
      <ShopTopBar workerName={worker.name} title={w9t(lang, "step_w9")} back="/shop/profile" lang={lang} />
      <main className="mx-auto max-w-xl px-4 pb-28 pt-5">
        <W9Status profile={profileView(rec)} lang={lang} />
      </main>
    </div>
  );
}
