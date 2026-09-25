import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { canViewOwnerFinancials } from "@/lib/shop/shared";
import { financeCounts, listReviewQueue } from "@/lib/shop/finance-db";
import ShopTopBar from "../../../ShopTopBar";
import FinanceNav from "../FinanceNav";
import ReviewQueue, { type ReviewItem } from "./ReviewQueue";
import { L } from "../ui";

export const dynamic = "force-dynamic";

export default async function FinanceReviewPage() {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  if (!canViewOwnerFinancials(worker)) redirect("/shop");
  const lang = worker.lang || "en";
  let items: ReviewItem[] = [];
  let error: string | null = null;
  let uncategorized = 0;
  try {
    ({ uncategorized } = await financeCounts());
    items = (await listReviewQueue()).map((t) => ({
      id: t.id!, account: t.account, posted_on: t.posted_on, description: t.description, amount: t.amount,
      category: t.category, vendor: t.vendor, grp: t.grp, owner: t.owner,
    }));
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load the review queue";
  }
  return (
    <div>
      <ShopTopBar workerName={worker.name} title={L(lang, "To review", "Revisar", "Revisar")} back="/shop/admin/finance" lang={lang} adminLink />
      <main className="mx-auto max-w-3xl space-y-5 px-4 pb-28 pt-5">
        <h1 className="text-2xl font-semibold">{L(lang, "Who does this belong to?", "De quem é esta despesa?", "¿De quién es este gasto?")}</h1>
        <FinanceNav lang={lang} active="review" reviewCount={items.length} categoryCount={uncategorized} />
        {error ? <div role="alert" className="rounded-2xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">{error}</div> : <ReviewQueue items={items} lang={lang} />}
      </main>
    </div>
  );
}
