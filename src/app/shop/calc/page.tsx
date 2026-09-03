import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { t } from "@/lib/shop/i18n";
import ShopTopBar from "../ShopTopBar";
import { canViewOwnerFinancials } from "@/lib/shop/shared";
import CalcClient from "./CalcClient";

export const dynamic = "force-dynamic";

// Open to the whole crew, not owner-gated: the person working out how many
// risers fit is the one standing at the opening with a tape.
export default async function CalcPage() {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  const lang = worker.lang || "en";
  return (
    <div>
      <ShopTopBar
        workerName={worker.name}
        title={t(lang, "calcTitle")}
        back="/shop/more"
        lang={lang}
        adminLink={canViewOwnerFinancials(worker)}
      />
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-5">
        <CalcClient lang={lang} />
      </main>
    </div>
  );
}
