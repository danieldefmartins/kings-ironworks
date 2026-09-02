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

// Daniel: "not all 16 projects are currently under fabrication, it's all active
// and pending fabrication."
//
// Sold is not started. A job sits in Awarded or Shop Drawings for weeks before
// anyone cuts anything, so the board calling all of them "under fabrication"
// overstated the shop by about three to one. Fabrication begins when material
// is being gathered for it — from Material onward the job is on the floor.
export const FIRST_FABRICATION_STAGE: Stage = "Material";

export function isInFabrication(job: { current_stage: string }): boolean {
  const i = STAGES.indexOf(job.current_stage as Stage);
  return i >= STAGES.indexOf(FIRST_FABRICATION_STAGE) && job.current_stage !== "Done";
}

// Owner-level access: contract money, labor cost, and the whole /shop/admin
// tree. Driven by the two flags already on kiw_shop_workers, so adding or
// removing an owner is a row edit rather than a deploy — and the rule is not
// shipped to the browser as a list of names. Both flags are required on
// purpose: is_admin alone covers shop-floor overrides (stage changes,
// archiving), which is not the same trust level as seeing what a job sold for.
export function canViewOwnerFinancials(worker: {
  is_admin?: boolean | null;
  can_see_prices?: boolean | null;
}): boolean {
  return !!worker.is_admin && !!worker.can_see_prices;
}

// Money fields travel with the job row, so hiding them in the UI is not
// hiding them — they would still sit in the RSC payload for anyone who opens
// the network tab. Strip them on the server before the row crosses over.
export function redactJobMoney<T extends Pick<Job, "contract_amount" | "deposit_amount" | "deposit_note" | "deposit_received_on">>(
  job: T,
  canSeeMoney: boolean,
): T {
  if (canSeeMoney) return job;
  return { ...job, contract_amount: null, deposit_amount: null, deposit_note: null, deposit_received_on: null };
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
  phone?: string | null;
  email?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
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
  shift_id?: string | null;
  start_accuracy_m?: number | null;
  end_accuracy_m?: number | null;
  workerName?: string;
  jobLabel?: string;
}

export interface TimeShift {
  id: string;
  worker_id: string;
  pay_rate?: number | string | null;
  started_at: string;
  ended_at: string | null;
  start_lat: number | null;
  start_lng: number | null;
  start_accuracy_m: number | null;
  end_lat: number | null;
  end_lng: number | null;
  end_accuracy_m: number | null;
  start_location_status: "verified" | "outside" | "unavailable" | "unknown";
  end_location_status: "verified" | "outside" | "unavailable" | "unknown";
  status: "open" | "submitted" | "approved" | "rejected";
  approved_by: string | null;
  approved_at: string | null;
  employee_note: string | null;
  manager_note: string | null;
}

export interface ShiftLocation {
  id: string;
  shift_id: string;
  worker_id: string;
  recorded_at: string;
  lat: number;
  lng: number;
  accuracy_m: number | null;
  location_status: string;
  work_state: "working" | "break";
}

export interface TimeBreak {
  id: string;
  shift_id: string;
  started_at: string;
  ended_at: string | null;
  paid: boolean;
}

export interface TimeCorrection {
  id: string;
  shift_id: string;
  worker_id: string;
  requested_started_at: string | null;
  requested_ended_at: string | null;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
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
  assigned_worker_id?: string | null;
  fabrication_order?: number | null;
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

// Longest a single project entry can count for. A still-running entry is
// capped at this so one forgotten tap cannot report 23 hours against a job and
// quietly move its profit. Closed entries are never capped — a real long day
// is a real long day, and only the owner can edit it.
export const MAX_PROJECT_ENTRY_HOURS = 12;

export function entryHours(e: TimeEntry, now = Date.now()): number {
  const start = new Date(e.started_at).getTime();
  const end = e.ended_at ? new Date(e.ended_at).getTime() : now;
  const hours = Math.max(0, (end - start) / 3600000);
  return e.ended_at ? hours : Math.min(hours, MAX_PROJECT_ENTRY_HOURS);
}

export function shiftHours(
  shift: Pick<TimeShift, "started_at" | "ended_at">,
  breaks: TimeBreak[] = [],
  now = Date.now()
): number {
  const gross = Math.max(
    0,
    ((shift.ended_at ? new Date(shift.ended_at).getTime() : now) -
      new Date(shift.started_at).getTime()) /
      3600000
  );
  const unpaid = breaks
    .filter((b) => !b.paid)
    .reduce((sum, b) => {
      const end = b.ended_at ? new Date(b.ended_at).getTime() : now;
      return sum + Math.max(0, end - new Date(b.started_at).getTime()) / 3600000;
    }, 0);
  return Math.max(0, gross - unpaid);
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
