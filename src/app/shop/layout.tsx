import type { Metadata, Viewport } from "next";
import { getSessionWorker } from "@/lib/shop/session";
import { loadClockState } from "@/lib/shop/clock-state";
import { canViewOwnerFinancials } from "@/lib/shop/shared";
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
  let clock;
  let clockReady = true;
  try { clock = await loadClockState(worker); }
  catch { clockReady = false; clock = { shift: null, breaks: [], hourlyRate: null, weekHoursBeforeShift: 0, weekEarningsBeforeShift: null }; }
  return (
    <div className="min-h-screen bg-[#09090b] text-neutral-100 font-body select-none">
      <ShopShell isOwner={worker ? canViewOwnerFinancials(worker) : false} key={worker?.id || "signed-out"} workerId={worker?.id || null} clockReady={clockReady} workerName={worker?.name || null} lang={worker?.lang || "en"} {...clock}>
        {children}
      </ShopShell>
    </div>
  );
}
