import { describe, expect, it } from "vitest";
import {
  KIW_BRANDING,
  LOGO_MAX_CHARS,
  auditableSettings,
  brandContactLine,
  brandInitials,
  contrastText,
  isValidLogo,
  normalizeAccent,
  resolveBrand,
  sanitizeBranding,
  type OrgBranding,
} from "./org-brand";
import { BRAND_KEYS, bt } from "./org-brand-i18n";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const prev: OrgBranding = { ...KIW_BRANDING };

describe("org branding", () => {
  it("KIW keeps its letterhead when nothing is set", () => {
    const b = resolveBrand(null);
    expect(b.name).toBe("KING IRON WORKS");
    expect(b.accent).toBe("#b8860b");
    expect(b.logo).toBe("");
    expect(brandContactLine(b)).toBe("69 Norman St, Unit 20, Everett, MA 02149 · (617) 404-2589 · kingsironworks.com");
  });

  it("resolves another shop's brand", () => {
    const b = resolveBrand({ name: "Acme Rail Co", address: "1 Main St", phone: "555-0100", website: "acme.test", license: "HIC 12345", accent: "#1D4ED8", logo: PNG });
    expect(b).toMatchObject({ name: "Acme Rail Co", license: "HIC 12345", accent: "#1d4ed8", onAccent: "#ffffff", logo: PNG });
  });

  it("sanitizes untrusted input: never blank text, valid colours and images only", () => {
    const out = sanitizeBranding({ name: "  ", phone: "555", accent: "red", logo: "data:image/svg+xml;base64,PHN2Zz4=", license: " L-9 ", email: "bad" }, prev);
    expect(out.name).toBe(prev.name);
    expect(out.phone).toBe("555");
    expect(out.accent).toBe(prev.accent);
    expect(out.logo).toBeUndefined();
    expect(out.license).toBe("L-9");
    expect(out.email).toBeUndefined();
  });

  it("logo: valid data URL replaces, empty removes, junk keeps", () => {
    const withLogo = sanitizeBranding({ logo: PNG }, prev);
    expect(withLogo.logo).toBe(PNG);
    expect(sanitizeBranding({ logo: "javascript:alert(1)" }, withLogo).logo).toBe(PNG);
    expect(sanitizeBranding({ logo: "" }, withLogo).logo).toBeUndefined();
    expect(sanitizeBranding({}, withLogo).logo).toBe(PNG);
  });

  it("rejects an oversize logo", () => {
    const big = "data:image/png;base64," + "A".repeat(LOGO_MAX_CHARS);
    expect(isValidLogo(big)).toBe(false);
  });

  it("licence may be cleared; accent normalises shorthand", () => {
    const a = sanitizeBranding({ license: "X1" }, prev);
    expect(sanitizeBranding({ license: "" }, a).license).toBeUndefined();
    expect(normalizeAccent("#ABC")).toBe("#aabbcc");
    expect(normalizeAccent("15803d")).toBe("#15803d");
    expect(normalizeAccent("url(x)")).toBeUndefined();
  });

  it("picks readable text on the accent", () => {
    expect(contrastText("#ffd400")).toBe("#000000");
    expect(contrastText("#111827")).toBe("#ffffff");
  });

  it("initials for a logo placeholder", () => {
    expect(brandInitials("KING IRON WORKS")).toBe("KIW");
    expect(brandInitials("Acme")).toBe("AC");
    expect(brandInitials("São Paulo Metais Ltda")).toBe("SPM");
  });

  it("audit keeps the logo size, not the image", () => {
    const s = auditableSettings({ branding: { ...prev, logo: PNG }, other: 1 });
    expect(s.branding.logo).toMatch(/^\[image \d+ chars\]$/);
    expect(s.other).toBe(1);
  });

  it("every branding string exists in EN/PT/ES", () => {
    for (const k of BRAND_KEYS) {
      expect(bt("pt", k)).not.toBe(k);
      expect(bt("es", k)).not.toBe(k);
    }
  });
});
