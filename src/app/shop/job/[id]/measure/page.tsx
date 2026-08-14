import { redirect, notFound } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { getJob, getMeasureSheets, listWorkers } from "@/lib/shop/db";
import ShopTopBar from "../../../ShopTopBar";
import MeasureListClient from "./MeasureListClient";

export const dynamic = "force-dynamic";

export default async function MeasureListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  const lang = worker.lang || "en";

  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();

  const [sheets, workers] = await Promise.all([getMeasureSheets(id), listWorkers()]);
  const nameById: Record<string, string> = {};
  for (const w of workers) nameById[w.id] = w.name;

  return (
    <div>
      <ShopTopBar
        workerName={worker.name}
        title={job.customer_name}
        back={`/shop/job/${id}`}
        lang={lang}
        adminLink={!!worker.is_admin}
      />
      <MeasureListClient job={job} sheets={sheets} lang={lang} nameById={nameById} />
    </div>
  );
}
