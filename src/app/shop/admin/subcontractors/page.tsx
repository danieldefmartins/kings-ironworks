import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { canViewOwnerFinancials, contractValue, subcontractorPaidValue, subcontractorSplitPct } from "@/lib/shop/shared";
import { listSubcontractorJobs } from "@/lib/shop/db";
import { t } from "@/lib/shop/i18n";
import ShopTopBar from "../../ShopTopBar";
import AddressLink from "../../AddressLink";
import { HardHat } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SubcontractorJobsPage() {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  if (!canViewOwnerFinancials(worker)) redirect("/shop");
  const lang = worker.lang || "en";

  let jobs: Awaited<ReturnType<typeof listSubcontractorJobs>> = [];
  let error: string | null = null;
  try {
    jobs = await listSubcontractorJobs();
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load subcontractor jobs";
  }

  const contractTotal = jobs.reduce((s, j) => s + contractValue(j), 0);
  const paidTotal = jobs.reduce((s, j) => s + subcontractorPaidValue(j), 0);

  return (
    <div>
      <ShopTopBar workerName={worker.name} title={t(lang, "admNavSubcontractors")} back="/shop/admin" lang={lang} adminLink />
      <main className="mx-auto max-w-4xl space-y-6 px-4 pb-28 pt-5">
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <HardHat aria-hidden className="h-6 w-6 text-orange-300" />
            {t(lang, "admNavSubcontractors")}
          </h1>
          <p className="mt-2 text-sm text-neutral-400">{t(lang, "admNavSubcontractorsHint")}</p>
        </header>

        {error && (
          <div role="alert" className="rounded-2xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {!error && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-neutral-900 p-4">
              <span className="block text-2xl font-semibold text-amber-400">
                ${contractTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="mt-1 block text-sm text-neutral-400">{t(lang, "subContract")}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-neutral-900 p-4">
              <span className="block text-2xl font-semibold text-emerald-300">
                ${paidTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="mt-1 block text-sm text-neutral-400">{t(lang, "subPaid")}</span>
            </div>
          </div>
        )}

        {!error && jobs.length === 0 && (
          <p className="py-16 text-center text-neutral-500">{t(lang, "subNoJobs")}</p>
        )}

        {!error && jobs.length > 0 && (
          <div className="space-y-3">
            {jobs.map((j) => {
              const contract = contractValue(j);
              const paid = subcontractorPaidValue(j);
              const splitPct = subcontractorSplitPct(j);
              return (
                <section key={j.id} className="rounded-2xl border border-white/10 bg-neutral-900/60 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-lg font-semibold">
                      {j.job_number} — {j.customer_name}
                    </h2>
                    <span className="text-xl font-semibold text-amber-400">
                      ${contract.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  {j.address && (
                    <div className="mt-1">
                      <AddressLink address={j.address} lang={lang} className="text-sm text-neutral-400" />
                    </div>
                  )}
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                    <div>
                      <span className="block text-neutral-500">{t(lang, "subSub")}</span>
                      <span className="font-semibold">{j.subcontractor_name || "—"}</span>
                    </div>
                    <div>
                      <span className="block text-neutral-500">{t(lang, "subSplit")}</span>
                      <span className="font-semibold">{splitPct ? `${splitPct}%` : "—"}</span>
                    </div>
                    <div>
                      <span className="block text-neutral-500">
                        {paid > 0 ? t(lang, "subPaid") : t(lang, "subNotPaid")}
                      </span>
                      <span className={`font-semibold ${paid > 0 ? "text-emerald-300" : "text-neutral-400"}`}>
                        ${paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {j.subcontractor_paid_on && (
                      <div>
                        <span className="block text-neutral-500">{t(lang, "subPaidOn")}</span>
                        <span className="font-semibold">{j.subcontractor_paid_on}</span>
                      </div>
                    )}
                  </div>
                  {j.subcontractor_notes && (
                    <p className="mt-3 border-t border-white/10 pt-3 text-sm text-neutral-400">
                      {j.subcontractor_notes}
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
