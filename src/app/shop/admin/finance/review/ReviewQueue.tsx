"use client";
import { useMemo, useState } from "react";
import { reviewKind, type ReviewKind } from "@/lib/shop/finance";
import TagControls, { type TagTx } from "../TagControls";
import { L, shortDate, usd } from "../ui";

export type ReviewItem = TagTx & { account: string; posted_on: string };

const KINDS: { id: ReviewKind | "all"; label: [string, string, string] }[] = [
  { id: "all", label: ["All", "Todas", "Todas"] },
  { id: "restaurants", label: ["Restaurants", "Restaurantes", "Restaurantes"] },
  { id: "hotels", label: ["Hotels & travel", "Hotéis e viagens", "Hoteles y viajes"] },
  { id: "cards", label: ["Card payments", "Pagamentos de cartão", "Pagos de tarjeta"] },
  { id: "online", label: ["Online purchases", "Compras online", "Compras en línea"] },
  { id: "zelle", label: ["Zelle & checks", "Zelle e cheques", "Zelle y cheques"] },
  { id: "income", label: ["Money in", "Entradas", "Entradas"] },
  { id: "other", label: ["Other", "Outros", "Otros"] },
];

export default function ReviewQueue({ items, lang }: { items: ReviewItem[]; lang: string }) {
  const [list, setList] = useState(items);
  const [kind, setKind] = useState<ReviewKind | "all">("all");
  const [sort, setSort] = useState<"big" | "new">("big");
  const [shown, setShown] = useState(40);
  const [done, setDone] = useState(0);

  const withKind = useMemo(() => list.map((t) => ({ ...t, kind: reviewKind(t) })), [list]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: withKind.length };
    for (const t of withKind) c[t.kind] = (c[t.kind] || 0) + 1;
    return c;
  }, [withKind]);
  // Dollar total per filter (money out shown as a positive amount).
  const sums = useMemo(() => {
    const s: Record<string, number> = { all: 0 };
    for (const t of withKind) { const a = Math.abs(t.amount); s.all += a; s[t.kind] = (s[t.kind] || 0) + a; }
    return s;
  }, [withKind]);
  const vendorCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of list) { const k = `${t.vendor}|${t.amount < 0}`; m.set(k, (m.get(k) || 0) + 1); }
    return m;
  }, [list]);
  const visible = useMemo(() => {
    const v = withKind.filter((t) => kind === "all" || t.kind === kind);
    v.sort(sort === "big" ? (a, b) => Math.abs(b.amount) - Math.abs(a.amount) : (a, b) => b.posted_on.localeCompare(a.posted_on));
    return v;
  }, [withKind, kind, sort]);

  function saved(id: string, r: { vendor: string; out: boolean; wholeVendor: boolean }) {
    setList((prev) => {
      const next = prev.filter((t) => t.id !== id && !(r.wholeVendor && t.vendor === r.vendor && t.amount < 0 === r.out));
      setDone((d) => d + (prev.length - next.length));
      return next;
    });
  }

  if (!list.length) {
    return <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center text-emerald-200">{L(lang, "All caught up — every transaction has a decision.", "Tudo em dia — todas as transações foram decididas.", "Todo al día — cada movimiento tiene su decisión.")}</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-400">
        {L(lang, "Tap who each one belongs to. It moves straight to that person or to KIW's expenses.", "Toque de quem é cada uma. Vai direto para a pessoa ou para as despesas da KIW.", "Toca de quién es cada uno. Pasa directo a esa persona o a los gastos de KIW.")}
        {done > 0 && <span className="ml-2 font-semibold text-emerald-300">{done} {L(lang, "done", "feitas", "hechos")} ✓</span>}
      </p>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
        {KINDS.filter((k) => k.id === "all" || counts[k.id]).map((k) => (
          <button key={k.id} onClick={() => { setKind(k.id); setShown(40); }} className={`flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-sm ${kind === k.id ? "border-amber-400 bg-amber-400/15 text-amber-200" : "border-white/15 text-neutral-400"}`}>
            {L(lang, ...k.label)} <span className="text-xs opacity-70">{counts[k.id] || 0} · {usd(sums[k.id] || 0)}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <div className="flex gap-2">
          <button onClick={() => setSort("big")} className={sort === "big" ? "font-semibold text-amber-300" : "text-neutral-500"}>{L(lang, "Biggest first", "Maiores primeiro", "Mayores primero")}</button>
          <span className="text-neutral-600">·</span>
          <button onClick={() => setSort("new")} className={sort === "new" ? "font-semibold text-amber-300" : "text-neutral-500"}>{L(lang, "Newest first", "Mais recentes", "Más recientes")}</button>
        </div>
        <span className="text-neutral-400" aria-live="polite">
          {counts[kind] || 0} · <span className="text-lg font-semibold tabular-nums text-neutral-100">{usd(sums[kind] || 0, true)}</span>
        </span>
      </div>
      <ul className="space-y-3">
        {visible.slice(0, shown).map((t) => (
          <li key={t.id} className="rounded-2xl border border-white/10 bg-neutral-900 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-sm text-neutral-100">{t.description}</p>
                <p className="mt-1 text-xs text-neutral-500">{shortDate(t.posted_on)} · …{t.account} · {t.vendor}</p>
              </div>
              <span className={`shrink-0 text-lg font-semibold tabular-nums ${t.amount < 0 ? "text-neutral-100" : "text-emerald-300"}`}>{usd(t.amount, true)}</span>
            </div>
            <TagControls tx={t} lang={lang} sameVendorCount={(vendorCounts.get(`${t.vendor}|${t.amount < 0}`) || 1) - 1} onSaved={(r) => saved(t.id, r)} />
          </li>
        ))}
      </ul>
      {visible.length > shown && (
        <button onClick={() => setShown(shown + 40)} className="min-h-12 w-full rounded-xl border border-white/15 text-neutral-300">
          {L(lang, "Show more", "Mostrar mais", "Mostrar más")} ({visible.length - shown})
        </button>
      )}
    </div>
  );
}
