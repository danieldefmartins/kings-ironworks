import { redirect, notFound } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { getJob, getMeasureSheet } from "@/lib/shop/db";
import ShopTopBar from "../../../../ShopTopBar";
import MeasureEditor from "./MeasureEditor";

export const dynamic = "force-dynamic";

export default async function MeasureSheetPage({
  params,
}: {
  params: Promise<{ id: string; sheetId: string }>;
}) {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  const lang = worker.lang || "en";

  const { id, sheetId } = await params;
  const [job, sheet] = await Promise.all([getJob(id), getMeasureSheet(sheetId)]);
  if (!job || !sheet || sheet.job_id !== id) notFound();

  return (
    <div>
      <div className="print:hidden">
        <ShopTopBar
          workerName={worker.name}
          title={job.customer_name}
          back={`/shop/job/${id}/measure`}
          lang={lang}
          adminLink={!!worker.is_admin}
        />
      </div>
      <MeasureEditor job={job} sheet={sheet} lang={lang} workerName={worker.name} />
    </div>
  );
}
