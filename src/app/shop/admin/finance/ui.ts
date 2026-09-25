// Small helpers shared by the finance pages (server and client safe).
export const L = (lang: string | undefined, en: string, pt: string, es: string) => (lang === "pt" ? pt : lang === "es" ? es : en);

export const usd = (n: number, cents = false) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });

export const shortDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
};

export const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
};

/** Today in shop time (New York), as YYYY-MM-DD. */
export const shopToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

export const GROUP_LABEL: Record<string, [string, string, string]> = {
  revenue: ["Revenue", "Receita", "Ingresos"],
  expense: ["Business expense", "Despesa da empresa", "Gasto de la empresa"],
  owner: ["Owner personal", "Pessoal do sócio", "Personal del socio"],
  transfer: ["Transfer / ignore", "Transferência / ignorar", "Transferencia / ignorar"],
  review: ["Needs decision", "Aguardando decisão", "Pendiente de decisión"],
};
