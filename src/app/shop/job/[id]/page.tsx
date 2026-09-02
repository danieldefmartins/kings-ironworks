import { redirect, notFound } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import {
  getJob,
  getCutItems,
  getMaterials,
  getQc,
  getPhotos,
  listWorkers,
  signPhotoUrl,
  getJobTimeEntries,
  entryHours,
  PRICE_CATEGORY,
  type Photo,
  listCatalog,
} from "@/lib/shop/db";
import ShopTopBar from "../../ShopTopBar";
import TravelerClient from "./TravelerClient";
import TimeClock from "./TimeClock";
import TravelerV2 from "./TravelerV2";
import { canViewOwnerFinancials, redactJobMoney } from "@/lib/shop/shared";

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

  const [cut, materials, qc, rawPhotos, workers, timeEntries] =
    await Promise.all([
      getCutItems(id),
      getMaterials(id),
      getQc(id),
      getPhotos(id),
      listWorkers(),
      getJobTimeEntries(id),
    ]);

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
  const visible = rawPhotos.filter(
    (p) => canSeePrices || p.category !== PRICE_CATEGORY
  );
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
        </>
      )}
    </div>
  );
}
