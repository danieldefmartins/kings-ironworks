import type { VisibleEstimate } from "@/lib/shop/job-estimates";
import type { Job } from "@/lib/shop/shared";

export default function JobEstimateDetails({ estimates, job, owner, lang }: {
  estimates: VisibleEstimate[] | null;
  job: Pick<Job, "scope" | "contract_amount" | "deposit_amount" | "deposit_note"> & { due_date?: string | null };
  owner: boolean; lang: string;
}) {
  const label = (en: string, pt: string, es: string) => lang === "pt" ? pt : lang === "es" ? es : en;
  const money = (value: number | string | null) => new Intl.NumberFormat(lang === "pt" ? "pt-BR" : lang === "es" ? "es-US" : "en-US", { style: "currency", currency: "USD" }).format(Number(value));
  return <section className="mx-auto max-w-4xl space-y-4 px-4 pt-4" aria-label={label("Estimate details", "Detalhes do orçamento", "Detalles del presupuesto")}>
    {owner && <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
      <h2 className="font-semibold text-amber-300">{label("Project money · Daniel & Kayky", "Valores da obra · Daniel e Kayky", "Importes del proyecto · Daniel y Kayky")}</h2>
      <dl className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div><dt className="text-sm text-neutral-400">{label("Recorded job amount", "Valor registrado da obra", "Importe registrado del proyecto")}</dt><dd className="mt-1 text-2xl font-semibold">{job.contract_amount == null ? "—" : money(job.contract_amount)}</dd></div>
        <div><dt className="text-sm text-neutral-400">{label("Deposit received", "Sinal recebido", "Anticipo recibido")}</dt><dd className="mt-1 text-2xl font-semibold text-emerald-300">{job.deposit_amount == null ? "—" : money(job.deposit_amount)}</dd></div>
        <div><dt className="text-sm text-neutral-400">{label("Job amount less recorded deposit", "Valor da obra menos o sinal registrado", "Importe menos anticipo registrado")}</dt><dd className="mt-1 text-2xl font-semibold">{job.contract_amount == null || job.deposit_amount == null ? "—" : money(Number(job.contract_amount) - Number(job.deposit_amount))}</dd></div>
      </dl>
      {job.deposit_note && <p className="mt-4 whitespace-pre-line text-sm text-neutral-300">{job.deposit_note}</p>}
    </div>}
    <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-semibold">{label("What we are fabricating · Estimate items", "O que vamos fabricar · Itens do orçamento", "Qué vamos a fabricar · Partidas del presupuesto")}</h2>
        {job.due_date && <strong className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-base font-bold text-amber-300">
          {label("Installation", "Instalação", "Instalación")}: <time dateTime={job.due_date}>{new Intl.DateTimeFormat(lang === "pt" ? "pt-BR" : lang === "es" ? "es-US" : "en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${job.due_date}T12:00:00Z`))}</time>
        </strong>}
      </header>
      {job.scope && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-neutral-300">{job.scope}</p>}
      {estimates === null ? <p role="alert" className="mt-4 text-sm text-amber-300">{label("Estimate items could not load. Refresh to try again.", "Não foi possível carregar os itens. Atualize para tentar novamente.", "No se pudieron cargar las partidas. Actualiza para intentarlo de nuevo.")}</p> : estimates.length === 0 ? <p className="mt-4 text-sm text-neutral-500">{label("No itemized estimate added yet.", "Nenhum orçamento detalhado adicionado ainda.", "Aún no se añadió un presupuesto detallado.")}</p> : estimates.map(estimate => <article key={estimate.id} className="mt-5 border-t border-white/10 pt-4">
        <header className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{estimate.number} · {estimate.title}</h3><p className="mt-1 text-xs text-neutral-400">{estimate.issuedOn}{estimate.original && ` · ${label("Original first estimate", "Primeiro orçamento original", "Primer presupuesto original")}`}</p></div>{owner && estimate.total !== undefined && <div className="text-right"><p className="text-xs text-neutral-400">{label("Estimate amount", "Valor do orçamento", "Importe del presupuesto")}</p><p className="text-xl font-semibold text-amber-300">{money(estimate.total)}</p></div>}</header>
        <ol className="mt-3 divide-y divide-white/10">{estimate.items.map((item, index) => <li key={index} className="flex items-start gap-3 py-4">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-neutral-800 text-xs text-neutral-400">{index + 1}</span>
          <div className="min-w-0 flex-1"><p className="whitespace-pre-line text-sm leading-relaxed">{item.description}</p><p className="mt-1 text-xs text-neutral-400">{label("Quantity", "Quantidade", "Cantidad")}: {item.quantity}</p></div>
          {owner && item.amount !== undefined && <div className="shrink-0 text-right text-sm font-semibold text-amber-300">{money(item.amount)}{item.quantity !== 1 && item.unitPrice !== undefined && <span className="block text-xs font-normal text-neutral-400">{money(item.unitPrice)} / {label("unit", "unidade", "unidad")}</span>}</div>}
        </li>)}</ol>
      </article>)}
    </div>
  </section>;
}
