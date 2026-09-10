"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { JobMoneyLedger, MoneyChange } from "@/lib/shop/money-ledger";
export default function JobMoneyManager({ jobId, ledger, lang }: { jobId: string; ledger: JobMoneyLedger | null; lang: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const lock = useRef(false);
  const requestId = useRef<string | null>(null);
  const [error, setError] = useState("");
  const [kind, setKind] = useState("payment");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [review, setReview] = useState<MoneyChange | null>(null);
  const label = (en: string, pt: string, es: string) => lang === "pt" ? pt : lang === "es" ? es : en;
  const money = (n: number | string) => Number(n).toLocaleString(lang === "pt" ? "pt-BR" : lang === "es" ? "es-US" : "en-US", { style: "currency", currency: "USD" });
  async function save(change: MoneyChange) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const res = await fetch("/shop/api/job-money", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId, change }) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setReview(null); setAmount(""); setDescription(""); setDate(""); requestId.current = null;
      startTransition(() => router.refresh());
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save"); }
    finally { lock.current = false; setBusy(false); }
  }
  if (!ledger) return <p role="alert" className="mx-auto mt-4 max-w-4xl px-4 text-amber-300">{label("Money ledger could not load. Refresh before changing financial records.", "Não foi possível carregar os lançamentos. Atualize antes de alterar valores.", "No se pudo cargar el registro. Actualiza antes de cambiar los importes.")}</p>;
  const pending = ledger.estimates.filter(e => e.money_status === "review");
  const inputClass = "min-h-12 w-full rounded-lg border border-white/20 bg-neutral-950 px-3 py-2";
  return <section className="mx-auto max-w-4xl px-4 pt-4">
    {pending.length > 0 && <p role="status" className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">{label("Totals need review", "Totais precisam de revisão", "Totales pendientes de revisión")}: {pending.map(e => e.estimate_number).join(", ")}. {label("Choose how each estimate affects the contract below. Unreviewed estimates are not added automatically.", "Escolha abaixo como cada orçamento entra no contrato. Orçamentos pendentes não são somados automaticamente.", "Elige cómo cada presupuesto afecta al contrato. Los pendientes no se suman automáticamente.")}</p>}
    <details className="rounded-2xl border border-amber-500/30 bg-neutral-900 p-4" open={pending.length > 0 || undefined}>
      <summary className="cursor-pointer py-2 font-bold text-amber-300">{label("Manage contract & payments · Daniel and Kayky", "Gerenciar contrato e pagamentos · Daniel e Kayky", "Gestionar contrato y pagos · Daniel y Kayky")}</summary>
      <p className="my-3 text-sm text-neutral-400">{label("Contract total = recorded contract entries. Money received = payments minus refunds. Every saved entry updates all job totals automatically. Only record money actually received.", "Contrato = lançamentos do contrato. Recebido = pagamentos menos reembolsos. Cada lançamento atualiza os totais automaticamente. Registre apenas valores realmente recebidos.", "Contrato = partidas del contrato. Recibido = pagos menos reembolsos. Cada registro actualiza todos los totales. Registra solo dinero recibido.")}</p>
      {ledger.estimates.map(e => <div key={e.id} className="my-3 rounded-xl border border-white/10 p-3">
        <p className="font-semibold">{e.estimate_number} · {e.title} · {money(e.total_amount)}</p>
        <p className="mt-1 text-sm text-neutral-400">{e.money_status === "review" ? label("Needs review", "Revisão pendente", "Revisión pendiente") : e.money_status === "added" ? label("Added to contract", "Somado ao contrato", "Sumado al contrato") : e.money_status === "included" ? label("Already included in recorded contract", "Já incluído no contrato registrado", "Ya incluido en el contrato registrado") : label("Excluded: reference / unsigned / replaced", "Excluído: referência / não assinado / substituído", "Excluido: referencia / sin firmar / sustituido")}{e.money_note && ` · ${e.money_note}`}</p>
        {e.money_status !== "added" && <div className="mt-3 flex flex-wrap gap-2">{([
          ["added", label("Add to contract", "Somar ao contrato", "Sumar al contrato")],
          ["included", label("Already included", "Já incluído", "Ya incluido")],
          ["excluded", label("Exclude from contract", "Excluir do contrato", "Excluir del contrato")],
        ] as const).map(([mode, text]) => <button key={mode} disabled={busy || refreshing} onClick={() => setReview({ action: "estimate", id: e.id, mode, description: "" })} className="min-h-11 rounded-lg border border-white/20 px-3 text-sm disabled:opacity-50">{text}</button>)}</div>}
      </div>)}
      <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); requestId.current ??= crypto.randomUUID(); const n = Number(amount); setReview({ action: "add", id: requestId.current, kind: kind === "payment" || kind === "refund" ? "payment" : "contract", amount: kind === "refund" || kind === "credit" ? -n : n, date: date || null, description }); }} onChange={() => { requestId.current = null; }}>
        <label className="text-sm">{label("Entry type", "Tipo de lançamento", "Tipo de registro")}<select className={inputClass} value={kind} onChange={e => setKind(e.target.value)}><option value="payment">{label("Payment received", "Pagamento recebido", "Pago recibido")}</option><option value="contract">{label("Contract / additional work", "Contrato / serviço adicional", "Contrato / trabajo adicional")}</option><option value="credit">{label("Contract reduction", "Redução do contrato", "Reducción del contrato")}</option><option value="refund">{label("Refund paid to customer", "Reembolso ao cliente", "Reembolso al cliente")}</option></select></label>
        <label className="text-sm">{label("Amount ($)", "Valor ($)", "Importe ($)")}<input className={inputClass} type="number" min="0" max="9999999999.99" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} /></label>
        <label className="text-sm">{label("Date (leave blank if unknown)", "Data (deixe em branco se desconhecida)", "Fecha (vacía si se desconoce)")}<input className={inputClass} type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
        <label className="text-sm">{label("Description / payment reference", "Descrição / referência do pagamento", "Descripción / referencia del pago")}<input className={inputClass} minLength={3} maxLength={1000} required value={description} onChange={e => setDescription(e.target.value)} /></label>
        <button disabled={busy || refreshing} className="min-h-12 rounded-lg bg-amber-400 px-4 font-bold text-neutral-950 disabled:opacity-50">{label("Review entry", "Revisar lançamento", "Revisar registro")}</button>
      </form>
      {review && <div className="mt-4 rounded-xl border border-amber-400 p-4" role="region" aria-label="Review money change">
        <p className="font-bold">{review.action === "add" ? `${review.kind === "contract" ? label("Contract change", "Alteração do contrato", "Cambio del contrato") : label("Money received change", "Alteração do recebido", "Cambio de recibido")}: ${money(review.amount)}` : review.action === "void" ? label("Void this entry and recalculate totals", "Anular lançamento e recalcular totais", "Anular registro y recalcular totales") : review.mode === "added" ? `${label("Increase contract by", "Aumentar contrato em", "Aumentar contrato en")} ${money(ledger.estimates.find(e => e.id === review.id)!.total_amount)}` : label("Record estimate treatment without changing the contract total", "Registrar classificação sem alterar o total do contrato", "Registrar clasificación sin cambiar el total del contrato")}</p>
        <label className="mt-3 block text-sm">{label("Reason / reference", "Motivo / referência", "Motivo / referencia")}<input className={inputClass} maxLength={1000} value={review.description} onChange={e => setReview({ ...review, description: e.target.value })} /></label>
        <div className="mt-3 flex gap-3"><button disabled={busy || refreshing || review.description.trim().length < 3} onClick={() => save(review)} className="min-h-12 rounded-lg bg-amber-400 px-4 font-bold text-neutral-950 disabled:opacity-50">{busy || refreshing ? label("Saving…", "Salvando…", "Guardando…") : label("Confirm and save", "Confirmar e salvar", "Confirmar y guardar")}</button><button disabled={busy} onClick={() => setReview(null)} className="min-h-12 px-3">{label("Cancel", "Cancelar", "Cancelar")}</button></div>
      </div>}
      {error && <p role="alert" className="mt-3 text-red-300">{error}</p>}
      <h3 className="mt-6 font-bold">{label("Contract and payment history", "Histórico do contrato e pagamentos", "Historial del contrato y pagos")}</h3>
      <ul className="mt-2 divide-y divide-white/10">{ledger.entries.map(e => <li key={e.id} className={`py-3 ${e.voided_at ? "text-neutral-500" : "text-neutral-200"}`}><div className="flex flex-wrap justify-between gap-2"><p className="min-w-0 break-words">{e.kind === "contract" ? label("Contract", "Contrato", "Contrato") : label("Payment", "Pagamento", "Pago")} · {e.description}</p><strong>{money(e.amount)}</strong></div><p className="text-xs text-neutral-400">{e.occurred_on || label("Date unknown", "Data desconhecida", "Fecha desconocida")}{e.voided_at && ` · ${label("Voided", "Anulado", "Anulado")}: ${e.void_reason}`}</p>{!e.voided_at && <button disabled={busy || refreshing} className="mt-1 min-h-10 text-xs text-amber-300 underline" onClick={() => setReview({ action: "void", id: e.id, description: "" })}>{label("Void incorrect entry", "Anular lançamento incorreto", "Anular registro incorrecto")}</button>}</li>)}</ul>
    </details>
  </section>;
}
