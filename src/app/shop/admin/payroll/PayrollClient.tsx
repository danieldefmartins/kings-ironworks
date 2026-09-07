"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { hoursToHm } from "@/lib/shop/shared";
import { addPayrollDays, type PayrollRow } from "@/lib/shop/payroll";

export default function PayrollClient({ rows, days, weeks, selected, sunday, lang }: { rows: PayrollRow[]; days: { date: string; rows: PayrollRow[] }[]; weeks: string[]; selected: string; sunday: string; lang: string }) {
  const router = useRouter();
  const pt = lang === "pt", es = lang === "es";
  const label = (en: string, br: string, sp: string) => pt ? br : es ? sp : en;
  const money = (amount: number) => amount.toLocaleString(pt ? "pt-BR" : es ? "es-US" : "en-US", { style: "currency", currency: "USD" });
  const date = (key: string) => new Date(`${key}T12:00:00Z`).toLocaleDateString(pt ? "pt-BR" : es ? "es-US" : "en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const missing = rows.reduce((s, r) => s + r.missingRateHours, 0);
  const total = rows.reduce((s, r) => s + r.basePay, 0);
  const hours = rows.reduce((s, r) => s + r.hours, 0);
  const open = rows.reduce((s, r) => s + r.openShifts, 0);
  useEffect(() => { if (!open) return; const timer = setInterval(() => router.refresh(), 60000); return () => clearInterval(timer); }, [open, router]);
  return <div className="space-y-5">
    <div className="flex flex-wrap items-end gap-3">
      <label className="min-w-0 flex-1"><span className="mb-2 block text-sm text-neutral-400">{label("Payroll week · Monday–Sunday", "Semana de pagamento · segunda–domingo", "Semana de nómina · lunes–domingo")}</span><select aria-label={label("Payroll week", "Semana de pagamento", "Semana de nómina")} value={selected} onChange={e => router.push(`/shop/admin/payroll?week=${e.target.value}`)} className="min-h-12 w-full rounded-xl border border-white/15 bg-neutral-900 px-3">{weeks.map(w => <option key={w} value={w}>{date(w)} – {date(addPayrollDays(w, 6))}</option>)}</select></label>
      <Link href="/shop/admin/payroll" className="rounded-xl border border-white/15 px-4 py-3">{label("This week", "Esta semana", "Esta semana")}</Link>
      <button onClick={() => router.refresh()} className="rounded-xl border border-white/15 px-4 py-3">{label("Refresh", "Atualizar", "Actualizar")}</button>
    </div>
    <section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5">
      <p className="text-sm text-emerald-200">{date(selected)} – {date(sunday)} · Eastern time</p>
      <h2 className="mt-3 text-sm text-neutral-300">{missing > 0 ? label("Known weekly base wages · total incomplete", "Salários base conhecidos · total incompleto", "Salarios base conocidos · total incompleto") : label("Weekly base wages · all workers", "Salários base da semana · todos os funcionários", "Salarios base de la semana · todos los empleados")}</h2>
      <p className="mt-1 text-4xl font-semibold tabular-nums">{money(total)}</p>
      <p className="mt-2 text-sm text-neutral-300">{hoursToHm(hours)} · {rows.length} {label("workers", "funcionários", "empleados")}</p>
    </section>
    <p className="text-sm text-neutral-400">{label("Uses the rate saved on each shift, subtracts unpaid breaks and includes submitted and approved time. Rejected time is shown separately. Hours over 40 are flagged; overtime premium, taxes and deductions are not calculated because no pay policy is configured.", "Usa o valor salvo em cada turno, desconta intervalos não pagos e inclui horas enviadas e aprovadas. Horas rejeitadas aparecem separadamente. Horas acima de 40 são sinalizadas; adicional de horas extras, impostos e descontos não são calculados porque não há política configurada.", "Usa la tarifa guardada en cada turno, descuenta descansos no pagados e incluye horas enviadas y aprobadas. Las horas rechazadas se muestran por separado. Se indican las horas superiores a 40; no se calculan recargos, impuestos ni deducciones porque no hay una política configurada.")}</p>
    {missing > 0 && <p role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-300">{hoursToHm(missing)} {label("have no recorded pay rate. These wages are missing from the total; review before payroll.", "sem valor/hora registrado. Esses salários não estão no total; revise antes do pagamento.", "sin tarifa registrada. Estos salarios faltan del total; revise antes del pago.")} <Link className="underline" href="/shop/admin/labor#rates">{label("Worker rates", "Valores por funcionário", "Tarifas por empleado")}</Link></p>}
    {open > 0 && <p className="text-sm text-amber-300">{open} {label("unclosed shifts included as estimates through the selected period or current time, whichever is earlier; refreshes every minute.", "turnos sem saída incluídos como estimativas até o fim do período ou agora, o que vier primeiro; atualiza a cada minuto.", "turnos sin salida incluidos como estimaciones hasta el fin del período o ahora, lo que ocurra primero; se actualiza cada minuto.")}</p>}
    <div className="flex flex-wrap gap-4 text-sm text-amber-300"><Link href="/shop/admin/time" className="underline">{label("Review and approve timesheets", "Revisar e aprovar o ponto", "Revisar y aprobar horarios")}</Link><Link href="/shop/admin/labor#rates" className="underline">{label("Manage rates", "Gerenciar valores", "Administrar tarifas")}</Link></div>
    <div className="space-y-3">{rows.map(row => <details key={row.id} className="rounded-2xl border border-white/10 bg-neutral-900/60">
      <summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-3 p-4"><span><span className="block font-semibold">{row.name}{!row.active && <span className="ml-2 text-xs text-neutral-500">{label("Inactive", "Inativo", "Inactivo")}</span>}</span><span className="text-sm text-neutral-400">{hoursToHm(row.hours)} · {label("View daily details", "Ver detalhes diários", "Ver detalles diarios")} ▾</span></span><span className="text-right"><span className="block font-semibold tabular-nums">{row.missingRateHours > 0 ? `${money(row.basePay)} + ?` : money(row.basePay)}</span>{row.openShifts > 0 && <span className="text-xs text-amber-300">{label("Estimate", "Estimativa", "Estimación")}</span>}</span></summary>
      <div className="space-y-3 border-t border-white/10 p-4"><p className="text-sm text-neutral-400">{hoursToHm(row.approvedHours)} {label("approved", "aprovadas", "aprobadas")} · {hoursToHm(row.pendingHours)} {label("pending review", "aguardando revisão", "pendientes de revisión")} · {hoursToHm(row.overtime)} {label("over 40 h", "acima de 40 h", "sobre 40 h")}</p>
        {row.rejectedHours > 0 && <p className="text-sm text-red-300">{hoursToHm(row.rejectedHours)} {label("rejected · excluded from wages", "rejeitadas · excluídas do valor", "rechazadas · excluidas del importe")}</p>}
        {row.missingRateHours > 0 && <p className="text-sm text-amber-300">{hoursToHm(row.missingRateHours)} {label("missing recorded rate", "sem valor/hora registrado", "sin tarifa registrada")}</p>}
        {days.map(day => { const daily = day.rows.find(r => r.id === row.id); return <div key={day.date} className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 py-2 text-sm"><span>{new Date(`${day.date}T12:00:00Z`).toLocaleDateString(pt ? "pt-BR" : es ? "es-US" : "en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })}</span><span className="text-neutral-400">{hoursToHm(daily?.hours || 0)}</span><span className="tabular-nums">{money(daily?.basePay || 0)}{(daily?.missingRateHours || 0) > 0 ? " + ?" : ""}</span></div>; })}
      </div>
    </details>)}</div>
    {rows.length === 0 && <p className="py-8 text-center text-neutral-500">{label("No workers found.", "Nenhum funcionário encontrado.", "No se encontraron empleados.")}</p>}
  </div>;
}
