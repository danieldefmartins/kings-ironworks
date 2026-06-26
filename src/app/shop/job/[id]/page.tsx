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
  PRICE_CATEGORY,
  type Photo,
} from "@/lib/shop/db";
import ShopTopBar from "../../ShopTopBar";
import TravelerClient from "./TravelerClient";

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

  const [cut, materials, qc, rawPhotos, workers] = await Promise.all([
    getCutItems(id),
    getMaterials(id),
    getQc(id),
    getPhotos(id),
    listWorkers(),
  ]);

  const nameById = new Map(workers.map((w) => [w.id, w.name]));

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
      />
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
