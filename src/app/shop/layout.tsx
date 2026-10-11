import type { Metadata, Viewport } from "next";
import { getSessionWorker } from "@/lib/shop/session";
import { loadClockState } from "@/lib/shop/clock-state";
import { canViewOwnerFinancials } from "@/lib/shop/shared";
import ShopShell from "./ShopShell";
import { getOrgSettings } from "@/lib/shop/db";
import { resolveBrand } from "@/lib/shop/org-brand";
import { BrandProvider } from "./brand/BrandContext";

// The tab title carries the organization's name (white-label); KIW's by default.
export async function generateMetadata(): Promise<Metadata> {
  const { branding } = await getOrgSettings();
  return {
    // absolute: skip the marketing site's "| King Iron Works" template.
    title: { absolute: `Shop Floor — ${resolveBrand(branding).displayName}` },
    robots: { index: false, follow: false },
  };
}

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
  catch { clockReady = false; clock = { shift: null, breaks: [], hourlyRate: null, weekHoursBeforeShift: 0, weekEarningsBeforeShift: null, windowQuestions: [] }; }
  const { branding } = await getOrgSettings();
  return (
    <div className="min-h-screen bg-[#09090b] text-neutral-100 font-body select-none">
      <BrandProvider branding={branding}>
      <ShopShell isOwner={worker ? canViewOwnerFinancials(worker) : false} key={worker?.id || "signed-out"} workerId={worker?.id || null} clockReady={clockReady} workerName={worker?.name || null} lang={worker?.lang || "en"} {...clock}>
        {children}
      </ShopShell>
      </BrandProvider>
    </div>
  );
}
