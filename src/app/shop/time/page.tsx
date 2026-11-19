import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { listWorkerBreaks, listWorkerShifts, shiftHours } from "@/lib/shop/db";
import { approverFirstName, listWorkerFixes } from "@/lib/shop/time-fix-db";
import ShopTopBar from "../ShopTopBar";
import TimesheetClient from "./TimesheetClient";
import { canViewOwnerFinancials } from "@/lib/shop/shared";
import { t } from "@/lib/shop/i18n";

export const dynamic = "force-dynamic";
export default async function MyTimePage() {
  const worker = await getSessionWorker(); if (!worker) redirect("/shop/login");
  if (canViewOwnerFinancials(worker)) redirect("/shop/admin/payroll");
  // Scoped in the query, not filtered afterwards: this screen is one person's
  // hours and one person's pay, so nobody else's shifts should be in the
  // process to begin with.
  const [mineShifts, breaks, myFixes, approver] = await Promise.all([
    listWorkerShifts(worker.id), listWorkerBreaks(worker.id), listWorkerFixes(worker.id).catch(() => []), approverFirstName(),
  ]);
  const shifts = mineShifts.map(s => ({ id: s.id, worker: worker.name, startedAt: s.started_at, endedAt: s.ended_at, hours: shiftHours(s, breaks.filter(b => b.shift_id === s.id)), regular: shiftHours(s, breaks.filter(b => b.shift_id === s.id)), overtime: 0, status: s.status, startLat: s.start_lat, startLng: s.start_lng, endLat: s.end_lat, endLng: s.end_lng }));
  return <div><ShopTopBar workerName={worker.name} title={t(worker.lang, "myTimesheet")} back="/shop/more" lang={worker.lang || "en"} /><main className="mx-auto max-w-2xl px-4 py-5"><TimesheetClient shifts={shifts} myFixes={myFixes} approverName={approver === worker.name.split(" ")[0] ? "" : approver} lang={worker.lang || "en"} /></main></div>;
}
