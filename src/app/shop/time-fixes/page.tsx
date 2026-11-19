import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { canViewOwnerFinancials } from "@/lib/shop/shared";
import { canApproveTime, isTimeApprover, tf } from "@/lib/shop/time-fix";
import { listPendingFixes } from "@/lib/shop/time-fix-db";
import ShopTopBar from "../ShopTopBar";
import TimeFixesClient from "./TimeFixesClient";

export const dynamic = "force-dynamic";

// The simple list that replaces the old "correction requests" block: one card
// per request, Approve · Change · Refuse; history read-only behind a button.
export default async function TimeFixesPage() {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  if (!canApproveTime(worker)) redirect("/shop");
  const lang = worker.lang || "en";
  const owner = canViewOwnerFinancials(worker);
  const pending = await listPendingFixes(worker.id).catch(() => []);
  return <div>
    <ShopTopBar workerName={worker.name} title={tf(lang, "fixesTitle")} back={owner ? "/shop/admin/payroll" : "/shop/more"} lang={lang} adminLink={owner} />
    <main className="mx-auto max-w-2xl px-4 pb-28 pt-5">
      <header className="mb-4">
        <h1 className="text-3xl font-semibold tracking-tight">{tf(lang, "fixesTitle")}</h1>
        <p className="mt-1 text-[15px] text-neutral-400">{tf(lang, "fixesHint")}</p>
        {isTimeApprover(worker) && <p className="mt-1 text-sm text-neutral-500">{tf(lang, "ownTimeNote")}</p>}
      </header>
      <TimeFixesClient initial={pending} lang={lang} />
    </main>
  </div>;
}
