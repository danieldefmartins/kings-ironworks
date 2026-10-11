import { expect, it } from "vitest";
import { SHOP_POINT, distanceM, placeKey, punchPoint, resolvePlace, shortAddress, type Ping } from "./punch-place";

const site = { name: "Fragale", lat: 42.5012, lng: -71.0731 }; // Wakefield
const sites = [site];
const none = new Map<string, string>();
const at = "2026-10-10T11:35:00Z";
const own = (lat: number | null, lng: number | null, accuracy: number | null = 8) => ({ lat, lng, accuracy });

it("names the job site when the punch is within 200 m of its geocode", () => {
  const p = punchPoint(own(site.lat + 0.001, site.lng), at, "s", []); // ~110 m north
  expect(resolvePlace(p, sites, none)).toMatchObject({ kind: "site", label: "Fragale", fromPing: false, poorAccuracyM: null });
  const far = punchPoint(own(site.lat + 0.003, site.lng), at, "s", []); // ~330 m
  expect(resolvePlace(far, sites, none).kind).toBe("pin");
});

it("calls 69 Norman St 'Shop', and the shop wins over a job next door", () => {
  const p = punchPoint(own(SHOP_POINT.lat + 0.0005, SHOP_POINT.lng), at, "s", []);
  expect(resolvePlace(p, [{ name: "Neighbour job", lat: SHOP_POINT.lat + 0.0006, lng: SHOP_POINT.lng }], none)).toMatchObject({ kind: "shop", label: "Shop" });
});

it("uses the cached street address, else a bare pin", () => {
  const point = { lat: 42.3601, lng: -71.0589 };
  const p = punchPoint(own(point.lat, point.lng), at, "s", []);
  expect(resolvePlace(p, sites, new Map([[placeKey(point), "1 City Hall Sq, Boston"]]))).toMatchObject({ kind: "address", label: "1 City Hall Sq, Boston" });
  expect(resolvePlace(p, sites, none)).toMatchObject({ kind: "pin", label: null, lat: point.lat });
});

it("falls back to the nearest breadcrumb ping of the same shift within 10 minutes", () => {
  const pings: Ping[] = [
    { shift_id: "s", recorded_at: "2026-10-10T11:20:00Z", lat: 1, lng: 1, accuracy_m: 5 }, // 15 min: too far
    { shift_id: "s", recorded_at: "2026-10-10T11:41:00Z", lat: site.lat, lng: site.lng, accuracy_m: 150 },
    { shift_id: "other", recorded_at: "2026-10-10T11:35:30Z", lat: 2, lng: 2, accuracy_m: 5 }, // other shift
  ];
  const p = punchPoint(own(null, null), at, "s", pings);
  expect(resolvePlace(p, sites, none)).toMatchObject({ kind: "site", fromPing: true, poorAccuracyM: 150 });
  expect(punchPoint(own(null, null), at, "s", pings.slice(0, 1))).toBeNull();
});

it("no point at all → 'No location'", () => {
  expect(resolvePlace(punchPoint(own(null, null), at, "s", []), sites, none)).toMatchObject({ kind: "none", label: null });
});

it("geometry and address helpers", () => {
  expect(Math.round(distanceM({ lat: 42, lng: -71 }, { lat: 42.001, lng: -71 }))).toBe(111);
  expect(shortAddress({ house_number: "69", road: "Norman Street", city: "Everett" })).toBe("69 Norman Street, Everett");
  expect(shortAddress(undefined, "MetroRock, 69, Norman Street, Everett")).toBe("MetroRock, 69");
});
