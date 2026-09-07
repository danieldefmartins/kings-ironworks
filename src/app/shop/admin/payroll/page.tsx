import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { canViewOwnerFinancials, shopWeekKey } from "@/lib/shop/shared";
import { addPayrollDays, calculatePayroll, payrollMidnight, payrollWeek } from "@/lib/shop/payroll";
import { earliestPayrollDate, loadPayrollWeek } from "@/lib/shop/payroll-db";
import ShopTopBar from "../../ShopTopBar";
import PayrollClient from "./PayrollClient";

export const dynamic = "force-dynamic";

export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ week?: string | string[] }> }) {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  if (!canViewOwnerFinancials(worker)) redirect("/shop");
  const query = await searchParams;
  // Dynamic server request: use one timestamp for every total on this response.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const week = payrollWeek(typeof query.week === "string" ? query.week : undefined, now);
  const [{ workers, shifts, breaks }, earliest] = await Promise.all([loadPayrollWeek(week), earliestPayrollDate()]);
  const current = shopWeekKey(now);
  const first = earliest ? shopWeekKey(earliest) : current;
  const weeks: string[] = [];
  for (let key = current; key >= first; key = addPayrollDays(key, -7)) weeks.push(key);
  if (!weeks.includes(week.key)) weeks.push(week.key);
  weeks.sort().reverse();
  const rows = calculatePayroll(workers, shifts, breaks, week, now);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addPayrollDays(week.key, i);
    return { date, rows: calculatePayroll(workers, shifts, breaks, { ...week, start: payrollMidnight(date), end: payrollMidnight(addPayrollDays(date, 1)) }, now) };
  });
  // Round each daily wage to cents, then sum those displayed amounts so the
  // daily details, worker subtotal, and shop total always reconcile.
  for (const row of rows) row.basePay = Math.round(days.reduce((sum, day) => sum + (day.rows.find(daily => daily.id === row.id)?.basePay || 0), 0) * 100) / 100;
  const lang = worker.lang || "en";
  const title = lang === "pt" ? "Folha de pagamento" : lang === "es" ? "Nómina" : "Payroll";
  return <div><ShopTopBar workerName={worker.name} title={title} back="/shop/admin" lang={lang} /><main className="mx-auto max-w-4xl px-4 pb-28 pt-5"><h1 className="mb-5 text-3xl font-semibold">{title}</h1><PayrollClient rows={rows} days={days} weeks={weeks} selected={week.key} sunday={week.sunday} lang={lang} /></main></div>;
}
