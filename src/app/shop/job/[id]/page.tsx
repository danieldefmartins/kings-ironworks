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
} from "@/lib/shop/db";
import ShopTopBar from "../../ShopTopBar";
import TravelerClient from "./TravelerClient";
import TimeClock from "./TimeClock";

export const dynamic = "force-dynamic";

export default async function JobTravelerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  const canSeePrices = !!worker.can_see_prices;
  const lang = worker.lang || "en";

  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();

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
        back="/shop"
        lang={lang}
        adminLink={!!worker.is_admin}
      />
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
        lang={lang}
      />
    </div>
  );
}
