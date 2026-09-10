import ProjectMoney from "./ProjectMoney";
import { loadProjectMoney } from "@/lib/shop/project-money-db";
import { redirect } from "next/navigation";
import { getSessionWorker, randomSeed } from "@/lib/shop/session";
import {
  listJobs,
  listWorkers,
  getCutItems,
  listAllJobPieces,
  getRunningEntries,
  type Job,
} from "@/lib/shop/db";
import { t } from "@/lib/shop/i18n";
import ShopTopBar from "../ShopTopBar";
import MotivationBanner from "../MotivationBanner";
import { canViewOwnerFinancials, pieceProgress, redactJobMoney } from "@/lib/shop/shared";
import JobsList from "./JobsList";
import JobsBoardMap from "./JobsBoardMap";

export const dynamic = "force-dynamic";

export default async function ShopBoard() {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  const lang = worker.lang || "en";
  // Money and the fabrication queue are owner-level (is_admin + can_see_prices).
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

  let financialJobs: Awaited<ReturnType<typeof loadProjectMoney>> | null = null;
  if (canSeeMoney) {
    try { financialJobs = await loadProjectMoney(); } catch { /* Explicit error instead of partial totals. */ }
  }

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

  // Piece completion per job, in one request rather than one per job.
  const piecePct: Record<string, { pct: number; installed: number; total: number }> = {};
  try {
    const allPieces = await listAllJobPieces();
    const byJob = new Map<string, typeof allPieces>();
    for (const pc of allPieces) {
      const list = byJob.get(pc.job_id) || [];
      list.push(pc);
      byJob.set(pc.job_id, list);
    }
    for (const [jobId, list] of byJob) {
      const { pct, installed, total } = pieceProgress(list);
      piecePct[jobId] = { pct, installed, total };
    }
  } catch {
    // A board that cannot count pieces is still a usable board.
  }

  // The crew list is only needed by the owner controls, and it is a name-and-id
  // list either way — no rates, no PINs.
  const crew = canSeeMoney
    ? (await listWorkers()).map((w) => ({ id: w.id, name: w.name }))
    : [];

  // Hiding money in the UI is not hiding it: an un-redacted job row would still
  // be readable in the RSC payload. Strip the fields before they cross over.
  const clientJobs = jobs.map((j) => redactJobMoney(j, canSeeMoney));

  // Pins for the board map. Only jobs whose cached geocode still matches the
  // address they carry — an address edited after geocoding would otherwise put
  // a pin on the previous house, which is worse than no pin at all.
  const mapJobs = jobs
    .filter((j) => j.lat != null && j.lng != null && j.address && j.geocoded_address === j.address)
    .map((j) => ({
      id: j.id,
      jobNumber: j.job_number,
      customer: j.customer_name,
      address: j.address as string,
      stage: j.current_stage,
      lat: j.lat as number,
      lng: j.lng as number,
      working: (workingCount[j.id] || 0) > 0,
    }));

  return (
    <div>
      <ShopTopBar workerName={worker.name} title={t(lang, "activeJobs")} back="/shop" lang={lang} adminLink={canSeeMoney} />
      <div className="mx-auto w-full min-w-0 max-w-5xl overflow-x-hidden p-4">
        <div className="mb-4">
          <MotivationBanner lang={lang} seed={randomSeed()} />
        </div>
        {canSeeMoney && <ProjectMoney jobs={financialJobs} lang={lang} />}
        {error && (
          <div className="text-red-400 bg-red-950/40 border border-red-800 rounded-lg p-4 mb-4 text-sm">
            {error}
          </div>
        )}
        {jobs.length === 0 && !error && (
          <p className="text-neutral-500 text-center py-16">{t(lang, "noJobs")}</p>
        )}
        {mapJobs.length > 0 && (
          <JobsBoardMap jobs={mapJobs} lang={lang} total={jobs.length} />
        )}
        <JobsList
          jobs={clientJobs}
          lang={lang}
          canSeeMoney={canSeeMoney}
          canManageQueue={canSeeMoney}
          crew={crew}
          workingCount={workingCount}
          piecePct={piecePct}
          progress={progress}
        />
      </div>
    </div>
  );
}
