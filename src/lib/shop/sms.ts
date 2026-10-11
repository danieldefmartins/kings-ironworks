// Text messages to the office, sent through GoHighLevel (the KIW location's
// phone number). Server-only: reads GHL_PIT_TOKEN.
//
// Same contract as sendTelegram: never throws, returns whether the message
// actually left. A text that fails must never take down the punch or action
// that triggered it.
//
// Safety: a real text goes out ONLY from a production server with SMS_DRY_RUN
// unset. Tests, `pnpm dev`, and any run with SMS_DRY_RUN=1 log the message
// instead — nobody's phone buzzes because a test clocked in at 6 am.

import { sendTelegram, tgEscape } from "./notify";

const GHL_API = "https://services.leadconnectorhq.com";
const DEFAULT_LOCATION_ID = "rJsKSnzzxWdCgDCq21rI";

export function smsDryRun(): boolean {
  const flag = (process.env.SMS_DRY_RUN || "").toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  if (process.env.VITEST || process.env.NODE_ENV === "test") return true;
  return process.env.NODE_ENV !== "production";
}

const E164 = /^\+[1-9]\d{7,14}$/;

export async function sendSms(toE164: string, text: string): Promise<boolean> {
  try {
    if (typeof toE164 !== "string" || !E164.test(toE164) || typeof text !== "string" || !text.trim()) {
      console.error("[sms] refusing to send: bad number or empty text");
      return false;
    }
    if (smsDryRun()) {
      console.log(`[sms] DRY RUN → ${toE164}: ${text}`);
      return true;
    }
    const token = process.env.GHL_PIT_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID || DEFAULT_LOCATION_ID;
    if (!token) {
      console.error("[sms] GHL_PIT_TOKEN not set");
      return false;
    }
    const headers = { Authorization: `Bearer ${token}`, Version: "2021-07-28", "Content-Type": "application/json", Accept: "application/json" };
    // Upsert by phone only: never rename or retag an existing contact (these
    // are the owner's own numbers, already saved in GHL).
    const up = await fetch(`${GHL_API}/contacts/upsert`, {
      method: "POST", headers,
      body: JSON.stringify({ locationId, phone: toE164 }),
      signal: AbortSignal.timeout(12000),
    });
    const upBody = await up.json().catch(() => ({}));
    const contactId = upBody?.contact?.id;
    if (!up.ok || typeof contactId !== "string") {
      console.error("[sms] contact upsert failed", up.status);
      return false;
    }
    const res = await fetch(`${GHL_API}/conversations/messages`, {
      method: "POST", headers: { ...headers, Version: "2021-04-15" },
      body: JSON.stringify({ type: "SMS", contactId, message: text }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      console.error("[sms] send failed", res.status, (await res.text().catch(() => "")).slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[sms] failed:", err);
    return false;
  }
}

export type SmsLang = "en" | "pt" | "es";
export interface SmsRecipient { phone: string; lang?: SmsLang | string | null }

/** Owner rule: unknown language means Portuguese (most of the crew). */
export function smsLang(l: unknown): SmsLang {
  return l === "en" || l === "es" || l === "pt" ? l : "pt";
}

/**
 * "Group" text. GoHighLevel cannot send a true group MMS (one thread with
 * everyone in it), so each number gets its own text — in that recipient's
 * own language (owner rule: Daniel English, Jairo Spanish, everyone else
 * pt-BR). `build` returns the body for a language. The same message also goes
 * to the Telegram ops chat, in English, as a backup.
 */
export async function sendSmsGroup(
  recipients: SmsRecipient[],
  build: (lang: SmsLang) => string,
): Promise<{ sent: number; failed: number; telegram: boolean }> {
  const seen = new Set<string>();
  const list = (recipients || []).filter((r) => r && typeof r.phone === "string" && !seen.has(r.phone) && seen.add(r.phone));
  const results = await Promise.all(list.map((r) => sendSms(r.phone, build(smsLang(r.lang)))));
  const english = build("en");
  const telegram = smsDryRun()
    ? (console.log(`[sms] DRY RUN telegram backup: ${english}`), true)
    : await sendTelegram(tgEscape(english));
  const sent = results.filter(Boolean).length;
  return { sent, failed: results.length - sent, telegram };
}
