import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import {
  listWorkersWithRates,
  getAllTimeEntries,
  listJobsWithDeposits,
  depositValue,
  entryHours,
  sbSelect,
  type Job,
} from "@/lib/shop/db";
import ShopTopBar from "../ShopTopBar";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function ShopAdminPage() {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  if (!worker.is_admin) redirect("/shop");

  const [workers, entries, jobs, depositJobs] = await Promise.all([
    listWorkersWithRates(),
    getAllTimeEntries(),
    sbSelect<Job[]>(
      "kiw_shop_jobs",
      "select=id,job_number,customer_name,project_type,archived&order=job_number.asc"
    ),
    listJobsWithDeposits(),
  ]);

  const workerById = new Map(workers.map((w) => [w.id, w]));
  const jobById = new Map(jobs.map((j) => [j.id, j]));

  // Per-job rollup: hours & cost per worker
  interface JobRow {
    jobId: string;
    label: string;
    totalHours: number;
    totalCost: number;
    missingRate: boolean;
    byWorker: Record<string, { hours: number; cost: number | null }>;
  }
  const rollup = new Map<string, JobRow>();
  for (const e of entries) {
    const j = jobById.get(e.job_id);
    if (!j) continue;
    let row = rollup.get(e.job_id);
    if (!row) {
      row = {
        jobId: e.job_id,
        label: `${j.job_number} — ${j.customer_name}`,
        totalHours: 0,
        totalCost: 0,
        missingRate: false,
        byWorker: {},
      };
      rollup.set(e.job_id, row);
    }
    const w = workerById.get(e.worker_id);
    const name = w?.name || "?";
    const hrs = entryHours(e);
    const rate = w?.hourly_rate ?? null;
    if (!row.byWorker[name]) row.byWorker[name] = { hours: 0, cost: rate === null ? null : 0 };
    row.byWorker[name].hours += hrs;
    row.totalHours += hrs;
    if (rate === null) {
      row.missingRate = true;
      row.byWorker[name].cost = null;
    } else {
      row.byWorker[name].cost = (row.byWorker[name].cost ?? 0) + hrs * Number(rate);
      row.totalCost += hrs * Number(rate);
    }
  }

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
    note: j.deposit_note,
    phone: j.phone,
    email: j.email,
    address: j.address,
    followUp: j.notes,
    archived: !!j.archived,
    laborCost: rollup.get(j.id)?.totalCost ?? 0,
  }));
  const depositTotal = deposits.reduce((s, d) => s + d.amount, 0);
  // Archived jobs drop off the board but the money is still held, so the
  // ledger keeps them — called out separately so the totals reconcile.
  const archivedDepositTotal = deposits
    .filter((d) => d.archived)
    .reduce((s, d) => s + d.amount, 0);

  return (
    <div>
      <ShopTopBar workerName={worker.name} title="Admin — Labor & Costs" back="/shop" />
      <AdminClient
        workers={workers.map((w) => ({
          id: w.id,
          name: w.name,
          role: w.role,
          hourly_rate: w.hourly_rate ?? null,
        }))}
        jobs={[...rollup.values()].sort((a, b) => b.totalHours - a.totalHours)}
        entries={entryRows}
        deposits={deposits}
        depositTotal={depositTotal}
        archivedDepositTotal={archivedDepositTotal}
      />
    </div>
  );
}
