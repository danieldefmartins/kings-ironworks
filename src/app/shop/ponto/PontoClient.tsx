"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Banknote, Check, ChevronRight, ClipboardClock, Clock3, MapPin, MessageSquareText, PencilLine, Users } from "lucide-react";
import { fmtTime, fromShopInput, shopDateKey } from "@/lib/shop/shared";
import { hm, pf } from "@/lib/shop/ponto";
import { atDay, firstName, hhmm, longDay, shortDay, tf, type FixCard } from "@/lib/shop/time-fix";
import type { MissedRow, PontoData, WeekRow } from "@/lib/shop/ponto-db";
import { FixCardView } from "../TimeFixCards";

async function post(payload: Record<string, unknown>): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const send = (p: Record<string, unknown>) => fetch("/shop/api/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
  try {
    let r = await send(payload);
    let j = await r.json().catch(() => ({}));
    if (!r.ok && j.confirmLong) {
      if (!window.confirm(j.error)) return { ok: false, data: { cancelled: true } };
      r = await send({ ...payload, confirmLong: true });
      j = await r.json().catch(() => ({}));
    }
    return { ok: r.ok, data: j };
  } catch { return { ok: false, data: {} }; }
}

const dayNoon = (day: string) => fromShopInput(`${day}T12:00`);

function Section({ title, count, icon: Icon, tone = "text-neutral-300", children, testId }: { title: string; count?: number; icon: typeof Clock3; tone?: string; children: React.ReactNode; testId?: string }) {
  return <section data-testid={testId}>
    <h2 className="mb-2.5 flex items-center gap-2 text-[20px] font-semibold tracking-tight">
      <Icon aria-hidden className={`h-5 w-5 ${tone}`} />{title}
      {count != null && count > 0 && <span className="ml-1 rounded-full bg-neutral-800 px-2 py-0.5 text-[13px] font-semibold tabular-nums text-neutral-300">{count}</span>}
    </h2>
    {children}
  </section>;
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-[22px] border border-white/10 bg-neutral-900/60 px-4 py-5 text-center text-[15px] text-neutral-500">{text}</p>;
}

function MissedCard({ row, lang, now, onFix, onAsked }: { row: MissedRow; lang: string; now: number; onFix: (r: MissedRow) => void; onAsked: (id: string, at: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const sameDay = shopDateKey(row.startedAt) === shopDateKey(now);
  const when = sameDay ? fmtTime(row.startedAt, lang) : `${longDay(row.startedAt, lang)}, ${fmtTime(row.startedAt, lang)}`;
  async function ask() {
    setBusy(true); setMsg("");
    const r = await post({ type: "shift_ask_worker", shiftId: row.shiftId });
    setBusy(false);
    if (r.ok) onAsked(row.shiftId, String(r.data.at || new Date().toISOString()));
    else if (r.data.error === "already_asked" && typeof r.data.at === "string") onAsked(row.shiftId, r.data.at);
    else setMsg(String(r.data.error || pf(lang, "errFailedOffice")));
  }
  return <article data-testid="missed-card" className="rounded-[22px] border border-red-500/35 bg-red-950/25 p-4">
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="min-w-0 truncate text-[19px] font-semibold">{row.name}</h3>
      <span className="shrink-0 text-[15px] font-semibold tabular-nums text-red-300">{hm(row.hours)}</span>
    </div>
    <p className="mt-0.5 text-[15px] text-neutral-300">
      {row.endedAt ? pf(lang, "missedLong", { hours: Math.round(row.hours) }) + ` · ${shortDay(row.startedAt, lang)}` : pf(lang, "missedOpenSince", { when })}
    </p>
    {row.askedAt && <p className="mt-1 flex items-center gap-1.5 text-[14px] text-emerald-300"><Check aria-hidden className="h-4 w-4" />{pf(lang, "askedAt", { time: fmtTime(row.askedAt, lang) })}</p>}
    {msg && <p role="alert" className="mt-2 rounded-xl bg-red-950/60 p-2.5 text-sm text-red-300">{msg}</p>}
    <div className="mt-3 grid grid-cols-2 gap-2">
      <button type="button" disabled={busy || !row.hasPhone || (!!row.askedAt && now - Date.parse(row.askedAt) < 3600_000)} onClick={ask} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-neutral-100 px-2 text-[15px] font-bold text-black disabled:opacity-40">
        <MessageSquareText aria-hidden className="h-5 w-5 shrink-0" />{busy ? "…" : row.askedAt ? pf(lang, "asked") : pf(lang, "askWorker")}
      </button>
      <button type="button" onClick={() => onFix(row)} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-neutral-800 text-[15px] font-semibold">
        <PencilLine aria-hidden className="h-5 w-5" />{pf(lang, "fix")}
      </button>
    </div>
  </article>;
}

function FixSheet({ row, lang, workEnd, onClose, onSaved }: { row: MissedRow; lang: string; workEnd: string; onClose: () => void; onSaved: () => void }) {
  const day = shopDateKey(row.startedAt);
  const [time, setTime] = useState(() => {
    const end = Date.parse(fromShopInput(`${day}T${workEnd}`));
    return end > Date.parse(row.startedAt) ? workEnd : hhmm(new Date(Date.parse(row.startedAt) + 3600_000).toISOString());
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    const end = atDay(day, time);
    if (Date.parse(end) <= Date.parse(row.startedAt)) { setError(tf(lang, "errOrder")); return; }
    setBusy(true); setError("");
    const r = row.endedAt
      ? await post({ type: "shift_edit", shiftId: row.shiftId, startedAt: row.startedAt, endedAt: end, note: `Clock-out fixed in Ponto (was ${row.endedAt}).` })
      : await post({ type: "shift_force_stop", shiftId: row.shiftId, endedAt: end, note: `Closed in Ponto — ${row.name} did not tap out.` });
    setBusy(false);
    if (r.ok) onSaved();
    else if (!r.data.cancelled) setError(String(r.data.error || pf(lang, "errFailedOffice")));
  }
  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 sm:items-center" onClick={onClose} role="dialog" aria-modal="true" aria-label={pf(lang, "fix")}>
    <section className="w-full rounded-t-[28px] border border-white/10 bg-neutral-900 px-5 pt-6 pb-[max(24px,env(safe-area-inset-bottom))] sm:max-w-md sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
      <h2 className="text-[22px] font-semibold tracking-tight">{row.name}</h2>
      <p className="mt-1 text-[15px] text-neutral-400">{longDay(row.startedAt, lang)} · {tf(lang, "edgeIn")} {fmtTime(row.startedAt, lang)}</p>
      <label className="mt-4 block">
        <span className="text-[15px] text-neutral-400">{pf(lang, "fixTime")}</span>
        <input aria-label={pf(lang, "fixTime")} type="time" value={time} onChange={(e) => { setTime(e.target.value); setError(""); }} className="mt-1 min-h-[72px] w-full rounded-[20px] bg-neutral-800 px-4 text-center text-[30px] font-semibold tabular-nums" />
      </label>
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-950/60 p-3 text-sm text-red-300">{error}</p>}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={onClose} className="min-h-14 rounded-2xl bg-neutral-800 text-base font-semibold">{pf(lang, "cancel")}</button>
        <button type="button" disabled={busy || !time} onClick={save} className="min-h-14 rounded-2xl bg-emerald-500 text-base font-bold text-black disabled:opacity-50">{busy ? "…" : pf(lang, "save")}</button>
      </div>
    </section>
  </div>;
}

function WeekCard({ row, lang, weekKey, selfId, money, onApproved }: { row: WeekRow; lang: string; weekKey: string; selfId: string; money: boolean; onApproved: (msg: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const own = row.workerId === selfId;
  const reasonKey = { open: "holdOpen", missed: "holdMissed", request: "holdRequest", window: "holdWindow" } as const;
  async function approve() {
    if (!window.confirm(pf(lang, "approveConfirm", { n: row.approve, name: firstName(row.name) }))) return;
    setBusy(true); setError("");
    const r = await post({ type: "week_approve", workerId: row.workerId, week: weekKey });
    setBusy(false);
    if (r.ok) onApproved(pf(lang, "approveDone", { name: firstName(row.name), n: Number(r.data.approved ?? 0) }));
    else setError(String(r.data.error || pf(lang, "errFailedOffice")));
  }
  const allDone = row.approve === 0 && row.held.length === 0 && row.approved > 0;
  return <article data-testid="week-card" className="rounded-[22px] border border-white/10 bg-neutral-900/60 p-4">
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="min-w-0 truncate text-[19px] font-semibold">{row.name}</h3>
      <span className="shrink-0 text-right">
        <span className="block text-[22px] font-semibold tabular-nums">{hm(row.hours)}</span>
        {money && row.pay != null && <span className="block text-[14px] tabular-nums text-emerald-300">{row.pay.toLocaleString(lang === "pt" ? "pt-BR" : lang === "es" ? "es-US" : "en-US", { style: "currency", currency: "USD" })}{row.missingRate || row.held.length ? " + ?" : ""}</span>}
      </span>
    </div>
    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[14px] tabular-nums text-neutral-400">
      {row.days.map((d) => <li key={d.day}><span className="text-neutral-500">{shortDay(dayNoon(d.day), lang).split(" ")[0]}</span> {d.hours > 0 ? hm(d.hours) : "—"}</li>)}
    </ul>
    <p className="mt-2 text-[14px] text-neutral-400">
      {row.approved > 0 && <span className="text-emerald-300">{pf(lang, "approvedCount", { n: row.approved })}</span>}
      {row.approved > 0 && row.approve > 0 && " · "}
      {row.approve > 0 && <span>{pf(lang, "toApprove", { n: row.approve })}</span>}
    </p>
    {row.held.length > 0 && <p className="mt-1 flex items-start gap-1.5 text-[14px] text-amber-300">
      <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      {pf(lang, "reviewFirst", { list: row.held.map((h) => `${shortDay(dayNoon(h.day), lang)} (${pf(lang, reasonKey[h.reason])})`).join(", ") })}
    </p>}
    {error && <p role="alert" className="mt-2 rounded-xl bg-red-950/60 p-2.5 text-sm text-red-300">{error}</p>}
    {own ? <p className="mt-3 text-[14px] text-neutral-500">{pf(lang, "ownWeek")}</p>
      : allDone ? <p className="mt-3 flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 text-[16px] font-semibold text-emerald-300"><Check aria-hidden className="h-5 w-5" />{pf(lang, "weekApproved")}</p>
      : <button type="button" disabled={busy || row.approve === 0} onClick={approve} className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-[17px] font-bold text-black disabled:bg-neutral-800 disabled:text-neutral-500">
          <Check aria-hidden className="h-5 w-5" strokeWidth={2.6} />{busy ? "…" : row.approve === 0 ? pf(lang, "nothingToApprove") : pf(lang, "approveWeek")}
        </button>}
  </article>;
}

export default function PontoClient({ data, pending, lang, owner, selfId, children }: { data: PontoData; pending: FixCard[]; lang: string; owner: boolean; selfId: string; children?: React.ReactNode }) {
  const router = useRouter();
  const [, transition] = useTransition();
  // The server list, lowered locally as cards are answered; a refresh brings a new list.
  const [cardState, setCardState] = useState({ base: pending, list: pending });
  const cards = cardState.base === pending ? cardState.list : pending;
  const setCards = (f: (l: FixCard[]) => FixCard[]) => setCardState({ base: pending, list: f(cards) });
  const [asked, setAsked] = useState<Record<string, string>>({});
  const [fixing, setFixing] = useState<MissedRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState(data.now);
  const refresh = () => transition(() => router.refresh());
  useEffect(() => {
    const id = window.setInterval(() => { if (document.visibilityState === "visible") { setNow(Date.now()); router.refresh(); } }, 60_000);
    return () => window.clearInterval(id);
  }, [router]);
  function say(msg: string) { setToast(msg); window.setTimeout(() => setToast(null), 5000); }

  const missed = data.missed.map((m) => ({ ...m, askedAt: asked[m.shiftId] ?? m.askedAt }));
  const elapsed = (startedAt: string) => (now - Date.parse(startedAt)) / 3600_000;

  return <div className="space-y-7">
    {toast && <div role="status" className="fixed inset-x-4 top-[max(12px,env(safe-area-inset-top))] z-[80] rounded-2xl bg-emerald-500 px-4 py-3 text-center text-base font-bold text-black shadow-2xl">✓ {toast}</div>}

    {missed.length > 0 && <Section title={pf(lang, "missedTitle")} count={missed.length} icon={AlertTriangle} tone="text-red-400" testId="ponto-missed">
      <div className="space-y-3">{missed.map((m) => <MissedCard key={m.shiftId} row={m} lang={lang} now={now} onFix={setFixing} onAsked={(id, at) => { setAsked((a) => ({ ...a, [id]: at })); say(pf(lang, "asked")); }} />)}</div>
    </Section>}

    <Section title={pf(lang, "workingNow")} count={data.working.length} icon={Users} tone="text-emerald-400" testId="ponto-working">
      {data.working.length ? <div className="overflow-hidden rounded-[22px] border border-white/10 bg-neutral-900/60">
        {data.working.map((w) => <div key={w.shiftId} className="flex min-h-[64px] items-center gap-3 border-b border-white/5 px-4 py-3 last:border-0">
          <span aria-hidden className={`h-3 w-3 shrink-0 rounded-full ${w.onBreak ? "bg-amber-400" : "bg-emerald-400"}`} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[17px] font-semibold">{w.name}</span>
            <span className="block text-[14px] text-neutral-400">{pf(lang, "since", { time: fmtTime(w.startedAt, lang) })}{w.onBreak ? ` · ${pf(lang, "onBreak")}` : ""}</span>
          </span>
          <span className="shrink-0 text-[17px] font-semibold tabular-nums">{hm(elapsed(w.startedAt))}</span>
        </div>)}
      </div> : <Empty text={pf(lang, "nobodyWorking")} />}
    </Section>

    <Section title={pf(lang, "todayHours")} icon={Clock3} tone="text-sky-400" testId="ponto-today">
      {data.today.length ? <div className="overflow-hidden rounded-[22px] border border-white/10 bg-neutral-900/60">
        {data.today.map((r) => <div key={r.workerId} className="flex min-h-[56px] items-center gap-3 border-b border-white/5 px-4 py-2.5 last:border-0">
          <span className="min-w-0 flex-1 truncate text-[17px]">{r.name}</span>
          {r.open && <span className="shrink-0 text-[13px] text-emerald-300">{pf(lang, "openNow")}</span>}
          {r.held && <span className="shrink-0 text-[13px] text-amber-300">{pf(lang, "held")}</span>}
          <span className="w-16 shrink-0 text-right text-[17px] font-semibold tabular-nums">{hm(r.hours)}</span>
        </div>)}
      </div> : <Empty text={pf(lang, "nobodyToday")} />}
    </Section>

    <Section title={pf(lang, "requestsTitle")} count={cards.length} icon={ClipboardClock} tone="text-amber-300" testId="ponto-requests">
      {cards.length ? <div className="space-y-3">{cards.map((c) => <FixCardView key={c.id} card={c} lang={lang} onDone={(id) => { setCards((l) => l.filter((x) => x.id !== id)); refresh(); }} />)}</div>
        : <Empty text={pf(lang, "noRequests")} />}
    </Section>

    {children}

    <Section title={pf(lang, "weekSummary")} icon={Check} tone="text-emerald-400" testId="ponto-week">
      <div className="mb-3 grid grid-cols-2 gap-2" role="tablist">
        {data.weeks.map((w) => <Link key={w.key} role="tab" aria-selected={w.key === data.weekKey} href={w.label === "thisWeek" ? "/shop/ponto" : `/shop/ponto?week=${w.key}`} replace scroll={false} className={`flex min-h-12 items-center justify-center rounded-2xl text-[15px] font-semibold ${w.key === data.weekKey ? "bg-neutral-100 text-black" : "border border-white/10 bg-neutral-900/60 text-neutral-300"}`}>{pf(lang, w.label)}</Link>)}
      </div>
      {data.week.length ? <div className="space-y-3">{data.week.map((r) => <WeekCard key={r.workerId} row={r} lang={lang} weekKey={data.weekKey} selfId={selfId} money={data.money} onApproved={(msg) => { say(msg); refresh(); }} />)}</div>
        : <Empty text={pf(lang, "nobodyToday")} />}
      <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">{pf(lang, "whyHeld")}</p>
    </Section>

    <Section title={pf(lang, "moreTools")} icon={ChevronRight} tone="text-neutral-500" testId="ponto-more">
      <nav className="overflow-hidden rounded-[22px] border border-white/10 bg-neutral-900/60">
        {[
          { href: "/shop/time-fixes", label: pf(lang, "allFixes"), icon: ClipboardClock, show: true },
          { href: "/shop/admin/time", label: pf(lang, "oldTimesheets"), icon: Clock3, show: owner },
          { href: "/shop/admin/payroll", label: pf(lang, "payroll"), icon: Banknote, show: owner },
          { href: "/shop/admin/time#locations", label: pf(lang, "locations"), icon: MapPin, show: owner },
        ].filter((l) => l.show).map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex min-h-[60px] items-center gap-3 border-b border-white/5 px-4 last:border-0 active:bg-neutral-800">
          <Icon aria-hidden className="h-5 w-5 shrink-0 text-neutral-400" /><span className="min-w-0 flex-1 text-[16px]">{label}</span><ChevronRight aria-hidden className="h-4 w-4 text-neutral-500" />
        </Link>)}
      </nav>
    </Section>

    {fixing && <FixSheet row={fixing} lang={lang} workEnd={data.workEnd} onClose={() => setFixing(null)} onSaved={() => { setFixing(null); say(pf(lang, "save")); refresh(); }} />}
  </div>;
}
