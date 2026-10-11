import { redirect, notFound } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { canViewOwnerFinancials, redactJobMoney } from "@/lib/shop/shared";
import { listCatalog, getJob, getMeasureSheet, listWorkers, getOrgSettings, getSheetHistory, getCarryover } from "@/lib/shop/db";
import { normalizeMeasureData } from "@/lib/shop/measure";
import {steelCatalog} from '@/lib/shop/measure-steel';
import MeasureEditor from "./MeasureEditor";
import JobGateScreen from "@/app/shop/JobGateScreen";
import { loadJobGate } from "@/lib/shop/job-timer-db";

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
  const gate = await loadJobGate(worker, id);
  if (gate.locked) {
    const gated = await getJob(id);
    if (!gated) notFound();
    return <JobGateScreen worker={worker} job={gated} gate={gate} />;
  }
  const [job, sheet, workers, orgSettings, history, carryover, catalog] = await Promise.all([
    getJob(id),
    getMeasureSheet(sheetId),
    listWorkers(),
    getOrgSettings(),
    getSheetHistory(sheetId),
    getCarryover(worker.id),
    listCatalog(),
  ]);
  if (!job || !sheet || sheet.job_id !== id) notFound();

  // Older sheets predate some fields — fill blanks so the editor and the
  // geometry checks always see the full shape.
  sheet.data = normalizeMeasureData(sheet.data);

  const nameById: Record<string, string> = {};
  for (const w of workers) nameById[w.id] = w.name;

  return (
    <div>
      {/* Focus mode: the editor draws its own slim bar (back, sheet, save
          state, menu). The shop top bar and tab bar return on the sheet list. */}
      <MeasureEditor
        job={redactJobMoney(job, canViewOwnerFinancials(worker))}
        sheet={sheet}
        lang={lang}
        workerName={worker.name}
        isAdmin={!!worker.is_admin}
        nameById={nameById}
        orgSettings={orgSettings}
        history={history}
        carryover={carryover}
        catalog={steelCatalog(catalog)}
        adminLink={canViewOwnerFinancials(worker)}
      />
    </div>
  );
}
