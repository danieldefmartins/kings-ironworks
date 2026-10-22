// 360 CRM public form client. Pattern copied from ~/Projects/sites/tile-and-pavers/src/lib/crm.ts,
// extended with separate SMS consent, attribution, multiple photos and form activity.
// Every failure throws a plain-language message that tells the visitor what to do next.

import type { Attribution } from "./attribution";

export type CrmFields = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  city: string;
  projectType: string;
  message: string;
  photos: string;
};
export type CrmConfig = { apiBase: string; formSlug: string; workspaceId: string; fields: CrmFields };

/** Public form API URL on the CRM. */
export const publicUrl = (config: CrmConfig, path: string) => `${config.apiBase.replace(/\/$/, "")}/public/website/${path}`;

export type PublicForm = {
  token: string;
  siteKey: string | null;
  config: {
    consentRequired: boolean;
    /** 360 protects the hosted /submit and /uploads endpoints with Turnstile; native sites use /direct-* instead. */
    turnstile?: boolean;
    requireCaptcha?: boolean;
    consentText: string;
    fields: { id: string; type: string; options?: string[] }[];
    pro?: { smsConsent?: string; partialCapture?: boolean };
  };
};
/** One submission attempt: `key` + `uploadSessionId` + `token` stay the same for uploads and the submit. */
export type Attempt = { key: string; uploadSessionId?: string; token?: string; signature: string; uploads: Record<string, string> };
export const newAttempt = (signature: string): Attempt => ({ key: crypto.randomUUID(), uploadSessionId: crypto.randomUUID(), signature, uploads: {} });
export type PhotoStatus = "waiting" | "uploading" | "throttled" | "done" | "failed";
export type PhotoHooks = {
  onStatus?: (index: number, status: PhotoStatus) => void;
  /** Injectable for tests; defaults to a real timer. */
  sleep?: (ms: number) => Promise<void>;
};
export type LeadValues = {
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  city?: string;
  projectType?: string;
  message?: string;
  website?: string; // honeypot
};

const FALLBACK = "Your request could not be confirmed. Please try again, or call or text (754)\u00a0240\u20110082. Your details are still here.";
const UNAVAILABLE = "Online requests are temporarily unavailable. Please call or text (754)\u00a0240\u20110082 for your free estimate.";
const PHONE = "(754)\u00a0240\u20110082";
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
export const PHOTO_ACCEPT = "image/jpeg,image/png,image/heic,image/heif,image/webp";
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 40 * 1024 * 1024;
export const MAX_PHOTOS = 10;
/** The CRM allows 5 photo uploads per connection per minute. */
const UPLOADS_PER_MINUTE = 5;
const RATE_WAIT_MS = 61_000;
const EXT_TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif" };
const PHOTO_HELP = `or text the photos to ${PHONE}`;

/** A failed request, with the CRM's status and error code when it sent them. */
export class CrmError extends Error {
  status?: number;
  code?: string;
  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function requestJson<T>(url: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: body ? "POST" : "GET",
      credentials: "omit",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(60000),
    });
  } catch {
    throw new CrmError(FALLBACK);
  }
  if (!response.ok) {
    let code: string | undefined;
    try {
      code = ((await response.json()) as { error?: { code?: string } })?.error?.code;
    } catch {
      /* no JSON body */
    }
    if (response.status === 429 || code === "form_rate_limited")
      throw new CrmError(`Too many requests from this connection. Please wait a minute and try again, or call or text ${PHONE}.`, 429, "form_rate_limited");
    throw new CrmError(FALLBACK, response.status, code);
  }
  return response.json() as Promise<T>;
}

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return "+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  if (value.trim().startsWith("+") && digits.length >= 8 && digits.length <= 15) return "+" + digits;
  throw Error("Enter a 10-digit phone number, like (754) 555-0123. Numbers outside the US need a + and country code.");
}

function tokenPayload(token: string): { ws: string; kind: string; issuedAt?: number; exp?: number } {
  const encoded = token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "="))) as { ws: string; kind: string };
}

/** Loads the published form and fails closed if it no longer matches what this site sends. */
export async function loadForm(config: CrmConfig, smsConsent: string): Promise<PublicForm> {
  if (!config.apiBase || !config.formSlug) throw Error(UNAVAILABLE);
  const form = await requestJson<PublicForm>(publicUrl(config, `forms/${encodeURIComponent(config.formSlug)}`));
  let payload: { ws: string; kind: string };
  try {
    payload = tokenPayload(form.token);
  } catch {
    throw Error(UNAVAILABLE);
  }
  if (payload.ws !== config.workspaceId || payload.kind !== "form") throw Error(UNAVAILABLE);
  // SMS consent must stay optional and the wording must match exactly what the visitor sees.
  if (form.config.requireCaptcha || form.config.consentRequired || (form.config.pro?.smsConsent || form.config.consentText) !== smsConsent) throw Error(UNAVAILABLE);
  const required: (keyof CrmFields)[] = ["firstName", "phone", "projectType"];
  for (const name of Object.keys(config.fields) as (keyof CrmFields)[]) {
    if (name === "photos") continue;
    const present = form.config.fields.some((f) => f.id === config.fields[name]);
    if (!present && required.includes(name)) throw Error(UNAVAILABLE);
  }
  return form;
}

/**
 * The form to submit with. 360 rejects a submit sent less than 2 s after its token was issued
 * (form_too_fast), so reuse the token loaded when the form opened while it is valid, and only
 * when a fresh one is needed wait out the remainder of those 2 s.
 */
export async function readyForm(config: CrmConfig, smsConsent: string, current: PublicForm | null): Promise<PublicForm> {
  let form = current;
  let claims: { issuedAt?: number; exp?: number } = {};
  try {
    if (form) claims = tokenPayload(form.token);
  } catch {
    form = null;
  }
  if (!form || !claims.exp || claims.exp - Date.now() < 120_000) {
    form = await loadForm(config, smsConsent);
    claims = tokenPayload(form.token);
  }
  const wait = (claims.issuedAt ?? Date.now()) + 2500 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  return form;
}

/**
 * How many photos the live form takes on the configured field: 10 for a `files` field, 1 for `file`, 0 if the
 * form has no photo field. Native forms upload through /direct-uploads (no captcha), so only requireCaptcha closes them.
 */
export const photoLimit = (config: CrmConfig, form: PublicForm | null) => {
  if (form?.config.requireCaptcha) return 0;
  const field = form?.config.fields.find((f) => f.id === config.fields.photos);
  return field?.type === "files" ? MAX_PHOTOS : field?.type === "file" ? 1 : 0;
};
export const acceptsPhotos = (config: CrmConfig, form: PublicForm | null) => photoLimit(config, form) > 0;

/** The photo requirements shown next to the picker. */
export const photoRequirements = (limit: number) =>
  limit === 1 ? "JPEG, PNG, HEIC or WebP. One photo, up to 10 MB." : `JPEG, PNG, HEIC or WebP. Up to ${limit} photos, 10 MB each, 40 MB total.`;

/** The content type to send for a photo, or null when it isn't an accepted image. Phones often leave `type` empty for HEIC. */
export function photoType(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const byExt = EXT_TYPES[ext] ?? null;
  const type = file.type.toLowerCase();
  if (type && PHOTO_TYPES.includes(type)) return ext === "heic" && type === "image/heif" ? "image/heic" : type;
  if ((!type || type === "application/octet-stream") && byExt) return byExt;
  return null;
}

const hasField = (form: PublicForm, id: string) => form.config.fields.some((f) => f.id === id);

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(Error(`"${file.name}" could not be read. Please choose it again.`));
    reader.readAsDataURL(file);
  });
}

export function checkPhotos(files: File[], limit = MAX_PHOTOS) {
  if (files.length > limit) throw Error(limit === 1 ? `Choose one photo, ${PHOTO_HELP}.` : `Choose up to ${limit} photos, ${PHOTO_HELP}.`);
  let total = 0;
  for (const file of files) {
    if (!photoType(file)) throw Error(`"${file.name}" can't be sent. Choose JPEG, PNG, HEIC or WebP photos, ${PHOTO_HELP}.`);
    if (file.size > MAX_PHOTO_BYTES) throw Error(`"${file.name}" is over 10 MB. Choose a smaller photo, ${PHOTO_HELP}.`);
    if (file.size === 0) throw Error(`"${file.name}" is empty. Choose it again, ${PHOTO_HELP}.`);
    total += file.size;
  }
  if (total > MAX_TOTAL_BYTES) throw Error(`Those photos add up to more than 40 MB. Remove a few, ${PHOTO_HELP}.`);
}

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const photoSig = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;

export async function sendLead(
  config: CrmConfig,
  form: PublicForm,
  attempt: Attempt,
  values: LeadValues,
  smsConsent: boolean,
  photos: File[],
  attribution: Attribution,
  challenge: () => Promise<string> = async () => "",
  hooks: PhotoHooks = {},
) {
  const answers: Record<string, string> = {};
  const map: [keyof LeadValues & keyof CrmFields, string | undefined][] = [
    ["firstName", values.firstName],
    ["lastName", values.lastName],
    ["phone", values.phone ? normalizePhone(values.phone) : ""],
    ["email", values.email],
    ["city", values.city],
    ["projectType", values.projectType],
    ["message", values.message],
  ];
  for (const [name, value] of map) {
    const id = config.fields[name];
    if (value && hasField(form, id)) answers[id] = value.trim();
  }
  // Preserve project location even when the published form has no separate city field.
  if (values.city && !hasField(form, config.fields.city) && hasField(form, config.fields.message))
    answers[config.fields.message] = `Project city: ${values.city}\n${values.message || ""}`.trim();
  const photoField = config.fields.photos;
  const session = attempt.uploadSessionId ?? attempt.key;
  const status = hooks.onStatus ?? (() => {});
  const sleep = hooks.sleep ?? realSleep;
  // Uploads belong to one token + key + session; if the token changed they must be sent again.
  if (attempt.token && attempt.token !== form.token) attempt.uploads = {};
  attempt.token = form.token;
  const limit = photoLimit(config, form);
  if (photos.length && limit === 0) throw Error(`Photos cannot be sent right now; ${PHOTO_HELP}.`);
  if (photos.length && limit > 0) {
    checkPhotos(photos, limit);
    photos.forEach((f, i) => status(i, attempt.uploads[photoSig(f)] ? "done" : "waiting"));
    const sent: number[] = [];
    for (const [i, file] of photos.entries()) {
      const sig = photoSig(file);
      if (!attempt.uploads[sig]) {
        // Reuse on retry, never upload twice. Stay under the CRM's per-minute upload allowance.
        const recent = sent.filter((t) => Date.now() - t < 60_000);
        if (recent.length >= UPLOADS_PER_MINUTE) {
          status(i, "throttled");
          await sleep(Math.max(0, RATE_WAIT_MS - (Date.now() - recent[0])));
        }
        status(i, "uploading");
        let data: string;
        try {
          data = await readFile(file);
        } catch (err) {
          status(i, "failed");
          throw err;
        }
        for (let tries = 0; ; tries++) {
          sent.push(Date.now());
          try {
            const uploaded = await requestJson<{ id: string }>(publicUrl(config, "direct-uploads"), {
              token: form.token,
              key: attempt.key,
              uploadSessionId: session,
              fieldId: photoField,
              file: { name: file.name, contentType: photoType(file), data },
              website: values.website || "",
              turnstileToken: await challenge(),
            });
            attempt.uploads[sig] = uploaded.id;
            break;
          } catch (err) {
            if (err instanceof CrmError && err.status === 429 && tries < 2) {
              // Wait out the minute, then try this same photo again.
              status(i, "throttled");
              await sleep(RATE_WAIT_MS);
              status(i, "uploading");
              continue;
            }
            status(i, "failed");
            throw photoError(err, file, attempt);
          }
        }
      }
      status(i, "done");
    }
    const ids = photos.map((f) => attempt.uploads[photoSig(f)]);
    answers[photoField] = limit === 1 ? ids[0] : JSON.stringify(ids);
  }
  // Native website forms submit through /direct-submit (signed token, at least 2 s after it was issued).
  try {
    return await requestJson<{ thankYou: string; redirect?: string }>(publicUrl(config, "direct-submit"), {
      token: form.token,
      key: attempt.key,
      uploadSessionId: session,
      answers,
      attribution,
      smsConsent,
      emailConsent: false,
      consent: !form.config.pro?.smsConsent && smsConsent,
      website: values.website || "",
      turnstileToken: await challenge(),
    });
  } catch (err) {
    if (photos.length && err instanceof CrmError && err.code === "invalid_upload") throw expiredPhotos(attempt, photos.length, hooks);
    throw err;
  }
}

/** Photos wait at most an hour for the request; after that the visitor sends them again under a fresh key. */
function expiredPhotos(attempt: Attempt, count: number, hooks: PhotoHooks) {
  attempt.key = crypto.randomUUID();
  attempt.uploadSessionId = crypto.randomUUID();
  attempt.uploads = {};
  for (let i = 0; i < count; i++) hooks.onStatus?.(i, "waiting");
  return new CrmError(
    `Your photos expired because the request took too long. Press Send request again and we'll upload them again, or ${PHOTO_HELP}.`,
    400,
    "invalid_upload",
  );
}

function photoError(err: unknown, file: File, attempt: Attempt) {
  if (err instanceof CrmError && err.code === "invalid_upload") {
    attempt.key = crypto.randomUUID();
    attempt.uploadSessionId = crypto.randomUUID();
    attempt.uploads = {};
    return new CrmError(`"${file.name}" expired. Press Send request again to upload it again, or ${PHOTO_HELP}.`, 400, "invalid_upload");
  }
  if (err instanceof CrmError && err.status === 429)
    return new CrmError(`Photo uploads are busy right now. Wait a minute, then press Send request again, or ${PHOTO_HELP}.`, 429, "form_rate_limited");
  if (err instanceof CrmError && err.status && err.status >= 400 && err.status < 500)
    return new CrmError(`"${file.name}" couldn't be accepted. Remove it or choose a different photo, or ${PHOTO_HELP}.`, err.status, err.code);
  return new CrmError(`"${file.name}" didn't upload. Check your connection and press Retry, or ${PHOTO_HELP}.`, err instanceof CrmError ? err.status : undefined);
}

/** Funnel analytics (view/start/step). Never blocks or surfaces errors to the visitor. */
export function trackFormActivity(
  config: CrmConfig,
  form: PublicForm,
  key: string,
  type: "view" | "start" | "step",
  step: number,
  attribution: Attribution,
) {
  fetch(publicUrl(config, "activity"), {
    method: "POST",
    credentials: "omit",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: form.token, key, type, step: Math.max(1, step), attribution }),
  }).catch(() => {
    /* analytics only: a failed ping must never interrupt the visitor */
  });
}
