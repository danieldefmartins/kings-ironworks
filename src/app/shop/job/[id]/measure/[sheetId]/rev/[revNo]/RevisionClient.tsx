"use client";

// Client pieces of the locked-revision viewer: the print button and the
// on-screen render of the immutable snapshot (PrintSheet in visible mode).

import type { Job } from "@/lib/shop/db";
import type { MeasureData, MeasureSheet, PostMeasure } from "@/lib/shop/measure";
import type { CheckResult } from "@/lib/shop/measure-checks";
import { mt } from "@/lib/shop/measure-i18n";
import PrintSheet from "../../PrintSheet";

export default function RevisionPrintButton({ lang }: { lang: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="text-xs font-bold rounded-full px-3 py-2 border bg-neutral-800 border-neutral-600 text-neutral-200"
    >
      🖨 {mt(lang, "printSheet")}
    </button>
  );
}

export function RevisionSheet(props: {
  job: Job;
  sheet: MeasureSheet;
  data: MeasureData;
  lang: string;
  workerName: string;
  posts: PostMeasure[];
  nameById: Record<string, string>;
  checks: CheckResult[];
  superseded: boolean;
  qrUrl: string;
}) {
  return <PrintSheet {...props} visible gapCount={0} />;
}
