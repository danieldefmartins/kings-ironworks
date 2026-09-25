import Link from "next/link";
import { L } from "./ui";

export default function FinanceNav({ lang, active, reviewCount, categoryCount }: { lang: string; active: "dash" | "review" | "cat" | "tx" | "import"; reviewCount?: number; categoryCount?: number }) {
  const tabs = [
    { id: "dash", href: "/shop/admin/finance", label: L(lang, "Overview", "Visão geral", "Resumen") },
    { id: "review", href: "/shop/admin/finance/review", label: L(lang, "To review", "Revisar", "Revisar"), badge: reviewCount },
    { id: "cat", href: "/shop/admin/finance/categorize", label: L(lang, "Add category", "Definir categoria", "Asignar categoría"), badge: categoryCount },
    { id: "tx", href: "/shop/admin/finance/transactions", label: L(lang, "Transactions", "Transações", "Movimientos") },
    { id: "import", href: "/shop/admin/finance/import", label: L(lang, "Import bank file", "Importar extrato", "Importar extracto") },
  ] as const;
  return (
    <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Finance">
      {tabs.map((t) => (
        <Link
          key={t.id}
          href={t.href}
          aria-current={active === t.id ? "page" : undefined}
          className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-4 text-sm font-semibold ${active === t.id ? "border-amber-400 bg-amber-400 text-neutral-950" : "border-white/15 text-neutral-300"}`}
        >
          {t.label}
          {"badge" in t && t.badge ? <span className={`rounded-full px-2 py-0.5 text-xs ${active === t.id ? "bg-neutral-950 text-amber-300" : "bg-amber-400 text-neutral-950"}`}>{t.badge}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
