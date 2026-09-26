"use client";
import { useMemo, useRef, useState } from "react";
import { EXPENSE_CATEGORIES, NEEDS_CATEGORY } from "@/lib/shop/finance";
import { L, shortDate, usd } from "../ui";

export type CatItem = { id: string; account: string; posted_on: string; description: string; amount: number; vendor: string };

const CHOICES = EXPENSE_CATEGORIES.filter((c) => !(NEEDS_CATEGORY as readonly string[]).includes(c));

function Row({ t, lang, sameVendor, onSaved }: { t: CatItem; lang: string; sameVendor: number; onSaved: (whole: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  const [whole, setWhole] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  async function pick(category: string) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const res = await fetch("/shop/api/finance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "tag", ids: [t.id], tag: { grp: "expense", owner: "kiw", category }, applyToVendor: whole }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Could not save");
      onSaved(whole);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save"); }
    finally { lock.current = false; setBusy(false); }
  }
  return (
    <li className="rounded-2xl border border-white/10 bg-neutral-900 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm text-neutral-100">{t.description}</p>
          <p className="mt-1 text-xs text-neutral-500">{shortDate(t.posted_on)} · …{t.account} · {t.vendor}</p>
        </div>
        <span className="shrink-0 text-lg font-semibold tabular-nums">{usd(t.amount, true)}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {CHOICES.map((c) => (
          <button key={c} disabled={busy} onClick={() => pick(c)} className="min-h-10 rounded-lg border border-white/15 px-3 text-xs text-neutral-200 hover:border-amber-400 disabled:opacity-50">{c}</button>
        ))}
      </div>
      {sameVendor > 0 && (
        <label className="mt-3 flex items-center gap-2 text-sm text-neutral-300">
          <input type="checkbox" className="h-5 w-5 accent-amber-400" checked={whole} onChange={(e) => setWhole(e.target.checked)} />
          {L(lang, `Same category for all ${sameVendor + 1} from this supplier, now and in the future`, `Mesma categoria para as ${sameVendor + 1} deste fornecedor, agora e no futuro`, `Misma categoría para los ${sameVendor + 1} de este proveedor, ahora y en el futuro`)}
        </label>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
    </li>
  );
}

export default function CategorizeQueue({ items, lang }: { items: CatItem[]; lang: string }) {
  const [list, setList] = useState(items);
  const [shown, setShown] = useState(40);
  const vendorCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of list) m.set(t.vendor, (m.get(t.vendor) || 0) + 1);
    return m;
  }, [list]);
  const sorted = useMemo(() => [...list].sort((a, b) => a.amount - b.amount), [list]);

  if (!list.length) return <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center text-emerald-200">{L(lang, "Every business expense has a category.", "Todas as despesas da empresa têm categoria.", "Todos los gastos de la empresa tienen categoría.")}</p>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-neutral-400">{L(lang, "These are KIW business expenses. Pick what kind of expense each one is.", "Estas são despesas da KIW. Escolha o tipo de cada uma.", "Estos son gastos de KIW. Elige el tipo de cada uno.")}</p>
        <span className="text-sm text-neutral-400">{list.length} · <span className="text-lg font-semibold tabular-nums text-neutral-100">{usd(list.reduce((a, t) => a + Math.abs(t.amount), 0), true)}</span></span>
      </div>
      <ul className="space-y-3">
        {sorted.slice(0, shown).map((t) => (
          <Row key={t.id} t={t} lang={lang} sameVendor={(vendorCounts.get(t.vendor) || 1) - 1}
            onSaved={(whole) => setList((prev) => prev.filter((x) => x.id !== t.id && !(whole && x.vendor === t.vendor)))} />
        ))}
      </ul>
      {sorted.length > shown && <button onClick={() => setShown(shown + 40)} className="min-h-12 w-full rounded-xl border border-white/15 text-neutral-300">{L(lang, "Show more", "Mostrar mais", "Mostrar más")} ({sorted.length - shown})</button>}
    </div>
  );
}
