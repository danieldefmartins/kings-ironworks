import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { canViewOwnerFinancials } from "@/lib/shop/shared";
import { t } from "@/lib/shop/i18n";
import ShopTopBar from "../ShopTopBar";
import MenuDirectory from "../MenuDirectory";
import Link from "next/link";
import { ChevronRight, ClipboardClock, Timer } from "lucide-react";
import { isTimeApprover, tf } from "@/lib/shop/time-fix";
import { countPendingFixes } from "@/lib/shop/time-fix-db";

export const dynamic = "force-dynamic";

export default async function MorePage() {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  const lang = worker.lang || "en";
  const owner = canViewOwnerFinancials(worker);
  // The office admin approves time fixes: her way in, with the waiting count.
  const approver = isTimeApprover(worker);
  const waiting = approver ? await countPendingFixes(worker.id).catch(() => 0) : 0;
  const title = lang === "pt" ? "Todas as ferramentas" : lang === "es" ? "Todas las herramientas" : "All tools";
  return <div>
    <ShopTopBar workerName={worker.name} title={title} lang={lang} adminLink={canViewOwnerFinancials(worker)} />
    <main className="mx-auto max-w-5xl space-y-5 px-4 pb-28 pt-5">
      <header><h1 className="text-2xl font-semibold tracking-tight">{title}</h1><p className="mt-1 text-sm text-neutral-400">{t(lang, "menuCrewHint")}</p></header>
      {approver && <Link href="/shop/ponto" data-testid="more-ponto" className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-400/15"><Timer aria-hidden className="h-5 w-5 text-emerald-300" /></span>
        <span className="min-w-0 flex-1"><span className="block font-semibold">{t(lang, "pontoNav")}</span><span className="mt-0.5 block text-xs text-neutral-400">{t(lang, "pontoNavHint")}</span></span>
        <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-neutral-500" />
      </Link>}
      {approver && <Link href="/shop/time-fixes" className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-400/15"><ClipboardClock aria-hidden className="h-5 w-5 text-amber-300" /></span>
        <span className="min-w-0 flex-1"><span className="block font-semibold">{tf(lang, "navBadge")}</span><span className="mt-0.5 block text-xs text-neutral-400">{tf(lang, "navBadgeHint")}</span></span>
        {waiting > 0 && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white tabular-nums">{waiting}</span>}
        <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-neutral-500" />
      </Link>}
      <MenuDirectory scope={owner ? "all" : "crew"} lang={lang} simple />
    </main>
  </div>;
}
