"use client";

// "Share job": text this job to crew members so the address, a maps link, the
// scope and the job link are on their phone. Money is never in the text.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Link2, Send, Share2 } from "lucide-react";

export interface ShareCrew { id: string; name: string; hasPhone: boolean }

type Result = { id: string; name: string; ok: boolean; reason?: "no_phone" | "send_failed" };

export default function ShareJob({ jobId, crew, selfId, lang }: {
  jobId: string; crew: ShareCrew[]; selfId: string; lang: string;
}) {
  const label = (en: string, pt: string, es: string) => lang === "pt" ? pt : lang === "es" ? es : en;
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [results, setResults] = useState<Result[] | null>(null);
  const [copied, setCopied] = useState(false);
  const others = crew.filter((w) => w.id !== selfId);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  function show() { setPicked(new Set()); setErr(null); setResults(null); setCopied(false); setOpen(true); }

  function toggle(id: string) {
    setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  async function send() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/shop/api/job-share", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, workerIds: [...picked] }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setErr(d.error || label("Could not send. Check your connection and try again.", "Não foi possível enviar. Verifique a conexão e tente de novo.", "No se pudo enviar. Revisa la conexión e inténtalo de nuevo."));
      else setResults(d.results as Result[]);
    } catch {
      setErr(label("No connection. Nothing was sent — try again.", "Sem conexão. Nada foi enviado — tente de novo.", "Sin conexión. No se envió nada — inténtalo de nuevo."));
    } finally { setBusy(false); }
  }

  async function copyLink() {
    const url = `${window.location.origin}/shop/job/${jobId}`;
    try {
      if (navigator.share) { await navigator.share({ url }); return; }
      await navigator.clipboard.writeText(url); setCopied(true);
    } catch { /* user cancelled the share sheet, or clipboard refused */ }
  }

  const failed = results?.filter((r) => !r.ok) ?? [];
  const sent = results?.filter((r) => r.ok) ?? [];

  const sheet = open && (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 p-4 sm:items-center" onClick={() => setOpen(false)}>
      <div role="dialog" aria-label={label("Share job", "Compartilhar obra", "Compartir trabajo")}
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-neutral-700 bg-neutral-900 p-4 pb-[max(16px,env(safe-area-inset-bottom))] text-neutral-100"
        onClick={(e) => e.stopPropagation()}>
        <div className="text-lg font-bold">{label("Share job", "Compartilhar obra", "Compartir trabajo")}</div>
        <p className="mt-0.5 mb-3 text-sm text-neutral-400">
          {label("They get a text with the address, directions, the scope and the job link. No prices.",
            "Eles recebem uma mensagem com endereço, como chegar, escopo e o link da obra. Sem valores.",
            "Reciben un mensaje con la dirección, cómo llegar, el alcance y el enlace del trabajo. Sin precios.")}
        </p>

        {results ? (
          <div className="space-y-2">
            {sent.length > 0 && <div className="rounded-xl border border-emerald-700/60 bg-emerald-950/40 p-3 text-emerald-300">
              <Check aria-hidden className="mr-1.5 inline h-5 w-5" />
              {label("Sent to", "Enviado para", "Enviado a")} {sent.map((r) => r.name).join(", ")}
            </div>}
            {failed.map((r) => <div key={r.id} role="alert" className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
              <b>{r.name}</b>: {r.reason === "no_phone"
                ? label("no phone number on file. Add it in Admin → Team & W-9, then share again.", "sem telefone cadastrado. Adicione em Admin → Equipe e W-9 e compartilhe de novo.", "sin teléfono registrado. Agrégalo en Admin → Equipo y W-9 y vuelve a compartir.")
                : label("the text did not go out. Try again, or send them the link another way.", "a mensagem não saiu. Tente de novo ou mande o link de outro jeito.", "el mensaje no salió. Inténtalo de nuevo o envía el enlace de otra forma.")}
            </div>)}
            <button type="button" onClick={() => setOpen(false)} className="min-h-[52px] w-full rounded-xl bg-amber-500 font-bold text-black active:bg-amber-400">
              {label("Done", "Pronto", "Listo")}
            </button>
          </div>
        ) : (
          <>
            {others.length === 0 ? (
              <p className="text-sm text-neutral-400">{label("No other active crew members yet. Add workers in Admin.", "Ainda não há outros membros ativos. Adicione em Admin.", "Aún no hay otros miembros activos. Agrégalos en Admin.")}</p>
            ) : (
              <ul className="-mx-1 flex-1 space-y-1.5 overflow-y-auto px-1">
                {others.map((w) => {
                  const on = picked.has(w.id);
                  return <li key={w.id}>
                    <button type="button" disabled={!w.hasPhone} onClick={() => toggle(w.id)} aria-pressed={on}
                      className={`flex min-h-[56px] w-full items-center gap-3 rounded-xl border px-4 text-left ${on ? "border-amber-500 bg-amber-500/10" : "border-neutral-700 bg-neutral-800"} disabled:opacity-50`}>
                      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${on ? "border-amber-500 bg-amber-500 text-black" : "border-neutral-500"}`}>
                        {on && <Check aria-hidden className="h-4 w-4" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold">{w.name}</span>
                        {!w.hasPhone && <span className="block text-xs text-neutral-400">{label("No phone on file — add it in Admin → Team & W-9", "Sem telefone — adicione em Admin → Equipe e W-9", "Sin teléfono — agrégalo en Admin → Equipo y W-9")}</span>}
                      </span>
                    </button>
                  </li>;
                })}
              </ul>
            )}
            {err && <div role="alert" className="mt-3 rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{err}</div>}
            <button type="button" onClick={send} disabled={busy || picked.size === 0}
              className="mt-3 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-amber-500 text-lg font-bold text-black active:bg-amber-400 disabled:bg-neutral-700 disabled:text-neutral-400">
              <Send aria-hidden className="h-5 w-5" />
              {busy ? label("Sending…", "Enviando…", "Enviando…")
                : picked.size === 0 ? label("Pick who gets it", "Escolha quem recebe", "Elige quién lo recibe")
                : `${label("Text", "Enviar para", "Enviar a")} ${picked.size} ${picked.size === 1 ? label("person", "pessoa", "persona") : label("people", "pessoas", "personas")}`}
            </button>
            <button type="button" onClick={copyLink}
              className="mt-2 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-neutral-700 font-bold text-neutral-300 active:bg-neutral-800">
              <Link2 aria-hidden className="h-5 w-5" />
              {copied ? label("Link copied", "Link copiado", "Enlace copiado") : label("Send the link another way", "Mandar o link de outro jeito", "Enviar el enlace de otra forma")}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="mt-2 min-h-[48px] w-full rounded-xl font-bold text-neutral-400">
              {label("Cancel", "Cancelar", "Cancelar")}
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button type="button" onClick={show} aria-haspopup="dialog"
        className="inline-flex items-center gap-1.5 rounded-full bg-neutral-800 px-3 py-1 font-semibold text-neutral-200 active:bg-neutral-700">
        <Share2 aria-hidden className="h-4 w-4" />
        {label("Share", "Compartilhar", "Compartir")}
      </button>
      {sheet && typeof document !== "undefined" && createPortal(sheet, document.body)}
    </>
  );
}
