import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { listJobs, getCutItems, STAGES, type Job } from "@/lib/shop/db";
import ShopTopBar from "./ShopTopBar";

export const dynamic = "force-dynamic";

function stageColor(stage: string) {
  const i = STAGES.indexOf(stage as (typeof STAGES)[number]);
  if (stage === "Done") return "bg-green-600";
  if (i >= STAGES.indexOf("QC")) return "bg-amber-500 text-black";
  if (i >= STAGES.indexOf("Cut")) return "bg-blue-600";
  return "bg-neutral-600";
}

function dueLabel(due: string | null) {
  if (!due) return { text: "No due date", cls: "text-neutral-500" };
  const d = new Date(due + "T00:00:00");
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
  const text = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (days < 0) return { text: `${text} · overdue`, cls: "text-red-400" };
  if (days <= 7) return { text: `${text} · ${days}d`, cls: "text-amber-400" };
  return { text, cls: "text-neutral-400" };
}

export default async function ShopBoard() {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");

  let jobs: Job[] = [];
  let error: string | null = null;
  try {
    jobs = await listJobs();
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load jobs";
  }

  // cut-progress per job
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
      <ShopTopBar workerName={worker.name} title="Active Jobs" />
      <div className="p-4 max-w-5xl mx-auto">
        {error && (
          <div className="text-red-400 bg-red-950/40 border border-red-800 rounded-lg p-4 mb-4 text-sm">
            {error}
          </div>
        )}
        {jobs.length === 0 && !error && (
          <p className="text-neutral-500 text-center py-16">
            No active jobs. Closed deals will appear here.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {jobs.map((j) => {
            const p = progress[j.id] || { done: 0, total: 0 };
            const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
            const due = dueLabel(j.due_date);
            return (
              <Link
                key={j.id}
                href={`/shop/job/${j.id}`}
                className="block bg-neutral-900 border border-neutral-800 rounded-xl p-4 hover:border-amber-600/60 active:scale-[0.99] transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-lg font-semibold truncate">
                      {j.customer_name}
                    </div>
                    <div className="text-xs text-neutral-500 truncate">
                      {j.job_number} · {j.address || "—"}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full text-white ${stageColor(
                      j.current_stage
                    )}`}
                  >
                    {j.current_stage}
                  </span>
                </div>
                {j.finish && (
                  <div className="text-xs text-neutral-400 mt-2">
                    Finish: <span className="text-neutral-200">{j.finish}</span>
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className={due.cls}>Due {due.text}</span>
                  <span className="text-neutral-400">
                    Cut {p.done}/{p.total}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
