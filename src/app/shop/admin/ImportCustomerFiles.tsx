"use client";

// Pull customer photos + approval messages from GoHighLevel for every active
// job. Everything lands pending on each job's review card.
import { useState } from "react";

export default function ImportCustomerFiles({ lang }: { lang: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const label = (en: string, pt: string, es: string) => (lang === "pt" ? pt : lang === "es" ? es : en);
  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/shop/api/customer-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pull_all" }),
      });
      const d = await res.json().catch(() => ({}));
      setMsg(res.ok
        ? label(`${d.jobs} jobs checked · ${d.photos} photo(s), ${d.notes} note(s) to review`, `${d.jobs} obras verificadas · ${d.photos} foto(s), ${d.notes} nota(s) para revisar`, `${d.jobs} trabajos revisados · ${d.photos} foto(s), ${d.notes} nota(s) por revisar`)
        : d.error || "Failed");
    } catch {
      setMsg(label("Network error", "Erro de rede", "Error de red"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mb-6 rounded-2xl border border-white/10 bg-neutral-900 p-4">
      <button onClick={run} disabled={busy} className="min-h-11 rounded-lg border border-amber-500/50 px-4 font-semibold text-amber-300 disabled:opacity-50">
        {busy ? label("Importing…", "Importando…", "Importando…") : label("Import customer files for all active jobs", "Importar arquivos de clientes de todas as obras", "Importar archivos de clientes de todos los trabajos")}
      </button>
      {msg && <p role="status" className="mt-2 text-sm text-neutral-300">{msg}</p>}
    </div>
  );
}
