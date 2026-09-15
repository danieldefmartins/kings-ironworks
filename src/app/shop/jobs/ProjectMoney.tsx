"use client";
import { useState } from "react";
import Link from "next/link";
import { projectMoney, type MoneyJob, type MoneyScope } from "@/lib/shop/project-money";
export default function ProjectMoney({ jobs, lang }: { jobs: MoneyJob[] | null; lang: string }) {
  const [scope, setScope] = useState<MoneyScope>("current");
  const label = (en: string, pt: string, es: string) => lang === "pt" ? pt : lang === "es" ? es : en;
  const money = (n: number | null) => n === null ? "—" : n.toLocaleString(lang === "pt" ? "pt-BR" : lang === "es" ? "es-US" : "en-US", { style: "currency", currency: "USD" });
  if (!jobs) return <div role="alert" className="mb-4 rounded-2xl border border-amber-700 bg-amber-950/30 p-4">{label("Could not load project money. Refresh to try again.", "Não foi possível carregar os valores. Atualize para tentar novamente.", "No se pudieron cargar los importes. Actualiza para intentarlo de nuevo.")}</div>;
  const summary = projectMoney(jobs, scope);
  const labels = { current: label("All current jobs", "Todas as obras atuais", "Todos los proyectos actuales"), active: label("Active only", "Somente ativas", "Solo activos"), archived: label("Archived records", "Registros arquivados", "Registros archivados") };
  return <section className="mb-4 rounded-2xl border border-sky-400/20 bg-gradient-to-br from-sky-950/40 via-neutral-900 to-neutral-900 p-4" aria-label={label("Project money", "Valores das obras", "Importes de proyectos")}>
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-sm font-semibold text-sky-200">{label("Project money", "Valores das obras", "Importes de proyectos")}</h2><select aria-label={label("Money summary scope", "Abrangência do resumo", "Alcance del resumen")} value={scope} onChange={e => setScope(e.target.value as MoneyScope)} className="min-h-12 max-w-full rounded-xl border border-white/15 bg-neutral-950 px-3 text-sm">{Object.entries(labels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></div>
    <dl className="mt-4 grid grid-cols-3 gap-1.5 sm:gap-3">{[
      { name: label("Project total", "Total das obras", "Total de proyectos"), value: summary.total, card: "border-sky-400/25 bg-sky-400/10", text: "text-sky-200" },
      { name: label("Money received", "Dinheiro recebido", "Dinero recibido"), value: summary.received, card: "border-emerald-400/25 bg-emerald-400/10", text: "text-emerald-200" },
      { name: label("Balance due", "Saldo a receber", "Saldo pendiente"), value: summary.balance, card: "border-amber-400/25 bg-amber-400/10", text: "text-amber-200" },
    ].map(({ name, value, card, text }) => <div key={name} className={`min-w-0 rounded-xl border px-1.5 py-3 sm:p-3 ${card}`}><dt className={`min-h-8 text-[11px] leading-4 sm:min-h-0 sm:text-xs ${text}`}>{name}</dt><dd className={`mt-1 whitespace-nowrap text-[11px] font-bold tabular-nums tracking-tight min-[375px]:text-xs min-[440px]:text-sm sm:text-lg ${text}`}>{money(value)}</dd></div>)}</dl>
    <details className="mt-3"><summary className="cursor-pointer py-3 text-sm font-semibold text-sky-200 hover:text-sky-100">{summary.rows.length} {label("jobs · View breakdown", "obras · Ver detalhes", "proyectos · Ver detalle")}</summary><div className="max-h-96 overflow-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead><tr className="text-xs text-neutral-400"><th className="p-2">{label("Job", "Obra", "Proyecto")}</th><th className="p-2">{label("Total", "Total", "Total")}</th><th className="p-2">{label("Received", "Recebido", "Recibido")}</th><th className="p-2">{label("Balance", "Saldo", "Saldo")}</th></tr></thead><tbody>{summary.rows.map(row => <tr key={row.id} className="border-t border-white/10"><td className="p-2"><Link className="block py-2 text-amber-300 underline" href={`/shop/job/${row.id}`}>{row.number} · {row.customer}</Link></td><td className="p-2">{money(row.total)}</td><td className="p-2">{money(row.received)}</td><td className="p-2">{money(row.balance)}</td></tr>)}</tbody></table></div></details>
  </section>;
}
