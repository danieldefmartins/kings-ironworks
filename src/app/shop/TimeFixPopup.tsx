"use client";

// The office admin's popup: shown when she opens the app and any time fix is
// waiting. "Depois" closes it; it comes back on a later open, at most once an
// hour. The owners never get this popup — they see the badge and the daily
// note when something has waited more than 24 h.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardClock } from "lucide-react";
import { tf, type FixCard } from "@/lib/shop/time-fix";
import { FixCardView } from "./TimeFixCards";

export const SNOOZE_MS = 60 * 60 * 1000;
const snoozeKey = (workerId: string) => `kiw-timefix-later:${workerId}`;

export function snoozedUntil(workerId: string): number {
  try { return Number(window.localStorage.getItem(snoozeKey(workerId)) || 0) + SNOOZE_MS; } catch { return 0; }
}

export default function TimeFixPopup({ workerId, lang, onChange }: { workerId: string; lang: string; onChange?: (left: number) => void }) {
  const [cards, setCards] = useState<FixCard[] | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/shop/api/time-fixes", { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      const list: FixCard[] = Array.isArray(j.pending) ? j.pending : [];
      setCards(list);
      setOpen(list.length > 0);
    } catch { /* the badge still shows; try again next open */ }
  }, []);

  useEffect(() => {
    if (Date.now() < snoozedUntil(workerId)) return;
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [workerId, load]);

  function later() {
    try { window.localStorage.setItem(snoozeKey(workerId), String(Date.now())); } catch { /* private mode */ }
    setOpen(false);
  }

  function done(id: string) {
    setCards((list) => {
      const left = (list || []).filter((c) => c.id !== id);
      onChange?.(left.length);
      if (!left.length) setOpen(false);
      return left;
    });
  }

  if (!open || !cards?.length) return null;
  const n = cards.length;
  return (
    <div className="fixed inset-0 z-[65] flex items-end bg-black/70 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="tf-title">
      <section className="flex max-h-[92dvh] w-full flex-col rounded-t-[28px] border border-white/10 bg-neutral-900 shadow-2xl sm:max-w-lg sm:rounded-[28px]">
        <header className="flex items-center gap-3 px-5 pt-5 pb-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-400/15 text-amber-300"><ClipboardClock aria-hidden className="h-6 w-6" /></span>
          <div className="min-w-0 flex-1">
            <h2 id="tf-title" className="text-xl font-semibold leading-tight tracking-tight">{tf(lang, "fixesTitle")}</h2>
            <p className="text-sm text-neutral-400">{n === 1 ? tf(lang, "fixesCountOne") : tf(lang, "fixesCount", { n })}</p>
          </div>
        </header>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pb-3">
          {cards.map((c) => <FixCardView key={c.id} card={c} lang={lang} onDone={done} />)}
        </div>
        <footer className="grid grid-cols-2 gap-2 border-t border-white/10 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
          <button type="button" onClick={later} className="min-h-14 rounded-2xl bg-neutral-800 text-base font-semibold">{tf(lang, "later")}</button>
          <Link href="/shop/time-fixes" onClick={() => setOpen(false)} className="flex min-h-14 items-center justify-center rounded-2xl border border-white/10 text-base font-semibold text-neutral-300">{tf(lang, "history")}</Link>
        </footer>
      </section>
    </div>
  );
}
