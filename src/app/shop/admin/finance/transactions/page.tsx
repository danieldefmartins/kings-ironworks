import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { canViewOwnerFinancials } from "@/lib/shop/shared";
import { financeCounts, searchFinTransactions } from "@/lib/shop/finance-db";
import ShopTopBar from "../../../ShopTopBar";
import FinanceNav from "../FinanceNav";
import TxList, { type TxItem } from "./TxList";
import CashEntryForm from "./CashEntryForm";
import { GROUP_LABEL, L, shopToday, usd } from "../ui";

export const dynamic = "force-dynamic";
const PER_PAGE = 100;

export default async function FinanceTransactionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  if (!canViewOwnerFinancials(worker)) redirect("/shop");
  const lang = worker.lang || "en";
  const sp = await searchParams;
  const page = Math.max(Number(sp.page) || 1, 1);
  const filters = { q: sp.q || "", grp: sp.grp || "", owner: sp.owner || "", account: sp.acct || "", month: sp.month || "" };

  let items: TxItem[] = [];
  let counts = { review: 0, uncategorized: 0 };
  let error: string | null = null;
  try {
    const [rows, c] = await Promise.all([searchFinTransactions({ ...filters, limit: PER_PAGE + 1, offset: (page - 1) * PER_PAGE }), financeCounts()]);
    counts = c;
    items = rows.map((t) => ({ id: t.id!, account: t.account, posted_on: t.posted_on, description: t.description, amount: t.amount, category: t.category, vendor: t.vendor, grp: t.grp, owner: t.owner, tag_source: t.tag_source }));
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load transactions";
  }
  const more = items.length > PER_PAGE;
  items = items.slice(0, PER_PAGE);
  const pageTotal = items.reduce((s, t) => s + t.amount, 0);
  const link = (p: number) => {
    const q = new URLSearchParams(Object.entries({ ...filters, acct: filters.account, account: "" }).filter(([, v]) => v) as [string, string][]);
    if (p > 1) q.set("page", String(p));
    return `/shop/admin/finance/transactions?${q.toString()}`;
  };
  const input = "min-h-11 rounded-lg border border-white/20 bg-neutral-950 px-3 text-sm";

  return (
    <div>
      <ShopTopBar workerName={worker.name} title={L(lang, "Transactions", "Transações", "Movimientos")} back="/shop/admin/finance" lang={lang} adminLink />
      <main className="mx-auto max-w-4xl space-y-5 px-4 pb-28 pt-5">
        <h1 className="text-2xl font-semibold">{L(lang, "All bank transactions", "Todas as transações", "Todos los movimientos")}</h1>
        <FinanceNav lang={lang} active="tx" reviewCount={counts.review} categoryCount={counts.uncategorized} />
        <CashEntryForm lang={lang} today={shopToday()} />
        <form className="grid gap-2 sm:grid-cols-6" method="get">
          <input name="q" defaultValue={filters.q} placeholder={L(lang, "Search description…", "Buscar descrição…", "Buscar descripción…")} className={`${input} sm:col-span-2`} />
          <select name="grp" defaultValue={filters.grp} className={input}>
            <option value="">{L(lang, "Any type", "Qualquer tipo", "Cualquier tipo")}</option>
            {Object.entries(GROUP_LABEL).map(([k, v]) => <option key={k} value={k}>{L(lang, ...v)}</option>)}
          </select>
          <select name="owner" defaultValue={filters.owner} className={input}>
            <option value="">{L(lang, "Anyone", "Qualquer um", "Cualquiera")}</option>
            <option value="kiw">KIW</option><option value="daniel">Daniel</option><option value="reginaldo">Reginaldo</option>
          </select>
          <input name="month" type="month" defaultValue={filters.month} className={input} />
          <button className="min-h-11 rounded-lg bg-amber-400 px-4 text-sm font-bold text-neutral-950">{L(lang, "Filter", "Filtrar", "Filtrar")}</button>
        </form>
        {error && <div role="alert" className="rounded-2xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">{error}</div>}
        {!error && <p className="text-sm text-neutral-400">{items.length} {L(lang, "shown · net", "exibidas · saldo", "mostrados · neto")} {usd(pageTotal, true)} · {L(lang, "tap one to change it", "toque para alterar", "toca para cambiar")}</p>}
        {!error && <TxList items={items} lang={lang} />}
        <div className="flex justify-between">
          {page > 1 ? <Link className="min-h-11 rounded-lg border border-white/15 px-4 py-2 text-sm" href={link(page - 1)}>← {L(lang, "Newer", "Mais recentes", "Más recientes")}</Link> : <span />}
          {more && <Link className="min-h-11 rounded-lg border border-white/15 px-4 py-2 text-sm" href={link(page + 1)}>{L(lang, "Older", "Mais antigas", "Más antiguos")} →</Link>}
        </div>
      </main>
    </div>
  );
}
