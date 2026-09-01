import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionWorker, randomSeed } from "@/lib/shop/session";
import {
  listJobs,
  getCutItems,
  getRunningEntries,
  depositValue,
  contractValue,
  STAGES,
  type Job,
} from "@/lib/shop/db";
import { t, stageLabel } from "@/lib/shop/i18n";
import ShopTopBar from "../ShopTopBar";
import MotivationBanner from "../MotivationBanner";
import { canViewOwnerFinancials } from "@/lib/shop/shared";
import JobsList from "./JobsList";

export const dynamic = "force-dynamic";

function stageColor(stage: string) {
  const i = STAGES.indexOf(stage as (typeof STAGES)[number]);
  if (stage === "Done") return "bg-green-600";
  if (i >= STAGES.indexOf("QC")) return "bg-amber-500 text-black";
  if (i >= STAGES.indexOf("Cut")) return "bg-blue-600";
  return "bg-neutral-600";
}

function money(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function dueLabel(due: string | null, lang: string) {
  if (!due) return { text: t(lang, "noDue"), cls: "text-neutral-500" };
  const d = new Date(due + "T00:00:00");
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
  const text = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (days < 0) return { text: `${text} · ${t(lang, "overdue")}`, cls: "text-red-400" };
  if (days <= 7) return { text: `${text} · ${days}d`, cls: "text-amber-400" };
  return { text, cls: "text-neutral-400" };
}

export default async function ShopBoard() {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  const lang = worker.lang || "en";
  // Money is admin-only (Daniel + Kayky).
  const canSeeMoney = canViewOwnerFinancials(worker);

  let jobs: Job[] = [];
  let error: string | null = null;
  const workingCount: Record<string, number> = {};
  try {
    jobs = await listJobs();
    const running = await getRunningEntries();
    for (const r of running) {
      workingCount[r.job_id] = (workingCount[r.job_id] || 0) + 1;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load jobs";
  }

  // Sales leads live on /shop/leads — the board shows fabrication work only.
  jobs = jobs.filter((j) => j.current_stage !== "Lead");

  const pendingProjects = jobs.filter((j) => j.current_stage !== "Done");
  const projectTotal = pendingProjects.reduce((s, j) => s + Math.max(0, contractValue(j)), 0);
  const receivedTotal = pendingProjects.reduce((s, j) => s + Math.max(0, depositValue(j)), 0);
  const balanceTotal = Math.max(0, projectTotal - receivedTotal);

  const progress: Record<string, { done: number; total: number }> = {};
  await Promise.all(
    jobs.map(async (j) => {
      try {
        const items = await getCutItems(j.id);
        progress[j.id] = {
          total: items.length,
          done: items.filter((i) => i.status !== "pending").length,
        };
      } catch {
        progress[j.id] = { done: 0, total: 0 };
      }
    })
  );

  return (
    <div>
      <ShopTopBar workerName={worker.name} title={t(lang, "activeJobs")} back="/shop" lang={lang} adminLink={!!worker.is_admin} />
      <div className="p-4 max-w-5xl mx-auto">
        <div className="mb-4">
          <MotivationBanner lang={lang} seed={randomSeed()} />
        </div>
        {canSeeMoney && (projectTotal > 0 || receivedTotal > 0) && (
          <section className="mb-4 rounded-2xl border border-emerald-800/70 bg-emerald-950/30 p-4">
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-400">{t(lang, "projectMoney")}</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-neutral-950/40 p-3"><div className="text-lg font-bold text-neutral-100">{money(projectTotal)}</div><div className="mt-1 text-[11px] leading-tight text-neutral-500">{t(lang, "activeProjectTotal")}</div></div>
              <div className="rounded-xl bg-neutral-950/40 p-3"><div className="text-lg font-bold text-emerald-300">{money(receivedTotal)}</div><div className="mt-1 text-[11px] leading-tight text-neutral-500">{t(lang, "depositReceived")}</div></div>
              <div className="rounded-xl bg-amber-500/10 p-3"><div className="text-lg font-bold text-amber-300">{money(balanceTotal)}</div><div className="mt-1 text-[11px] leading-tight text-neutral-500">{t(lang, "balanceToReceive")}</div></div>
            </div>
            <div className="mt-3 text-xs text-neutral-500">{pendingProjects.length} {t(lang, "pendingProjects")}</div>
          </section>
        )}
        {error && (
          <div className="text-red-400 bg-red-950/40 border border-red-800 rounded-lg p-4 mb-4 text-sm">
            {error}
          </div>
        )}


        {jobs.length === 0 && !error && (
          <p className="text-neutral-500 text-center py-16">{t(lang, "noJobs")}</p>
        )}
        <JobsList jobs={jobs} lang={lang} canSeeMoney={canSeeMoney} workingCount={workingCount} progress={progress} />
        {/* legacy card rendering removed; JobsList owns filtering and sorting */}
        {false && <div className="grid gap-3 sm:grid-cols-2">
          {jobs.map((j) => {
            const p = progress[j.id] || { done: 0, total: 0 };
            const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
            const due = dueLabel(j.due_date, lang);
            return (
              <Link
                key={j.id}
                href={`/shop/job/${j.id}`}
                className="block bg-neutral-900 border border-neutral-800 rounded-xl p-4 hover:border-amber-600/60 active:scale-[0.99] transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {j.project_type && (
                      <div className="text-[11px] font-bold uppercase tracking-wide text-amber-500 truncate">
                        {j.project_type}
                      </div>
                    )}
                    <div className="text-lg font-semibold truncate">
                      {j.customer_name}
                    </div>
                    <div className="text-xs text-neutral-500 truncate">
                      {j.address || "—"}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full text-white ${stageColor(
                      j.current_stage
                    )}`}
                  >
                    {stageLabel(lang, j.current_stage)}
                  </span>
                </div>
                {workingCount[j.id] > 0 && (
                  <div className="text-xs text-green-400 mt-2 font-semibold">
                    ● {workingCount[j.id]} {t(lang, "working")}
                  </div>
                )}
                {canSeeMoney && (contractValue(j) > 0 || depositValue(j) > 0) && (
                  <div className="mt-2 flex flex-wrap items-baseline gap-2">
                    {contractValue(j) > 0 && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-700 text-amber-300">
                        {t(lang, "contractPrice")} {money(contractValue(j))}
                      </span>
                    )}
                    {depositValue(j) > 0 && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-700 text-emerald-300">
                        {t(lang, "depositPaid")} {money(depositValue(j))}
                      </span>
                    )}
                    {j.deposit_note && (
                      <span className="text-[11px] text-neutral-500 truncate">
                        {j.deposit_note}
                      </span>
                    )}
                  </div>
                )}
                {j.finish && (
                  <div className="text-xs text-neutral-400 mt-2">
                    {t(lang, "finish")}:{" "}
                    <span className="text-neutral-200">{j.finish}</span>
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className={due.cls}>
                    {t(lang, "due")} {due.text}
                  </span>
                  <span className="text-neutral-400">
                    {t(lang, "cutProgress")} {p.done}/{p.total}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${pct}%` }} />
                </div>
              </Link>
            );
          })}
        </div>}
      </div>
    </div>
  );
}
