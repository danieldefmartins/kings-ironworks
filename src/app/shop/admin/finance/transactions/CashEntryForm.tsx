"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EXPENSE_CATEGORIES, OWNER_CATEGORIES, UNCATEGORIZED, canBeDaniel } from "@/lib/shop/finance";
import { L, usd } from "../ui";

type Who = "kiw" | "daniel" | "reginaldo" | "customer";

export default function CashEntryForm({ lang, today }: { lang: string; today: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<"out" | "in">("out");
  const [date, setDate] = useState(today);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [who, setWho] = useState<Who>("kiw");
  const [category, setCategory] = useState<string>("Labor & subcontractors");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [, start] = useTransition();
  const requestId = useRef<string | null>(null);

  const n = Number(amount);
  const danielOk = canBeDaniel(date);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!(n > 0)) return;
    requestId.current ??= crypto.randomUUID();
    const signed = direction === "out" ? -n : n;
    const list: readonly string[] = who === "kiw" ? EXPENSE_CATEGORIES : OWNER_CATEGORIES;
    const cat = list.includes(category) && category !== UNCATEGORIZED ? category : who === "kiw" ? "Labor & subcontractors" : "Personal (other)";
    const tag =
      who === "kiw" ? { grp: "expense", owner: "kiw", category: cat }
      : who === "customer" ? { grp: "revenue", owner: null, category: "Customer payment" }
      : { grp: "owner", owner: who, category: direction === "in" ? "Owner money in" : cat };
    setBusy(true); setError(""); setSaved("");
    try {
      const res = await fetch("/shop/api/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cash", id: requestId.current, date, description, amount: signed, tag }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Could not save");
      setSaved(`${description} · ${usd(signed, true)}`);
      requestId.current = null; setDescription(""); setAmount("");
      start(() => router.refresh());
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save"); }
    finally { setBusy(false); }
  }

  const input = "mt-1 min-h-11 w-full rounded-lg border border-white/20 bg-neutral-950 px-3 text-sm";
  const whoOptions: [Who, string][] = direction === "out"
    ? [["kiw", "KIW"], ...(danielOk ? [["daniel", "Daniel"] as [Who, string]] : []), ["reginaldo", "Kayky"]]
    : [["customer", L(lang, "Customer payment", "Pagamento de cliente", "Pago de cliente")], ...(danielOk ? [["daniel", L(lang, "Daniel put in", "Daniel colocou", "Daniel aportó")] as [Who, string]] : []), ["reginaldo", L(lang, "Kayky put in", "Kayky colocou", "Kayky aportó")]];
  const cats = who === "kiw" ? EXPENSE_CATEGORIES.filter((c) => c !== UNCATEGORIZED && c !== "Check") : OWNER_CATEGORIES;

  if (!open) return (
    <button onClick={() => setOpen(true)} className="min-h-11 rounded-xl border border-amber-500/40 px-4 text-sm font-semibold text-amber-300">
      + {L(lang, "Add cash paid or received", "Adicionar dinheiro pago ou recebido", "Agregar efectivo pagado o recibido")}
    </button>
  );

  return (
    <form onSubmit={submit} onChange={() => { requestId.current = null; }} className="grid gap-3 rounded-2xl border border-amber-500/30 bg-neutral-900 p-4 sm:grid-cols-2">
      <p className="text-sm text-neutral-400 sm:col-span-2">{L(lang, "For cash that never went through the bank (paying a worker in cash, a customer paying cash).", "Para dinheiro vivo que não passou pelo banco (pagar funcionário em dinheiro, cliente pagando em dinheiro).", "Para efectivo que no pasó por el banco.")}</p>
      <div className="flex gap-2 sm:col-span-2">
        {(["out", "in"] as const).map((d) => (
          <button type="button" key={d} onClick={() => { setDirection(d); setWho(d === "out" ? "kiw" : "customer"); }} className={`min-h-11 flex-1 rounded-lg border text-sm font-semibold ${direction === d ? "border-amber-400 bg-amber-400 text-neutral-950" : "border-white/15 text-neutral-300"}`}>
            {d === "out" ? L(lang, "Cash paid out", "Dinheiro pago", "Efectivo pagado") : L(lang, "Cash received", "Dinheiro recebido", "Efectivo recibido")}
          </button>
        ))}
      </div>
      <label className="text-sm">{L(lang, "Date", "Data", "Fecha")}<input type="date" required max={today} value={date} onChange={(e) => { setDate(e.target.value); if (!canBeDaniel(e.target.value) && who === "daniel") setWho("reginaldo"); }} className={input} /></label>
      <label className="text-sm">{L(lang, "Amount ($)", "Valor ($)", "Importe ($)")}<input type="number" required min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={input} /></label>
      <label className="text-sm sm:col-span-2">{L(lang, "What / who", "O quê / para quem", "Qué / a quién")}<input required minLength={3} maxLength={200} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={L(lang, "e.g. Cash to Kaio — labor", "ex.: Dinheiro para o Kaio — mão de obra", "ej.: Efectivo a Kaio — mano de obra")} className={input} /></label>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        {whoOptions.map(([w, label]) => (
          <button type="button" key={w} onClick={() => setWho(w)} className={`min-h-11 rounded-lg border px-4 text-sm font-semibold ${who === w ? "border-amber-400 bg-amber-400/15 text-amber-200" : "border-white/15 text-neutral-300"}`}>{label}</button>
        ))}
      </div>
      {direction === "out" && (
        <label className="text-sm sm:col-span-2">{L(lang, "Category", "Categoria", "Categoría")}
          <select value={(cats as readonly string[]).includes(category) ? category : cats[0]} onChange={(e) => setCategory(e.target.value)} className={input}>
            {cats.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
      )}
      <div className="flex gap-3 sm:col-span-2">
        <button disabled={busy || !(n > 0)} className="min-h-12 flex-1 rounded-lg bg-amber-400 font-bold text-neutral-950 disabled:opacity-50">{busy ? L(lang, "Saving…", "Salvando…", "Guardando…") : L(lang, "Save", "Salvar", "Guardar")}</button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-12 px-3 text-neutral-400">{L(lang, "Close", "Fechar", "Cerrar")}</button>
      </div>
      {saved && <p role="status" className="text-sm text-emerald-300 sm:col-span-2">✓ {saved}</p>}
      {error && <p role="alert" className="text-sm text-red-300 sm:col-span-2">{error}</p>}
    </form>
  );
}
