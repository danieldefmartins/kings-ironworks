// KIW Shop Floor — Supabase REST data layer (server-only; uses service-role key).
// No SDK dependency: talks to PostgREST directly. RLS is on with no policies,
// so the service-role key is REQUIRED and must never be exposed to the browser.

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://scasgwrikoqdwlwlwcff.supabase.co";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const STAGES = [
  "Awarded",
  "Shop Drawings",
  "Material",
  "Cut",
  "Fit/Weld",
  "Finish",
  "QC",
  "Install",
  "Done",
] as const;
export type Stage = (typeof STAGES)[number];

export interface Worker {
  id: string;
  name: string;
  role: string;
  pin?: string;
  active: boolean;
  can_see_prices?: boolean;
  lang?: string;
  hourly_rate?: number | null;
  is_admin?: boolean;
}

export interface TimeEntry {
  id: string;
  job_id: string;
  worker_id: string;
  started_at: string;
  ended_at: string | null;
  note: string | null;
  start_lat: number | null;
  start_lng: number | null;
  end_lat: number | null;
  end_lng: number | null;
  workerName?: string;
  jobLabel?: string;
}

// Photo categories the shop can pin an image to. "Installation — Location N"
// covers up to 5 railings out of the box; workers can add a custom one.
export const PRICE_CATEGORY = "Approved Estimate";
export const PHOTO_CATEGORIES = [
  "Plans",
  "Instructions",
  "Design",
  "Measurements",
  "Existing",
  "Inspiration",
  "Installation — Location 1",
  "Installation — Location 2",
  "Installation — Location 3",
  "Installation — Location 4",
  "Installation — Location 5",
  PRICE_CATEGORY,
] as const;

export interface Photo {
  id: string;
  job_id: string;
  url: string; // storage object path (private bucket) — sign before display
  kind: string | null; // 'image' | 'video'
  category: string | null;
  label: string | null;
  caption: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  signedUrl?: string;
  uploaderName?: string;
}
export interface Job {
  id: string;
  job_number: string;
  customer_name: string;
  project_type: string | null;
  address: string | null;
  phone: string | null;
  finish: string | null;
  finish_type: string | null;
  finish_sheen: string | null;
  color: string | null;
  mounting: string | null;
  due_date: string | null;
  current_stage: string;
  est_number: string | null;
  scope: string | null;
  notes: string | null;
  archived: boolean;
  created_at: string;
}
export interface CutItem {
  id: string;
  job_id: string;
  item_no: number | null;
  profile: string | null; // material type (Tube, Flat Bar, Angle, …)
  size: string | null; // e.g. 2x2x1/4
  description: string | null;
  qty: number | null;
  length: string | null;
  cut_tag: string | null;
  status: string;
  done_by: string | null;
  done_at: string | null;
}
export interface Material {
  id: string;
  job_id: string;
  description: string | null;
  qty: string | null;
  pulled: boolean;
  pulled_by: string | null;
  pulled_at: string | null;
}
export interface QcCheck {
  id: string;
  job_id: string;
  stage: string;
  label: string;
  expected: string | null;
  measured: string | null;
  passed: boolean | null;
  checked_by: string | null;
  checked_at: string | null;
  photo_url: string | null;
}

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

export function sbDelete(table: string, query: string): Promise<unknown> {
  return rest(`${table}?${query}`, { method: "DELETE" });
}

// ---- Domain helpers -------------------------------------------------------

export async function listJobs(): Promise<Job[]> {
  return sbSelect<Job[]>(
    "kiw_shop_jobs",
    "select=*&archived=eq.false&order=due_date.asc.nullslast"
  );
}

export async function getJob(id: string): Promise<Job | null> {
  const rows = await sbSelect<Job[]>(
    "kiw_shop_jobs",
    `select=*&id=eq.${id}&limit=1`
  );
  return rows[0] || null;
}

export async function getCutItems(jobId: string): Promise<CutItem[]> {
  return sbSelect<CutItem[]>(
    "kiw_shop_cut_items",
    `select=*&job_id=eq.${jobId}&order=item_no.asc`
  );
}
export async function getMaterials(jobId: string): Promise<Material[]> {
  return sbSelect<Material[]>(
    "kiw_shop_materials",
    `select=*&job_id=eq.${jobId}&order=description.asc`
  );
}
export async function getQc(jobId: string): Promise<QcCheck[]> {
  return sbSelect<QcCheck[]>(
    "kiw_shop_qc_checks",
    `select=*&job_id=eq.${jobId}&order=label.asc`
  );
}

export async function listWorkers(): Promise<Worker[]> {
  return sbSelect<Worker[]>(
    "kiw_shop_workers",
    "select=id,name,role,active,can_see_prices,lang,is_admin&active=eq.true&order=name.asc"
  );
}

export async function verifyWorkerPin(
  workerId: string,
  pin: string
): Promise<Worker | null> {
  const rows = await sbSelect<Worker[]>(
    "kiw_shop_workers",
    `select=id,name,role,active,can_see_prices,lang,is_admin,pin&id=eq.${workerId}&active=eq.true&limit=1`
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

export async function getWorkerById(id: string): Promise<Worker | null> {
  const rows = await sbSelect<Worker[]>(
    "kiw_shop_workers",
    `select=id,name,role,active,can_see_prices,lang,is_admin&id=eq.${id}&limit=1`
  );
  return rows[0] || null;
}

// ---- Time tracking (job clock) --------------------------------------------

// The worker's currently running entry, if any (one at a time per worker).
export async function getRunningEntry(workerId: string): Promise<TimeEntry | null> {
  const rows = await sbSelect<TimeEntry[]>(
    "kiw_shop_time_entries",
    `select=*&worker_id=eq.${workerId}&ended_at=is.null&order=started_at.desc&limit=1`
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
    `worker_id=eq.${workerId}&ended_at=is.null`,
    { ended_at: new Date().toISOString() }
  );
  await sbInsert("kiw_shop_time_entries", {
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
    `worker_id=eq.${workerId}&job_id=eq.${jobId}&ended_at=is.null`,
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
    `select=*&job_id=eq.${jobId}&order=started_at.desc`
  );
}

export async function getAllTimeEntries(): Promise<TimeEntry[]> {
  return sbSelect<TimeEntry[]>(
    "kiw_shop_time_entries",
    "select=*&order=started_at.desc&limit=500"
  );
}

// Running entries across the whole shop (for the board's live indicator).
export async function getRunningEntries(): Promise<TimeEntry[]> {
  return sbSelect<TimeEntry[]>(
    "kiw_shop_time_entries",
    "select=*&ended_at=is.null&order=started_at.asc"
  );
}

// Admin: full worker list including pay rates.
export async function listWorkersWithRates(): Promise<Worker[]> {
  return sbSelect<Worker[]>(
    "kiw_shop_workers",
    "select=id,name,role,active,can_see_prices,lang,is_admin,hourly_rate&active=eq.true&order=name.asc"
  );
}

export function entryHours(e: TimeEntry, now = Date.now()): number {
  const start = new Date(e.started_at).getTime();
  const end = e.ended_at ? new Date(e.ended_at).getTime() : now;
  return Math.max(0, (end - start) / 3600000);
}

// ---- Photos & Storage -----------------------------------------------------

const PHOTO_BUCKET = "kiw-shop-photos";

export async function getPhotos(jobId: string): Promise<Photo[]> {
  return sbSelect<Photo[]>(
    "kiw_shop_photos",
    `select=*&job_id=eq.${jobId}&order=uploaded_at.desc`
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
}): Promise<void> {
  await sbInsert("kiw_shop_photos", {
    kind: "image",
    ...row,
    uploaded_at: new Date().toISOString(),
  });
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
