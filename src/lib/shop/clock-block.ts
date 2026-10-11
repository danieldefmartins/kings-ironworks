// A clock-in refused for no location (owner rule 10/11: "Make sure that we ask
// every time to allow location. Otherwise send us a message and don't clock
// in."). Every attempt is audited; the approval contacts get at most one text
// per worker per BLOCK_NOTIFY_WINDOW_MS (five taps in a row = one message),
// each in their own language, plus the English copy on Telegram.

import { ORG_ID, audit, getOrgSettings, sbSelect } from "./db";
import { sendSmsGroup, type SmsLang } from "./sms";
import { resolveWorkHours } from "./work-hours";

export const BLOCK_NOTIFY_WINDOW_MS = 30 * 60 * 1000;
export type BlockReason = "denied" | "unavailable" | "timeout";

const LOCALE: Record<SmsLang, string> = { en: "en-US", pt: "pt-BR", es: "es-US" };

export function blockedMessage(lang: SmsLang, org: string, name: string, tapAt: string, reason: BlockReason, tz: string): string {
  const time = new Date(tapAt).toLocaleTimeString(LOCALE[lang], { timeZone: tz, hour: "numeric", minute: "2-digit" });
  const denied = reason === "denied";
  if (lang === "pt") return `${org}: ${name} tentou bater o ponto às ${time}, mas ${denied ? "a localização estava bloqueada no celular" : "o celular não conseguiu a localização"} — ponto não registrado.`;
  if (lang === "es") return `${org}: ${name} intentó marcar entrada a las ${time}, pero ${denied ? "la ubicación estaba bloqueada en el teléfono" : "el teléfono no pudo obtener la ubicación"} — no se marcó la entrada.`;
  return `${org}: ${name} tried to clock in at ${time} but ${denied ? "location was blocked on the phone" : "the phone couldn't get a location"} — not clocked in.`;
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.length >= 2 ? words.map((w) => w[0]).join("").toUpperCase().slice(0, 5) : name.trim() || "Shop";
}

export async function reportClockInBlocked(
  worker: { id: string; name: string },
  input: { reason: BlockReason; tapAt: string; userAgent: string },
  now = Date.now(),
): Promise<{ notified: boolean }> {
  const since = new Date(now - BLOCK_NOTIFY_WINDOW_MS).toISOString();
  const recent = await sbSelect<{ id: string }[]>(
    "kiw_shop_audit",
    `select=id&org_id=eq.${ORG_ID}&action=eq.clock_in_blocked_notify&worker_id=eq.${worker.id}&at=gte.${encodeURIComponent(since)}&limit=1`
  ).catch(() => []);
  await audit("clock_in_blocked", { workerId: worker.id, entity: "worker", entityId: worker.id, detail: { ...input, deduped: recent.length > 0 } });
  if (recent.length) return { notified: false };
  const org = await getOrgSettings();
  const settings = resolveWorkHours(org.workHours);
  const prefix = initials(org.branding.name || "Shop");
  const result = await sendSmsGroup(
    settings.contacts.map((c) => ({ phone: c.phone, lang: c.lang })),
    (lang) => blockedMessage(lang, prefix, worker.name, input.tapAt, input.reason, settings.timeZone),
  );
  await audit("clock_in_blocked_notify", { workerId: worker.id, entity: "worker", entityId: worker.id, detail: { reason: input.reason, ...result } });
  return { notified: true };
}
