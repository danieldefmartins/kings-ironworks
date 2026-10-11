// Worker profile + Form W-9 (Rev. March 2024): shared shapes and rules.
//
// Client-safe. Everything sensitive lives server-side in w9-crypto / w9-service;
// this file only knows the public status of a W-9 (signed when, which kind of
// number, last four digits) and the profile fields the crew fill in.
//
// Storage: kiw_shop_workers.application_details (jsonb). Approved applicants
// already carry street/city/state/postalCode, emergencyRelationship and the
// Zelle fields there under these same keys, so a profile completed in the app
// and one that came through the public application read the same way.

import { z } from "zod";
import { TIN_TYPES, type TinType } from "./tin";

export const W9_FORM_REVISION = "Rev. March 2024";

// ---- Federal tax classification (line 3a) ---------------------------------
export const W9_CLASSIFICATIONS = ["individual", "c_corp", "s_corp", "partnership", "trust_estate", "llc", "other"] as const;
export type W9Classification = (typeof W9_CLASSIFICATIONS)[number];
export const LLC_CLASSES = ["C", "S", "P"] as const;

/** Classifications that must use an EIN (they are entities, not people). */
export function requiresEin(c: W9Classification): boolean {
  return c === "c_corp" || c === "s_corp" || c === "partnership" || c === "trust_estate" || c === "llc";
}
/** Line 3b applies only to partnership, trust/estate, or an LLC taxed as a partnership. */
export function foreignPartnersApplies(c: W9Classification, llcClass?: string | null): boolean {
  return c === "partnership" || c === "trust_estate" || (c === "llc" && llcClass === "P");
}

// ---- Part II, verbatim from the form --------------------------------------
// Shown in English as the legal text (translations are only a reading aid),
// and printed on the signed PDF. Do not edit: the IRS requires an electronic
// W-9 to carry the same perjury statement as the paper form.
export const W9_JURAT_INTRO = "Under penalties of perjury, I certify that:";
export const W9_CERT_ITEMS = [
  "The number shown on this form is my correct taxpayer identification number (or I am waiting for a number to be issued to me); and",
  "I am not subject to backup withholding because (a) I am exempt from backup withholding, or (b) I have not been notified by the Internal Revenue Service (IRS) that I am subject to backup withholding as a result of a failure to report all interest or dividends, or (c) the IRS has notified me that I am no longer subject to backup withholding; and",
  "I am a U.S. citizen or other U.S. person (defined below); and",
  "The FATCA code(s) entered on this form (if any) indicating that I am exempt from FATCA reporting is correct.",
] as const;
export const W9_CERT_INSTRUCTIONS =
  "Certification instructions. You must cross out item 2 above if you have been notified by the IRS that you are currently subject to backup withholding because you have failed to report all interest and dividends on your tax return. For real estate transactions, item 2 does not apply. For mortgage interest paid, acquisition or abandonment of secured property, cancellation of debt, contributions to an individual retirement arrangement (IRA), and, generally, payments other than interest and dividends, you are not required to sign the certification, but you must provide your correct TIN. See the instructions for Part II, later.";
/** E-sign consent the signer accepts; printed on the signature record page. */
export const W9_ESIGN_CONSENT =
  "I agree to sign this Form W-9 electronically. My electronic signature (my finger signature together with my typed legal name) has the same legal effect as a handwritten signature. I confirm that I am the person named on line 1, or am authorized to sign for that entity, that I signed in with my own PIN, and that I can download a copy of this signed form at any time from my profile.";
export const W9_JURAT_TEXT =[W9_JURAT_INTRO, ...W9_CERT_ITEMS.map((s, i) => `${i + 1}. ${s}`)].join("\n");

// ---- Stored W-9 metadata ----------------------------------------------------
// Never contains a full TIN. tinCipher is AES-256-GCM ciphertext; pdfPath
// points at an AES-256-GCM encrypted object. Both are server-only and are
// stripped by publicW9() before anything reaches a browser.
export interface W9PreparedTin {
  tinType: TinType;
  tinLast4: string;
  tinCipher: string;
  keyId: string;
  preparedAt: string;
  preparedBy: string;
}

export interface W9Record {
  status: "requested" | "prepared" | "signed";
  requestedAt?: string | null;
  requestedBy?: string | null;
  signedAt?: string | null;
  formRevision?: string;
  classification?: W9Classification;
  llcClass?: string | null;
  businessName?: string | null;
  tinType?: TinType;
  tinLast4?: string;
  tinCipher?: string;
  keyId?: string;
  pdfPath?: string;
  pdfSha256?: string;
  signatureSha256?: string;
  signerIp?: string | null;
  signerUserAgent?: string | null;
  backupWithholding?: boolean;
  /** A number the owner typed in for this worker. Still needs the worker's signature. */
  prepared?: W9PreparedTin | null;
  history?: { signedAt: string; pdfPath: string; keyId: string; pdfSha256: string; tinType: TinType; tinLast4: string }[];
}

export interface W9Public {
  /** prepared = the owner entered the number; the worker has not signed it yet. */
  status: "none" | "requested" | "prepared" | "signed";
  requestedAt: string | null;
  signedAt: string | null;
  tinType: TinType | null;
  tinLast4: string | null;
  classification: W9Classification | null;
  businessName: string | null;
  /** A number already on file the worker can sign with, without retyping it. Last 4 only. */
  onFile: { tinType: TinType; tinLast4: string; source: "owner" | "signed" } | null;
  /** True when a signature is still owed: never signed, or the owner changed the number after. */
  needsSignature: boolean;
}

const okType = (t: unknown): t is TinType => TIN_TYPES.includes(t as TinType);
const ok4 = (s: unknown): s is string => typeof s === "string" && /^\d{4}$/.test(s);

/** Has the owner entered a number that is newer than the last signature? */
export function preparedPending(r: W9Record | null | undefined): boolean {
  const p = r?.prepared;
  if (!p || !okType(p.tinType) || !ok4(p.tinLast4) || !p.tinCipher) return false;
  const signed = r!.status === "signed" && !!r!.pdfPath && !!r!.signedAt;
  return !signed || p.preparedAt > (r!.signedAt || "");
}

export function publicW9(r: W9Record | null | undefined): W9Public {
  const none: W9Public = { status: "none", requestedAt: null, signedAt: null, tinType: null, tinLast4: null, classification: null, businessName: null, onFile: null, needsSignature: true };
  if (!r || typeof r !== "object") return none;
  const signed = r.status === "signed" && !!r.pdfPath && !!r.signedAt;
  const pending = preparedPending(r);
  const prep = pending ? r.prepared! : null;
  const onFile = prep
    ? { tinType: prep.tinType, tinLast4: prep.tinLast4, source: "owner" as const }
    : signed && okType(r.tinType) && ok4(r.tinLast4) && r.tinCipher ? { tinType: r.tinType, tinLast4: r.tinLast4, source: "signed" as const } : null;
  return {
    status: signed ? "signed" : prep ? "prepared" : r.requestedAt ? "requested" : "none",
    requestedAt: r.requestedAt ?? null,
    signedAt: signed ? r.signedAt ?? null : null,
    tinType: signed && okType(r.tinType) ? r.tinType : null,
    tinLast4: signed && ok4(r.tinLast4) ? r.tinLast4 : null,
    classification: signed ? r.classification ?? null : null,
    businessName: signed ? r.businessName ?? null : null,
    onFile,
    needsSignature: !signed || pending,
  };
}

// ---- Profile ------------------------------------------------------------------
const text = (max: number) => z.string().trim().max(max);
const phoneOk = (v: string) => /^[+()0-9 .-]*$/.test(v) && v.replace(/\D/g, "").length >= 7 && v.replace(/\D/g, "").length <= 15;
const zelleOk = (v: string) => !v || z.email().safeParse(v).success || (/^[+()0-9 .-]+$/.test(v) && /^(1)?\d{10}$/.test(v.replace(/\D/g, "")));
export const profileFieldsSchema = z.object({
  /** Display name (the kiw_shop_workers.name column). Never overwritten by legalName. */
  name: text(100).min(2),
  /** Full legal name, as on tax documents. W-9 line 1 starts from this. */
  legalName: text(150).min(3),
  phone: text(40).refine(phoneOk, "phone"),
  email: z.email().trim().max(160),
  street: text(200).min(3),
  unit: text(50),
  city: text(100).min(2),
  state: text(80).min(2),
  postalCode: text(20).regex(/^\d{5}(-\d{4})?$/, "postalCode"),
  emergencyName: text(100).min(2),
  emergencyPhone: text(40).refine(phoneOk, "phone"),
  emergencyRelationship: text(80).min(2),
  zelleContact: text(160).refine(zelleOk, "zelleContact"),
  zelleName: text(120),
});
export type ProfileFields = z.infer<typeof profileFieldsSchema>;
export const PROFILE_KEYS = Object.keys(profileFieldsSchema.shape) as (keyof ProfileFields)[];
/**
 * Saves can be partial (one wizard step at a time); each present field is still
 * validated. Only unit and the optional Zelle fields accept "" (to clear them).
 */
export const profilePatchSchema = profileFieldsSchema.partial().strict();
export type ProfilePatch = z.infer<typeof profilePatchSchema>;

export interface ProfileView extends ProfileFields {
  id: string;
  role: string;
  lang: string;
  w9: W9Public;
  requestedAt: string | null;
}

export type ProfileStep = "contact" | "address" | "emergency" | "payment" | "w9";
export const PROFILE_STEPS: ProfileStep[] = ["contact", "address", "emergency", "payment", "w9"];
type Checkable = Pick<ProfileView, keyof ProfileFields | "w9">;

export function fieldOk(p: Partial<ProfileFields>, k: keyof ProfileFields): boolean {
  const v = String(p[k] ?? "").trim();
  return v !== "" && profileFieldsSchema.shape[k].safeParse(v).success;
}
export function stepDone(p: Checkable, step: ProfileStep): boolean {
  switch (step) {
    case "contact": return fieldOk(p, "legalName") && fieldOk(p, "phone") && fieldOk(p, "email");
    case "address": return fieldOk(p, "street") && fieldOk(p, "city") && fieldOk(p, "state") && fieldOk(p, "postalCode");
    case "emergency": return fieldOk(p, "emergencyName") && fieldOk(p, "emergencyPhone") && fieldOk(p, "emergencyRelationship");
    case "payment": return fieldOk(p, "zelleContact") && fieldOk(p, "zelleName");
    case "w9": return p.w9.status === "signed" && !p.w9.needsSignature;
  }
}
/** Zelle is optional; everything else is required. */
export const REQUIRED_STEPS: ProfileStep[] = ["contact", "address", "emergency", "w9"];
export function profileComplete(p: Checkable): boolean {
  return REQUIRED_STEPS.every(s => stepDone(p, s));
}
export function firstOpenStep(p: Checkable): ProfileStep {
  return PROFILE_STEPS.find(s => s !== "payment" && !stepDone(p, s)) ?? "w9";
}

/** W-9 line 1 default: the legal name, falling back to the display name. */
export function w9LineOneName(p: Pick<ProfileFields, "legalName" | "name">): string {
  return (p.legalName || "").trim() || (p.name || "").trim();
}

// Accounts that are not people: the shop tablet login, unnamed helpers.
// Hidden from the roster by default, never from the database.
export function isSystemAccount(name: string): boolean {
  return /^(office|shop|tablet|kiosk|shop tablet|helper\s*\d*)$/i.test(name.trim());
}
