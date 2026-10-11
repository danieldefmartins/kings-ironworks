// Getting a location for a CLOCK-IN (owner rule, 10/11: "If they do not
// approve the location we won't clock in … We need to record your location.").
//
// A fast first try (fresh fix, network positioning, 15s),
// then one precise try. Permission denied is reported as such so the phone
// can explain how to allow it; anything else is "unavailable".
//
// Clock-OUT never waits on this — see ShopShell.

export type LocateResult =
  | { ok: true; lat: number; lng: number; accuracy: number | null }
  | { ok: false; reason: "denied" | "unavailable" | "timeout" };

type Geo = Pick<Geolocation, "getCurrentPosition">;

function once(geo: Geo, options: PositionOptions): Promise<GeolocationPosition | GeolocationPositionError | null> {
  return new Promise((resolve) => {
    // Belt and braces: some browsers never call back at all.
    const timer = setTimeout(() => resolve(null), (options.timeout ?? 15000) + 2000);
    try {
      geo.getCurrentPosition(
        (p) => { clearTimeout(timer); resolve(p); },
        (e) => { clearTimeout(timer); resolve(e); },
        options,
      );
    } catch { clearTimeout(timer); resolve(null); }
  });
}

const PERMISSION_DENIED = 1;

export async function locate(geo: Geo | undefined = typeof navigator !== "undefined" ? navigator.geolocation : undefined): Promise<LocateResult> {
  if (!geo) return { ok: false, reason: "unavailable" };
  let denied = false, timedOut = false;
  for (const options of [
    // Owner rule: a FRESH fix on every clock-in — never a cached position.
    { enableHighAccuracy: false, maximumAge: 0, timeout: 15000 },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
  ] satisfies PositionOptions[]) {
    const r = await once(geo, options);
    if (r && "coords" in r) {
      return { ok: true, lat: r.coords.latitude, lng: r.coords.longitude, accuracy: Number.isFinite(r.coords.accuracy) ? r.coords.accuracy : null };
    }
    if (r && r.code === PERMISSION_DENIED) { denied = true; break; } // asking again will not help
    timedOut = !r || r.code === 3;
  }
  return { ok: false, reason: denied ? "denied" : timedOut ? "timeout" : "unavailable" };
}

/** "granted" | "denied" | "prompt" | "unknown" (no Permissions API). */
export async function locationPermission(): Promise<"granted" | "denied" | "prompt" | "unknown"> {
  try {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return "unknown";
    const s = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    return s.state === "granted" || s.state === "denied" || s.state === "prompt" ? s.state : "unknown";
  } catch { return "unknown"; }
}
