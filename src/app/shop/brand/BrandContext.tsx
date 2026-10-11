"use client";

// The organization's brand, available to any shop component (customer sign-off
// screen, print blocks) without threading props through every section.

import { createContext, useContext, useMemo } from "react";
import Image from "next/image";
import { brandInitials, resolveBrand, type OrgBranding, type ResolvedBrand } from "@/lib/shop/org-brand";

const BrandCtx = createContext<ResolvedBrand>(resolveBrand(null));

export function BrandProvider({ branding, children }: { branding?: Partial<OrgBranding> | null; children: React.ReactNode }) {
  const value = useMemo(() => resolveBrand(branding), [branding]);
  return <BrandCtx.Provider value={value}>{children}</BrandCtx.Provider>;
}

export function useBrand(): ResolvedBrand {
  return useContext(BrandCtx);
}

/**
 * App-chrome mark (top bar, login): the org's logo, KIW's own artwork for
 * KIW, or an initials badge in the org's accent.
 */
export function BrandMark({ dark = false, size = "md" }: { dark?: boolean; size?: "md" | "lg" }) {
  const brand = useBrand();
  const h = size === "lg" ? 72 : 36;
  if (brand.logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={brand.logo}
        alt={brand.displayName}
        style={{ height: h, width: "auto", maxWidth: "100%", objectFit: "contain", background: dark ? "#fff" : "transparent", borderRadius: 8, padding: dark ? 3 : 0 }}
      />
    );
  }
  if (brand.isKiw) {
    return (
      <Image
        src={dark ? "/images/logo-white-transparent.png" : "/images/logo-black.png"}
        alt={brand.displayName}
        width={1536}
        height={1024}
        className="h-auto w-full"
        priority
      />
    );
  }
  return (
    <span
      aria-label={brand.displayName}
      className="flex items-center justify-center rounded-xl font-bold"
      style={{ height: h, width: h, background: brand.accent, color: brand.onAccent, fontSize: h * 0.36 }}
    >
      {brandInitials(brand.name)}
    </span>
  );
}

/** Letterhead mark: the logo when there is one, else nothing. */
export function BrandLogo({ brand, height = 44 }: { brand: ResolvedBrand; height?: number }) {
  if (!brand.logo) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={brand.logo} alt={brand.name} style={{ height, width: "auto", maxWidth: height * 4, objectFit: "contain", display: "block" }} />;
}
