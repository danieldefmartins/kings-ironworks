"use client";

// White-label branding, Apple-Settings style: a live letterhead preview on top,
// then grouped rows. Everything here prints on every sheet, PDF and customer
// sign-off for this organization.

import { useRef, useState } from "react";
import { LOGO_MAX_CHARS, normalizeAccent, resolveBrand, type OrgBranding } from "@/lib/shop/org-brand";
import { bt } from "@/lib/shop/org-brand-i18n";
import PrintLetterhead from "@/app/shop/brand/PrintLetterhead";

export const ACCENT_SWATCHES = ["#b8860b", "#1d4ed8", "#b91c1c", "#15803d", "#111827", "#7c3aed", "#0e7490"];

/** Downscale an uploaded logo to a small data URL that fits in settings. */
async function logoDataUrl(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, 640 / img.naturalWidth, 240 / img.naturalHeight);
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.naturalWidth * scale));
    c.height = Math.max(1, Math.round(img.naturalHeight * scale));
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    for (const [type, q] of [["image/png", 1], ["image/webp", 0.9], ["image/jpeg", 0.85]] as const) {
      const d = c.toDataURL(type, q);
      if (d.startsWith(`data:${type}`) && d.length <= LOGO_MAX_CHARS) return d;
    }
    return null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function BrandingCard({
  lang,
  value,
  onChange,
}: {
  lang: string;
  value: OrgBranding;
  onChange: (b: OrgBranding) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoErr, setLogoErr] = useState<string | null>(null);
  const brand = resolveBrand(value);
  const t = (k: string) => bt(lang, k);
  const setF = (k: keyof OrgBranding, v: string | undefined) => onChange({ ...value, [k]: v });
  const custom = !ACCENT_SWATCHES.includes(brand.accent);

  const row = "flex items-center gap-3 px-4 min-h-[52px]";
  const lbl = "w-32 shrink-0 text-[15px] text-neutral-300";
  const inp = "min-w-0 flex-1 bg-transparent py-3 text-right text-[16px] text-neutral-100 outline-none placeholder:text-neutral-500";

  return (
    <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4" data-testid="branding-card">
      <h2 className="text-[20px] font-semibold text-neutral-100">{t("brandTitle")}</h2>
      <p className="text-[15px] text-neutral-500 mt-0.5">{t("brandSub")}</p>

      {/* Live letterhead preview — paper white in both themes */}
      <div className="mt-4 text-[13px] font-semibold uppercase tracking-wide text-neutral-500">{t("brandPreview")}</div>
      <div
        className="mt-2 rounded-xl p-4 overflow-hidden"
        style={{ background: "#fff", color: "#000", fontSize: 12, borderBottom: `4px solid ${brand.accent}`, boxShadow: "0 1px 3px rgba(0,0,0,.12)" }}
      >
        <PrintLetterhead brand={brand} lang={lang} />
      </div>

      {/* Logo */}
      <div className="mt-5 rounded-xl border border-neutral-800 bg-neutral-950/40 divide-y divide-neutral-800">
        <div className={row}>
          <span className="shrink-0 text-[15px] text-neutral-300">{t("brandLogo")}</span>
          <div className="flex flex-1 items-center justify-end gap-2 py-2">
            {brand.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logo} alt="" className="h-9 w-auto max-w-[7rem] rounded-md object-contain" style={{ background: "#fff" }} />
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="min-h-11 rounded-lg px-2 text-[15px] font-semibold text-indigo-700"
            >
              {brand.logo ? t("brandLogoChange") : t("brandLogoAdd")}
            </button>
            {brand.logo && (
              <button
                type="button"
                onClick={() => setF("logo", "")}
                className="min-h-11 rounded-lg px-2 text-[15px] font-semibold text-red-400"
              >
                {t("brandLogoRemove")}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              aria-label={t("brandLogo")}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                const d = await logoDataUrl(f);
                if (!d) return setLogoErr(t("brandLogoTooBig"));
                setLogoErr(null);
                setF("logo", d);
              }}
            />
          </div>
        </div>
      </div>
      {logoErr && <div className="mt-2 text-sm text-red-400">{logoErr}</div>}

      {/* Identity */}
      <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/40 divide-y divide-neutral-800">
        {(
          [
            ["name", "brandName", "text"],
            ["phone", "brandPhone", "tel"],
            ["email", "brandEmail", "email"],
            ["website", "brandWebsite", "url"],
            ["license", "brandLicense", "text"],
            ["address", "brandAddress", "text"],
          ] as const
        ).map(([k, key, type]) => (
          <label key={k} className={row}>
            <span className={lbl}>{t(key)}</span>
            <input
              className={inp}
              type={type === "url" ? "text" : type}
              inputMode={type === "tel" ? "tel" : type === "email" ? "email" : type === "url" ? "url" : undefined}
              value={(value[k] as string | undefined) || ""}
              onChange={(e) => setF(k, e.target.value)}
              aria-label={t(key)}
            />
          </label>
        ))}
      </div>

      {/* Accent */}
      <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/40">
        <div className={`${row} flex-wrap py-2`}>
          <span className={lbl}>{t("brandAccent")}</span>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2" role="radiogroup" aria-label={t("brandAccent")}>
            {ACCENT_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={brand.accent === c}
                aria-label={c}
                onClick={() => setF("accent", c)}
                className="h-9 w-9 rounded-full"
                style={{
                  background: c,
                  boxShadow: brand.accent === c ? `0 0 0 2px var(--shop-card, #fff), 0 0 0 4px ${c}` : "none",
                }}
              />
            ))}
            <label
              className="relative h-9 w-9 overflow-hidden rounded-full cursor-pointer"
              title={t("brandCustom")}
              style={{
                background: custom ? brand.accent : "conic-gradient(#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)",
                boxShadow: custom ? `0 0 0 2px var(--shop-card, #fff), 0 0 0 4px ${brand.accent}` : "none",
              }}
            >
              <input
                type="color"
                aria-label={t("brandCustom")}
                value={brand.accent}
                onChange={(e) => setF("accent", normalizeAccent(e.target.value) || brand.accent)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
