// Customer-file import — server only (service-role key, GHL token).
//
// Pulls the images a customer sent us and the messages where they approved or
// chose a design, and parks them as PENDING on the job. Nothing reaches the
// crew until an owner keeps it. Sources are pluggable: GoHighLevel runs here
// on demand; the info@ mailbox is imported by scripts/mail-import on the Mac
// mini (Apple Mail holds the mailbox locally) and lands in the same tables.

import {
  ORG_ID,
  sbSelect,
  sbInsertIgnoreDuplicates,
  sbUpdate,
  uploadPhotoObject,
  type Job,
  type Photo,
  type CustomerNote,
} from "./db";
import {
  CUSTOMER_PHOTO_CATEGORY,
  KEEP_CATEGORIES,
  contactMatchesJob,
  importStoragePath,
  isImportableImage,
  normalizeEmail,
  onlyNew,
  phoneDigits,
  planGhlImports,
  redactMoney,
  storageExt,
  type GhlMessage,
  type ImageCandidate,
  type NoteCandidate,
} from "./customer-files";

const GHL_API = "https://services.leadconnectorhq.com";
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || "rJsKSnzzxWdCgDCq21rI";
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_MESSAGE_PAGES = 10;

export interface ImportResult {
  source: string;
  photos: number;
  notes: number;
  skipped: number;
  errors: string[];
}

// ---- Reading ----------------------------------------------------------------

/** Notes for a job. Crew callers pass includePending=false and get approved only. */
export async function listCustomerNotes(jobId: string, includePending: boolean): Promise<CustomerNote[]> {
  const status = includePending ? "in.(pending,approved)" : "eq.approved";
  try {
    return await sbSelect<CustomerNote[]>(
      "kiw_shop_customer_notes",
      `select=id,job_id,source,source_ref,body,author_direction,message_at,review_status,created_at&org_id=eq.${ORG_ID}&job_id=eq.${jobId}&review_status=${status}&order=message_at.desc.nullslast`,
    );
  } catch {
    // Table not migrated yet: no notes, and the job page keeps working.
    return [];
  }
}

/** Notes shaped for the crew: approved only, money re-redacted, no source refs. */
export async function listCrewCustomerNotes(jobId: string): Promise<CustomerNote[]> {
  const rows = await listCustomerNotes(jobId, false);
  return rows.map((n) => ({ ...n, source_ref: "", body: redactMoney(n.body) }));
}

/** When the Mac mini last ran the mailbox import, if ever. */
export async function lastEmailSync(): Promise<string | null> {
  try {
    const rows = await sbSelect<{ at: string }[]>(
      "kiw_shop_audit",
      `select=at&org_id=eq.${ORG_ID}&action=eq.customer_import_email&order=at.desc&limit=1`,
    );
    return rows[0]?.at || null;
  } catch {
    return null;
  }
}

// ---- Review -----------------------------------------------------------------

export type ReviewDecision = "keep" | "reject";

export async function reviewImportedPhoto(jobId: string, photoId: string, decision: ReviewDecision, category?: string): Promise<boolean> {
  const patch: Record<string, unknown> = { review_status: decision === "keep" ? "approved" : "rejected" };
  if (decision === "keep") {
    patch.category = (KEEP_CATEGORIES as readonly string[]).includes(category || "") ? category : CUSTOMER_PHOTO_CATEGORY;
  }
  // Only imported rows are reviewable; app uploads have no source.
  const rows = await sbUpdate<Photo[]>(
    "kiw_shop_photos",
    `org_id=eq.${ORG_ID}&job_id=eq.${jobId}&id=eq.${photoId}&source=not.is.null`,
    patch,
  );
  return rows.length > 0;
}

export async function reviewCustomerNote(jobId: string, noteId: string, decision: ReviewDecision): Promise<boolean> {
  const rows = await sbUpdate<CustomerNote[]>(
    "kiw_shop_customer_notes",
    `org_id=eq.${ORG_ID}&job_id=eq.${jobId}&id=eq.${noteId}`,
    { review_status: decision === "keep" ? "approved" : "rejected" },
  );
  return rows.length > 0;
}

// ---- Storing (shared by every source) ----------------------------------------

async function existingRefs(jobId: string): Promise<{ photos: Set<string>; notes: Set<string> }> {
  const [p, n] = await Promise.all([
    sbSelect<{ source_ref: string | null }[]>("kiw_shop_photos", `select=source_ref&org_id=eq.${ORG_ID}&job_id=eq.${jobId}&source_ref=not.is.null`),
    sbSelect<{ source_ref: string }[]>("kiw_shop_customer_notes", `select=source_ref&org_id=eq.${ORG_ID}&job_id=eq.${jobId}`),
  ]);
  return {
    photos: new Set(p.map((r) => r.source_ref || "").filter(Boolean)),
    notes: new Set(n.map((r) => r.source_ref)),
  };
}

export interface FetchedImage {
  bytes: ArrayBuffer;
  contentType: string;
  name: string;
}

/** Store pending images + notes for a job, skipping anything already imported. */
export async function storeImports(
  job: Pick<Job, "id">,
  source: string,
  images: ImageCandidate[],
  notes: NoteCandidate[],
  fetchImage: (c: ImageCandidate) => Promise<FetchedImage | null>,
): Promise<ImportResult> {
  const result: ImportResult = { source, photos: 0, notes: 0, skipped: 0, errors: [] };
  const have = await existingRefs(job.id);

  for (const c of onlyNew(images, have.photos)) {
    try {
      const file = await fetchImage(c);
      if (!file || !isImportableImage(file) || file.bytes.byteLength > MAX_IMAGE_BYTES) {
        result.skipped++;
        continue;
      }
      const ext = storageExt(file);
      const path = importStoragePath(job.id, source, c.sourceRef, ext);
      const contentType = file.contentType.startsWith("image/") ? file.contentType : `image/${ext === "jpg" ? "jpeg" : ext}`;
      await uploadPhotoObject(path, file.bytes, contentType);
      const inserted = await sbInsertIgnoreDuplicates<Photo[]>(
        "kiw_shop_photos",
        [{
          org_id: ORG_ID,
          job_id: job.id,
          url: path,
          kind: "image",
          category: CUSTOMER_PHOTO_CATEGORY,
          uploaded_by: null,
          uploaded_at: new Date().toISOString(),
          source,
          source_ref: c.sourceRef,
          review_status: "pending",
          source_note: redactMoney(ext === "heic" || ext === "heif" ? `${c.note} · HEIC (opens in Safari)` : c.note),
          source_at: c.at,
        }],
        "org_id,job_id,source_ref",
      );
      result.photos += inserted.length;
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message.slice(0, 200) : "image import failed");
    }
  }

  const freshNotes = onlyNew(notes, have.notes);
  if (freshNotes.length) {
    try {
      const inserted = await sbInsertIgnoreDuplicates<CustomerNote[]>(
        "kiw_shop_customer_notes",
        freshNotes.map((n) => ({
          org_id: ORG_ID,
          job_id: job.id,
          source,
          source_ref: n.sourceRef,
          body: redactMoney(n.body),
          author_direction: n.direction,
          message_at: n.at,
          review_status: "pending",
        })),
        "org_id,job_id,source_ref",
      );
      result.notes += inserted.length;
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message.slice(0, 200) : "note import failed");
    }
  }
  return result;
}

// ---- GoHighLevel source -------------------------------------------------------

async function ghl<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${GHL_API}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Version: "2021-07-28", Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GoHighLevel ${res.status} on ${path.split("?")[0]}`);
  return (await res.json()) as T;
}

interface GhlContact {
  id: string;
  phone?: string | null;
  email?: string | null;
  additionalEmails?: (string | null)[] | null;
  additionalPhones?: (string | null)[] | null;
}

/** Every GHL contact that matches the job exactly on phone digits or email. */
export async function findGhlContacts(job: Pick<Job, "phone" | "email">, token: string): Promise<GhlContact[]> {
  const queries = [phoneDigits(job.phone), normalizeEmail(job.email)].filter(Boolean);
  const byId = new Map<string, GhlContact>();
  for (const q of queries) {
    const data = await ghl<{ contacts?: GhlContact[] }>(
      `/contacts/?locationId=${GHL_LOCATION_ID}&query=${encodeURIComponent(q)}&limit=20`,
      token,
    );
    for (const c of data.contacts || []) if (contactMatchesJob(c, job)) byId.set(c.id, c);
  }
  return [...byId.values()];
}

async function ghlMessages(contactId: string, token: string): Promise<GhlMessage[]> {
  const convs = await ghl<{ conversations?: { id: string }[] }>(
    `/conversations/search?locationId=${GHL_LOCATION_ID}&contactId=${contactId}`,
    token,
  );
  const out: GhlMessage[] = [];
  for (const conv of convs.conversations || []) {
    let last: string | undefined;
    for (let page = 0; page < MAX_MESSAGE_PAGES; page++) {
      const data = await ghl<{ messages?: { messages?: GhlMessage[]; nextPage?: boolean; lastMessageId?: string } }>(
        `/conversations/${conv.id}/messages?limit=100${last ? `&lastMessageId=${encodeURIComponent(last)}` : ""}`,
        token,
      );
      const box = data.messages || {};
      out.push(...(box.messages || []));
      if (!box.nextPage || !box.lastMessageId || box.lastMessageId === last) break;
      last = box.lastMessageId;
    }
  }
  return out;
}

async function downloadImage(c: ImageCandidate): Promise<FetchedImage | null> {
  const res = await fetch(c.url, { cache: "no-store" });
  if (!res.ok) return null;
  const contentType = res.headers.get("content-type") || "";
  const name = decodeURIComponent(c.url.split("?")[0].split("/").pop() || "");
  if (!isImportableImage({ name, contentType })) return null;
  return { bytes: await res.arrayBuffer(), contentType, name };
}

export function ghlConfigured(): boolean {
  return !!process.env.GHL_PIT_TOKEN;
}

export async function importGhlForJob(job: Pick<Job, "id" | "phone" | "email">): Promise<ImportResult> {
  const token = process.env.GHL_PIT_TOKEN;
  if (!token) return { source: "ghl", photos: 0, notes: 0, skipped: 0, errors: ["GHL_PIT_TOKEN is not set"] };
  if (!phoneDigits(job.phone) && !normalizeEmail(job.email)) {
    return { source: "ghl", photos: 0, notes: 0, skipped: 0, errors: [] };
  }
  const contacts = await findGhlContacts(job, token);
  const messages: GhlMessage[] = [];
  for (const c of contacts) messages.push(...(await ghlMessages(c.id, token)));
  const plan = planGhlImports(messages);
  return storeImports(job, "ghl", plan.images, plan.notes, downloadImage);
}
