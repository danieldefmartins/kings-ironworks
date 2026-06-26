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
}
export interface Job {
  id: string;
  job_number: string;
  customer_name: string;
  address: string | null;
  phone: string | null;
  finish: string | null;
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
  profile: string | null;
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
    "select=id,name,role,active&active=eq.true&order=name.asc"
  );
}

export async function verifyWorkerPin(
  workerId: string,
  pin: string
): Promise<Worker | null> {
  const rows = await sbSelect<Worker[]>(
    "kiw_shop_workers",
    `select=id,name,role,active,pin&id=eq.${workerId}&active=eq.true&limit=1`
  );
  const w = rows[0];
  if (!w || w.pin !== pin) return null;
  return { id: w.id, name: w.name, role: w.role, active: w.active };
}

export async function getWorkerById(id: string): Promise<Worker | null> {
  const rows = await sbSelect<Worker[]>(
    "kiw_shop_workers",
    `select=id,name,role,active&id=eq.${id}&limit=1`
  );
  return rows[0] || null;
}
