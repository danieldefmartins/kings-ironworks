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
  address?: string | null;
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
  // Cached geocode of `address`, so the map does not hit Nominatim per render.
  // geocoded_address is what they were derived from: when it drifts from
  // address the pin is stale and belongs to the previous house.
  lat: number | null;
  lng: number | null;
  geocoded_address: string | null;
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

// A finished article the customer counts — "9 window wells", "14 railing
// sections" — as opposed to CutItem, which is the steel to buy and cut for it.
export interface JobPiece {
  id: string;
  job_id: string;
  name: string;
  qty_total: number;
  qty_fabricated: number;
  qty_installed: number;
  sort_order: number;
}

// Each piece is half done when it is fabricated and whole when it is
// installed, so a job of 10 pieces all built but none hung reads 50% — which
// is what "based on items installed and fabricated" means and, more to the
// point, what the shop floor would say if you asked.
export function pieceProgress(pieces: JobPiece[]): {
  total: number; fabricated: number; installed: number; pct: number;
} {
  const total = pieces.reduce((n, p) => n + p.qty_total, 0);
  const fabricated = pieces.reduce((n, p) => n + p.qty_fabricated, 0);
  const installed = pieces.reduce((n, p) => n + p.qty_installed, 0);
  // No pieces means no claim: 0%, never 100% from an empty sum.
  const pct = total === 0 ? 0 : Math.round(((fabricated + installed) / (total * 2)) * 100);
  return { total, fabricated, installed, pct };
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

// King Iron Works runs on Eastern time. Everything is stored as timestamptz —
// absolute instants, which is correct — but "what time did Tiago clock in" has
// exactly one right answer for this shop, and it is not "whatever timezone the
// renderer happened to be in."
//
// That distinction bit us: the timesheet's location history is a SERVER
// component, the Railway container sets no TZ so Node defaults to UTC, and a
// 8:12am punch rendered as "12:12 PM". Client components looked fine only
// because the tablets happen to sit in Massachusetts — correct by accident,
// and wrong the moment a device has the wrong zone or somebody reviews hours
// from another state.
//
// So pin the zone rather than inheriting it. Payroll is the consumer here and
// payroll does not get to be ambiguous.
export const SHOP_TZ = "America/New_York";

const LOCALES: Record<string, string> = { pt: "pt-BR", es: "es-US", en: "en-US" };

/** Clock time only — "7:14 AM". */
export function fmtTime(iso: string | number | Date, lang = "en"): string {
  return new Date(iso).toLocaleTimeString(LOCALES[lang] || "en-US", {
    timeZone: SHOP_TZ,
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Date and clock time — "Sep 2, 7:14 AM". */
export function fmtDateTime(iso: string | number | Date, lang = "en"): string {
  return new Date(iso).toLocaleString(LOCALES[lang] || "en-US", {
    timeZone: SHOP_TZ,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** The calendar date in shop time, as YYYY-MM-DD. */
export function shopDateKey(iso: string | number | Date): string {
  // en-CA formats as YYYY-MM-DD, which saves hand-assembling the parts.
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: SHOP_TZ });
}

/** Monday of the shop-time week containing `iso`, as YYYY-MM-DD. */
export function shopWeekKey(iso: string | number | Date): string {
  const key = shopDateKey(iso);
  // Anchor at noon UTC so adding/subtracting whole days can never trip over a
  // DST transition and land on the previous evening.
  const noon = new Date(`${key}T12:00:00Z`);
  const dow = (noon.getUTCDay() + 6) % 7; // Monday = 0
  noon.setUTCDate(noon.getUTCDate() - dow);
  return noon.toISOString().slice(0, 10);
}

// The correction editor round-trips a timestamp through an <input
// type="datetime-local">, which speaks naive wall-clock strings with no zone.
// The old pair read and wrote that string in the DEVICE's zone, so it only
// round-tripped correctly on a phone set to Eastern. Much of the crew is
// Brazilian; a handset left on São Paulo time would have silently filed a
// correction several hours off — against payroll.
//
// These two are exact inverses in shop time, so a value that is displayed,
// left untouched, and saved comes back as the same instant.
export function toShopInput(iso: string | number | Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SHOP_TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function fromShopInput(value: string): string {
  // Read the wall-clock string as if it were UTC, then measure how far that
  // instant's shop-time rendering sits from its UTC rendering and undo it.
  // Deriving the offset per instant is what keeps DST correct.
  const asIfUtc = new Date(`${value}:00Z`).getTime();
  const shopWall = new Date(new Date(asIfUtc).toLocaleString("en-US", { timeZone: SHOP_TZ })).getTime();
  const utcWall = new Date(new Date(asIfUtc).toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  return new Date(asIfUtc - (shopWall - utcWall)).toISOString();
}

// Hours are carried as a decimal internally because that is the only form the
// payroll arithmetic and the QuickBooks export work in — 40 + overtime does
// not add up in base 60. But nothing on screen shows a decimal any more.
//
// Daniel asked whether "1.37 hours" meant an hour and thirty-seven minutes. It
// did not — it meant 1h 22m. Anyone reading a timesheet reads a clock, and a
// format that has to be explained is a format that will be misread, on the
// numbers that turn into paychecks. So the decimal stays inside the math and
// every screen renders hours and minutes.
export function hoursToHm(h: number): string {
  const total = Math.max(0, Math.round(h * 60));
  return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, "0")}m`;
}

/** Monday 00:00 shop time for the week containing `iso`, as a UTC ISO string. */
export function shopWeekStartIso(iso: string | number | Date = Date.now()): string {
  // Via fromShopInput so the offset is derived for that actual date — a
  // hardcoded -05:00 is EST and silently wrong for the eight months of EDT.
  return fromShopInput(`${shopWeekKey(iso)}T00:00`);
}
