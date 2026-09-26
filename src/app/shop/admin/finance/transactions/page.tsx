import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { canViewOwnerFinancials } from "@/lib/shop/shared";
import { financeCounts, searchFinTransactions, totalsFinTransactions, type FinFilter } from "@/lib/shop/finance-db";
import ShopTopBar from "../../../ShopTopBar";
import FinanceNav from "../FinanceNav";
import TxList, { type TxItem } from "./TxList";
import CashEntryForm from "./CashEntryForm";
import { GROUP_LABEL, L, shopToday, shortDate, usd } from "../ui";

export const dynamic = "force-dynamic";
const PER_PAGE = 100;

const OWNER_CHIPS: { id: string; label: string; tone: string }[] = [
  { id: "", label: "All", tone: "text-neutral-200" },
  { id: "kiw", label: "KIW", tone: "text-emerald-300" },
  { id: "daniel", label: "Daniel", tone: "text-sky-300" },
  { id: "reginaldo", label: "Kayky", tone: "text-rose-300" },
];

export default async function FinanceTransactionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  if (!canViewOwnerFinancials(worker)) redirect("/shop");
  const lang = worker.lang || "en";
  const sp = await searchParams;
  const page = Math.max(Number(sp.page) || 1, 1);
  const view = sp.view === "cat" ? "cat" : "list";
  const filters: FinFilter = {
    q: sp.q || "", grp: sp.grp || "", owner: sp.owner || "", account: sp.acct || "", month: sp.month || "",
    from: sp.from || "", to: sp.to || "", category: sp.category || "",
  };

  let items: TxItem[] = [];
  let counts = { review: 0, uncategorized: 0 };
  let totals = { count: 0, total: 0, byCategory: [] as { name: string; count: number; total: number }[] };
  let error: string | null = null;
  try {
    const [rows, c, t] = await Promise.all([
      view === "list" ? searchFinTransactions({ ...filters, limit: PER_PAGE + 1, offset: (page - 1) * PER_PAGE }) : Promise.resolve([]),
      financeCounts(),
      totalsFinTransactions(filters),
    ]);
    counts = c; totals = t;
    items = rows.map((r) => ({ id: r.id!, account: r.account, posted_on: r.posted_on, description: r.description, amount: r.amount, category: r.category, vendor: r.vendor, grp: r.grp, owner: r.owner, tag_source: r.tag_source }));
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load transactions";
  }
  const more = items.length > PER_PAGE;
  items = items.slice(0, PER_PAGE);

  // Links keep every current filter except the ones being changed.
  const href = (change: Record<string, string | null>) => {
    const base: Record<string, string> = {
      q: filters.q || "", grp: filters.grp || "", owner: filters.owner || "", acct: filters.account || "", month: filters.month || "",
      from: filters.from || "", to: filters.to || "", category: filters.category || "", view,
    };
    const merged = { ...base, ...Object.fromEntries(Object.entries(change).map(([k, v]) => [k, v ?? ""])) };
    const q = new URLSearchParams(Object.entries(merged).filter(([k, v]) => v && !(k === "view" && v === "list")) as [string, string][]);
    return `/shop/admin/finance/transactions${q.toString() ? `?${q.toString()}` : ""}`;
  };
  const chip = (on: boolean) => `flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-sm ${on ? "border-amber-400 bg-amber-400/15 text-amber-200" : "border-white/15 text-neutral-400"}`;
  const input = "min-h-11 rounded-lg border border-white/20 bg-neutral-950 px-3 text-sm";
  const spend = totals.total < 0;
  const maxCat = Math.max(1, ...totals.byCategory.map((c) => Math.abs(c.total)));
  const who = OWNER_CHIPS.find((o) => o.id === filters.owner);
  const period = filters.from || filters.to ? `${filters.from ? shortDate(filters.from) : "…"} – ${filters.to ? shortDate(filters.to) : "…"}` : filters.month || "";

  return (
    <div>
      <ShopTopBar workerName={worker.name} title={L(lang, "Transactions", "Transações", "Movimientos")} back="/shop/admin/finance" lang={lang} adminLink />
      <main className="mx-auto max-w-4xl space-y-5 px-4 pb-28 pt-5">
        <h1 className="text-2xl font-semibold">
          {filters.owner && who ? `${who.label} — ` : ""}{filters.category || L(lang, "All bank transactions", "Todas as transações", "Todos los movimientos")}
        </h1>
        <FinanceNav lang={lang} active="tx" reviewCount={counts.review} categoryCount={counts.uncategorized} />

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
          {OWNER_CHIPS.map((o) => (
            <Link key={o.id || "all"} href={href({ owner: o.id, category: null, page: null })} className={chip((filters.owner || "") === o.id)}>
              <span className={o.tone}>{o.label}</span>
            </Link>
          ))}
          <span className="mx-1 w-px shrink-0 bg-white/10" />
          <Link href={href({ view: "list", page: null })} className={chip(view === "list")}>{L(lang, "List", "Lista", "Lista")}</Link>
          <Link href={href({ view: "cat", page: null })} className={chip(view === "cat")}>{L(lang, "By category", "Por categoria", "Por categoría")}</Link>
        </div>

        {(period || filters.category || filters.q || filters.grp) && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-400">
            {period && <span className="rounded-full border border-white/15 px-3 py-1">{period}</span>}
            {filters.category && <span className="rounded-full border border-white/15 px-3 py-1">{filters.category}</span>}
            {filters.grp && GROUP_LABEL[filters.grp] && <span className="rounded-full border border-white/15 px-3 py-1">{L(lang, ...GROUP_LABEL[filters.grp])}</span>}
            {filters.q && <span className="rounded-full border border-white/15 px-3 py-1">“{filters.q}”</span>}
            <Link href={href({ from: null, to: null, month: null, category: null, q: null, grp: null, page: null })} className="text-amber-300 underline">{L(lang, "Clear filters", "Limpar filtros", "Quitar filtros")}</Link>
          </div>
        )}

        {!error && (
          <section className="flex flex-wrap items-baseline justify-between gap-2 rounded-2xl border border-white/10 bg-neutral-900 p-4" aria-label="Total">
            <span className="text-sm text-neutral-400">{totals.count.toLocaleString("en-US")} {L(lang, "transactions", "transações", "movimientos")}</span>
            <span className={`text-2xl font-semibold tabular-nums ${spend ? "text-orange-300" : "text-emerald-300"}`}>
              {spend ? `${usd(-totals.total, true)} ${L(lang, "spent", "gastos", "gastado")}` : `${usd(totals.total, true)} ${L(lang, "in", "entrada", "entrada")}`}
            </span>
          </section>
        )}

        {view === "list" && <CashEntryForm lang={lang} today={shopToday()} />}
        {view === "list" && (
          <form className="grid gap-2 sm:grid-cols-6" method="get">
            {filters.owner && <input type="hidden" name="owner" value={filters.owner} />}
            {filters.from && <input type="hidden" name="from" value={filters.from} />}
            {filters.to && <input type="hidden" name="to" value={filters.to} />}
            {filters.category && <input type="hidden" name="category" value={filters.category} />}
            <input name="q" defaultValue={filters.q} placeholder={L(lang, "Search description…", "Buscar descrição…", "Buscar descripción…")} className={`${input} sm:col-span-3`} />
            <select name="grp" defaultValue={filters.grp} className={input}>
              <option value="">{L(lang, "Any type", "Qualquer tipo", "Cualquier tipo")}</option>
              {Object.entries(GROUP_LABEL).map(([k, v]) => <option key={k} value={k}>{L(lang, ...v)}</option>)}
            </select>
            <input name="month" type="month" defaultValue={filters.month} className={input} />
            <button className="min-h-11 rounded-lg bg-amber-400 px-4 text-sm font-bold text-neutral-950">{L(lang, "Filter", "Filtrar", "Filtrar")}</button>
          </form>
        )}

        {error && <div role="alert" className="rounded-2xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">{error}</div>}

        {!error && view === "cat" && (
          totals.byCategory.length === 0
            ? <p className="py-12 text-center text-neutral-500">{L(lang, "No transactions match.", "Nenhuma transação encontrada.", "Ningún movimiento coincide.")}</p>
            : <ul className="space-y-2 rounded-2xl border border-white/10 bg-neutral-900 p-4">
                {totals.byCategory.map((c) => (
                  <li key={c.name}>
                    <Link href={href({ view: "list", category: c.name, page: null })} className="block rounded-lg p-2 hover:bg-white/5">
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate text-neutral-100">{c.name} <span className="text-xs text-neutral-500">· {c.count}</span></span>
                        <span className="shrink-0 font-semibold tabular-nums">{usd(Math.abs(c.total), true)}
                          <span className="ml-2 text-xs font-normal text-neutral-500">{totals.total !== 0 ? `${Math.round((Math.abs(c.total) / Math.abs(totals.total)) * 100)}%` : ""}</span>
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-white/5"><div className="h-1.5 rounded-full bg-[#d95926]" style={{ width: `${Math.max(2, (Math.abs(c.total) / maxCat) * 100)}%` }} /></div>
                    </Link>
                  </li>
                ))}
              </ul>
        )}

        {!error && view === "list" && <TxList items={items} lang={lang} />}
        {view === "list" && (
          <div className="flex justify-between">
            {page > 1 ? <Link className="min-h-11 rounded-lg border border-white/15 px-4 py-2 text-sm" href={href({ page: String(page - 1) })}>← {L(lang, "Newer", "Mais recentes", "Más recientes")}</Link> : <span />}
            {more && <Link className="min-h-11 rounded-lg border border-white/15 px-4 py-2 text-sm" href={href({ page: String(page + 1) })}>{L(lang, "Older", "Mais antigas", "Más antiguos")} →</Link>}
          </div>
        )}
      </main>
    </div>
  );
}
