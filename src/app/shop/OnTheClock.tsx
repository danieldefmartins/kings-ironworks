"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { fmtTime, hoursToHm, shiftHours, type TimeBreak } from "@/lib/shop/shared";
import { t } from "@/lib/shop/i18n";

export interface OnClockRow {
  workerId: string;
  name: string;
  /** Payroll clock-in, ISO. */
  startedAt: string;
  /** This shift's breaks, so the elapsed number can be recomputed as it ticks. */
  breaks: TimeBreak[];
  onBreak: boolean;
  locationStatus: string;
  lat: number | null;
  lng: number | null;
  /** The job whose clock is also running, if any. The two clocks are separate. */
  job: string | null;
}

// Daniel: "when people clock in I should be able to see who is clocked in."
//
// Owners only (Daniel and Kayky). It goes at the top of their home screen
// rather than behind a menu, because the question it answers — is the crew
// here — is the first one asked in the morning, and a dashboard you have to
// navigate to is a dashboard nobody opens.
//
// This is the PAYROLL clock (kiw_shop_shifts). The job named on a row is that
// worker's running project entry, shown for context only; nothing here writes
// to either clock, and reading them together does not couple them.
// Past this, a shift is almost certainly a clock-out nobody tapped. Flagged
// for review rather than auto-closed: the project clock caps itself because a
// stray hour distorts a job cost, but payroll hours become a payment, and
// software should not quietly edit one.
const RUNAWAY_HOURS = 12;

export default function OnTheClock({ rows, lang = "en" }: { rows: OnClockRow[]; lang?: string }) {
  const router = useRouter();

  // Elapsed time is recomputed from started_at on every tick rather than
  // trusting a number baked in at render, so a tab left open overnight cannot
  // show stale hours. The server rows are refreshed on the same beat so
  // somebody clocking in appears without a manual reload. Both pause while the
  // tab is hidden — this runs on a shop tablet that stays awake all day.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setNow(Date.now());
      router.refresh();
    }, 30000);
    return () => clearInterval(id);
  }, [router]);

  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Clock aria-hidden className="h-5 w-5 text-emerald-400" />
          {t(lang, "crewOnTheClock")}
        </h2>
        <Link href="/shop/admin/time" className="text-sm text-amber-400">
          {t(lang, "reviewTimesheets")}
        </Link>
      </div>
      <div className="overflow-hidden rounded-[22px] border border-white/10 bg-neutral-900/60">
        {rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-neutral-500">{t(lang, "nobodyClockedIn")}</p>
        ) : (
          rows.map((r) => {
            const runningHours = shiftHours(
              { started_at: r.startedAt, ended_at: null }, r.breaks, now
            );
            const runaway = runningHours >= RUNAWAY_HOURS;
            return (
            <div key={r.workerId} className="border-b border-white/5 last:border-0">
            <div className="flex min-h-[72px] items-center gap-3 px-4 py-3">
              <span
                aria-hidden
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  r.onBreak ? "bg-amber-400" : "bg-emerald-400"
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{r.name}</div>
                <div className="truncate text-sm text-neutral-500">
                  {t(lang, "sinceTime", { time: fmtTime(r.startedAt, lang) })}
                  {r.job ? ` · ${r.job}` : ""}
                </div>
                <div className="mt-0.5 text-xs text-neutral-600">
                  {r.locationStatus === "verified"
                    ? t(lang, "locationVerified")
                    : r.locationStatus === "outside"
                    ? t(lang, "locationOutside")
                    : t(lang, "locationUnknown")}
                  {r.lat != null && r.lng != null && (
                    <>
                      {" · "}
                      <a
                        href={`https://maps.google.com/?q=${r.lat},${r.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-500/90 underline"
                      >
                        📍
                      </a>
                    </>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className={`text-lg font-semibold tabular-nums ${runaway ? "text-amber-400" : ""}`}>
                  {hoursToHm(runningHours)}
                </div>
                {r.onBreak && (
                  <div className="text-xs font-medium text-amber-400">{t(lang, "onBreakNow")}</div>
                )}
              </div>
            </div>
            {runaway && (
              <div className="flex items-start gap-2 border-t border-amber-500/20 bg-amber-500/10 px-4 py-2">
                <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <span className="text-xs leading-snug text-amber-300">
                  {t(lang, "runawayShift", { hours: hoursToHm(runningHours) })}{" "}
                  <Link href="/shop/admin/time" className="underline">
                    {t(lang, "reviewTimesheets")}
                  </Link>
                </span>
              </div>
            )}
            </div>
            );
          })
        )}
      </div>
    </section>
  );
}
