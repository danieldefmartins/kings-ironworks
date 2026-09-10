import { getJobMoneyLedger } from "@/lib/shop/money-ledger-db";
import JobMoneyManager from "./JobMoneyManager";
import { getJobEstimates } from "@/lib/shop/job-estimates-db";
import JobEstimateDetails from "./JobEstimateDetails";
import { redirect, notFound } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import {
  getJob,
  getCutItems,
  listJobPieces,
  getMaterials,
  getQc,
  getPhotos,
  listWorkers,
  signPhotoUrl,
  getJobTimeEntries,
  entryHours,
  type Photo,
  listCatalog,
} from "@/lib/shop/db";
import JobDocuments from "./JobDocuments";
import ShopTopBar from "../../ShopTopBar";
import TravelerClient from "./TravelerClient";
import PiecesPanel from "./PiecesPanel";
import TimeClock from "./TimeClock";
import TravelerV2 from "./TravelerV2";
import { canViewOwnerFinancials, redactJobMoney, partitionJobAttachments } from "@/lib/shop/shared";

export const dynamic = "force-dynamic";

export default async function JobTravelerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ ui?: string }>;
}) {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  // Money is owner-only (is_admin + can_see_prices on the worker row).
  const canSeePrices = canViewOwnerFinancials(worker);
  const lang = worker.lang || "en";

  const { id } = await params;
  // Simplified traveler is the default. ?ui=legacy is a temporary rollback.
  const v2 = ((await searchParams)?.ui || "") !== "legacy";
  const catalog = v2 ? await listCatalog() : [];
  const rawJob = await getJob(id);
  if (!rawJob) notFound();
  // Strip the money fields server-side rather than only hiding them: an
  // un-redacted row would still be readable in this page's RSC payload.
  const job = redactJobMoney(rawJob, canSeePrices);

  const [cut, materials, qc, rawPhotos, workers, timeEntries, pieces] =
    await Promise.all([
      getCutItems(id),
      getMaterials(id),
      getQc(id),
      getPhotos(id),
      listWorkers(),
      getJobTimeEntries(id),
      listJobPieces(id),
    ]);

  let estimates: Awaited<ReturnType<typeof getJobEstimates>> | null = null;
  try { estimates = await getJobEstimates(id, canSeePrices); } catch { /* Keep job work usable; show explicit estimate load error. */ }

  let ledger: Awaited<ReturnType<typeof getJobMoneyLedger>> | null = null;
  if (canSeePrices) {
    try { ledger = await getJobMoneyLedger(id); } catch { /* Explicit load error in owner controls. */ }
  }

  const nameById = new Map(workers.map((w) => [w.id, w.name]));

  // Time clock state for this worker + the whole job
  const myRunning = timeEntries.find(
    (e) => !e.ended_at && e.worker_id === worker.id
  );
  const othersRunning = timeEntries
    .filter((e) => !e.ended_at && e.worker_id !== worker.id)
    .map((e) => nameById.get(e.worker_id) || "?");
  const totalHours = timeEntries.reduce((sum, e) => sum + entryHours(e), 0);

  // Hide price-sensitive photos from workers without access, then sign URLs.
  const { photos: visible, documents } = partitionJobAttachments(rawPhotos, canSeePrices);
  const photos: Photo[] = await Promise.all(
    visible.map(async (p) => ({
      ...p,
      signedUrl: (await signPhotoUrl(p.url)) || undefined,
      uploaderName: p.uploaded_by ? nameById.get(p.uploaded_by) : undefined,
    }))
  );

  return (
    <div>
      <ShopTopBar
        workerName={worker.name}
        title={job.customer_name}
        back="/shop/jobs"
        lang={lang}
        adminLink={canSeePrices}
      />
      <JobEstimateDetails estimates={estimates} job={job} owner={canSeePrices} lang={lang} />
      {canSeePrices && <JobMoneyManager jobId={id} ledger={ledger} lang={lang} />}
      {canSeePrices && <JobDocuments documents={documents} lang={lang} />}
      {v2 ? (
        <TravelerV2
          job={job}
          cut={cut}
          materials={materials}
          qc={qc}
          photos={photos}
          canSeePrices={canSeePrices}
          isAdmin={!!worker.is_admin}
          lang={lang}
          myStartedAt={myRunning ? myRunning.started_at : null}
          activeWorkers={othersRunning}
          totalHours={totalHours}
          catalog={catalog}
        />
      ) : null}
      {v2 ? (
        <div className="mx-auto max-w-4xl px-4 pb-6">
          <PiecesPanel jobId={job.id} pieces={pieces} lang={lang} />
        </div>
      ) : (
        <>
      <div className="px-4 pt-4 max-w-4xl mx-auto">
        <TimeClock
          jobId={job.id}
          lang={lang}
          myStartedAt={myRunning ? myRunning.started_at : null}
          activeWorkers={othersRunning}
          totalHours={totalHours}
        />
      </div>
      <TravelerClient
        job={job}
        cut={cut}
        materials={materials}
        qc={qc}
        photos={photos}
        canSeePrices={canSeePrices}
        isAdmin={!!worker.is_admin}
        lang={lang}
      />
      <div className="mx-auto max-w-4xl px-4 pb-6">
        <PiecesPanel jobId={job.id} pieces={pieces} lang={lang} />
      </div>
        </>
      )}
    </div>
  );
}
