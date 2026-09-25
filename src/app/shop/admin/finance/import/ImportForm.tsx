"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { accountFromFileName } from "@/lib/shop/finance";
import { L, shortDate, usd } from "../ui";

type Result = { file: string; account: string; ok: boolean; message: string };

export default function ImportForm({ lang }: { lang: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [account, setAccount] = useState("auto");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Result[]>([]);

  async function run() {
    const files = Array.from(input.current?.files || []);
    if (!files.length) return;
    setBusy(true);
    const out: Result[] = [];
    for (const f of files) {
      const acct = account === "auto" ? accountFromFileName(f.name) : account;
      if (!acct) { out.push({ file: f.name, account: "?", ok: false, message: L(lang, "Can't tell which account — pick it above.", "Não sei de qual conta — escolha acima.", "No sé de qué cuenta — elígela arriba.") }); continue; }
      try {
        const res = await fetch("/shop/api/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "import", account: acct, csv: await f.text() }) });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error || "Import failed");
        const r = j.result;
        out.push({
          file: f.name, account: acct, ok: true,
          message: `${r.added} ${L(lang, "new", "novas", "nuevos")} · ${r.duplicates} ${L(lang, "already here", "já existiam", "ya estaban")} · ${r.toReview} ${L(lang, "need your decision", "aguardam decisão", "esperan decisión")}${r.pending ? ` · ${r.pending} ${L(lang, "pending skipped", "pendentes ignoradas", "pendientes omitidos")}` : ""}${r.balance ? ` · ${L(lang, "balance", "saldo", "saldo")} ${usd(r.balance.balance, true)} (${shortDate(r.balance.posted_on)})` : ""}`,
        });
      } catch (e) {
        out.push({ file: f.name, account: acct, ok: false, message: e instanceof Error ? e.message : "Import failed" });
      }
    }
    setResults(out);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-neutral-400">
        <li>{L(lang, "In Chase, open the account → Download account activity → Spreadsheet (CSV) → All transactions.", "No Chase, abra a conta → Download account activity → Spreadsheet (CSV) → All transactions.", "En Chase, abre la cuenta → Download account activity → Spreadsheet (CSV) → All transactions.")}</li>
        <li>{L(lang, "Choose the file(s) here. Re-importing the same file never creates duplicates.", "Escolha o(s) arquivo(s) aqui. Importar o mesmo arquivo de novo não duplica nada.", "Elige el/los archivo(s) aquí. Importar el mismo archivo otra vez no duplica nada.")}</li>
      </ol>
      <div className="grid gap-3 rounded-2xl border border-white/10 bg-neutral-900 p-4 sm:grid-cols-3">
        <label className="text-sm sm:col-span-2">{L(lang, "Chase CSV file(s)", "Arquivo(s) CSV do Chase", "Archivo(s) CSV de Chase")}
          <input ref={input} type="file" accept=".csv,text/csv" multiple className="mt-1 block w-full text-sm file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-neutral-800 file:px-4 file:text-neutral-100" />
        </label>
        <label className="text-sm">{L(lang, "Account", "Conta", "Cuenta")}
          <select value={account} onChange={(e) => setAccount(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-white/20 bg-neutral-950 px-2">
            <option value="auto">{L(lang, "From file name", "Pelo nome do arquivo", "Por el nombre del archivo")}</option>
            <option value="1752">…1752 King Iron Works LLC</option>
            <option value="3971">…3971 King Iron Group Inc</option>
          </select>
        </label>
        <button disabled={busy} onClick={run} className="min-h-12 rounded-lg bg-amber-400 px-4 font-bold text-neutral-950 disabled:opacity-50 sm:col-span-3">
          {busy ? L(lang, "Importing…", "Importando…", "Importando…") : L(lang, "Import", "Importar", "Importar")}
        </button>
      </div>
      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((r) => (
            <li key={r.file} className={`rounded-xl border p-3 text-sm ${r.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100" : "border-red-800 bg-red-950/40 text-red-200"}`}>
              <span className="font-semibold">{r.file}</span> (…{r.account}) — {r.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
