import { redirect, notFound } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { canViewOwnerFinancials } from "@/lib/shop/shared";
import { getJob, getMeasureSheet, listWorkers, getOrgSettings, getSheetHistory, getCarryover } from "@/lib/shop/db";
import { normalizeMeasureData } from "@/lib/shop/measure";
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
  const [job, sheet, workers, orgSettings, history, carryover] = await Promise.all([
    getJob(id),
    getMeasureSheet(sheetId),
    listWorkers(),
    getOrgSettings(),
    getSheetHistory(sheetId),
    getCarryover(worker.id),
  ]);
  if (!job || !sheet || sheet.job_id !== id) notFound();

  // Older sheets predate some fields — fill blanks so the editor and the
  // geometry checks always see the full shape.
  sheet.data = normalizeMeasureData(sheet.data);

  const nameById: Record<string, string> = {};
  for (const w of workers) nameById[w.id] = w.name;

  return (
    <div>
      <div className="print:hidden">
        <ShopTopBar
          workerName={worker.name}
          title={job.customer_name}
          back={`/shop/job/${id}/measure`}
          lang={lang}
          adminLink={canViewOwnerFinancials(worker)}
        />
      </div>
      <MeasureEditor
        job={job}
        sheet={sheet}
        lang={lang}
        workerName={worker.name}
        isAdmin={!!worker.is_admin}
        nameById={nameById}
        orgSettings={orgSettings}
        history={history}
        carryover={carryover}
      />
    </div>
  );
}
