import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { canViewOwnerFinancials } from "@/lib/shop/shared";
import { financeCounts, listFinAccounts, listFinTransactions } from "@/lib/shop/finance-db";
import { FIN_RANGES, rangeBounds, summarize, type FinRange } from "@/lib/shop/finance";
import ShopTopBar from "../../ShopTopBar";
import FinanceNav from "./FinanceNav";
import MonthlyChart from "./MonthlyChart";
import { L, shopToday, shortDate, usd } from "./ui";

export const dynamic = "force-dynamic";

const RANGE_LABEL: Record<FinRange, [string, string, string]> = {
  month: ["This month", "Este mês", "Este mes"],
  lastmonth: ["Last month", "Mês passado", "Mes pasado"],
  "90d": ["Last 90 days", "Últimos 90 dias", "Últimos 90 días"],
  ytd: ["This year", "Este ano", "Este año"],
  "12m": ["Last 12 months", "Últimos 12 meses", "Últimos 12 meses"],
  all: ["All time", "Tudo", "Todo"],
};

type Row = { name: string; amount: number; count: number };

function BarList({ rows, total, color, empty }: { rows: Row[]; total: number; color: string; empty: string }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-neutral-500">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.amount));
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.name}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-neutral-200">{r.name}</span>
            <span className="shrink-0 tabular-nums font-semibold text-neutral-100">{usd(r.amount)}<span className="ml-2 text-xs font-normal text-neutral-500">{total > 0 ? `${Math.round((r.amount / total) * 100)}%` : ""}</span></span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-white/5"><div className="h-1.5 rounded-full" style={{ width: `${Math.max(2, (r.amount / max) * 100)}%`, background: color }} /></div>
        </li>
      ))}
    </ul>
  );
}

function Card({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-neutral-900 p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2"><h2 className="font-semibold text-neutral-100">{title}</h2>{right}</div>
      {children}
    </section>
  );
}

export default async function FinancePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  if (!canViewOwnerFinancials(worker)) redirect("/shop");
  const lang = worker.lang || "en";
  const sp = await searchParams;
  const range: FinRange = FIN_RANGES.includes(sp.range as FinRange) ? (sp.range as FinRange) : "ytd";
  const account = sp.acct === "1752" || sp.acct === "3971" ? sp.acct : null;
  const today = shopToday();
  const { from, to } = rangeBounds(range, today);

  let error: string | null = null;
  let txs: Awaited<ReturnType<typeof listFinTransactions>> = [];
  let accounts: Awaited<ReturnType<typeof listFinAccounts>> = [];
  let reviewAll = 0;
  let uncategorized = 0;
  try {
    [txs, accounts] = await Promise.all([listFinTransactions({ from, to, account }), listFinAccounts()]);
    ({ review: reviewAll, uncategorized } = await financeCounts());
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load finance data";
  }
  const s = summarize(txs);
  const cash = accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0);
  const dataThrough = accounts.map((a) => a.balance_on).filter(Boolean).sort().at(-1) || null;
  const href = (p: Record<string, string | null>) => {
    const q = new URLSearchParams();
    const r = p.range ?? range, a = p.acct === undefined ? account : p.acct;
    if (r !== "ytd") q.set("range", r);
    if (a) q.set("acct", a);
    const qs = q.toString();
    return `/shop/admin/finance${qs ? `?${qs}` : ""}`;
  };
  const chip = (on: boolean) => `flex min-h-10 shrink-0 items-center rounded-full border px-3 text-sm ${on ? "border-amber-400 bg-amber-400/15 text-amber-200" : "border-white/15 text-neutral-400"}`;

  return (
    <div>
      <ShopTopBar workerName={worker.name} title={L(lang, "Company finance", "Finanças da empresa", "Finanzas de la empresa")} back="/shop/admin" lang={lang} adminLink />
      <main className="mx-auto max-w-5xl space-y-5 px-4 pb-28 pt-5">
        <header className="flex flex-wrap items-end justify-between gap-2">
          <h1 className="text-2xl font-semibold">{L(lang, "Company finance", "Finanças da empresa", "Finanzas de la empresa")}</h1>
          {dataThrough && <p className="text-sm text-neutral-400">{L(lang, "Bank data through", "Dados do banco até", "Datos del banco hasta")} {shortDate(dataThrough)}</p>}
        </header>
        <FinanceNav lang={lang} active="dash" reviewCount={reviewAll} categoryCount={uncategorized} />

        {error && <div role="alert" className="rounded-2xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">{error}</div>}

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
          {FIN_RANGES.map((r) => <Link key={r} href={href({ range: r })} className={chip(r === range)}>{L(lang, ...RANGE_LABEL[r])}</Link>)}
          <span className="mx-1 w-px shrink-0 bg-white/10" />
          <Link href={href({ acct: null })} className={chip(!account)}>{L(lang, "Both accounts", "Ambas as contas", "Ambas cuentas")}</Link>
          <Link href={href({ acct: "1752" })} className={chip(account === "1752")}>LLC …1752</Link>
          <Link href={href({ acct: "3971" })} className={chip(account === "3971")}>Inc …3971</Link>
        </div>

        {reviewAll > 0 && (
          <Link href="/shop/admin/finance/review" className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
            <span className="text-amber-200">
              <span className="font-semibold">{reviewAll} {L(lang, "transactions need your decision", "transações aguardam sua decisão", "movimientos esperan tu decisión")}</span>
              {s.review.count > 0 && <span className="block text-sm text-amber-300/80">{usd(s.review.total)} {L(lang, "in this period is not counted yet", "neste período ainda não entra na conta", "en este periodo aún no se cuenta")}</span>}
            </span>
            <span className="shrink-0 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-neutral-950">{L(lang, "Review", "Revisar", "Revisar")} →</span>
          </Link>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Kpi label={L(lang, "Revenue", "Receita", "Ingresos")} value={usd(s.revenue)} tone="text-sky-300" />
          <Kpi label={L(lang, "Business spending", "Gastos da empresa", "Gastos de la empresa")} value={usd(s.expenses)} tone="text-orange-300" />
          <Kpi label={L(lang, "Profit", "Lucro", "Ganancia")} value={usd(s.profit)} tone={s.profit < 0 ? "text-red-300" : "text-emerald-300"} sub={s.margin !== null ? `${Math.round(s.margin * 100)}% ${L(lang, "margin", "de margem", "de margen")}` : undefined} />
          <Kpi label={L(lang, "Cash in the bank", "Dinheiro no banco", "Dinero en el banco")} value={usd(cash)} tone="text-neutral-100" sub={accounts.map((a) => `…${a.account} ${usd(a.balance ?? 0)}`).join(" · ")} />
          <Kpi href="/shop/admin/finance/transactions?owner=daniel" label={L(lang, "Daniel — personal", "Daniel — pessoal", "Daniel — personal")} value={usd(s.draws.daniel)} tone="text-sky-200" />
          <Kpi href="/shop/admin/finance/transactions?owner=reginaldo" label={L(lang, "Reginaldo — personal", "Reginaldo — pessoal", "Reginaldo — personal")} value={usd(s.draws.reginaldo)} tone="text-rose-200" />
        </div>

        <Card title={L(lang, "Month by month", "Mês a mês", "Mes a mes")}>
          <MonthlyChart months={s.months} lang={lang} />
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card title={L(lang, "Where the money goes", "Para onde vai o dinheiro", "A dónde va el dinero")} right={<span className="text-sm text-neutral-400">{usd(s.expenses)}</span>}>
            <BarList rows={s.byCategory} total={s.expenses} color="#d95926" empty={L(lang, "No business spending tagged yet.", "Nenhum gasto marcado ainda.", "Ningún gasto marcado aún.")} />
          </Card>
          <Card title={L(lang, "Top suppliers & payees", "Maiores fornecedores", "Principales proveedores")}>
            <BarList rows={s.topVendors} total={s.expenses} color="#d95926" empty="—" />
          </Card>
          <Card title={L(lang, "Labor & subcontractors — who we pay", "Mão de obra — quem recebe", "Mano de obra — a quién pagamos")}>
            <BarList rows={s.laborPayees} total={s.laborPayees.reduce((a, r) => a + r.amount, 0)} color="#d95926" empty="—" />
          </Card>
          <Card title={L(lang, "Owners — personal spending", "Sócios — gastos pessoais", "Socios — gastos personales")}>
            <div className="space-y-5">
              {(["daniel", "reginaldo"] as const).map((o) => (
                <div key={o}>
                  <p className="mb-2 flex justify-between text-sm font-semibold"><span className={o === "daniel" ? "text-sky-200" : "text-rose-200"}>{o === "daniel" ? "Daniel" : "Reginaldo"}</span><span className="tabular-nums">{usd(s.draws[o])}</span></p>
                  <BarList rows={s.ownerCategories[o]} total={Math.max(s.draws[o], 0)} color="#199e70" empty="—" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

function Kpi({ label, value, tone, sub, href }: { label: string; value: string; tone: string; sub?: string; href?: string }) {
  const body = (
    <>
      <span className={`block text-2xl font-semibold tabular-nums ${tone}`}>{value}</span>
      <span className="mt-1 block text-sm text-neutral-400">{label}{href && " →"}</span>
      {sub && <span className="mt-1 block text-xs text-neutral-500">{sub}</span>}
    </>
  );
  const cls = "block rounded-2xl border border-white/10 bg-neutral-900 p-4";
  return href ? <Link href={href} className={`${cls} hover:border-white/25`}>{body}</Link> : <div className={cls}>{body}</div>;
}
