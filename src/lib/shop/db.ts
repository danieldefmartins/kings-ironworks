// KIW Shop Floor — Supabase REST data layer (server-only; uses service-role key).
// No SDK dependency: talks to PostgREST directly. RLS is on with no policies,
// so the service-role key is REQUIRED and must never be exposed to the browser.

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://scasgwrikoqdwlwlwcff.supabase.co";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Multi-tenant: this deployment serves exactly ONE organization. Every query
// in this file is scoped to it, and composite DB foreign keys guarantee that
// child rows can never reference another organization's data even if a
// filter were ever missed. KIW is tenant #1.
// Shared constants and row types live in shared.ts so client components can
// use them without pulling this server-only module into the browser bundle.
export * from "./shared";
import { type TimeEntry, type Job, type Photo, type Worker, type CutItem, type Material, type QcCheck, type OrgSettings, type CatalogItem, type InventoryRow } from "./shared";

// Multi-tenant: this deployment serves exactly ONE organization. Every query
// in this file is scoped to it, and composite DB foreign keys guarantee that
// child rows can never reference another organization's data even if a
// filter were ever missed. KIW is tenant #1.
export const ORG_ID = (() => {
  // Guard is server-only: if this module ever leaks into a client bundle,
  // env vars are absent there and throwing would crash the whole page.
  if (typeof window !== "undefined") return "";
  const v = process.env.SHOP_ORG_ID;
  if (v) return v;
  // Fail closed: a deployed instance must say which organization it serves.
  // Silently defaulting could open the wrong company's data on a
  // misconfigured customer deployment. Local dev may opt into the KIW
  // default with SHOP_ALLOW_DEFAULT_ORG=1.
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build" && // build has no env
    process.env.SHOP_ALLOW_DEFAULT_ORG !== "1"
  ) {
    throw new Error(
      "SHOP_ORG_ID is not set — refusing to serve without an explicit organization."
    );
  }
  return "a0000000-0000-4000-8000-000000000001";
})();

async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!SERVICE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to the environment (Railway) to enable the shop floor."
    );
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase ${res.status}: ${body}`);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export function sbSelect<T>(table: string, query: string): Promise<T> {
  return rest<T>(`${table}?${query}`);
}
export function sbInsert<T>(table: string, row: unknown): Promise<T> {
  return rest<T>(table, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
}
export function sbUpdate<T>(
  table: string,
  query: string,
  patch: Record<string, unknown>
): Promise<T> {
  return rest<T>(`${table}?${query}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
}

// Call a Postgres function (PostgREST RPC). Errors surface as thrown
// Error("Supabase <status>: <body>") from rest() — callers match on message.
export function sbRpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  return rest<T>(`rpc/${fn}`, {
    method: "POST",
    body: JSON.stringify(args),
  });
}

export function sbDelete<T = unknown>(table: string, query: string): Promise<T> {
  // return=representation so callers can verify a row was actually deleted
  return rest<T>(`${table}?${query}`, {
    method: "DELETE",
    headers: { Prefer: "return=representation" },
  });
}

// ---- Domain helpers -------------------------------------------------------

export async function listJobs(): Promise<Job[]> {
  return sbSelect<Job[]>(
    "kiw_shop_jobs",
    `select=*&org_id=eq.${ORG_ID}&archived=eq.false&order=due_date.asc.nullslast`
  );
}

// Every job carrying a customer deposit, biggest first. Admin-only view.
export async function listJobsWithDeposits(): Promise<Job[]> {
  return sbSelect<Job[]>(
    "kiw_shop_jobs",
    `select=*&org_id=eq.${ORG_ID}&deposit_amount=not.is.null&order=deposit_amount.desc`
  );
}

export async function getJob(id: string): Promise<Job | null> {
  const rows = await sbSelect<Job[]>(
    "kiw_shop_jobs",
    `select=*&org_id=eq.${ORG_ID}&id=eq.${id}&limit=1`
  );
  return rows[0] || null;
}

export async function getCutItems(jobId: string): Promise<CutItem[]> {
  return sbSelect<CutItem[]>(
    "kiw_shop_cut_items",
    `select=*&org_id=eq.${ORG_ID}&job_id=eq.${jobId}&order=item_no.asc`
  );
}
export async function getMaterials(jobId: string): Promise<Material[]> {
  return sbSelect<Material[]>(
    "kiw_shop_materials",
    `select=*&org_id=eq.${ORG_ID}&job_id=eq.${jobId}&order=description.asc`
  );
}
export async function getQc(jobId: string): Promise<QcCheck[]> {
  return sbSelect<QcCheck[]>(
    "kiw_shop_qc_checks",
    `select=*&org_id=eq.${ORG_ID}&job_id=eq.${jobId}&order=label.asc`
  );
}

export async function listWorkers(): Promise<Worker[]> {
  return sbSelect<Worker[]>(
    "kiw_shop_workers",
    `select=id,name,role,active,can_see_prices,lang,is_admin&org_id=eq.${ORG_ID}&active=eq.true&order=name.asc`
  );
}

export async function verifyWorkerPin(
  workerId: string,
  pin: string
): Promise<Worker | null> {
  const rows = await sbSelect<Worker[]>(
    "kiw_shop_workers",
    `select=id,name,role,active,can_see_prices,lang,is_admin,pin&org_id=eq.${ORG_ID}&id=eq.${workerId}&active=eq.true&limit=1`
  );
  const w = rows[0];
  if (!w || w.pin !== pin) return null;
  return {
    id: w.id,
    name: w.name,
    role: w.role,
    active: w.active,
    can_see_prices: w.can_see_prices,
    lang: w.lang,
    is_admin: w.is_admin,
  };
}

// Just the fields a session is bound to. Kept separate from getWorkerById so
// the PIN is only ever read where it is actually needed.
export interface WorkerAuthState {
  pin: string | null;
  active: boolean;
  is_admin: boolean;
}

export async function getWorkerAuthState(id: string): Promise<WorkerAuthState | null> {
  const rows = await sbSelect<{ pin: string | null; active: boolean; is_admin: boolean | null }[]>(
    "kiw_shop_workers",
    `select=pin,active,is_admin&org_id=eq.${ORG_ID}&id=eq.${id}&limit=1`
  );
  const r = rows[0];
  if (!r) return null;
  return { pin: r.pin ?? null, active: !!r.active, is_admin: !!r.is_admin };
}

export async function getWorkerById(id: string): Promise<Worker | null> {
  const rows = await sbSelect<Worker[]>(
    "kiw_shop_workers",
    `select=id,name,role,active,can_see_prices,lang,is_admin&org_id=eq.${ORG_ID}&id=eq.${id}&limit=1`
  );
  return rows[0] || null;
}

// ---- Time tracking (job clock) --------------------------------------------

// The worker's currently running entry, if any (one at a time per worker).
export async function getRunningEntry(workerId: string): Promise<TimeEntry | null> {
  const rows = await sbSelect<TimeEntry[]>(
    "kiw_shop_time_entries",
    `select=*&org_id=eq.${ORG_ID}&worker_id=eq.${workerId}&ended_at=is.null&order=started_at.desc&limit=1`
  );
  return rows[0] || null;
}

// Start the clock on a job. Any running entry for this worker is closed first,
// so a forgotten timer never double-counts.
export async function startTimeEntry(
  workerId: string,
  jobId: string,
  loc?: { lat: number; lng: number } | null
): Promise<void> {
  await sbUpdate(
    "kiw_shop_time_entries",
    `org_id=eq.${ORG_ID}&worker_id=eq.${workerId}&ended_at=is.null`,
    { ended_at: new Date().toISOString() }
  );
  await sbInsert("kiw_shop_time_entries", {
    org_id: ORG_ID,
    worker_id: workerId,
    job_id: jobId,
    started_at: new Date().toISOString(),
    start_lat: loc?.lat ?? null,
    start_lng: loc?.lng ?? null,
  });
}

export async function stopTimeEntry(
  workerId: string,
  jobId: string,
  loc?: { lat: number; lng: number } | null
): Promise<void> {
  await sbUpdate(
    "kiw_shop_time_entries",
    `org_id=eq.${ORG_ID}&worker_id=eq.${workerId}&job_id=eq.${jobId}&ended_at=is.null`,
    {
      ended_at: new Date().toISOString(),
      end_lat: loc?.lat ?? null,
      end_lng: loc?.lng ?? null,
    }
  );
}

export async function getJobTimeEntries(jobId: string): Promise<TimeEntry[]> {
  return sbSelect<TimeEntry[]>(
    "kiw_shop_time_entries",
    `select=*&org_id=eq.${ORG_ID}&job_id=eq.${jobId}&order=started_at.desc`
  );
}

export async function getAllTimeEntries(): Promise<TimeEntry[]> {
  return sbSelect<TimeEntry[]>(
    "kiw_shop_time_entries",
    `select=*&org_id=eq.${ORG_ID}&order=started_at.desc&limit=500`
  );
}

// Running entries across the whole shop (for the board's live indicator).
export async function getRunningEntries(): Promise<TimeEntry[]> {
  return sbSelect<TimeEntry[]>(
    "kiw_shop_time_entries",
    `select=*&org_id=eq.${ORG_ID}&ended_at=is.null&order=started_at.asc`
  );
}

// Admin: full worker list including pay rates.
export async function listWorkersWithRates(): Promise<Worker[]> {
  return sbSelect<Worker[]>(
    "kiw_shop_workers",
    `select=id,name,role,active,can_see_prices,lang,is_admin,hourly_rate&org_id=eq.${ORG_ID}&active=eq.true&order=name.asc`
  );
}

// Archiving is how a finished job leaves the shop floor without leaving the
// record. listJobs() has always filtered on this column; nothing could set it.
export async function setJobArchived(jobId: string, archived: boolean): Promise<Job | null> {
  const rows = await sbUpdate<Job[]>(
    "kiw_shop_jobs",
    `org_id=eq.${ORG_ID}&id=eq.${jobId}`,
    { archived }
  );
  return rows[0] || null;
}

export async function listArchivedJobs(): Promise<Job[]> {
  return sbSelect<Job[]>(
    "kiw_shop_jobs",
    `select=*&org_id=eq.${ORG_ID}&archived=eq.true&order=job_number.asc`
  );
}

// ---- Field measure sheets -------------------------------------------------

import {
  carryoverFrom,
  normalizeMeasureData,
  type MeasureSheet,
  type MeasureData,
  type Carryover,
  type CarryoverSource,
} from "./measure";

export async function getMeasureSheets(jobId: string): Promise<MeasureSheet[]> {
  return sbSelect<MeasureSheet[]>(
    "kiw_shop_measure_sheets",
    `select=*&org_id=eq.${ORG_ID}&job_id=eq.${jobId}&order=created_at.asc`
  );
}

export async function getMeasureSheet(id: string): Promise<MeasureSheet | null> {
  const rows = await sbSelect<MeasureSheet[]>(
    "kiw_shop_measure_sheets",
    `select=*&org_id=eq.${ORG_ID}&id=eq.${id}&limit=1`
  );
  return rows[0] || null;
}

// The shop-standard answers to start the next sheet from: the worker's own
// most recently finished sheet, falling back to the shop's. Blank when this is
// the first finished sheet anyone has — there is nothing honest to suggest.
export async function getCarryover(
  workerId: string
): Promise<{ values: Carryover; source: CarryoverSource } | null> {
  const finished = "status=in.(submitted,approved)";
  const pick = async (filter: string) =>
    sbSelect<{ data: MeasureData }[]>(
      "kiw_shop_measure_sheets",
      `select=data&org_id=eq.${ORG_ID}&${finished}&${filter}order=updated_at.desc&limit=1`
    );
  try {
    const mine = await pick(`submitted_by=eq.${workerId}&`);
    if (mine[0]) {
      const values = carryoverFrom(normalizeMeasureData(mine[0].data));
      if (Object.keys(values).length > 0) return { values, source: "worker" };
    }
    const shop = await pick("");
    if (shop[0]) {
      const values = carryoverFrom(normalizeMeasureData(shop[0].data));
      if (Object.keys(values).length > 0) return { values, source: "shop" };
    }
  } catch {
    // Suggestions are a convenience; never let them take the sheet down.
  }
  return null;
}

import type { MeasureRevision } from "./measure";

export async function getMeasureRevision(
  sheetId: string,
  revNo: number
): Promise<MeasureRevision | null> {
  const rows = await sbSelect<MeasureRevision[]>(
    "kiw_shop_measure_revisions",
    `select=*&org_id=eq.${ORG_ID}&sheet_id=eq.${sheetId}&rev_no=eq.${revNo}&limit=1`
  );
  return rows[0] || null;
}

// ---- Organization settings + audit ----------------------------------------

const FALLBACK_SETTINGS: OrgSettings = {
  branding: {
    name: "KING IRON WORKS",
    address: "69 Norman St, Unit 20, Everett, MA 02149",
    phone: "(617) 404-2589",
    website: "kingsironworks.com",
  },
  tolerances: {
    riseSum: { green: 0.25, yellow: 0.75 },
    runSum: { green: 0.375, yellow: 1.0 },
    rake: { green: 0.5, yellow: 1.5 },
    angle: { green: 1.0, yellow: 2.5 },
    widthVar: { green: 0.375, yellow: 1.0 },
  },
  presets: {},
  options: {},
  rules: { allowSelfApproval: false },
  defaults: { units: "in" },
};

export async function getOrgSettings(): Promise<OrgSettings> {
  try {
    const rows = await sbSelect<{ settings: Partial<OrgSettings> }[]>(
      "kiw_shop_org_settings",
      `select=settings&org_id=eq.${ORG_ID}&limit=1`
    );
    const sdb = rows[0]?.settings || {};
    return {
      branding: { ...FALLBACK_SETTINGS.branding, ...(sdb.branding || {}) },
      tolerances: { ...FALLBACK_SETTINGS.tolerances, ...(sdb.tolerances || {}) },
      presets: sdb.presets || {},
      options: sdb.options || {},
      rules: { ...FALLBACK_SETTINGS.rules, ...(sdb.rules || {}) },
      defaults: { ...FALLBACK_SETTINGS.defaults, ...(sdb.defaults || {}) },
    };
  } catch {
    return FALLBACK_SETTINGS;
  }
}

export async function saveOrgSettings(
  settings: Partial<OrgSettings>,
  workerId: string
): Promise<void> {
  await rest("kiw_shop_org_settings", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({
      org_id: ORG_ID,
      settings,
      updated_at: new Date().toISOString(),
      updated_by: workerId,
    }),
  });
}

// Immutable audit trail — a DB trigger blocks UPDATE/DELETE on this table
// for every role, including administrators and the service key.
export async function audit(
  action: string,
  opts: {
    workerId?: string | null;
    entity?: string;
    entityId?: string;
    detail?: unknown;
  } = {}
): Promise<void> {
  try {
    await sbInsert("kiw_shop_audit", {
      org_id: ORG_ID,
      worker_id: opts.workerId ?? null,
      action,
      entity: opts.entity ?? null,
      entity_id: opts.entityId ?? null,
      detail: opts.detail ?? null,
    });
  } catch {
    // auditing must never break the operation being audited
  }
}

// Change history of one measure sheet, from the immutable audit trail.
// Consecutive autosaves by the same worker collapse into a single entry
// (its timestamp = the last save), so the list reads as editing sessions.
export interface SheetHistoryEntry {
  at: string;
  action: string;
  workerId: string | null;
}
export async function getSheetHistory(sheetId: string): Promise<SheetHistoryEntry[]> {
  const rows = await sbSelect<{ at: string; action: string; worker_id: string | null }[]>(
    "kiw_shop_audit",
    `select=at,action,worker_id&org_id=eq.${ORG_ID}&entity=eq.measure_sheet&entity_id=eq.${sheetId}&order=at.asc&limit=1000`
  );
  const out: SheetHistoryEntry[] = [];
  for (const r of rows) {
    const prev = out[out.length - 1];
    const workerId = r.worker_id || null;
    if (prev && r.action === "sheet_update" && prev.action === "sheet_update" && prev.workerId === workerId) {
      prev.at = r.at;
      continue;
    }
    out.push({ at: r.at, action: r.action, workerId });
  }
  return out;
}

// Failed logins in the recent window (PIN throttling).
export async function recentLoginFailures(
  workerId: string,
  windowMinutes = 15
): Promise<number> {
  const since = new Date(Date.now() - windowMinutes * 60000).toISOString();
  const rows = await sbSelect<{ id: string }[]>(
    "kiw_shop_audit",
    `select=id&org_id=eq.${ORG_ID}&action=eq.login_fail&worker_id=eq.${workerId}&at=gte.${encodeURIComponent(since)}`
  );
  return rows.length;
}

// ---- Photos & Storage -----------------------------------------------------

const PHOTO_BUCKET = "kiw-shop-photos";

export async function getPhotos(jobId: string): Promise<Photo[]> {
  return sbSelect<Photo[]>(
    "kiw_shop_photos",
    `select=*&org_id=eq.${ORG_ID}&job_id=eq.${jobId}&order=uploaded_at.desc`
  );
}

export async function insertPhoto(row: {
  job_id: string;
  url: string;
  kind?: string;
  category: string;
  label?: string | null;
  caption?: string | null;
  uploaded_by: string;
}): Promise<Photo | null> {
  const rows = await sbInsert<Photo[]>("kiw_shop_photos", {
    kind: "image",
    org_id: ORG_ID,
    ...row,
    uploaded_at: new Date().toISOString(),
  });
  return rows[0] || null;
}

// Upload raw bytes to the private bucket.
export async function uploadPhotoObject(
  path: string,
  bytes: ArrayBuffer,
  contentType: string
): Promise<void> {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${PHOTO_BUCKET}/${encodeURI(path)}`,
    {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: Buffer.from(bytes),
    }
  );
  if (!res.ok) {
    throw new Error(`Storage upload ${res.status}: ${await res.text()}`);
  }
}

// Remove an object from the private bucket (admin photo deletion).
export async function deletePhotoObject(path: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/storage/v1/object/${PHOTO_BUCKET}/${encodeURI(path)}`, {
    method: "DELETE",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });
}

// Create a short-lived signed URL so private photos can be viewed in the browser.
export async function signPhotoUrl(
  path: string,
  expiresIn = 3600
): Promise<string | null> {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/sign/${PHOTO_BUCKET}/${encodeURI(path)}`,
    {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn }),
    }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { signedURL?: string };
  return data.signedURL ? `${SUPABASE_URL}/storage/v1${data.signedURL}` : null;
}

// ---- Material catalog & inventory ------------------------------------------
//
// Jobs consume catalog items, never a sentence somebody typed. Free text goes
// to kiw_catalog_requests and stays there until a human turns it into a SKU,
// so stock counts can never be polluted by four spellings of the same steel.

export async function listCatalog(): Promise<CatalogItem[]> {
  return sbSelect<CatalogItem[]>(
    "kiw_materials_catalog",
    `select=*&org_id=eq.${ORG_ID}&active=eq.true&order=category.asc,display.asc`
  );
}

export async function listInventory(): Promise<InventoryRow[]> {
  return sbSelect<InventoryRow[]>(
    "kiw_inventory",
    `select=*&org_id=eq.${ORG_ID}`
  );
}
