// KIW Shop Floor — constants and row types shared by server AND client code.
// This module must stay free of env access, secrets, and Supabase calls:
// client components import from here, never from db.ts (whose org guard is
// server-only and would crash the browser bundle).

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
  email: string | null;
  // Money fields — only ever rendered for workers with can_see_prices/is_admin.
  contract_amount: number | string | null; // total sell price for the job
  deposit_amount: number | string | null; // PostgREST returns numeric as a string
  deposit_note: string | null;
  deposit_received_on: string | null;
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

export interface OrgSettings {
  branding: { name: string; address: string; phone: string; website: string };
  tolerances: Record<string, { green: number; yellow: number }>;
  presets: Record<string, string[]>;
  options: Record<string, string[]>;
  rules: { allowSelfApproval: boolean };
  defaults: Record<string, string>;
}

// numeric columns arrive as strings over PostgREST; normalise once.
function num(v: number | string | null): number {
  if (v === null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
export function depositValue(j: Pick<Job, "deposit_amount">): number {
  return num(j.deposit_amount);
}
export function contractValue(j: Pick<Job, "contract_amount">): number {
  return num(j.contract_amount);
}

export function entryHours(e: TimeEntry, now = Date.now()): number {
  const start = new Date(e.started_at).getTime();
  const end = e.ended_at ? new Date(e.ended_at).getTime() : now;
  return Math.max(0, (end - start) / 3600000);
}

// ---- Material catalog ------------------------------------------------------

export interface CatalogItem {
  id: string;
  sku: string;
  category: string;
  role_keys: string[];
  spec: string;          // canonical designation, e.g. "HSS 1-1/2 x 1-1/2 x 11ga"
  display: string;       // what the crew reads
  dim_a: number | null;
  dim_b: number | null;
  wall: number | null;
  grade: string | null;
  stock_length_ft: number | null;
  weight_per_ft: number | null;
  unit: string;          // ft | ea | sqft | job
  active: boolean;
  // Supplies and tools carry facts steel does not.
  brand?: string | null;
  supplier?: string | null;
  supplier_sku?: string | null;
  reorder_url?: string | null;
  image_url?: string | null;   // storage PATH, signed at render time
  pack_qty?: number | null;
  unit_cost?: number | null;
  is_tool?: boolean;
  service_interval_days?: number | null;
  notes?: string | null;
}

export interface InventoryRow {
  id: string;
  catalog_id: string;
  location: string;
  on_hand: number;
  min_qty: number | null;
  updated_at: string;
}

// One place to buy one item. unit_price is generated in the database
// (pack_price / pack_qty) because that is the only number that compares
// across suppliers selling different pack sizes.
export interface SupplierPrice {
  id: string;
  catalog_id: string;
  supplier: string;
  supplier_sku: string | null;
  url: string | null;
  pack_qty: number | null;
  pack_price: number | null;
  unit_price: number | null;
  preferred: boolean;
  last_checked: string | null;
  notes: string | null;
}
