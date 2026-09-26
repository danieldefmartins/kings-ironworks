"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import TagControls, { type TagTx } from "../TagControls";
import { GROUP_LABEL, L, shortDate, usd } from "../ui";

export type TxItem = TagTx & { account: string; posted_on: string; tag_source: string };

const OWNER_TONE: Record<string, string> = { kiw: "text-emerald-300", daniel: "text-sky-300", reginaldo: "text-rose-300" };

export default function TxList({ items, lang }: { items: TxItem[]; lang: string }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [, start] = useTransition();
  if (!items.length) return <p className="py-12 text-center text-neutral-500">{L(lang, "No transactions match.", "Nenhuma transação encontrada.", "Ningún movimiento coincide.")}</p>;
  return (
    <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-neutral-900">
      {items.map((t) => (
        <li key={t.id} className="p-4">
          <button className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setOpen(open === t.id ? null : t.id)} aria-expanded={open === t.id}>
            <span className="min-w-0">
              <span className="block break-words text-sm text-neutral-100">{t.description}</span>
              <span className="mt-1 block text-xs text-neutral-500">
                {shortDate(t.posted_on)} · {t.account === "cash" ? L(lang, "Cash", "Dinheiro", "Efectivo") : `…${t.account}`} ·{" "}
                <span className={t.owner ? OWNER_TONE[t.owner] : t.grp === "revenue" ? "text-sky-300" : t.grp === "review" ? "text-amber-300" : "text-neutral-400"}>
                  {L(lang, ...GROUP_LABEL[t.grp])}{t.owner && t.owner !== "kiw" ? ` · ${t.owner === "daniel" ? "Daniel" : "Kayky"}` : ""} · {t.category}
                </span>
                {t.tag_source === "rule" && <span className="ml-1 text-neutral-600">({L(lang, "merchant rule", "regra do fornecedor", "regla del comercio")})</span>}
              </span>
            </span>
            <span className={`shrink-0 font-semibold tabular-nums ${t.amount > 0 ? "text-emerald-300" : "text-neutral-100"}`}>{usd(t.amount, true)}</span>
          </button>
          {open === t.id && <TagControls tx={t} lang={lang} sameVendorCount={1} onSaved={() => { setOpen(null); start(() => router.refresh()); }} />}
        </li>
      ))}
    </ul>
  );
}
