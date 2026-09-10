import Link from "next/link";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import type { loadBusinessActions } from "@/lib/shop/actions-db";
import { ACTION_GROUPS } from "@/lib/shop/actions";
import { t } from "@/lib/shop/i18n";
import ShopTopBar from "../../ShopTopBar";

export default function ActionsView({ data, workerName, lang }: {
  data: Awaited<ReturnType<typeof loadBusinessActions>> | null; workerName: string; lang: string;
}) {
  return <div>
    <ShopTopBar workerName={workerName} title={t(lang, "actionsTitle")} back="/shop/admin" lang={lang} adminLink />
    <main className="mx-auto max-w-4xl space-y-6 px-4 pb-28 pt-5">
      <header><h1 className="flex items-center gap-2 text-2xl font-semibold"><LayoutDashboard aria-hidden className="h-6 w-6 text-amber-400" />{t(lang, "actionsTitle")}</h1><p className="mt-2 text-sm text-neutral-400">{t(lang, "actionsHint")}</p></header>
      {!data ? <div role="alert" className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5"><p>{t(lang, "actionsFailed")}</p><a href="/shop/admin/actions" className="mt-3 inline-flex min-h-12 items-center font-semibold underline">{t(lang, "actionsRefresh")}</a></div> : <>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-400"><span>{data.today} · {t(lang, "actionsTimezone")}</span><a href="/shop/admin/actions" className="inline-flex min-h-12 items-center rounded-xl border border-white/15 px-4 text-neutral-200">{t(lang, "actionsRefresh")}</a></div>
        <nav aria-label={t(lang, "actionsTitle")} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{ACTION_GROUPS.map(key => <a key={key} href={`#${key}`} className="rounded-2xl border border-white/10 bg-neutral-900 p-4 hover:border-amber-500/50"><span className={`block text-3xl font-semibold ${data.groups[key].length ? key === "overdue" ? "text-red-400" : "text-amber-400" : "text-neutral-500"}`}>{data.groups[key].length}</span><span className="mt-2 block text-sm">{t(lang, `actions_${key}`)}</span></a>)}</nav>
        {ACTION_GROUPS.map(key => <section key={key} id={key} className="scroll-mt-24 rounded-2xl border border-white/10 bg-neutral-900/60 p-4">
          <h2 className="text-lg font-semibold">{t(lang, `actions_${key}`)} <span className="text-neutral-500">({data.groups[key].length})</span></h2>
          <p className="mt-1 text-sm text-neutral-400">{t(lang, `actions_${key}Hint`)}</p>
          {data.groups[key].length === 0 ? <p className="mt-4 text-sm text-neutral-500">{t(lang, "actionsNone")}</p> : <div className="mt-3 max-h-96 divide-y divide-white/10 overflow-y-auto">{data.groups[key].map(row => <Link key={row.id} href={row.href} className="flex min-h-[72px] items-center gap-3 rounded-lg px-2 py-3 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-amber-400"><span className="min-w-0 flex-1"><span className="block font-semibold">{row.title}</span>{row.detail && <span className="mt-1 block text-sm text-neutral-400">{row.detail}</span>}</span>{row.date && <time dateTime={row.date} className="shrink-0 text-xs text-neutral-400">{row.date}</time>}<ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-amber-400" /></Link>)}</div>}
        </section>)}
      </>}
    </main>
  </div>;
}
