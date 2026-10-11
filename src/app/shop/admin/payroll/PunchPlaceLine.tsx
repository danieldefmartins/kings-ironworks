"use client";

// One punch's place on the owner payroll line: "Shop", the job, a street, a
// pin — or "No location" in red so the owner knows whose phone to fix. Tap
// opens the pin in Apple Maps on Apple devices, Google Maps elsewhere.

import { MapPin } from "lucide-react";
import { pinUrls, type PunchPlace } from "@/lib/shop/punch-place";

export default function PunchPlaceLine({ place, late, lang }: { place: PunchPlace | null; late?: boolean; lang: string }) {
  const pt = lang === "pt", es = lang === "es";
  const lateBadge = late ? <span className="ml-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">{pt ? "enviado atrasado" : es ? "enviado tarde" : "sent late"}</span> : null;
  if (!place) return null;
  if (place.kind === "none" || place.lat == null || place.lng == null) {
    return <span className="mt-0.5 flex flex-wrap items-center gap-1 text-sm font-semibold text-red-400"><MapPin className="h-4 w-4" />{pt ? "Sem localização" : es ? "Sin ubicación" : "No location"}{lateBadge}</span>;
  }
  const { lat, lng } = place;
  const label = place.label ?? (pt ? "Ponto no mapa" : es ? "Punto en el mapa" : "Map pin");
  const open = (e: React.MouseEvent) => {
    e.preventDefault();
    const urls = pinUrls(lat, lng);
    const apple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
    window.open(apple ? urls.apple : urls.google, "_blank", "noopener");
  };
  return (
    <span className="mt-0.5 flex flex-wrap items-center gap-1 text-sm">
      <a href={pinUrls(lat, lng).google} onClick={open} className="inline-flex min-h-8 items-center gap-1 font-semibold text-amber-300 underline-offset-2 hover:underline">
        <MapPin className="h-4 w-4 shrink-0" /><span className="truncate">{label}</span>
      </a>
      {place.poorAccuracyM != null && <span className="text-xs text-neutral-500">±{place.poorAccuracyM} m</span>}
      {lateBadge}
    </span>
  );
}
