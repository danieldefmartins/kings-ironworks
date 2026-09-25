import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { canViewOwnerFinancials } from "@/lib/shop/shared";
import { financeCounts, listFinAccounts } from "@/lib/shop/finance-db";
import ShopTopBar from "../../../ShopTopBar";
import FinanceNav from "../FinanceNav";
import ImportForm from "./ImportForm";
import { L, shortDate, usd } from "../ui";

export const dynamic = "force-dynamic";

export default async function FinanceImportPage() {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  if (!canViewOwnerFinancials(worker)) redirect("/shop");
  const lang = worker.lang || "en";
  let counts = { review: 0, uncategorized: 0 };
  let accounts: Awaited<ReturnType<typeof listFinAccounts>> = [];
  try { [counts, accounts] = await Promise.all([financeCounts(), listFinAccounts()]); } catch { /* shown as empty */ }
  return (
    <div>
      <ShopTopBar workerName={worker.name} title={L(lang, "Import bank file", "Importar extrato", "Importar extracto")} back="/shop/admin/finance" lang={lang} adminLink />
      <main className="mx-auto max-w-3xl space-y-5 px-4 pb-28 pt-5">
        <h1 className="text-2xl font-semibold">{L(lang, "Import from Chase", "Importar do Chase", "Importar de Chase")}</h1>
        <FinanceNav lang={lang} active="import" reviewCount={counts.review} categoryCount={counts.uncategorized} />
        {accounts.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2">
            {accounts.map((a) => (
              <li key={a.account} className="rounded-2xl border border-white/10 bg-neutral-900 p-4 text-sm">
                <p className="font-semibold">{a.name} …{a.account}</p>
                <p className="text-neutral-400">{a.balance_on ? `${L(lang, "Up to", "Até", "Hasta")} ${shortDate(a.balance_on)} · ${usd(a.balance ?? 0, true)}` : L(lang, "Nothing imported yet", "Nada importado ainda", "Nada importado aún")}</p>
              </li>
            ))}
          </ul>
        )}
        <ImportForm lang={lang} />
      </main>
    </div>
  );
}
