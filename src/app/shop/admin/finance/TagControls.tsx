"use client";
import { useRef, useState } from "react";
import { EXPENSE_CATEGORIES, OWNER_CATEGORIES, TRANSFER_CATEGORIES, UNCATEGORIZED, canBeDaniel, reviewKind, type FinGroup, type FinOwner } from "@/lib/shop/finance";
import { L } from "./ui";

export interface TagTx { id: string; description: string; amount: number; category: string; vendor: string; grp: FinGroup; owner: FinOwner | null; posted_on?: string }
type Choice = { grp: FinGroup; owner: FinOwner | null; category: string };

function ownerDefault(tx: TagTx): string {
  switch (reviewKind(tx)) {
    case "restaurants": return "Restaurants";
    case "hotels": return "Travel / hotels";
    case "cards": return "Credit card";
    case "online": return "Online purchase";
    default: return "Personal (other)";
  }
}
// If we can't tell the business category, it lands in "Add category" for later.
function expenseDefault(tx: TagTx): string {
  if ((EXPENSE_CATEGORIES as readonly string[]).includes(tx.category)) return tx.category;
  const k = reviewKind(tx);
  return k === "restaurants" ? "Meals" : k === "hotels" ? "Travel" : k === "cards" ? "Credit card payment" : UNCATEGORIZED;
}

export default function TagControls({
  tx, lang, sameVendorCount = 0, onSaved,
}: {
  tx: TagTx;
  lang: string;
  sameVendorCount?: number;
  onSaved: (r: { vendor: string; out: boolean; wholeVendor: boolean }) => void;
}) {
  const out = tx.amount < 0;
  const danielOk = canBeDaniel(tx.posted_on);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  // Daniel, 2026-09-25: one answer should move every transaction from the same merchant —
  // except restaurants and hotels, which are decided one by one.
  const perTransaction = ["restaurants", "hotels"].includes(reviewKind(tx));
  const [wholeVendor, setWholeVendor] = useState(!perTransaction);
  const [expenseCat, setExpenseCat] = useState(expenseDefault(tx));
  const [ownerCat, setOwnerCat] = useState(out ? ownerDefault(tx) : "Owner money in");
  const lock = useRef(false);

  async function save(c: Choice) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const res = await fetch("/shop/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "tag", ids: [tx.id], tag: c, applyToVendor: wholeVendor && c.grp !== "review" }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Could not save");
      onSaved({ vendor: tx.vendor, out, wholeVendor: wholeVendor && c.grp !== "review" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally { lock.current = false; setBusy(false); }
  }

  const btn = "min-h-11 rounded-xl border px-3 text-sm font-semibold disabled:opacity-50";
  const sel = "min-h-10 rounded-lg border border-white/20 bg-neutral-950 px-2 text-sm";
  const isCurrent = (g: FinGroup, o: FinOwner | null) => tx.grp === g && tx.owner === o;
  const ring = (g: FinGroup, o: FinOwner | null) => (isCurrent(g, o) ? " ring-2 ring-amber-400" : "");

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2">
        {out ? (
          <>
            <button disabled={busy} onClick={() => save({ grp: "expense", owner: "kiw", category: expenseCat })} className={`${btn} border-emerald-500/40 bg-emerald-500/10 text-emerald-200${ring("expense", "kiw")}`}>KIW</button>
            {danielOk && <button disabled={busy} onClick={() => save({ grp: "owner", owner: "daniel", category: ownerCat })} className={`${btn} border-sky-500/40 bg-sky-500/10 text-sky-200${ring("owner", "daniel")}`}>Daniel</button>}
            <button disabled={busy} onClick={() => save({ grp: "owner", owner: "reginaldo", category: ownerCat })} className={`${btn} border-rose-500/40 bg-rose-500/10 text-rose-200${ring("owner", "reginaldo")}`}>Kayky</button>
          </>
        ) : (
          <>
            <button disabled={busy} onClick={() => save({ grp: "revenue", owner: null, category: "Customer payment" })} className={`${btn} border-emerald-500/40 bg-emerald-500/10 text-emerald-200${ring("revenue", null)}`}>{L(lang, "Customer payment", "Pagamento de cliente", "Pago de cliente")}</button>
            {danielOk && <button disabled={busy} onClick={() => save({ grp: "owner", owner: "daniel", category: "Owner money in" })} className={`${btn} border-sky-500/40 bg-sky-500/10 text-sky-200${ring("owner", "daniel")}`}>{L(lang, "Daniel put in", "Daniel colocou", "Daniel aportó")}</button>}
            <button disabled={busy} onClick={() => save({ grp: "owner", owner: "reginaldo", category: "Owner money in" })} className={`${btn} border-rose-500/40 bg-rose-500/10 text-rose-200${ring("owner", "reginaldo")}`}>{L(lang, "Kayky put in", "Kayky colocou", "Kayky aportó")}</button>
          </>
        )}
        <button disabled={busy} onClick={() => save({ grp: "transfer", owner: null, category: out ? "Not income / ignore" : "Not income / ignore" })} className={`${btn} border-white/15 text-neutral-300${ring("transfer", null)}`}>{L(lang, "Ignore", "Ignorar", "Ignorar")}</button>
        <button type="button" onClick={() => setOpen(!open)} className="min-h-11 px-2 text-sm text-amber-300 underline">{open ? L(lang, "Less", "Menos", "Menos") : L(lang, "Category…", "Categoria…", "Categoría…")}</button>
      </div>

      {sameVendorCount > 0 && (
        <label className="mt-2 flex items-center gap-2 text-sm text-neutral-300">
          <input type="checkbox" className="h-5 w-5 accent-amber-400" checked={wholeVendor} onChange={(e) => setWholeVendor(e.target.checked)} />
          {L(lang, `Same for all ${sameVendorCount + 1} from this merchant, now and in the future`, `Igual para todas as ${sameVendorCount + 1} deste fornecedor, agora e no futuro`, `Igual para las ${sameVendorCount + 1} de este comercio, ahora y en el futuro`)}
        </label>
      )}

      {open && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {out && (
            <label className="text-xs text-neutral-400">{L(lang, "If KIW — category", "Se KIW — categoria", "Si KIW — categoría")}
              <select className={`${sel} mt-1 w-full`} value={expenseCat} onChange={(e) => setExpenseCat(e.target.value)}>
                {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
          )}
          <label className="text-xs text-neutral-400">{L(lang, "If personal — category", "Se pessoal — categoria", "Si personal — categoría")}
            <select className={`${sel} mt-1 w-full`} value={ownerCat} onChange={(e) => setOwnerCat(e.target.value)}>
              {OWNER_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            {TRANSFER_CATEGORIES.map((c) => (
              <button key={c} disabled={busy} onClick={() => save({ grp: "transfer", owner: null, category: c })} className="min-h-10 rounded-lg border border-white/15 px-3 text-xs text-neutral-300">{c}</button>
            ))}
            {!out && <button disabled={busy} onClick={() => save({ grp: "revenue", owner: null, category: "Other income" })} className="min-h-10 rounded-lg border border-white/15 px-3 text-xs text-neutral-300">Other income</button>}
            {tx.grp !== "review" && <button disabled={busy} onClick={() => save({ grp: "review", owner: null, category: tx.category })} className="min-h-10 rounded-lg border border-amber-500/40 px-3 text-xs text-amber-300">{L(lang, "Back to review", "Voltar para revisão", "Volver a revisión")}</button>}
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  );
}
