"use client";

// One card per time-fix request, in plain words:
//
//   Kaio · qui 5/11
//   Saída: sem saída → 19:14
//   "Esqueci de bater a saída"
//   [ Aprovar ]  [ Mudar ]  [ Recusar ]
//
// "Mudar" opens two time fields prefilled with the request. Used by the
// popup the office admin sees on open and by the Time fixes page.

import { useState } from "react";
import { Check, PencilLine, X } from "lucide-react";
import { fmtTime, shopDateKey } from "@/lib/shop/shared";
import { atDay, firstName, fixLines, hhmm, lineText, reviewTimesError, shortDay, tf, timeOn, type FixCard } from "@/lib/shop/time-fix";

async function post(payload: Record<string, unknown>): Promise<{ ok: boolean; error?: string; cancelled?: boolean }> {
  const send = (p: Record<string, unknown>) => fetch("/shop/api/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
  try {
    let r = await send(payload);
    let j = await r.json().catch(() => ({}));
    // A very long result (almost always a wrong date): ask once, then resend.
    if (!r.ok && j.confirmLong) {
      if (!window.confirm(j.error)) return { ok: false, cancelled: true };
      r = await send({ ...payload, confirmLong: true });
      j = await r.json().catch(() => ({}));
    }
    return r.ok ? { ok: true } : { ok: false, error: j.error };
  } catch { return { ok: false }; }
}

export function FixSummary({ card, lang }: { card: FixCard; lang: string }) {
  const lines = fixLines(card);
  return <>
    {lines.length
      ? <ul className="mt-2 space-y-1">{lines.map((l) => <li key={l.edge} className="text-[17px] font-semibold tabular-nums leading-snug text-neutral-100">{lineText(l, card.shiftStart, lang)}</li>)}</ul>
      : <p className="mt-2 text-[15px] text-neutral-400">{tf(lang, "noTimeChange")}</p>}
    {card.reason && <p className="mt-2 text-[15px] leading-relaxed text-neutral-300">“{card.reason}”</p>}
  </>;
}

export function FixCardView({ card, lang, onDone }: { card: FixCard; lang: string; onDone: (id: string) => void }) {
  const [busy, setBusy] = useState<null | "approve" | "change" | "refuse">(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const startDay = shopDateKey(card.askStart ?? card.shiftStart);
  const endIso = card.askEnd ?? card.shiftEnd;
  const endDay = endIso ? shopDateKey(endIso) : shopDateKey(card.shiftStart);
  const [inTime, setInTime] = useState(() => hhmm(card.askStart ?? card.shiftStart));
  const [outTime, setOutTime] = useState(() => (endIso ? hhmm(endIso) : ""));

  async function act(kind: "approve" | "change" | "refuse") {
    setError("");
    const payload: Record<string, unknown> = { type: "correction_review", id: card.id, status: kind === "refuse" ? "rejected" : "approved" };
    if (kind === "change") {
      const start = atDay(startDay, inTime);
      const end = outTime ? atDay(endDay, outTime) : null;
      if (reviewTimesError(start, end)) { setError(tf(lang, "errOrder")); return; }
      payload.startedAt = start;
      payload.endedAt = end;
    }
    setBusy(kind);
    const r = await post(payload);
    setBusy(null);
    if (r.ok) onDone(card.id);
    else if (!r.cancelled) setError(r.error || tf(lang, "errFailed"));
  }

  const day = shortDay(card.shiftStart, lang);
  return (
    <article data-testid="fix-card" className="rounded-[22px] border border-white/10 bg-neutral-800/60 p-4">
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="min-w-0 truncate text-[17px] font-semibold">{firstName(card.workerName)} <span className="text-neutral-400">· {day}</span></h3>
        <span className="shrink-0 text-xs text-neutral-500">{shortDay(card.createdAt, lang)}, {fmtTime(card.createdAt, lang)}</span>
      </header>
      <FixSummary card={card} lang={lang} />
      {editing && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm text-neutral-400">{tf(lang, "changeIn")}</span>
            <input aria-label={tf(lang, "changeIn")} type="time" value={inTime} onChange={(e) => setInTime(e.target.value)} className="mt-1 min-h-12 w-full rounded-xl bg-neutral-950 px-3 text-lg tabular-nums text-neutral-100" />
          </label>
          <label className="block">
            <span className="text-sm text-neutral-400">{tf(lang, "changeOut")}</span>
            <input aria-label={tf(lang, "changeOut")} type="time" value={outTime} onChange={(e) => setOutTime(e.target.value)} className="mt-1 min-h-12 w-full rounded-xl bg-neutral-950 px-3 text-lg tabular-nums text-neutral-100" />
          </label>
        </div>
      )}
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-950/60 p-3 text-sm text-red-300">{error}</p>}
      {editing ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" disabled={!!busy} onClick={() => { setEditing(false); setError(""); }} className="min-h-14 rounded-2xl bg-neutral-700 text-base font-semibold disabled:opacity-50">{tf(lang, "cancel")}</button>
          <button type="button" disabled={!!busy || !inTime} onClick={() => act("change")} className="min-h-14 rounded-2xl bg-emerald-500 text-base font-bold text-black disabled:opacity-50">{busy === "change" ? "…" : tf(lang, "save")}</button>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button type="button" disabled={!!busy} onClick={() => act("approve")} className="flex min-h-14 flex-col items-center justify-center rounded-2xl bg-emerald-500 text-[15px] font-bold text-black disabled:opacity-50"><Check aria-hidden className="mb-0.5 h-5 w-5" strokeWidth={2.6} />{busy === "approve" ? "…" : tf(lang, "approve")}</button>
          <button type="button" disabled={!!busy} onClick={() => setEditing(true)} className="flex min-h-14 flex-col items-center justify-center rounded-2xl border border-white/15 bg-neutral-700 text-[15px] font-semibold text-neutral-100 disabled:opacity-50"><PencilLine aria-hidden className="mb-0.5 h-5 w-5" />{tf(lang, "change")}</button>
          <button type="button" disabled={!!busy} onClick={() => act("refuse")} className="flex min-h-14 flex-col items-center justify-center rounded-2xl border border-red-500/40 bg-red-950/40 text-[15px] font-semibold text-red-300 disabled:opacity-50"><X aria-hidden className="mb-0.5 h-5 w-5" />{busy === "refuse" ? "…" : tf(lang, "refuse")}</button>
        </div>
      )}
    </article>
  );
}

/** A reviewed request, read-only. */
export function FixHistoryRow({ card, lang }: { card: FixCard; lang: string }) {
  const approved = card.status === "approved";
  const label = card.status === "pending" ? tf(lang, "pending")
    : card.reviewedBy ? tf(lang, approved ? "approvedBy" : "refusedBy", { name: card.reviewedBy }) : tf(lang, approved ? "approved" : "refused");
  return (
    <article className="border-b border-white/5 px-4 py-3 last:border-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate font-semibold">{firstName(card.workerName)} <span className="font-normal text-neutral-400">· {shortDay(card.shiftStart, lang)}</span></span>
        <span className={`shrink-0 text-xs font-semibold ${card.status === "pending" ? "text-amber-300" : approved ? "text-emerald-400" : "text-red-400"}`}>{label}</span>
      </div>
      <div className="text-sm text-neutral-400">
        {card.askStart && <div className="tabular-nums">{tf(lang, "edgeIn")}: {timeOn(card.askStart, card.shiftStart, lang)}</div>}
        {card.askEnd && <div className="tabular-nums">{tf(lang, "edgeOut")}: {timeOn(card.askEnd, card.shiftStart, lang)}</div>}
        {card.reason && <div className="mt-0.5 italic">“{card.reason}”</div>}
      </div>
    </article>
  );
}
