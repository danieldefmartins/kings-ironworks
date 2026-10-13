// "Share job" — text a crew member the job so it is one tap away in the truck.
//
// What goes in the text is deliberately narrow: who, where (with a maps link),
// what we are building, and the job link. NEVER money: the text leaves the app
// and sits in a phone's message history forever, so contract, deposit and
// estimate amounts are not even passed in here.
//
// Pure (no I/O) so it is unit-tested; the route does the sending.

import type { SmsLang } from "./sms";

export interface ShareJobFacts {
  job_number: string;
  customer_name: string;
  address: string | null;
  scope: string | null;
  due_date: string | null;
}

/** Estimate line descriptions only — the caller strips everything else. */
export type ShareItems = string[];

const SCOPE_MAX = 320;

const L = {
  en: { from: "shared a job with you", where: "Address", map: "Directions", what: "Scope", install: "Install", open: "Open the job", noAddress: "No address on file yet" },
  pt: { from: "compartilhou uma obra com você", where: "Endereço", map: "Como chegar", what: "Escopo", install: "Instalação", open: "Abrir a obra", noAddress: "Ainda sem endereço" },
  es: { from: "compartió un trabajo contigo", where: "Dirección", map: "Cómo llegar", what: "Alcance", install: "Instalación", open: "Abrir el trabajo", noAddress: "Aún sin dirección" },
} as const;

export function googleMapsLink(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function squash(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function clip(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

/** The scope line: the job's own scope, else the estimate item descriptions. */
export function shareScope(job: Pick<ShareJobFacts, "scope">, items: ShareItems = []): string | null {
  const own = job.scope ? squash(job.scope) : "";
  if (own) return clip(own, SCOPE_MAX);
  const list = items.map(squash).filter(Boolean);
  if (!list.length) return null;
  return clip(list.map((d, i) => (list.length > 1 ? `${i + 1}) ${d}` : d)).join(" "), SCOPE_MAX);
}

function installDate(iso: string, lang: SmsLang): string {
  const loc = lang === "pt" ? "pt-BR" : lang === "es" ? "es-US" : "en-US";
  return new Intl.DateTimeFormat(loc, { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
}

export function buildJobShareText(
  job: ShareJobFacts,
  opts: { lang: SmsLang; senderName: string; jobUrl: string; items?: ShareItems },
): string {
  const l = L[opts.lang];
  const lines = [`KIW · ${opts.senderName} ${l.from}`, "", `${job.customer_name} (${job.job_number})`];
  if (job.address && job.address.trim()) {
    lines.push(`${l.where}: ${squash(job.address)}`, `${l.map}: ${googleMapsLink(squash(job.address))}`);
  } else {
    lines.push(l.noAddress);
  }
  const scope = shareScope(job, opts.items);
  if (scope) lines.push(`${l.what}: ${scope}`);
  if (job.due_date && /^\d{4}-\d{2}-\d{2}$/.test(job.due_date)) lines.push(`${l.install}: ${installDate(job.due_date, opts.lang)}`);
  lines.push("", `${l.open}: ${opts.jobUrl}`);
  return lines.join("\n");
}
