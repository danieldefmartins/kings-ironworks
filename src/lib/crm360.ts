
// Routing stays on the server; visitors cannot choose another CRM account or form.
export const CRM_API = "https://api.get360crm.com/public/website";
const FORM_SLUG = "kiw-website-quote";
const WORKSPACE_ID = "8e40794c-055a-49a8-a190-7baea0587ba3";
export const CALL_US = "Please try again or call (617) 404-2589.";
/** Must match the checkbox on the form word for word: 360 records it as the consent evidence. */
export const SMS_CONSENT_TEXT =
  "By checking this box, I consent to receive non-marketing text messages from King Iron Works LLC including appointment reminders, project updates, and follow-ups. Message frequency varies. Reply STOP to opt out. Standard message and data rates may apply.";

/** US numbers are typed without a country code; 360 stores numbers in international form. */
export function toE164(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

type PublicForm = { token: string; config: { requireCaptcha?: boolean } };
type Claims = { ws?: string; kind?: string; issuedAt?: number; exp?: number };
const claims = (token: string): Claims =>
  JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString("utf8"));

// The signed form token is reused while valid, so a visitor only waits when a fresh one is needed.
let cached: { token: string; claims: Claims } | null = null;
export function resetFormCache() { cached = null; }

export async function formToken() {
  if (!cached || !cached.claims.exp || cached.claims.exp - Date.now() < 120_000) {
    const res = await fetch(`${CRM_API}/forms/${FORM_SLUG}`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`form ${res.status}`);
    const form = (await res.json()) as PublicForm;
    const c = claims(form.token);
    if (c.ws !== WORKSPACE_ID || c.kind !== "form" || form.config.requireCaptcha) throw new Error("form misconfigured");
    cached = { token: form.token, claims: c };
  }
  // 360 refuses a submission sent less than 2 s after its token was issued.
  const wait = (cached.claims.issuedAt ?? Date.now()) + 2500 - Date.now();
  if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
  return cached.token;
}

