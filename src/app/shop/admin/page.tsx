import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { getSessionWorker } from "@/lib/shop/session";
import { canViewOwnerFinancials } from "@/lib/shop/shared";
import { t } from "@/lib/shop/i18n";
import ShopTopBar from "../ShopTopBar";
import { ADMIN_DESTS } from "../adminNav";

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
      <ShopTopBar workerName={worker.name} title={t(lang, "admHubTitle")} back="/shop" lang={lang} />
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-5">
        <header className="mb-5 flex items-start gap-3">
          <ShieldCheck aria-hidden className="mt-0.5 h-6 w-6 shrink-0 text-amber-400" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t(lang, "admHubTitle")}</h1>
            <p className="mt-0.5 text-sm text-neutral-500">{t(lang, "admHubHint")}</p>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          {ADMIN_DESTS.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              className="flex min-h-[84px] items-center gap-3 rounded-[20px] border border-white/10 bg-neutral-900/60 p-4 transition active:scale-[0.99] hover:border-amber-600/50"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-neutral-800">
                <d.icon aria-hidden className={`h-5 w-5 ${d.tone}`} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{t(lang, d.key)}</span>
                <span className="block text-xs leading-snug text-neutral-500">
                  {t(lang, d.hintKey)}
                </span>
              </span>
              <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-neutral-600" />
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
