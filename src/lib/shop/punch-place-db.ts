// Server side of punch places (rules in punch-place.ts). Owner pages only.
//
// Reverse geocoding: OpenStreetMap Nominatim, identified by User-Agent, at
// most one request per second from this process, and every answer cached in
// kiw_shop_place_cache — so a page render never waits on, or repeats, a
// lookup. Misses are queued in the background and show up on the next load.
// If the cache table does not exist yet (migration not applied), lookups are
// skipped entirely rather than repeated on every render.

import { ORG_ID, sbInsertIgnoreDuplicates, sbSelect } from "./db";
import type { TimeShift } from "./shared";
import {
  SHOP_POINT, placeKey, punchPoint, resolvePlace, shortAddress,
  type GeoPoint, type Ping, type Site,
} from "./punch-place";

export type { ShiftPlaces } from "./punch-place";
import type { ShiftPlaces } from "./punch-place";

type LocShift = Pick<TimeShift, "id" | "started_at" | "ended_at" | "start_lat" | "start_lng" | "start_accuracy_m" | "end_lat" | "end_lng" | "end_accuracy_m">;

function shopPoint() {
  const lat = Number(process.env.SHOP_GEOFENCE_LAT), lng = Number(process.env.SHOP_GEOFENCE_LNG);
  return Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0) ? { lat, lng } : SHOP_POINT;
}

function chunks<T>(list: T[], n = 80): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n));
  return out;
}

const queue: { lat: number; lng: number; key: string }[] = [];
const queued = new Set<string>();
let draining = false;

async function drain() {
  if (draining) return;
  draining = true;
  try {
    while (queue.length) {
      const job = queue.shift()!;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${job.lat}&lon=${job.lng}&zoom=18&addressdetails=1`, {
          headers: { "User-Agent": "KIW-ShopFloor/1.0 (info@kingsironworks.com)" }, cache: "no-store", signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          const g = (await res.json()) as { address?: Record<string, string>; display_name?: string };
          const label = shortAddress(g.address, g.display_name || "").slice(0, 120);
          if (label) {
            const [latE4, lngE4] = job.key.split(",").map(Number);
            await sbInsertIgnoreDuplicates("kiw_shop_place_cache", [{ org_id: ORG_ID, lat_e4: latE4, lng_e4: lngE4, label }], "org_id,lat_e4,lng_e4");
          }
        }
      } catch (err) {
        console.error("[place] reverse geocode failed:", err);
      }
      await new Promise((r) => setTimeout(r, 1100)); // Nominatim: max 1 req/s
    }
  } finally {
    draining = false;
  }
}

function enqueue(points: GeoPoint[]) {
  for (const p of points) {
    const key = placeKey(p);
    if (queued.has(key) || queue.length >= 50) continue;
    queued.add(key);
    queue.push({ lat: Math.round(p.lat * 1e5) / 1e5, lng: Math.round(p.lng * 1e5) / 1e5, key });
  }
  void drain();
}

export async function loadShiftPlaces(shifts: LocShift[]): Promise<Record<string, ShiftPlaces>> {
  if (!shifts.length) return {};
  const ids = shifts.map((s) => s.id);
  const [pings, jobs, late, cache] = await Promise.all([
    Promise.all(chunks(ids).map((c) => sbSelect<Ping[]>("kiw_shop_shift_locations",
      `select=shift_id,recorded_at,lat,lng,accuracy_m&org_id=eq.${ORG_ID}&shift_id=in.(${c.join(",")})&order=recorded_at.asc&limit=5000`))).then((r) => r.flat()).catch(() => [] as Ping[]),
    sbSelect<{ customer_name: string; job_number: string; lat: number | null; lng: number | null }[]>("kiw_shop_jobs",
      `select=customer_name,job_number,lat,lng&org_id=eq.${ORG_ID}&lat=not.is.null&lng=not.is.null&limit=2000`).catch(() => []),
    Promise.all(chunks(ids).map((c) => sbSelect<{ action: string; entity_id: string }[]>("kiw_shop_audit",
      `select=action,entity_id&org_id=eq.${ORG_ID}&action=in.(shift_clock_in,shift_clock_out)&detail->>late=eq.true&entity_id=in.(${c.join(",")})`))).then((r) => r.flat()).catch(() => []),
    sbSelect<{ lat_e4: number; lng_e4: number; label: string }[]>("kiw_shop_place_cache",
      `select=lat_e4,lng_e4,label&org_id=eq.${ORG_ID}&limit=10000`).catch(() => null),
  ]);
  const sites: Site[] = jobs.filter((j) => j.lat != null && j.lng != null).map((j) => ({ name: j.customer_name || j.job_number, lat: Number(j.lat), lng: Number(j.lng) }));
  const addresses = new Map((cache || []).map((c) => [`${c.lat_e4},${c.lng_e4}`, c.label]));
  const shop = shopPoint();
  const lateIn = new Set(late.filter((a) => a.action === "shift_clock_in").map((a) => a.entity_id));
  const lateOut = new Set(late.filter((a) => a.action === "shift_clock_out").map((a) => a.entity_id));
  const out: Record<string, ShiftPlaces> = {};
  const misses: GeoPoint[] = [];
  for (const s of shifts) {
    const pIn = punchPoint({ lat: s.start_lat, lng: s.start_lng, accuracy: s.start_accuracy_m }, s.started_at, s.id, pings);
    const pOut = s.ended_at ? punchPoint({ lat: s.end_lat, lng: s.end_lng, accuracy: s.end_accuracy_m }, s.ended_at, s.id, pings) : null;
    const placeIn = resolvePlace(pIn, sites, addresses, shop);
    const placeOut = s.ended_at ? resolvePlace(pOut, sites, addresses, shop) : null;
    if (placeIn.kind === "pin" && pIn) misses.push(pIn.point);
    if (placeOut?.kind === "pin" && pOut) misses.push(pOut.point);
    out[s.id] = { in: placeIn, out: placeOut, lateIn: lateIn.has(s.id), lateOut: lateOut.has(s.id) };
  }
  // Only with a working cache: without one, a lookup would repeat per render.
  if (cache && misses.length) enqueue(misses);
  return out;
}
