"use client";

// Owner-only: what the customer sent us, waiting to be kept or turned down.
// The parent renders this only for canViewOwnerFinancials workers and the API
// re-checks; crew never receive the pending rows at all.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CustomerNote, Photo } from "@/lib/shop/shared";
import { fmtDateTime } from "@/lib/shop/shared";
import { CUSTOMER_PHOTO_CATEGORY, KEEP_CATEGORIES } from "@/lib/shop/customer-files";

export default function CustomerFilesReview({
  jobId, pending, notes, keptCount, lastEmailSync, lang,
}: {
  jobId: string;
  pending: Photo[];
  notes: CustomerNote[];
  keptCount: number;
  lastEmailSync: string | null;
  lang: string;
}) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [cats, setCats] = useState<Record<string, string>>({});
  const label = (en: string, pt: string, es: string) => (lang === "pt" ? pt : lang === "es" ? es : en);
  const waiting = pending.length + notes.length;

  async function post(key: string, payload: Record<string, unknown>) {
    setBusy(key);
    setMsg(null);
    try {
      const res = await fetch("/shop/api/customer-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, ...payload }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setMsg(d.error || label("Could not save", "Não foi possível salvar", "No se pudo guardar"));
      else if (payload.action === "pull") {
        setMsg(
          d.photos || d.notes
            ? label(`Imported ${d.photos} photo(s), ${d.notes} note(s)`, `Importado: ${d.photos} foto(s), ${d.notes} nota(s)`, `Importado: ${d.photos} foto(s), ${d.notes} nota(s)`)
            : d.errors?.length
              ? d.errors[0]
              : label("Nothing new", "Nada novo", "Nada nuevo"),
        );
      }
      startTransition(() => router.refresh());
    } catch {
      setMsg(label("Network error", "Erro de rede", "Error de red"));
    } finally {
      setBusy(null);
    }
  }

  const disabled = !!busy || refreshing;
  const btn = "min-h-11 rounded-lg px-3 text-sm font-semibold disabled:opacity-50";

  return (
    <section className="mx-auto max-w-4xl px-4 pt-4">
      <div className="rounded-2xl border border-amber-500/30 bg-neutral-900 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-amber-300">{label("Review customer files", "Revisar arquivos do cliente", "Revisar archivos del cliente")}</h2>
            <p className="text-sm text-neutral-400">
              {label(`${waiting} waiting · ${keptCount} kept`, `${waiting} aguardando · ${keptCount} aprovados`, `${waiting} pendientes · ${keptCount} aprobados`)}
            </p>
          </div>
          <button disabled={disabled} onClick={() => post("pull", { action: "pull" })} className={`${btn} border border-amber-500/50 text-amber-300`}>
            {busy === "pull" ? label("Pulling…", "Buscando…", "Buscando…") : label("Pull from GHL", "Buscar no GHL", "Traer de GHL")}
          </button>
        </div>
        {msg && <p role="status" className="mt-2 text-sm text-neutral-300">{msg}</p>}

        {pending.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {pending.map((p) => {
              const cat = cats[p.id] || CUSTOMER_PHOTO_CATEGORY;
              return (
                <div key={p.id} className="overflow-hidden rounded-xl border border-white/10 bg-neutral-950">
                  {p.signedUrl ? (
                    <a href={p.signedUrl} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.signedUrl} alt={p.source_note || ""} className="h-36 w-full object-cover" />
                    </a>
                  ) : (
                    <div className="h-36 w-full bg-neutral-800" />
                  )}
                  <div className="space-y-2 p-2">
                    <p className="truncate text-xs text-neutral-500">
                      {[p.source_note, p.source_at ? fmtDateTime(p.source_at, lang) : null].filter(Boolean).join(" · ")}
                    </p>
                    <select
                      value={cat}
                      onChange={(e) => setCats({ ...cats, [p.id]: e.target.value })}
                      className="min-h-10 w-full rounded-lg border border-white/20 bg-neutral-900 px-2 text-sm"
                      aria-label={label("Category", "Categoria", "Categoría")}
                    >
                      {KEEP_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <button disabled={disabled} onClick={() => post(p.id, { action: "review", kind: "photo", id: p.id, decision: "keep", category: cat })} className={`${btn} flex-1 bg-amber-400 text-neutral-950`}>
                        {label("Keep", "Manter", "Mantener")}
                      </button>
                      <button disabled={disabled} onClick={() => post(p.id, { action: "review", kind: "photo", id: p.id, decision: "reject" })} className={`${btn} flex-1 border border-white/20`}>
                        {label("Reject", "Rejeitar", "Rechazar")}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {notes.length > 0 && (
          <ul className="mt-4 space-y-3">
            {notes.map((n) => (
              <li key={n.id} className="rounded-xl border border-white/10 bg-neutral-950 p-3">
                <blockquote className="whitespace-pre-line border-l-2 border-amber-500/60 pl-3 text-[15px] text-neutral-200">{n.body}</blockquote>
                <p className="mt-1 text-xs text-neutral-500">
                  {[n.source === "ghl" ? "GoHighLevel" : n.source === "email" ? "Email" : n.source, n.message_at ? fmtDateTime(n.message_at, lang) : null].filter(Boolean).join(" · ")}
                </p>
                <div className="mt-2 flex gap-2">
                  <button disabled={disabled} onClick={() => post(n.id, { action: "review", kind: "note", id: n.id, decision: "keep" })} className={`${btn} bg-amber-400 text-neutral-950`}>
                    {label("Keep", "Manter", "Mantener")}
                  </button>
                  <button disabled={disabled} onClick={() => post(n.id, { action: "review", kind: "note", id: n.id, decision: "reject" })} className={`${btn} border border-white/20`}>
                    {label("Reject", "Rejeitar", "Rechazar")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {lastEmailSync && (
          <p className="mt-3 text-xs text-neutral-500">
            {label("Email last checked", "E-mail verificado em", "Correo revisado")} {fmtDateTime(lastEmailSync, lang)}
          </p>
        )}
      </div>
    </section>
  );
}
