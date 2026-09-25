import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { canViewOwnerFinancials } from "@/lib/shop/shared";
import { financeCounts, listNeedsCategory } from "@/lib/shop/finance-db";
import ShopTopBar from "../../../ShopTopBar";
import FinanceNav from "../FinanceNav";
import CategorizeQueue, { type CatItem } from "./CategorizeQueue";
import { L } from "../ui";

export const dynamic = "force-dynamic";

export default async function FinanceCategorizePage() {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  if (!canViewOwnerFinancials(worker)) redirect("/shop");
  const lang = worker.lang || "en";
  let items: CatItem[] = [];
  let counts = { review: 0, uncategorized: 0 };
  let error: string | null = null;
  try {
    const [rows, c] = await Promise.all([listNeedsCategory(), financeCounts()]);
    counts = c;
    items = rows.map((t) => ({ id: t.id!, account: t.account, posted_on: t.posted_on, description: t.description, amount: t.amount, vendor: t.vendor }));
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load";
  }
  return (
    <div>
      <ShopTopBar workerName={worker.name} title={L(lang, "Add category", "Definir categoria", "Asignar categoría")} back="/shop/admin/finance" lang={lang} adminLink />
      <main className="mx-auto max-w-3xl space-y-5 px-4 pb-28 pt-5">
        <h1 className="text-2xl font-semibold">{L(lang, "Business expenses without a category", "Despesas da empresa sem categoria", "Gastos de la empresa sin categoría")}</h1>
        <FinanceNav lang={lang} active="cat" reviewCount={counts.review} categoryCount={items.length} />
        {error ? <div role="alert" className="rounded-2xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">{error}</div> : <CategorizeQueue items={items} lang={lang} />}
      </main>
    </div>
  );
}
