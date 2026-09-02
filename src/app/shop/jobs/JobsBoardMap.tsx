"use client";

import { useState } from "react";
import { ChevronDown, Map as MapIcon } from "lucide-react";
import JobsMap, { type MapJob } from "../JobsMap";
import { t } from "@/lib/shop/i18n";

// The board's map of every job at once. Collapsed by default: the list is what
// the shop opens this screen for, and a map that loads tiles on every visit
// would tax a tablet on shop wifi for a view most visits do not need. Leaflet
// is only fetched once this is opened.
export default function JobsBoardMap({
  jobs,
  lang = "en",
  total,
}: {
  jobs: MapJob[];
  lang?: string;
  /** All jobs on the board, so we can say how many are missing a pin. */
  total: number;
}) {
  const [open, setOpen] = useState(false);
  const missing = Math.max(0, total - jobs.length);

  return (
    <section className="mb-4 overflow-hidden rounded-[22px] border border-white/10 bg-neutral-900/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-[56px] w-full items-center gap-3 px-4 text-left"
      >
        <MapIcon aria-hidden className="h-5 w-5 shrink-0 text-amber-400" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{t(lang, "jobsMapTitle")}</span>
          <span className="block text-xs text-neutral-500">
            {jobs.length} {t(lang, "jobs").toLowerCase()}
            {missing > 0 ? ` · ${missing} ${t(lang, "noMapPinShort")}` : ""}
          </span>
        </span>
        <ChevronDown
          aria-hidden
          className={`h-5 w-5 shrink-0 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-3 pb-3">
          <JobsMap jobs={jobs} lang={lang} height={340} />
        </div>
      )}
    </section>
  );
}
