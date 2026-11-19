"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, History } from "lucide-react";
import { tf, type FixCard } from "@/lib/shop/time-fix";
import { FixCardView, FixHistoryRow } from "../TimeFixCards";

export default function TimeFixesClient({ initial, lang }: { initial: FixCard[]; lang: string }) {
  const router = useRouter();
  const [, transition] = useTransition();
  const [cards, setCards] = useState(initial);
  const [history, setHistory] = useState<FixCard[] | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);

  async function toggleHistory() {
    if (showHistory) { setShowHistory(false); return; }
    setShowHistory(true);
    setLoading(true);
    try {
      const r = await fetch("/shop/api/time-fixes?history=1", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { setHistory(Array.isArray(j.history) ? j.history : []); setCards(Array.isArray(j.pending) ? j.pending : cards); }
    } finally { setLoading(false); }
  }

  function done(id: string) {
    setCards((list) => list.filter((c) => c.id !== id));
    setHistory(null);
    if (showHistory) setShowHistory(false);
    // The badge and the layout's count follow.
    transition(() => router.refresh());
  }

  return <div className="space-y-4">
    {cards.length
      ? <div className="space-y-3">{cards.map((c) => <FixCardView key={c.id} card={c} lang={lang} onDone={done} />)}</div>
      : <div className="flex flex-col items-center rounded-[22px] border border-white/10 bg-neutral-900/60 px-6 py-10 text-center">
          <CheckCircle2 aria-hidden className="h-10 w-10 text-emerald-400" />
          <p className="mt-3 text-[17px] font-semibold">{tf(lang, "allDone")}</p>
        </div>}
    <button type="button" onClick={toggleHistory} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 text-[15px] font-semibold text-neutral-300">
      <History aria-hidden className="h-4 w-4" />{showHistory ? tf(lang, "hideHistory") : tf(lang, "history")}
    </button>
    {showHistory && (
      <section aria-label={tf(lang, "history")} className="overflow-hidden rounded-[22px] border border-white/10 bg-neutral-900/60">
        {loading && !history ? <p className="p-6 text-center text-sm text-neutral-500">…</p>
          : history && history.length ? history.map((c) => <FixHistoryRow key={c.id} card={c} lang={lang} />)
          : <p className="p-6 text-center text-sm text-neutral-500">{tf(lang, "historyEmpty")}</p>}
      </section>
    )}
  </div>;
}
