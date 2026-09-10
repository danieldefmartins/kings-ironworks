import { FileText } from "lucide-react";
import { signPhotoUrl } from "@/lib/shop/db";
import type { Photo } from "@/lib/shop/shared";

// Parent authenticates and removes all documents before rendering crew pages.
export default async function JobDocuments({ documents, lang }: { documents: Photo[]; lang: string }) {
  if (!documents.length) return null;
  const label = (en: string, pt: string, es: string) => lang === "pt" ? pt : lang === "es" ? es : en;
  const rows = await Promise.all(documents.map(async d => ({ ...d, link: await signPhotoUrl(d.url, 300) })));
  return <section className="mx-auto max-w-4xl px-4 pt-4" aria-label={label("Private estimates & documents", "Orçamentos e documentos privados", "Presupuestos y documentos privados")}>
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
      <h2 className="font-semibold text-amber-300">{label("Estimates & documents · Owners only", "Orçamentos e documentos · Somente donos", "Presupuestos y documentos · Solo dueños")}</h2>
      {rows.map(d => <div key={d.id} className="mt-3 rounded-xl border border-white/10 bg-neutral-900 p-4">
        <div className="flex items-start gap-3"><FileText aria-hidden className="mt-1 h-5 w-5 shrink-0 text-amber-400" /><div className="min-w-0"><p className="font-semibold">{d.label || d.category || "PDF"}</p>{d.caption && <p className="mt-1 whitespace-pre-line text-sm text-neutral-400">{d.caption}</p>}</div></div>
        {d.link ? <a href={d.link} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-12 items-center rounded-xl border border-amber-500/40 px-4 font-semibold text-amber-300">{label("Open PDF", "Abrir PDF", "Abrir PDF")} ↗</a> : <p role="status" className="mt-3 text-sm text-neutral-400">{label("Document unavailable. Refresh to try again.", "Documento indisponível. Atualize para tentar novamente.", "Documento no disponible. Actualiza para intentarlo de nuevo.")}</p>}
      </div>)}
    </div>
  </section>;
}
