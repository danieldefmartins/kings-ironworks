// Worker profile + W-9 operations. Server-only.
//
// Every function takes its I/O as `deps` so the security rules can be tested
// end to end without a database: who may read a W-9, that the TIN only ever
// leaves this module inside an encrypted blob, that each access is audited.
//
// Rules this file enforces:
//  - A full TIN exists in memory only while a request is being handled. It is
//    persisted only as AES-256-GCM ciphertext (tinCipher, and inside the
//    encrypted PDF). Responses carry last 4 digits at most.
//  - Signing requires the signer's own PIN again (IRS: the system must make
//    reasonably certain the person submitting is the person on the form).
//  - The decrypted PDF is served to the worker themselves or to an owner with
//    finance access (canViewOwnerFinancials), and every view is audited.
//  - The owner may type a worker's number in (prepareTin); it is stored the
//    same way and is marked as awaiting the worker's signature.

import crypto from "node:crypto";
import { z } from "zod";
import { canViewOwnerFinancials } from "./shared";
import { last4, validateTin, tinDigits, TIN_TYPES, type TinType } from "./tin";
import {
  LLC_CLASSES, PROFILE_KEYS, W9_CLASSIFICATIONS, W9_ESIGN_CONSENT, W9_FORM_REVISION,
  foreignPartnersApplies, isSystemAccount, preparedPending, profileComplete, profilePatchSchema, publicW9, requiresEin, w9LineOneName,
  type ProfileFields, type ProfilePatch, type ProfileView, type W9Record,
} from "./w9";
import { decryptBytes, decryptText, encryptBytes, encryptText, sha256Hex, w9Aad, w9KeyId } from "./w9-crypto";
import { buildW9Pdf } from "./w9-pdf";
import { pinResetOf } from "./pin-service";

export interface TeamRecord {
  id: string;
  name: string;
  role: string;
  active: boolean;
  is_admin?: boolean | null;
  can_see_prices?: boolean | null;
  hourly_rate?: number | string | null;
  payroll_excluded?: boolean | null;
  lang?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  application_details?: Record<string, unknown> | null;
}

export interface Actor {
  id: string;
  name: string;
  is_admin?: boolean | null;
  can_see_prices?: boolean | null;
}

export interface W9Deps {
  orgId: string;
  getRecord(id: string): Promise<TeamRecord | null>;
  listRecords(): Promise<TeamRecord[]>;
  saveRecord(id: string, patch: { columns?: Record<string, unknown>; details: Record<string, unknown> }): Promise<void>;
  putObject(path: string, bytes: Buffer): Promise<void>;
  getObject(path: string): Promise<Buffer>;
  audit(action: string, opts: { workerId?: string | null; entity?: string; entityId?: string; detail?: unknown }): Promise<void>;
  verifyPin(workerId: string, pin: string): Promise<boolean>;
  recentPinFailures(workerId: string): Promise<number>;
  org(): Promise<{ name: string; address: string }>;
  now(): Date;
}

export class W9Error extends Error {
  constructor(public status: number, public code: string, message?: string) {
    super(message || code);
    this.name = "W9Error";
  }
}

export const ESIGN_CONSENT_TEXT = W9_ESIGN_CONSENT;

const MAX_PIN_FAILURES = 5;
const MAX_SIGNATURE_BYTES = 300_000;

// ---- Reading records --------------------------------------------------------

const str = (v: unknown) => (typeof v === "string" ? v : "");

function details(rec: TeamRecord): Record<string, unknown> {
  const d = rec.application_details;
  return d && typeof d === "object" && !Array.isArray(d) ? { ...d } : {};
}
export function w9Of(rec: TeamRecord): W9Record | null {
  const w = details(rec).w9;
  return w && typeof w === "object" ? (w as W9Record) : null;
}

export function profileView(rec: TeamRecord): ProfileView {
  const d = details(rec);
  const req = d.profileRequest as { at?: string } | undefined;
  return {
    id: rec.id,
    role: rec.role,
    lang: rec.lang || "en",
    name: rec.name || "",
    // Applicants typed their full legal name on the application.
    legalName: str(d.legalName) || str(d.fullName),
    phone: rec.phone || "",
    email: rec.email || "",
    // Structured address when we have it; an old single-line address is the
    // best starting point for the street line otherwise.
    street: str(d.street) || (!d.city ? rec.address || "" : ""),
    unit: str(d.unit),
    city: str(d.city),
    state: str(d.state),
    postalCode: str(d.postalCode),
    emergencyName: rec.emergency_contact_name || str(d.emergencyName),
    emergencyPhone: rec.emergency_contact_phone || str(d.emergencyPhone),
    emergencyRelationship: str(d.emergencyRelationship),
    zelleContact: str(d.zelleContact),
    zelleName: str(d.zelleName),
    w9: publicW9(w9Of(rec)),
    requestedAt: req?.at || null,
  };
}

/** Owner-side roster row. Contains no secret: last 4 at most. */
export interface RosterRow {
  id: string;
  name: string;
  role: string;
  hourlyRate: number | null;
  isOwner: boolean;
  system: boolean;
  payrollExcluded: boolean;
  profile: ProfileView;
  complete: boolean;
  /** Counts toward year-end 1099 readiness. */
  contractor: boolean;
  /** Owner set a temporary PIN the worker has not replaced yet. */
  pinReset?: boolean;
}
export function rosterRow(rec: TeamRecord): RosterRow {
  const profile = profileView(rec);
  const isOwner = canViewOwnerFinancials(rec);
  const system = isSystemAccount(rec.name);
  const rate = rec.hourly_rate == null ? null : Number(rec.hourly_rate);
  return {
    id: rec.id, name: rec.name, role: rec.role,
    hourlyRate: Number.isFinite(rate) ? rate : null,
    isOwner, system, payrollExcluded: !!rec.payroll_excluded,
    profile, complete: profileComplete(profile),
    contractor: !isOwner && !system && !rec.payroll_excluded,
    pinReset: !!pinResetOf(rec),
  };
}

/** Whether the "Complete your profile" banner shows for this worker. */
export function showProfileBanner(rec: TeamRecord): boolean {
  const p = profileView(rec);
  if (profileComplete(p)) return false;
  const row = rosterRow(rec);
  return !!p.requestedAt || p.w9.status === "prepared" || row.contractor;
}

// ---- Profile ------------------------------------------------------------------

function composeAddress(p: Pick<ProfileFields, "street" | "unit" | "city" | "state" | "postalCode">): string | null {
  const s = [p.street, p.unit, p.city, p.state, p.postalCode].map(v => (v || "").trim()).filter(Boolean).join(", ");
  return s || null;
}

export async function saveProfile(deps: W9Deps, actor: Actor, workerId: string, raw: unknown): Promise<ProfileView> {
  const self = actor.id === workerId;
  if (!self && !canViewOwnerFinancials(actor)) throw new W9Error(403, "forbidden");
  const parsed = profilePatchSchema.safeParse(raw);
  if (!parsed.success) throw new W9Error(400, "invalid", String(parsed.error.issues[0]?.path?.[0] ?? "invalid"));
  const patch: ProfilePatch = parsed.data;
  const rec = await deps.getRecord(workerId);
  if (!rec) throw new W9Error(404, "notFound");
  const d = details(rec);
  const cur = profileView(rec);
  const next = { ...cur, ...patch };
  const columns: Record<string, unknown> = {};
  if (patch.name !== undefined) columns.name = patch.name;
  if (patch.phone !== undefined) columns.phone = patch.phone || null;
  if (patch.email !== undefined) columns.email = patch.email || null;
  if (patch.emergencyName !== undefined) columns.emergency_contact_name = patch.emergencyName || null;
  if (patch.emergencyPhone !== undefined) columns.emergency_contact_phone = patch.emergencyPhone || null;
  const addressTouched = (["street", "unit", "city", "state", "postalCode"] as const).some(k => patch[k] !== undefined);
  if (addressTouched) columns.address = composeAddress(next);
  for (const k of ["legalName", "street", "unit", "city", "state", "postalCode", "emergencyRelationship", "zelleContact", "zelleName"] as const) {
    if (patch[k] !== undefined) d[k] = patch[k];
  }
  await deps.saveRecord(workerId, { columns, details: d });
  await deps.audit(self ? "worker_profile_update" : "worker_profile_update_by_owner", {
    workerId: actor.id, entity: "worker", entityId: workerId,
    detail: { fields: Object.keys(patch).filter(k => (PROFILE_KEYS as string[]).includes(k)) },
  });
  return profileView({ ...rec, ...columns, application_details: d } as TeamRecord);
}

// ---- Requests ------------------------------------------------------------------

export async function requestProfiles(deps: W9Deps, actor: Actor, target: { workerIds?: string[]; all?: boolean }): Promise<{ requested: string[] }> {
  if (!canViewOwnerFinancials(actor)) throw new W9Error(403, "forbidden");
  let recs: TeamRecord[];
  if (target.all) {
    recs = (await deps.listRecords()).filter(r => rosterRow(r).contractor && !rosterRow(r).complete);
  } else {
    const ids = [...new Set(target.workerIds || [])].slice(0, 200);
    recs = (await Promise.all(ids.map(id => deps.getRecord(id)))).filter((r): r is TeamRecord => !!r);
  }
  const at = deps.now().toISOString();
  const done: string[] = [];
  for (const rec of recs) {
    const d = details(rec);
    const w9 = { ...(w9Of(rec) || { status: "requested" as const }) };
    w9.requestedAt = at;
    w9.requestedBy = actor.id;
    if (w9.status !== "signed" && w9.status !== "prepared") w9.status = "requested";
    d.w9 = w9;
    d.profileRequest = { at, by: actor.id };
    await deps.saveRecord(rec.id, { details: d });
    await deps.audit("w9_requested", { workerId: actor.id, entity: "worker", entityId: rec.id });
    done.push(rec.id);
  }
  return { requested: done };
}

// ---- Owner enters a TIN ----------------------------------------------------

const tinInputSchema = z.object({ tinType: z.enum(TIN_TYPES as [TinType, ...TinType[]]), tin: z.string().max(20), tinConfirm: z.string().max(20) });

export async function prepareTin(deps: W9Deps, actor: Actor, workerId: string, raw: unknown): Promise<{ tinType: TinType; tinLast4: string }> {
  if (!canViewOwnerFinancials(actor)) throw new W9Error(403, "forbidden");
  const parsed = tinInputSchema.safeParse(raw);
  if (!parsed.success) throw new W9Error(400, "invalid");
  const { tinType, tin, tinConfirm } = parsed.data;
  const err = validateTin(tinType, tin, tinConfirm);
  if (err) throw new W9Error(400, `tin.${err}`);
  const rec = await deps.getRecord(workerId);
  if (!rec) throw new W9Error(404, "notFound");
  const d = details(rec);
  const w9: W9Record = { ...(w9Of(rec) || { status: "prepared" }) };
  const at = deps.now().toISOString();
  w9.prepared = {
    tinType, tinLast4: last4(tin),
    tinCipher: encryptText(tinDigits(tin), w9Aad(deps.orgId, workerId, "tin")),
    keyId: w9KeyId(), preparedAt: at, preparedBy: actor.id,
  };
  if (w9.status !== "signed") w9.status = "prepared";
  if (!w9.requestedAt) { w9.requestedAt = at; w9.requestedBy = actor.id; }
  d.w9 = w9;
  d.profileRequest = d.profileRequest || { at, by: actor.id };
  await deps.saveRecord(workerId, { details: d });
  await deps.audit("w9_tin_prepared", { workerId: actor.id, entity: "worker", entityId: workerId, detail: { tinType } });
  return { tinType, tinLast4: last4(tin) };
}

// ---- Signing ---------------------------------------------------------------------

const opt = (max: number) => z.string().trim().max(max).optional().default("");
export const signSchema = z.object({
  name: z.string().trim().min(2).max(150),
  businessName: opt(150),
  classification: z.enum(W9_CLASSIFICATIONS),
  llcClass: z.enum(LLC_CLASSES).optional().nullable(),
  otherText: opt(60),
  foreignPartners: z.boolean().optional().default(false),
  exemptPayeeCode: z.string().trim().regex(/^(|[1-9]|1[0-3])$/).optional().default(""),
  fatcaCode: z.string().trim().regex(/^(|[A-M])$/i).optional().default(""),
  street: z.string().trim().min(3).max(200),
  unit: opt(50),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(80),
  postalCode: z.string().trim().regex(/^\d{5}(-\d{4})?$/),
  tinMode: z.enum(["new", "onFile"]),
  tinType: z.enum(TIN_TYPES as [TinType, ...TinType[]]).optional(),
  tin: z.string().max(20).optional(),
  tinConfirm: z.string().max(20).optional(),
  backupWithholding: z.boolean(),
  certify: z.literal(true),
  consent: z.literal(true),
  typedName: z.string().trim().min(3).max(150),
  pin: z.string().regex(/^\d{4,8}$/),
  signature: z.string().max(MAX_SIGNATURE_BYTES * 2),
});
export type SignInput = z.input<typeof signSchema>;

function decodeSignature(dataUrl: string): Buffer {
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) throw new W9Error(400, "signature");
  const buf = Buffer.from(m[1], "base64");
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length < 100 || buf.length > MAX_SIGNATURE_BYTES || !buf.subarray(0, 8).equals(png)) throw new W9Error(400, "signature");
  return buf;
}

export async function signW9(
  deps: W9Deps,
  actor: Actor,
  raw: unknown,
  ctx: { ip: string | null; userAgent: string | null }
): Promise<ProfileView> {
  const parsed = signSchema.safeParse(raw);
  if (!parsed.success) throw new W9Error(400, "invalid", String(parsed.error.issues[0]?.path?.[0] ?? "invalid"));
  const input = parsed.data;
  // A W-9 is signed by the person it is about, on their own session. Nobody signs for someone else.
  const rec = await deps.getRecord(actor.id);
  if (!rec) throw new W9Error(404, "notFound");
  const prev = w9Of(rec);

  // The number: freshly typed (twice), or the one already on file.
  let tinType: TinType;
  let tin: string;
  let preparedBy: string | null = null;
  if (input.tinMode === "new") {
    if (!input.tinType || !input.tin) throw new W9Error(400, "tin.length");
    const err = validateTin(input.tinType, input.tin, input.tinConfirm ?? "");
    if (err) throw new W9Error(400, `tin.${err}`);
    tinType = input.tinType;
    tin = tinDigits(input.tin);
  } else {
    if (prev && preparedPending(prev)) {
      tinType = prev.prepared!.tinType;
      tin = decryptText(prev.prepared!.tinCipher, w9Aad(deps.orgId, actor.id, "tin"));
      preparedBy = prev.prepared!.preparedBy;
    } else if (prev?.tinCipher && prev.tinType) {
      tinType = prev.tinType;
      tin = decryptText(prev.tinCipher, w9Aad(deps.orgId, actor.id, "tin"));
    } else throw new W9Error(400, "tin.length");
  }
  if (requiresEin(input.classification) && tinType !== "ein") throw new W9Error(400, "tin.einRequired");
  if (input.classification === "llc" && !input.llcClass) throw new W9Error(400, "llcClass");
  if (input.classification === "other" && !input.otherText) throw new W9Error(400, "otherText");

  const signaturePng = decodeSignature(input.signature);

  // Re-authenticate: the session proves a device, the PIN proves the person.
  if ((await deps.recentPinFailures(actor.id)) >= MAX_PIN_FAILURES) {
    await deps.audit("login_locked", { workerId: actor.id, entity: "w9", entityId: actor.id });
    throw new W9Error(429, "locked");
  }
  if (!(await deps.verifyPin(actor.id, input.pin))) {
    await deps.audit("login_fail", { workerId: actor.id, entity: "w9", entityId: actor.id, detail: { ua: ctx.userAgent?.slice(0, 200) || null } });
    throw new W9Error(403, "pin");
  }

  const org = await deps.org();
  const signedAt = deps.now();
  const signatureSha256 = sha256Hex(signaturePng);
  let preparedByName: string | null = null;
  if (preparedBy) preparedByName = (await deps.getRecord(preparedBy))?.name || "Owner";
  const pdf = await buildW9Pdf({
    name: input.name,
    businessName: input.businessName,
    classification: input.classification,
    llcClass: input.classification === "llc" ? input.llcClass : null,
    otherText: input.classification === "other" ? input.otherText : null,
    foreignPartners: foreignPartnersApplies(input.classification, input.llcClass) && input.foreignPartners,
    exemptPayeeCode: input.exemptPayeeCode,
    fatcaCode: input.fatcaCode,
    addressLine: [input.street, input.unit].filter(Boolean).join(", "),
    cityStateZip: `${input.city}, ${input.state} ${input.postalCode}`,
    requester: `${org.name}\n${org.address}`,
    tinType, tin,
    backupWithholding: input.backupWithholding,
    signaturePng, signedAt, typedName: input.typedName,
    certificate: {
      workerId: actor.id, orgName: org.name, ip: ctx.ip, userAgent: ctx.userAgent, signatureSha256,
      authMethod: "Signed in to the shop app and re-entered personal PIN at signing",
      consentText: ESIGN_CONSENT_TEXT, preparedBy: preparedByName,
    },
  });

  const keyId = w9KeyId();
  const pdfSha256 = sha256Hex(pdf);
  const pdfPath = `w9/${deps.orgId}/${actor.id}/${crypto.randomBytes(16).toString("hex")}.bin`;
  await deps.putObject(pdfPath, encryptBytes(pdf, w9Aad(deps.orgId, actor.id, "pdf")));

  const history = [...(prev?.history || [])];
  if (prev?.status === "signed" && prev.pdfPath && prev.signedAt && prev.keyId && prev.pdfSha256 && prev.tinType && prev.tinLast4) {
    history.unshift({ signedAt: prev.signedAt, pdfPath: prev.pdfPath, keyId: prev.keyId, pdfSha256: prev.pdfSha256, tinType: prev.tinType, tinLast4: prev.tinLast4 });
  }
  const w9: W9Record = {
    status: "signed",
    requestedAt: prev?.requestedAt ?? null,
    requestedBy: prev?.requestedBy ?? null,
    signedAt: signedAt.toISOString(),
    formRevision: W9_FORM_REVISION,
    classification: input.classification,
    llcClass: input.classification === "llc" ? input.llcClass ?? null : null,
    businessName: input.businessName || null,
    tinType,
    tinLast4: last4(tin),
    tinCipher: encryptText(tin, w9Aad(deps.orgId, actor.id, "tin")),
    keyId,
    pdfPath,
    pdfSha256,
    signatureSha256,
    signerIp: ctx.ip,
    signerUserAgent: ctx.userAgent?.slice(0, 300) || null,
    backupWithholding: input.backupWithholding,
    prepared: null,
    history: history.slice(0, 10),
  };
  const d = details(rec);
  d.w9 = w9;
  if (!str(d.legalName) && input.classification === "individual") d.legalName = input.name;
  await deps.saveRecord(actor.id, { details: d });
  await deps.audit("w9_signed", {
    workerId: actor.id, entity: "worker", entityId: actor.id,
    detail: { tinType, classification: input.classification, pdfSha256, signatureSha256, ip: ctx.ip, preparedByOwner: !!preparedBy },
  });
  tin = "";
  return profileView({ ...rec, application_details: d });
}

// ---- Reading the signed PDF -----------------------------------------------------

export async function openW9Pdf(deps: W9Deps, viewer: Actor, workerId: string): Promise<{ pdf: Buffer; filename: string }> {
  const self = viewer.id === workerId;
  if (!self && !canViewOwnerFinancials(viewer)) {
    await deps.audit("w9_view_denied", { workerId: viewer.id, entity: "worker", entityId: workerId });
    throw new W9Error(403, "forbidden");
  }
  const rec = await deps.getRecord(workerId);
  const w9 = rec ? w9Of(rec) : null;
  if (!rec || !w9 || w9.status !== "signed" || !w9.pdfPath) throw new W9Error(404, "notFound");
  const blob = await deps.getObject(w9.pdfPath);
  const pdf = decryptBytes(blob, w9Aad(deps.orgId, workerId, "pdf"));
  if (w9.pdfSha256 && sha256Hex(pdf) !== w9.pdfSha256) throw new W9Error(500, "integrity");
  await deps.audit("w9_pdf_view", { workerId: viewer.id, entity: "worker", entityId: workerId, detail: { self, pdfSha256: w9.pdfSha256 } });
  const safe = (w9LineOneName(profileView(rec)) || "worker").replace(/[^A-Za-z0-9 _-]/g, "").trim().replace(/\s+/g, "-");
  return { pdf, filename: `W-9-${safe}-${(w9.signedAt || "").slice(0, 10)}.pdf` };
}
