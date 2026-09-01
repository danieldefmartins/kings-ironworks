import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { listBreaks, listCorrections, listShiftLocations, listShifts, listWorkersWithRates, shiftHours } from "@/lib/shop/db";
import ShopTopBar from "../../ShopTopBar";
import TimesheetClient, { type ShiftRow } from "../../time/TimesheetClient";
import { t } from "@/lib/shop/i18n";
import { canViewOwnerFinancials } from "@/lib/shop/shared";

export const dynamic = "force-dynamic";

function weekKey(iso: string) {
  const d = new Date(iso); const day = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

export default async function TeamTimePage() {
  const worker = await getSessionWorker(); if (!worker) redirect("/shop/login"); if (!canViewOwnerFinancials(worker)) redirect("/shop");
  const canViewLocationHistory = true;
  const [shifts, breaks, workers, corrections, locations] = await Promise.all([listShifts(), listBreaks(), listWorkersWithRates(), listCorrections(), canViewLocationHistory ? listShiftLocations() : Promise.resolve([])]);
  const names = new Map(workers.map(w => [w.id, w.name]));
  const used = new Map<string, number>();
  const rows: ShiftRow[] = [...shifts].sort((a,b) => a.started_at.localeCompare(b.started_at)).map(s => {
    const hours = shiftHours(s, breaks.filter(b => b.shift_id === s.id)); const key = `${s.worker_id}:${weekKey(s.started_at)}`; const before = used.get(key) || 0;
    const regular = Math.min(hours, Math.max(0, 40 - before)); const overtime = Math.max(0, hours - regular); used.set(key, before + hours);
    return { id: s.id, worker: names.get(s.worker_id) || "Unknown", startedAt: s.started_at, endedAt: s.ended_at, hours, regular, overtime, status: s.status, startLat: s.start_lat, startLng: s.start_lng, endLat: s.end_lat, endLng: s.end_lng };
  }).reverse();
  const correctionRows = corrections.map(c => ({ id: c.id, shiftId: c.shift_id, worker: names.get(c.worker_id) || "Unknown", reason: c.reason, status: c.status, createdAt: c.created_at }));
  return <div><ShopTopBar workerName={worker.name} title={t(worker.lang, "teamTimesheets")} back="/shop/more" lang={worker.lang || "en"} /><main className="mx-auto max-w-4xl px-4 py-5"><div className="mb-5"><h1 className="text-3xl font-semibold tracking-tight">{t(worker.lang, "timeReview")}</h1><p className="mt-1 text-sm text-neutral-500">{t(worker.lang, "timeReviewHint")}</p></div><TimesheetClient shifts={rows} corrections={correctionRows} admin lang={worker.lang || "en"} />{canViewLocationHistory && <section className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4"><h2 className="text-xl font-semibold">Crew location history</h2><p className="mt-1 text-sm text-neutral-500">Recent GPS breadcrumbs from active and completed payroll shifts.</p><div className="mt-4 max-h-[480px] overflow-y-auto divide-y divide-neutral-800">{locations.map((p) => <a key={p.id} href={`https://www.google.com/maps?q=${p.lat},${p.lng}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 py-3 text-sm"><span className={`h-2.5 w-2.5 rounded-full ${p.work_state === "break" ? "bg-amber-400" : "bg-emerald-400"}`} /><span className="min-w-0 flex-1"><span className="block font-medium">{names.get(p.worker_id) || "Unknown"} · {p.work_state}</span><span className="text-neutral-500">{new Date(p.recorded_at).toLocaleString()} · ±{p.accuracy_m ? Math.round(p.accuracy_m) : "?"}m</span></span><span className="text-amber-400">↗</span></a>)}</div></section>}</main></div>;
}
