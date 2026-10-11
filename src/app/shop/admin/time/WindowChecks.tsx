"use client";

// Owner: extra time a worker says the team leader asked for. Keep the actual
// time, or move it back to the work-hours edge. One row each, two buttons.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/shop/i18n";
import { SHOP_TZ, fmtTime } from "@/lib/shop/shared";

export interface WindowCheckRow { shiftId: string; edge: "start" | "end"; worker: string; punchedAt: string; edgeAt: string }

export default function WindowChecks({ rows, lang }: { rows: WindowCheckRow[]; lang: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const visible = rows.filter((r) => !done.has(`${r.shiftId}:${r.edge}`));
  if (!visible.length) return null;

  async function review(r: WindowCheckRow, approve: boolean) {
    const key = `${r.shiftId}:${r.edge}`;
    setBusy(key);
    const res = await fetch("/shop/api/action", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "shift_window_review", shiftId: r.shiftId, edge: r.edge, approve }),
    }).catch(() => null);
    setBusy(null);
    if (res?.ok) { setDone((d) => new Set(d).add(key)); router.refresh(); }
  }

  return (
    <section className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
      <h2 className="text-xl font-semibold">{t(lang, "windowCheckTitle")}</h2>
      <p className="mt-1 text-sm text-neutral-400">{t(lang, "windowCheckHint")}</p>
      <ul className="mt-3 divide-y divide-neutral-800">
        {visible.map((r) => {
          const key = `${r.shiftId}:${r.edge}`;
          const time = fmtTime(r.punchedAt, lang);
          const edge = fmtTime(r.edgeAt, lang);
          return (
            <li key={key} className="py-3">
              <div className="text-base font-semibold">{r.worker}</div>
              <div className="text-sm text-neutral-400">
                {new Date(r.punchedAt).toLocaleDateString(lang === "pt" ? "pt-BR" : lang === "es" ? "es-US" : "en-US", { timeZone: SHOP_TZ, weekday: "short", month: "short", day: "numeric" })} · {t(lang, r.edge === "start" ? "windowCheckIn" : "windowCheckOut", { time, edge })}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button disabled={busy === key} onClick={() => review(r, true)} className="min-h-12 rounded-xl bg-emerald-500 font-bold text-black disabled:opacity-50">
                  {t(lang, "windowKeep", { time })}
                </button>
                <button disabled={busy === key} onClick={() => review(r, false)} className="min-h-12 rounded-xl bg-neutral-800 font-semibold disabled:opacity-50">
                  {t(lang, "windowUseEdge", { edge })}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
