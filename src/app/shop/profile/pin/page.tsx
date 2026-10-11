import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { pint } from "@/lib/shop/pin-i18n";
import ShopTopBar from "../../ShopTopBar";
import ChangePin from "./ChangePin";

export const dynamic = "force-dynamic";

export default async function ChangePinPage() {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  const lang = worker.lang || "en";
  return (
    <div>
      <ShopTopBar workerName={worker.name} title={pint(lang, "title")} back="/shop/profile" lang={lang} />
      <main className="mx-auto max-w-md px-4 pb-16 pt-6">
        <ChangePin lang={lang} />
      </main>
    </div>
  );
}
