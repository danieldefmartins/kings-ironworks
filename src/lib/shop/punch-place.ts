// "Where were they when they clocked in / out?" — Daniel, for every line of
// the daily payroll. Pure and client-safe; the server feeds it the punch,
// the shift's breadcrumb pings, the job sites and the reverse-geocode cache.
//
// Order of preference for a punch's place:
//   1. a job site whose cached geocode is within SITE_RADIUS_M → the job name;
//   2. the shop (69 Norman St, Everett) → "Shop";
//   3. a cached short street address for the point;
//   4. otherwise the point is still a pin (label null → shown as "Map pin");
//   5. no point at all → "No location" (shown in red so the owner follows up).
// The point is the punch's own GPS (or the follow-up shift_*_location call),
// else the nearest breadcrumb ping of that shift within PING_WINDOW_MS.

export const SITE_RADIUS_M = 200;
export const PING_WINDOW_MS = 10 * 60 * 1000;
/** Accuracy worse than this is shown next to the place. */
export const POOR_ACCURACY_M = 100;
/** 69 Norman St, Everett MA 02149 (OSM geocode). */
export const SHOP_POINT = { lat: 42.4076681, lng: -71.0672409 };

export interface GeoPoint { lat: number; lng: number; accuracy: number | null }
export interface Site { name: string; lat: number; lng: number }
export interface Ping { shift_id: string; recorded_at: string; lat: number; lng: number; accuracy_m: number | null }

export interface ShiftPlaces { in: PunchPlace; out: PunchPlace | null; lateIn: boolean; lateOut: boolean }

export type PlaceKind = "site" | "shop" | "address" | "pin" | "none";
export interface PunchPlace {
  kind: PlaceKind;
  /** Job name, "Shop", or short street address; null for a bare pin / none. */
  label: string | null;
  lat: number | null;
  lng: number | null;
  /** Rounded metres, only when poorer than POOR_ACCURACY_M. */
  poorAccuracyM: number | null;
  /** True when the point came from a breadcrumb ping, not the punch itself. */
  fromPing: boolean;
}

export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** The punch's own point, else the nearest ping of the shift within 10 min. */
export function punchPoint(
  own: { lat: number | null | undefined; lng: number | null | undefined; accuracy: number | null | undefined },
  at: string | null,
  shiftId: string,
  pings: Ping[],
): { point: GeoPoint; fromPing: boolean } | null {
  if (finite(own.lat) && finite(own.lng)) return { point: { lat: own.lat, lng: own.lng, accuracy: finite(own.accuracy) ? own.accuracy : null }, fromPing: false };
  if (!at) return null;
  const t = Date.parse(at);
  let best: Ping | null = null;
  for (const p of pings) {
    if (p.shift_id !== shiftId) continue;
    const d = Math.abs(Date.parse(p.recorded_at) - t);
    if (d <= PING_WINDOW_MS && (!best || d < Math.abs(Date.parse(best.recorded_at) - t))) best = p;
  }
  return best ? { point: { lat: best.lat, lng: best.lng, accuracy: best.accuracy_m }, fromPing: true } : null;
}

/** Cache key for a point: 4 decimals ≈ 11 m. */
export function placeKey(p: { lat: number; lng: number }): string {
  return `${Math.round(p.lat * 1e4)},${Math.round(p.lng * 1e4)}`;
}

export function resolvePlace(
  found: { point: GeoPoint; fromPing: boolean } | null,
  sites: Site[],
  addresses: Map<string, string>,
  shop: { lat: number; lng: number } = SHOP_POINT,
): PunchPlace {
  if (!found) return { kind: "none", label: null, lat: null, lng: null, poorAccuracyM: null, fromPing: false };
  const { point, fromPing } = found;
  const poorAccuracyM = point.accuracy != null && point.accuracy > POOR_ACCURACY_M ? Math.round(point.accuracy) : null;
  const base = { lat: point.lat, lng: point.lng, poorAccuracyM, fromPing };
  let nearest: { site: Site; d: number } | null = null;
  for (const site of sites) {
    const d = distanceM(point, site);
    if (d <= SITE_RADIUS_M && (!nearest || d < nearest.d)) nearest = { site, d };
  }
  const shopD = distanceM(point, shop);
  // Within reach of the shop it is the shop, even if a job is geocoded nearby.
  if (shopD <= SITE_RADIUS_M) return { kind: "shop", label: "Shop", ...base };
  if (nearest) return { kind: "site", label: nearest.site.name, ...base };
  const address = addresses.get(placeKey(point));
  return address ? { kind: "address", label: address, ...base } : { kind: "pin", label: null, ...base };
}

/** Short "12 Main St, Everett" from a Nominatim reverse result. */
export function shortAddress(a: Record<string, string> | undefined, fallback = ""): string {
  const x = a || {};
  const street = [x.house_number, x.road].filter(Boolean).join(" ");
  const city = x.city || x.town || x.village || x.suburb || x.hamlet || "";
  return [street, city].filter(Boolean).join(", ") || fallback.split(",").slice(0, 2).join(",").trim();
}

/** Maps link for a pin: Apple Maps on Apple devices hands off to the app,
 *  and maps.apple.com redirects everyone else to a web map. */
export function pinUrls(lat: number, lng: number) {
  return {
    apple: `https://maps.apple.com/?ll=${lat},${lng}&q=${lat},${lng}`,
    google: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
  };
}
