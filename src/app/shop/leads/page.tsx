import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { listJobs } from "@/lib/shop/db";
import { mt } from "@/lib/shop/measure-i18n";
import ShopTopBar from "../ShopTopBar";
import NewFieldMeasure from "../NewFieldMeasure";

export const dynamic = "force-dynamic";

// Sales measurements: projects measured before the deal closes.
export default async function LeadsPage() {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  const lang = worker.lang || "en";

  const jobs = await listJobs();
  const leads = jobs.filter((j) => j.current_stage === "Lead");

  return (
    <div>
      <ShopTopBar
        workerName={worker.name}
        title={mt(lang, "tileLeads")}
        back="/shop"
        lang={lang}
        adminLink={!!worker.is_admin}
      />
      <div className="p-4 max-w-4xl mx-auto pb-24">
        <NewFieldMeasure lang={lang} />
        {leads.length === 0 && (
          <p className="text-neutral-500 text-center py-10 text-sm">
            {mt(lang, "tileLeadsHint")}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {leads.map((j) => (
            <Link
              key={j.id}
              href={`/shop/job/${j.id}/measure`}
              className="block bg-neutral-900 border border-neutral-800 rounded-xl p-4 hover:border-amber-600/60 active:scale-[0.99] transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {j.project_type && (
                    <div className="text-[11px] font-bold uppercase tracking-wide text-amber-500 truncate">
                      {j.project_type}
                    </div>
                  )}
                  <div className="text-lg font-semibold truncate">{j.customer_name}</div>
                  <div className="text-xs text-neutral-500 truncate">{j.address || "—"}</div>
                  {j.phone && (
                    <div className="text-xs text-neutral-500 truncate">☎ {j.phone}</div>
                  )}
                </div>
                <span className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500 text-amber-300">
                  📐 {mt(lang, "leadChip")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
