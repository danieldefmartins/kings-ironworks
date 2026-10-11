"use client";

// The left half of a printed letterhead: logo, company name, contact line and
// licence number — all from the organization's branding.

import { brandContactLine, type ResolvedBrand } from "@/lib/shop/org-brand";
import { bt } from "@/lib/shop/org-brand-i18n";
import { BrandLogo } from "./BrandContext";

export default function PrintLetterhead({ brand, lang }: { brand: ResolvedBrand; lang: string }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }} data-testid="print-letterhead">
      <BrandLogo brand={brand} height={48} />
      <div style={{ flex: "1 1 240px", minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1 }}>{brand.name}</div>
        <div style={{ color: "#555" }}>{brandContactLine(brand)}</div>
        {brand.license && (
          <div style={{ color: "#555", fontSize: 10 }}>
            {bt(lang, "licShort")} {brand.license}
          </div>
        )}
      </div>
    </div>
  );
}

/** Where QR codes on printed sheets point: the app this sheet was printed from. */
export function appOrigin(): string {
  return typeof window !== "undefined" && window.location?.origin ? window.location.origin : "https://kingsironworks.com";
}
