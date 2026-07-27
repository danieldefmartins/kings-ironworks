import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionWorker, randomSeed } from "@/lib/shop/session";
import {
  listJobs,
  getCutItems,
  getRunningEntries,
  depositValue,
  STAGES,
  type Job,
} from "@/lib/shop/db";
import { t, stageLabel } from "@/lib/shop/i18n";
import ShopTopBar from "./ShopTopBar";
import MotivationBanner from "./MotivationBanner";

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
  // Deposits are customer money — same gate as the approved-estimate photos.
  const canSeeMoney = !!worker.can_see_prices || !!worker.is_admin;

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

  const withDeposit = jobs.filter((j) => depositValue(j) > 0);
  const depositTotal = withDeposit.reduce((s, j) => s + depositValue(j), 0);
  const depositCount = withDeposit.length;

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
      <ShopTopBar workerName={worker.name} title={t(lang, "activeJobs")} lang={lang} adminLink={!!worker.is_admin} />
      <div className="p-4 max-w-5xl mx-auto">
        <div className="mb-4">
          <MotivationBanner lang={lang} seed={randomSeed()} />
        </div>
        {canSeeMoney && depositTotal > 0 && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-800 bg-emerald-950/40 px-4 py-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-500">
                {t(lang, "depositsHeld")}
              </div>
              <div className="text-xs text-neutral-400">
                {depositCount} {t(lang, "depositJobs")}
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-300">
              {money(depositTotal)}
            </div>
          </div>
        )}
        {error && (
          <div className="text-red-400 bg-red-950/40 border border-red-800 rounded-lg p-4 mb-4 text-sm">
            {error}
          </div>
        )}
        {jobs.length === 0 && !error && (
          <p className="text-neutral-500 text-center py-16">{t(lang, "noJobs")}</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
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
                {canSeeMoney && depositValue(j) > 0 && (
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-700 text-emerald-300">
                      {t(lang, "depositPaid")} {money(depositValue(j))}
                    </span>
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
        </div>
      </div>
    </div>
  );
}
