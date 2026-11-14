
// Routing stays on the server; visitors cannot choose another CRM account or form.
export const CRM_API = "https://api.get360crm.com/public/website";
const FORM_SLUG = "kiw-website-quote";
const WORKSPACE_ID = "8e40794c-055a-49a8-a190-7baea0587ba3";
export const CALL_US = "Please try again or call (617) 404-2589.";
/**
 * Shown directly above the Submit button (no checkbox, owner decision 2026-11-14).
 * Must match the notice saved on the 360 form word for word: 360 records it as the consent evidence.
 */
export const SMS_NOTICE_TEXT =
  "By submitting this form, you agree to receive text messages from King Iron Works about your request (quotes, scheduling, project updates). Message frequency varies. Msg & data rates may apply. Reply STOP to opt out. We will never sell or share your information.";

/** US numbers are typed without a country code; 360 stores numbers in international form. */
export function toE164(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

type PublicForm = { token: string; config: { requireCaptcha?: boolean; consentMode?: string; consentText?: string } };
type Claims = { ws?: string; kind?: string; issuedAt?: number; exp?: number };
const claims = (token: string): Claims =>
  JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString("utf8"));

// The signed form token is reused while valid, so a visitor only waits when a fresh one is needed.
let cached: { token: string; claims: Claims; notice: boolean } | null = null;
export function resetFormCache() { cached = null; }

export async function formToken() {
  if (!cached || !cached.claims.exp || cached.claims.exp - Date.now() < 120_000) {
    const res = await fetch(`${CRM_API}/forms/${FORM_SLUG}`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`form ${res.status}`);
    const form = (await res.json()) as PublicForm;
    const c = claims(form.token);
    if (c.ws !== WORKSPACE_ID || c.kind !== "form" || form.config.requireCaptcha) throw new Error("form misconfigured");
    // 360 counts a submission as text permission only when its form is set to
    // "Consent by submitting" with this exact notice.
    const notice = form.config.consentMode === "notice" && form.config.consentText?.trim() === SMS_NOTICE_TEXT;
    cached = { token: form.token, claims: c, notice };
  }
  // 360 refuses a submission sent less than 2 s after its token was issued.
  const wait = (cached.claims.issuedAt ?? Date.now()) + 2500 - Date.now();
  if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
  return { token: cached.token, notice: cached.notice };
}

