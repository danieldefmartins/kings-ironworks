"use client";

// "Did your team leader ask you to start early / stay late?"
//
// Shown AFTER a punch outside the work-hours window has been saved — it never
// stands between the worker and the punch. Until it is answered payroll uses
// the window edge; the question waits on the phone and comes back on the next
// open. Two big answers, no wall of text, no caveat left on the shift.

import { useState } from "react";
import { Clock3 } from "lucide-react";
import { t } from "@/lib/shop/i18n";
import { fmtDateTime, fmtTime, shopDateKey } from "@/lib/shop/shared";
import type { WindowQuestion } from "@/lib/shop/work-hours";

export default function WorkHoursQuestion({ question, lang, onDone }: {
  question: WindowQuestion;
  lang: string;
  onDone: (q: WindowQuestion, requested: boolean) => void;
}) {
  const [busy, setBusy] = useState<null | "yes" | "no">(null);
  const [error, setError] = useState("");
  const start = question.edge === "start";
  const [today] = useState(() => shopDateKey(Date.now()) === shopDateKey(question.punchedAt));
  const time = today ? fmtTime(question.punchedAt, lang) : fmtDateTime(question.punchedAt, lang);
  const edge = fmtTime(question.edgeAt, lang);

  async function answer(requested: boolean) {
    setBusy(requested ? "yes" : "no"); setError("");
    try {
      const res = await fetch("/shop/api/action", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "shift_window_answer", shiftId: question.shiftId, edge: question.edge, requested }),
      });
      if (!res.ok) throw new Error();
      onDone(question, requested);
    } catch { setError(t(lang, "windowFailed")); }
    finally { setBusy(null); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/70 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="wh-q">
      <section className="w-full rounded-t-[28px] border border-white/10 bg-neutral-900 px-5 pt-6 pb-[max(24px,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-[28px]">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-amber-400/15 text-amber-300">
          <Clock3 className="h-7 w-7" strokeWidth={2.4} />
        </div>
        <h2 id="wh-q" className="text-center text-2xl font-semibold leading-tight tracking-tight">
          {t(lang, start ? "windowAskStart" : "windowAskEnd")}
        </h2>
        <p className="mt-2 text-center text-base text-neutral-400">
          {t(lang, start ? "windowSubStart" : "windowSubEnd", { time, edge })}
        </p>
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-950/60 p-3 text-center text-sm text-red-300">{error}</p>}
        <div className="mt-6 space-y-3">
          <button disabled={!!busy} onClick={() => answer(true)}
            className="flex min-h-[68px] w-full flex-col items-center justify-center rounded-2xl bg-emerald-500 px-4 text-black disabled:opacity-60">
            <span className="text-lg font-bold">{busy === "yes" ? "…" : t(lang, "windowYes")}</span>
            <span className="text-sm font-medium text-black/70">{t(lang, "windowYesHint", { time: fmtTime(question.punchedAt, lang) })}</span>
          </button>
          <button disabled={!!busy} onClick={() => answer(false)}
            className="flex min-h-[68px] w-full flex-col items-center justify-center rounded-2xl bg-neutral-800 px-4 text-neutral-100 disabled:opacity-60">
            <span className="text-lg font-bold">{busy === "no" ? "…" : t(lang, "windowNo")}</span>
            <span className="text-sm font-medium text-neutral-400">{t(lang, start ? "windowNoStart" : "windowNoEnd", { edge })}</span>
          </button>
        </div>
      </section>
    </div>
  );
}
