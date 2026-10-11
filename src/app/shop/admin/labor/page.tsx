import { getEstimateTotals } from "@/lib/shop/job-estimates-db";
import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import {
  listWorkersWithRates,
  getAllTimeEntries,
  listJobsWithDeposits,
  listArchivedJobs,
  depositValue,
  contractValue,
  entryHours,
  sbSelect,
  ORG_ID,
  type Job,
} from "@/lib/shop/db";
import ShopTopBar from "../../ShopTopBar";
import AdminClient from "../AdminClient";
import JobCostBoard from "./JobCostBoard";
import { loadLaborBoard } from "@/lib/shop/labor-board-db";
import { canViewOwnerFinancials } from "@/lib/shop/shared";
import { t } from "@/lib/shop/i18n";

export const dynamic = "force-dynamic";

export default async function ShopAdminPage() {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  if (!canViewOwnerFinancials(worker)) redirect("/shop");

  const [workers, entries, jobs, depositJobs, archivedJobs, estimateTotals] = await Promise.all([
    listWorkersWithRates(),
    getAllTimeEntries(),
    sbSelect<Job[]>(
      "kiw_shop_jobs",
      `select=id,job_number,customer_name,project_type,archived&org_id=eq.${ORG_ID}&order=job_number.asc`
    ),
    listJobsWithDeposits(),
    listArchivedJobs(),
    getEstimateTotals(),
  ]);

  const workerById = new Map(workers.map((w) => [w.id, w]));
  const jobById = new Map(jobs.map((j) => [j.id, j]));

  // Job cost: every entry (paged), rated at the shift's pay rate when the
  // work happened, against the job's labor budget. Replaces the old rollup,
  // which read only the latest 500 entries and repriced history at today's rate.
  const board = await loadLaborBoard({ withUtilization: true });
  const laborByJob = new Map(board.jobs.map((j) => [j.jobId, j.cost]));

  // Serialize entries with names for the client table
  const entryRows = entries.slice(0, 100).map((e) => ({
    id: e.id,
    worker: workerById.get(e.worker_id)?.name || "?",
    job: jobById.get(e.job_id)
      ? `${jobById.get(e.job_id)!.job_number} — ${jobById.get(e.job_id)!.customer_name}`
      : "?",
    started_at: e.started_at,
    ended_at: e.ended_at,
    hours: entryHours(e),
    start_lat: e.start_lat,
    start_lng: e.start_lng,
    end_lat: e.end_lat,
    end_lng: e.end_lng,
  }));

  // Deposits on file, with labor burned against each so far.
  const deposits = depositJobs.map((j) => ({
    id: j.id,
    jobNumber: j.job_number,
    customer: j.customer_name,
    projectType: j.project_type,
    amount: depositValue(j),
    contractAmount: contractValue(j),
    estimates: estimateTotals.filter(e => e.job_id === j.id).map(e => ({ number: e.estimate_number, amount: Number(e.total_amount), original: e.is_original })),
    note: j.deposit_note,
    phone: j.phone,
    email: j.email,
    address: j.address,
    followUp: j.notes,
    archived: !!j.archived,
    laborCost: laborByJob.get(j.id) ?? 0,
  }));
  const depositTotal = deposits.reduce((s, d) => s + d.amount, 0);
  // Archived jobs drop off the board but the money is still held, so the
  // ledger keeps them — called out separately so the totals reconcile.
  const archivedDepositTotal = deposits
    .filter((d) => d.archived)
    .reduce((s, d) => s + d.amount, 0);

  return (
    <div>
      <ShopTopBar workerName={worker.name} title={t(worker.lang || "en", "admNavJobCosts")} back="/shop/admin" lang={worker.lang || "en"} adminLink />
      <AdminClient
        workers={workers.map((w) => ({
          id: w.id,
          name: w.name,
          role: w.role,
          hourly_rate: w.hourly_rate ?? null,
          address: w.address ?? null,
        }))}
        jobCosts={<JobCostBoard board={board} lang={worker.lang || "en"} />}
        entries={entryRows}
        deposits={deposits}
        depositTotal={depositTotal}
        archivedDepositTotal={archivedDepositTotal}
        archivedJobs={archivedJobs.map((j) => ({
          id: j.id,
          label: `${j.job_number} — ${j.customer_name}`,
        }))}
        lang={worker.lang || "en"}
      />
    </div>
  );
}
