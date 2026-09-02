"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, MapPin } from "lucide-react";
import { t } from "@/lib/shop/i18n";
import { AppleMapsIcon, GoogleMapsIcon, WazeIcon } from "./MapAppIcons";

// Driving directions to a job.
//
// The crew reads the address off the traveler and then retypes it into a maps
// app in the truck. Three apps because the choice is personal and already made:
// iPhones default to Apple Maps, the Android tablets to Google, and half the
// Brazilian crew navigates in Waze. All three take an https deep link, which
// hands off to the installed app on a phone and falls back to the website on
// the shop tablet — no app-scheme URL that dead-ends when the app is missing.
export function mapUrls(address: string) {
  const q = encodeURIComponent(address);
  return {
    apple: `https://maps.apple.com/?daddr=${q}&dirflg=d`,
    google: `https://www.google.com/maps/dir/?api=1&destination=${q}&travelmode=driving`,
    waze: `https://waze.com/ul?q=${q}&navigate=yes`,
  };
}

// The directions chooser, shared by the tappable address and by a pin on the
// map. Rendering it in one place keeps the three apps, the copy fallback and
// the portal behaviour identical wherever an address is tapped.
export function DirectionsSheet({
  address,
  lang = "en",
  onClose,
}: {
  address: string;
  lang?: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const urls = mapUrls(address);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
    } catch {
      // Clipboard needs a secure context and a gesture; the tap is the gesture,
      // but a locked-down tablet can still refuse. Say nothing rather than
      // claim it copied — the address is on screen to read either way.
      setCopied(false);
    }
  }

  // Portalled to <body>: this renders inside job headers that sit under a
  // sticky backdrop-blur bar, and a backdrop-filter is a containing block for
  // fixed descendants — see the comment in MoreMenu.tsx.
  const sheet = (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={t(lang, "directionsTo")}
        className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-900 p-4 pb-[max(16px,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-lg font-bold">{t(lang, "directionsTo")}</div>
        <div className="mt-0.5 mb-3 text-sm text-neutral-400">{address}</div>
        <div className="space-y-2">
          <DirRow href={urls.apple} icon={<AppleMapsIcon className="h-7 w-7" />} label={t(lang, "appleMaps")} />
          <DirRow href={urls.google} icon={<GoogleMapsIcon className="h-7 w-7" />} label={t(lang, "googleMaps")} />
          <DirRow href={urls.waze} icon={<WazeIcon className="h-7 w-7" />} label={t(lang, "waze")} />
          <button
            type="button"
            onClick={copy}
            className="flex min-h-[56px] w-full items-center gap-3 rounded-xl border border-neutral-700 bg-neutral-800 px-4 text-left font-bold text-neutral-200 active:bg-neutral-700"
          >
            <Copy aria-hidden className="h-6 w-6 shrink-0 text-neutral-400" />
            {copied ? t(lang, "addressCopied") : t(lang, "copyAddress")}
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 min-h-[48px] w-full rounded-xl border border-neutral-700 font-bold text-neutral-300"
        >
          {t(lang, "close")}
        </button>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(sheet, document.body);
}

export default function AddressLink({
  address,
  lang = "en",
  className = "",
  showPin = true,
}: {
  address: string;
  lang?: string;
  /** Applied to the tappable address itself, so each screen keeps its own type. */
  className?: string;
  showPin?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`inline-flex max-w-full items-start gap-1.5 text-left underline decoration-neutral-600 underline-offset-4 active:opacity-70 ${className}`}
      >
        {showPin && <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />}
        <span className="min-w-0 break-words">{address}</span>
      </button>
      {open && <DirectionsSheet address={address} lang={lang} onClose={() => setOpen(false)} />}
    </>
  );
}

function DirRow({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-[56px] w-full items-center gap-3 rounded-xl border border-neutral-700 bg-neutral-800 px-4 text-left font-bold text-neutral-200 active:bg-neutral-700"
    >
      <span aria-hidden className="shrink-0">
        {icon}
      </span>
      {label}
    </a>
  );
}
