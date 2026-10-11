// White-label branding: who the printed sheet, the customer sign-off screen
// and every PDF says the work is from. Stored per organization inside the
// existing kiw_shop_org_settings.settings JSON (branding key) — no migration.
//
// KIW's own values are the fallback, so an org that never touched branding
// prints exactly what it always printed.

export interface OrgBranding {
  name: string;
  address: string;
  phone: string;
  website: string;
  /** Contractor / HIC licence number, printed under the letterhead. */
  license?: string;
  /** Contact email for the letterhead. */
  email?: string;
  /** Logo as a small data: URL (png/jpeg/webp), resized client-side. */
  logo?: string;
  /** Accent colour for rules and headings, #rrggbb. */
  accent?: string;
}

export const DEFAULT_ACCENT = "#b8860b";

export const KIW_BRANDING: Required<Pick<OrgBranding, "name" | "address" | "phone" | "website" | "accent">> = {
  name: "KING IRON WORKS",
  address: "69 Norman St, Unit 20, Everett, MA 02149",
  phone: "(617) 404-2589",
  website: "kingsironworks.com",
  accent: DEFAULT_ACCENT,
};

/** Largest logo data URL kept in settings (~110 KB of image). */
export const LOGO_MAX_CHARS = 150_000;

const LOGO_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;
const HEX_RE = /^#[0-9a-f]{6}$/i;

export function isValidLogo(v: unknown): v is string {
  return typeof v === "string" && v.length <= LOGO_MAX_CHARS && LOGO_RE.test(v);
}

export function normalizeAccent(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  let s = v.trim();
  if (/^#?[0-9a-f]{3}$/i.test(s)) {
    s = s.replace("#", "");
    s = `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`;
  }
  if (!s.startsWith("#")) s = `#${s}`;
  return HEX_RE.test(s) ? s.toLowerCase() : undefined;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * Merge an incoming (untrusted) branding patch over the previous value.
 * Text fields: an empty name/address/phone/website keeps the previous value
 * (the letterhead can never print blank); licence/email may be cleared.
 * Logo: a valid data URL replaces, "" or null removes, anything else keeps.
 */
export function sanitizeBranding(input: unknown, prev: OrgBranding): OrgBranding {
  const i = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: OrgBranding = {
    name: str(i.name, 200) || prev.name,
    address: str(i.address, 300) || prev.address,
    phone: str(i.phone, 60) || prev.phone,
    website: str(i.website, 200) || prev.website,
  };
  const license = "license" in i ? str(i.license, 80) : prev.license || "";
  if (license) out.license = license;
  const email = "email" in i ? str(i.email, 200) : prev.email || "";
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) out.email = email;
  const accent = "accent" in i ? normalizeAccent(i.accent) || prev.accent : prev.accent;
  if (accent) out.accent = accent;
  let logo = prev.logo;
  if ("logo" in i) {
    if (i.logo === "" || i.logo === null) logo = undefined;
    else if (isValidLogo(i.logo)) logo = i.logo;
  }
  if (logo) out.logo = logo;
  return out;
}

/** Brand values ready to render — every field present. */
export interface ResolvedBrand {
  name: string;
  address: string;
  phone: string;
  website: string;
  license: string;
  email: string;
  logo: string;
  accent: string;
  /** Readable text colour on top of the accent. */
  onAccent: string;
}

export function resolveBrand(b?: Partial<OrgBranding> | null): ResolvedBrand {
  const accent = normalizeAccent(b?.accent) || DEFAULT_ACCENT;
  return {
    name: b?.name?.trim() || KIW_BRANDING.name,
    address: b?.address?.trim() ?? KIW_BRANDING.address,
    phone: b?.phone?.trim() ?? KIW_BRANDING.phone,
    website: b?.website?.trim() ?? KIW_BRANDING.website,
    license: b?.license?.trim() || "",
    email: b?.email?.trim() || "",
    logo: isValidLogo(b?.logo) ? (b!.logo as string) : "",
    accent,
    onAccent: contrastText(accent),
  };
}

/** WCAG relative luminance of #rrggbb. */
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/** Black or white, whichever reads better on `hex`. */
export function contrastText(hex: string): string {
  const L = luminance(hex);
  return (L + 0.05) / 0.05 > 1.05 / (L + 0.05) ? "#000000" : "#ffffff";
}

/** The letterhead's contact line, skipping blanks. */
export function brandContactLine(b: ResolvedBrand): string {
  return [b.address, b.phone, b.email, b.website].filter(Boolean).join(" · ");
}

/** Short initials for a logo placeholder ("KING IRON WORKS" → "KIW"). */
export function brandInitials(name: string): string {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 3).map((w) => w[0]).join("").toUpperCase();
}

/** Settings as written to the audit trail: the logo by size, never the image. */
export function auditableSettings<T extends { branding: OrgBranding }>(s: T): T {
  const { logo, ...rest } = s.branding;
  return { ...s, branding: logo ? { ...rest, logo: `[image ${logo.length} chars]` } : rest };
}
