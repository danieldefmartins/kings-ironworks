"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Navigation } from "lucide-react";
import { DirectionsSheet } from "./AddressLink";
import { t } from "@/lib/shop/i18n";

export interface MapJob {
  id: string;
  jobNumber: string;
  customer: string;
  address: string;
  stage: string;
  lat: number;
  lng: number;
  /** Somebody's job clock is running here right now. */
  working?: boolean;
}

// Leaflet comes off a CDN rather than package.json on purpose: `npm install`
// currently fails in this repo (it fails with no arguments at all, and with the
// Dockerfile's own --legacy-peer-deps), so adding a dependency here could not be
// verified before it reached a production build. A map is useless without the
// network that serves its tiles, so a CDN script costs no availability that the
// feature did not already require.
const LEAFLET_JS = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js";
const LEAFLET_CSS = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css";

// Daytime tiles, and specifically OpenStreetMap's own: the CARTO basemaps now
// stamp "API KEY REQUIRED" diagonally across every tile they serve without a
// key, which is what Daniel saw. They still answer 200 with a valid PNG, so
// nothing errors — the refusal is painted into the image. This is the same
// standard style tavvy-web uses for its light map, and it needs no key.
//
// Full colour rather than a muted basemap because this gets read in a truck,
// where parks, water and arterials are the landmarks you place yourself by.
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIB = '&copy; OpenStreetMap contributors';

declare global {
  interface Window {
    L?: any;
  }
}

let loader: Promise<void> | null = null;
function loadLeaflet(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.L) return Promise.resolve();
  // One shared promise: two maps on a page must not race two script tags.
  if (loader) return loader;
  loader = new Promise<void>((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = LEAFLET_CSS;
      document.head.appendChild(css);
    }
    const js = document.createElement("script");
    js.src = LEAFLET_JS;
    js.async = true;
    js.onload = () => resolve();
    js.onerror = () => reject(new Error("leaflet"));
    document.body.appendChild(js);
  });
  return loader;
}

export default function JobsMap({
  jobs,
  lang = "en",
  height = 260,
  /** Single-job maps frame one pin; the board fits them all. */
  zoom = 15,
  className = "",
}: {
  jobs: MapJob[];
  lang?: string;
  height?: number;
  zoom?: number;
  className?: string;
}) {
  const el = useRef<HTMLDivElement | null>(null);
  const map = useRef<any>(null);
  const [selected, setSelected] = useState<MapJob | null>(null);
  const [directions, setDirections] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let dead = false;
    if (jobs.length === 0) return;

    loadLeaflet()
      .then(() => {
        if (dead || !el.current || !window.L) return;
        const L = window.L;

        if (!map.current) {
          map.current = L.map(el.current, {
            zoomControl: jobs.length > 1,
            // A map inside a scrolling job list must not swallow the scroll.
            scrollWheelZoom: false,
          });
          L.tileLayer(TILES, { attribution: ATTRIB, maxZoom: 19 }).addTo(map.current);
        }
        const m = map.current;

        // On a one-job map the whole thing means that job, so tapping anywhere
        // asks for directions — aiming at an 18px dot on a moving truck seat is
        // not a reasonable thing to ask of anyone. With several jobs a tap on
        // open water has no answer, so only the pins respond.
        m.off("click");
        if (jobs.length === 1) {
          m.on("click", () => setDirections(jobs[0].address));
        }
        m.eachLayer((l: any) => {
          if (l instanceof L.Marker) m.removeLayer(l);
        });

        const pts: [number, number][] = [];
        for (const j of jobs) {
          pts.push([j.lat, j.lng]);
          const color = j.working ? "#34d399" : "#f5b642";
          const icon = L.divIcon({
            className: "",
            html: `<span style="display:block;width:18px;height:18px;border-radius:9999px;background:${color};border:2.5px solid #ffffff;box-shadow:0 1px 4px rgba(0,0,0,.5)"></span>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          });
          L.marker([j.lat, j.lng], { icon, title: j.customer })
            .addTo(m)
            .on("click", () => {
              if (jobs.length === 1) setDirections(j.address);
              else setSelected(j);
            });
        }

        if (pts.length === 1) {
          m.setView(pts[0], zoom);
        } else {
          m.fitBounds(L.latLngBounds(pts), { padding: [36, 36], maxZoom: 14 });
        }
        // The container is often laid out after the map is built (accordions,
        // tabs); without this the tiles render into a stale size.
        setTimeout(() => m.invalidateSize(), 60);
      })
      .catch(() => {
        if (!dead) setFailed(true);
      });

    return () => {
      dead = true;
    };
  }, [jobs, zoom]);

  useEffect(() => {
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  if (jobs.length === 0 || failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-[22px] border border-white/10 bg-neutral-900/60 text-sm text-neutral-500 ${className}`}
        style={{ height }}
      >
        {failed ? t(lang, "mapUnavailable") : t(lang, "noMappedJobs")}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-[22px] border border-white/10 ${className}`}>
      <div ref={el} style={{ height }} className="w-full bg-neutral-200" />
      {jobs.length === 1 && !directions && (
        <span className="pointer-events-none absolute left-1/2 top-2 z-[1000] -translate-x-1/2 rounded-full bg-neutral-900/85 px-3 py-1 text-[11px] font-medium text-neutral-200 backdrop-blur">
          {t(lang, "tapForDirections")}
        </span>
      )}

      {selected && (
        <div className="absolute inset-x-0 bottom-0 z-[1000] border-t border-white/10 bg-neutral-900/95 p-3 backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{selected.customer}</div>
              <div className="truncate text-xs text-neutral-500">
                {selected.jobNumber} · {selected.stage}
              </div>
              <div className="mt-0.5 truncate text-xs text-neutral-400">{selected.address}</div>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label={t(lang, "close")}
              className="shrink-0 rounded-lg px-2 py-1 text-neutral-500"
            >
              ✕
            </button>
          </div>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={() => setDirections(selected.address)}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 font-bold text-black"
            >
              <Navigation aria-hidden className="h-4 w-4" />
              {t(lang, "getDirections")}
            </button>
            <Link
              href={`/shop/job/${selected.id}`}
              className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-neutral-700 font-bold text-neutral-200"
            >
              {t(lang, "openJob")}
            </Link>
          </div>
        </div>
      )}

      {directions && (
        <DirectionsSheet
          address={directions}
          lang={lang}
          onClose={() => setDirections(null)}
        />
      )}
    </div>
  );
}
