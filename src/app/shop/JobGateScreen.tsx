// Server half of the job gate: the full screen a crew member sees in place of
// a job's details (job page, measure list, sheet, revision) until he starts
// that job's time. Only name, type and address cross to the client.
import type { Job, Worker } from "@/lib/shop/shared";
import { canViewOwnerFinancials } from "@/lib/shop/shared";
import ShopTopBar from "./ShopTopBar";
import JobGate from "./JobGate";
import type { LoadedGate } from "@/lib/shop/job-timer-db";

export default function JobGateScreen({
  worker, job, gate,
}: {
  worker: Pick<Worker, "name" | "lang" | "is_admin" | "can_see_prices">;
  job: Pick<Job, "id" | "customer_name" | "project_type" | "job_number" | "address">;
  gate: LoadedGate;
}) {
  const lang = worker.lang || "en";
  return (
    <div>
      <ShopTopBar workerName={worker.name} title={job.customer_name} back="/shop/jobs" lang={lang} adminLink={canViewOwnerFinancials(worker)} />
      <JobGate
        job={{ id: job.id, name: job.customer_name, subtitle: job.project_type || job.job_number || null, address: job.address }}
        lang={lang}
        runningElsewhere={gate.runningElsewhere}
      />
    </div>
  );
}
