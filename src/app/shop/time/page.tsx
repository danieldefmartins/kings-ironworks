import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { listCorrections, listWorkerBreaks, listWorkerShifts, shiftHours } from "@/lib/shop/db";
import ShopTopBar from "../ShopTopBar";
import TimesheetClient from "./TimesheetClient";
import { t } from "@/lib/shop/i18n";

export const dynamic = "force-dynamic";
export default async function MyTimePage() {
  const worker = await getSessionWorker(); if (!worker) redirect("/shop/login");
  // Scoped in the query, not filtered afterwards: this screen is one person's
  // hours and one person's pay, so nobody else's shifts should be in the
  // process to begin with.
  const [mineShifts, breaks, corrections] = await Promise.all([
    listWorkerShifts(worker.id), listWorkerBreaks(worker.id), listCorrections(),
  ]);
  const shifts = mineShifts.map(s => ({ id: s.id, worker: worker.name, startedAt: s.started_at, endedAt: s.ended_at, hours: shiftHours(s, breaks.filter(b => b.shift_id === s.id)), regular: shiftHours(s, breaks.filter(b => b.shift_id === s.id)), overtime: 0, status: s.status, startLat: s.start_lat, startLng: s.start_lng, endLat: s.end_lat, endLng: s.end_lng }));
  const mine = corrections.filter(c => c.worker_id === worker.id).map(c => ({ id: c.id, shiftId: c.shift_id, worker: worker.name, reason: c.reason, status: c.status, createdAt: c.created_at }));
  return <div><ShopTopBar workerName={worker.name} title={t(worker.lang, "myTimesheet")} back="/shop/more" lang={worker.lang || "en"} /><main className="mx-auto max-w-2xl px-4 py-5"><TimesheetClient shifts={shifts} corrections={mine} lang={worker.lang || "en"} /></main></div>;
}
