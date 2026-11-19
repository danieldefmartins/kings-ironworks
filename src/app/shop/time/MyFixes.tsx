"use client";

// The worker's side of a time fix, in plain words: "Enviado para a Giulia
// aprovar" right after sending, then Pendente / Aprovado / Recusado — one tap
// on a shift (or on "Meus pedidos") shows the request itself.

import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { shortDay, tf, timeOn, type FixCard } from "@/lib/shop/time-fix";

function statusText(fix: Pick<FixCard, "status">, approver: string, lang: string): string {
  if (fix.status === "approved") return tf(lang, "statusApproved");
  if (fix.status === "rejected") return approver ? tf(lang, "statusRefused", { name: approver }) : tf(lang, "refused");
  return approver ? tf(lang, "statusPending", { name: approver }) : tf(lang, "pending");
}

const TONE = {
  pending: "bg-amber-400/15 text-amber-300",
  approved: "bg-emerald-400/15 text-emerald-300",
  rejected: "bg-red-400/15 text-red-300",
} as const;

function Icon({ status }: { status: FixCard["status"] }) {
  const C = status === "approved" ? CheckCircle2 : status === "rejected" ? XCircle : Clock3;
  return <C aria-hidden className="h-4 w-4 shrink-0" />;
}

/** A small status pill on a shift row (tap to open), or the line in "my requests". */
export function MyFixStatus({ fix, approver, lang, onOpen, inline = false }: { fix: FixCard; approver: string; lang: string; onOpen?: () => void; inline?: boolean }) {
  const label = fix.status === "approved" ? tf(lang, "approved") : fix.status === "rejected" ? tf(lang, "refused") : tf(lang, "pending");
  if (inline) return <>
    <span className="block font-semibold">{shortDay(fix.shiftStart, lang)}</span>
    <span className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[fix.status]}`}><Icon status={fix.status} />{statusText(fix, approver, lang)}</span>
  </>;
  return <button type="button" onClick={onOpen} className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${TONE[fix.status]}`}><Icon status={fix.status} />{label} · {tf(lang, "see")}</button>;
}

function Asked({ fix, lang }: { fix: FixCard; lang: string }) {
  return <div className="mt-4 space-y-1 rounded-2xl bg-neutral-800/70 p-4 text-[17px] font-semibold tabular-nums">
    <div className="text-sm font-normal text-neutral-400">{shortDay(fix.shiftStart, lang)}</div>
    {fix.askStart && <div>{tf(lang, "edgeIn")}: {timeOn(fix.askStart, fix.shiftStart, lang)}</div>}
    {fix.askEnd && <div>{tf(lang, "edgeOut")}: {timeOn(fix.askEnd, fix.shiftStart, lang)}</div>}
    {fix.reason && <div className="pt-1 text-[15px] font-normal text-neutral-300">“{fix.reason}”</div>}
  </div>;
}

function Sheet({ children, onClose, label }: { children: React.ReactNode; onClose: () => void; label: string }) {
  return <div className="fixed inset-0 z-[60] flex items-end bg-black/70 sm:items-center sm:justify-center" onClick={onClose} role="dialog" aria-modal="true" aria-label={label}>
    <section className="w-full rounded-t-[28px] border border-white/10 bg-neutral-900 px-5 pt-6 pb-[max(24px,env(safe-area-inset-bottom))] sm:max-w-md sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>{children}</section>
  </div>;
}

/** Right after sending. */
export function SentSheet({ fix, approver, lang, onClose }: { fix: FixCard; approver: string; lang: string; onClose: () => void }) {
  const title = approver ? tf(lang, "sentTo", { name: approver }) : tf(lang, "sentToOffice");
  return <Sheet onClose={onClose} label={title}>
    <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-emerald-400/15 text-emerald-300"><CheckCircle2 aria-hidden className="h-8 w-8" /></div>
    <h2 className="text-center text-[22px] font-semibold leading-tight tracking-tight">{title}</h2>
    <p className={`mx-auto mt-3 flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${TONE.pending}`}><Icon status="pending" />{tf(lang, "pending")}</p>
    <Asked fix={fix} lang={lang} />
    <button type="button" onClick={onClose} className="mt-5 min-h-14 w-full rounded-2xl bg-emerald-500 text-lg font-bold text-black">{tf(lang, "ok")}</button>
  </Sheet>;
}

/** One tap on a request: what was asked and where it stands. */
export function MyFixSheet({ fix, approver, lang, onClose }: { fix: FixCard; approver: string; lang: string; onClose: () => void }) {
  return <Sheet onClose={onClose} label={statusText(fix, approver, lang)}>
    <p className={`mx-auto flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${TONE[fix.status]}`}><Icon status={fix.status} />{statusText(fix, approver, lang)}</p>
    <Asked fix={fix} lang={lang} />
    <p className="mt-3 text-center text-xs text-neutral-500">{tf(lang, "requestedOn", { day: shortDay(fix.createdAt, lang) })}</p>
    <button type="button" onClick={onClose} className="mt-5 min-h-14 w-full rounded-2xl bg-neutral-800 text-base font-semibold">{tf(lang, "ok")}</button>
  </Sheet>;
}
