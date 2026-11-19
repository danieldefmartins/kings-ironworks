"use client";

// On the employee home until resolved: each request still waiting, and for
// three days after, the answer ("Aprovado — suas horas foram corrigidas").
// One tap shows the request itself. The full list stays in Minha semana.

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { FixCard } from "@/lib/shop/time-fix";
import { pf } from "@/lib/shop/ponto";
import { MyFixSheet, MyFixStatus } from "./time/MyFixes";

export default function HomeRequests({ fixes, approver, lang }: { fixes: FixCard[]; approver: string; lang: string }) {
  const [view, setView] = useState<FixCard | null>(null);
  if (!fixes.length) return null;
  return <section aria-label={pf(lang, "myRequests")} data-testid="home-requests">
    <h2 className="mb-2 text-[17px] font-semibold text-neutral-300">{pf(lang, "myRequests")}</h2>
    <div className="overflow-hidden rounded-[22px] border border-white/10 bg-neutral-900/60">
      {fixes.map((f) => <button key={f.id} type="button" onClick={() => setView(f)} className="flex min-h-[64px] w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left last:border-0 active:bg-neutral-800">
        <span className="min-w-0 flex-1"><MyFixStatus fix={f} approver={approver} lang={lang} inline /></span>
        <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-neutral-500" />
      </button>)}
    </div>
    {view && <MyFixSheet fix={view} approver={approver} lang={lang} onClose={() => setView(null)} />}
  </section>;
}
