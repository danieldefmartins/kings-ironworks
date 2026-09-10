import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getSessionWorker } from "@/lib/shop/session";
import { canViewOwnerFinancials } from "@/lib/shop/shared";
import { t } from "@/lib/shop/i18n";
import ShopTopBar from "../ShopTopBar";
import MenuDirectory from "../MenuDirectory";

export const dynamic = "force-dynamic";

// The admin landing page: every owner-level tool as a labelled tile.
//
// This used to drop straight into labour and job costs with two small text
// links wedged above it, so the rest of admin was effectively undiscoverable —
// you had to already know it was there. Tiles say what exists. The dropdown in
// the top bar is the fast path for when you already do.
export default async function AdminHub() {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  if (!canViewOwnerFinancials(worker)) redirect("/shop");
  const lang = worker.lang || "en";

  return (
    <div>
      <ShopTopBar workerName={worker.name} title={t(lang, "admHubTitle")} back="/shop" lang={lang} adminLink />
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-5">
        <header className="mb-5 flex items-start gap-3">
          <ShieldCheck aria-hidden className="mt-0.5 h-6 w-6 shrink-0 text-amber-400" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t(lang, "admHubTitle")}</h1>
            <p className="mt-0.5 text-sm text-neutral-500">{t(lang, "admHubHint")}</p>
          </div>
        </header>

        <Link href="/shop/admin/actions" className="mb-6 block rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 hover:bg-amber-500/15"><span className="block text-xl font-semibold text-amber-300">{t(lang, "actionsTitle")} →</span><span className="mt-1 block text-sm text-neutral-300">{t(lang, "actionsNavHint")}</span></Link>
        <MenuDirectory scope="admin" lang={lang} />
      </main>
    </div>
  );
}
