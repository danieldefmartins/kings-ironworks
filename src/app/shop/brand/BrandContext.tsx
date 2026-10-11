"use client";

// The organization's brand, available to any shop component (customer sign-off
// screen, print blocks) without threading props through every section.

import { createContext, useContext, useMemo } from "react";
import { resolveBrand, type OrgBranding, type ResolvedBrand } from "@/lib/shop/org-brand";

const BrandCtx = createContext<ResolvedBrand>(resolveBrand(null));

export function BrandProvider({ branding, children }: { branding?: Partial<OrgBranding> | null; children: React.ReactNode }) {
  const value = useMemo(() => resolveBrand(branding), [branding]);
  return <BrandCtx.Provider value={value}>{children}</BrandCtx.Provider>;
}

export function useBrand(): ResolvedBrand {
  return useContext(BrandCtx);
}

/** Letterhead mark: the logo when there is one, else nothing. */
export function BrandLogo({ brand, height = 44 }: { brand: ResolvedBrand; height?: number }) {
  if (!brand.logo) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={brand.logo} alt={brand.name} style={{ height, width: "auto", maxWidth: height * 4, objectFit: "contain", display: "block" }} />;
}
