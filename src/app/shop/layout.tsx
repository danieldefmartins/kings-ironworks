import type { Metadata, Viewport } from "next";
import { getSessionWorker } from "@/lib/shop/session";
import { getOpenShift, getShiftBreaks, getRunningEntry, getWorkerRate, listBreaks, listJobs, listShifts, shiftHours } from "@/lib/shop/db";
import ShopShell from "./ShopShell";

export const metadata: Metadata = {
  title: "Shop Floor — King Iron Works",
  robots: { index: false, follow: false },
};

// Tablet tool: always open at exactly 100% of the device width, no pinch-zoom.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const worker = await getSessionWorker();
  let shift = null;
  let breaks: Awaited<ReturnType<typeof getShiftBreaks>> = [];
  let currentJobId: string | null = null;
  let jobs: { id: string; label: string }[] = [];
  let hourlyRate: number | null = null;
  let weekHoursBeforeShift = 0;
  if (worker) {
    try {
      const week = new Date();
      const day = (week.getDay() + 6) % 7;
      week.setHours(0, 0, 0, 0); week.setDate(week.getDate() - day);
      const weekIso = week.toISOString();
      const [openShift, running, allJobs, rate, weekShifts, weekBreaks] = await Promise.all([
        getOpenShift(worker.id), getRunningEntry(worker.id), listJobs(), getWorkerRate(worker.id), listShifts(weekIso), listBreaks(weekIso),
      ]);
      shift = openShift;
      currentJobId = running?.job_id || null;
      jobs = allJobs.filter((j) => j.current_stage !== "Lead").map((j) => ({ id: j.id, label: `${j.job_number} · ${j.customer_name}` }));
      hourlyRate = openShift?.pay_rate == null ? rate : Number(openShift.pay_rate);
      weekHoursBeforeShift = weekShifts.filter((s) => s.worker_id === worker.id && s.id !== openShift?.id).reduce((sum, s) => sum + shiftHours(s, weekBreaks.filter((b) => b.shift_id === s.id)), 0);
      if (shift) breaks = await getShiftBreaks(shift.id);
    } catch {
      // During a rolling deploy the UI remains usable until the clock migration lands.
    }
  }
  return (
    <div className="min-h-screen bg-[#09090b] text-neutral-100 font-body select-none">
      <ShopShell workerName={worker?.name || null} lang={worker?.lang || "en"} shift={shift} breaks={breaks} currentJobId={currentJobId} jobs={jobs} hourlyRate={hourlyRate} weekHoursBeforeShift={weekHoursBeforeShift}>
        {children}
      </ShopShell>
    </div>
  );
}
