"use client";

// Take the photo. Choose the category only if you want something other than
// the obvious one.
//
// The old panel put eleven category chips plus a free-text box in front of the
// camera, so the commonest act in the whole app — point at the thing, capture
// it — cost a decision first. But the category is nearly always predictable
// from where the job is: at Awarded you are shooting the site as found, at
// Install you are shooting the installation. So the stage picks it, the button
// says what it will file it as, and changing it is one tap for the rare case.

import { useRef, useState } from "react";
import Image from "next/image";
import { PHOTO_CATEGORIES, PRICE_CATEGORY, type Photo } from "@/lib/shop/shared";
import { t } from "@/lib/shop/i18n";

// Where the job is → what the photo almost certainly is.
function defaultCategory(stage: string): string {
  switch (stage) {
    case "Awarded":
    case "Shop Drawings":
      return "Existing";
    case "Material":
    case "Cut":
    case "Fit/Weld":
    case "Finish":
    case "QC":
      return "Measurements";
    case "Install":
    case "Done":
      return "Installation — Location 1";
    default:
      return "Existing";
  }
}

export default function PhotosV2({
  jobId,
  stage,
  photos,
  canSeePrices,
  lang,
  refresh,
}: {
  jobId: string;
  stage: string;
  photos: Photo[];
  canSeePrices: boolean;
  lang: string;
  refresh: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState(() => defaultCategory(stage));
  const [picking, setPicking] = useState(false);
  const [custom, setCustom] = useState("");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const visible = photos.filter((p) => canSeePrices || p.category !== PRICE_CATEGORY);
  const choices = PHOTO_CATEGORIES.filter((c) => canSeePrices || c !== PRICE_CATEGORY);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const chosen = custom.trim() || category;
    setUploading(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("jobId", jobId);
      fd.append("category", chosen);
      const res = await fetch("/shop/api/photo", { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d.error || "Upload failed");
      } else {
        setCustom("");
        refresh();
      }
    } catch {
      setErr("Network error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      {err && <p className="mb-2 text-sm text-red-400">{err}</p>}

      {/* The camera, first. The label says where it lands so nothing is a
          surprise, and the OS sheet handles take-or-choose. */}
      <label className="flex min-h-[64px] w-full cursor-pointer items-center justify-center gap-3 rounded-2xl bg-amber-500 px-4 text-[17px] font-bold text-black active:scale-[0.99]">
        <svg viewBox="0 0 20 20" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h4l1.5 2h2A1.5 1.5 0 0 1 17 8.5v6A1.5 1.5 0 0 1 15.5 16h-11A1.5 1.5 0 0 1 3 14.5v-6Z" />
          <circle cx={10} cy={11} r={2.5} />
        </svg>
        {uploading ? t(lang, "uploading") : t(lang, "takePhoto")}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFile}
          disabled={uploading}
          className="hidden"
        />
      </label>

      {/* Where it will be filed — and the way to change it, for the rare case. */}
      <button
        onClick={() => setPicking((v) => !v)}
        className="mt-2 flex w-full items-center justify-center gap-1.5 py-1.5 text-[14px] text-neutral-400"
      >
        {t(lang, "filesUnder")} <span className="font-semibold text-amber-400">{custom.trim() || category}</span>
        <span className={`transition-transform ${picking ? "rotate-90" : ""}`}>›</span>
      </button>

      {picking && (
        <div className="mt-1 rounded-xl border border-neutral-800 bg-neutral-950 p-2">
          <div className="flex flex-wrap gap-1.5">
            {choices.map((c) => (
              <button
                key={c}
                onClick={() => { setCategory(c); setCustom(""); setPicking(false); }}
                className={`min-h-[40px] rounded-lg border px-2.5 text-[14px] ${
                  category === c && !custom.trim()
                    ? "border-amber-500 bg-amber-500 font-bold text-black"
                    : "border-neutral-700 bg-neutral-900 text-neutral-300"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder={t(lang, "customLocation")}
            className="mt-2 min-h-[44px] w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-[14px] text-neutral-100 outline-none focus:border-amber-500"
          />
        </div>
      )}

      {visible.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {visible.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-xl border border-neutral-800">
              {p.url ? (
                <Image
                  src={p.url}
                  alt={p.category || ""}
                  width={200}
                  height={200}
                  className="h-24 w-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="h-24 w-full bg-neutral-900" />
              )}
              <p className="truncate px-1.5 py-1 text-[11px] text-neutral-500">{p.category}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
