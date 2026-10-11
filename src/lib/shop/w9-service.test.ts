// @vitest-environment node
// End-to-end security tests for the W-9 flow, against in-memory storage.
// The point is not only that signing works but that the full TIN never
// appears anywhere it could be read later: rows, blobs, audit, logs, responses.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decryptBytes, decryptText, encryptBytes, encryptText, W9KeyError, w9Aad, w9KeyConfigured } from "./w9-crypto";
import { openW9Pdf, prepareTin, profileView, requestProfiles, rosterRow, saveProfile, showProfileBanner, signW9, W9Error, type TeamRecord, type W9Deps } from "./w9-service";
import { profileComplete, publicW9 } from "./w9";
import { FAKE_SSN, FAKE_SSN_DIGITS, TEST_KEY, signatureDataUrl } from "./w9.fixture";

const ORG = "b0000000-0000-4000-8000-000000000002";
const W = "b1000000-0000-4000-8000-000000000002"; // crew
const OTHER = "b1000000-0000-4000-8000-000000000003"; // other crew
const OWNER = "b1000000-0000-4000-8000-000000000001";
const crew = { id: W, name: "Kaio Prates", is_admin: false, can_see_prices: false };
const other = { id: OTHER, name: "Other", is_admin: false, can_see_prices: false };
const owner = { id: OWNER, name: "Owner", is_admin: true, can_see_prices: true };
const adminNoFinance = { id: OTHER, name: "Lead", is_admin: true, can_see_prices: false };

function world() {
  const rows = new Map<string, TeamRecord>([
    [W, { id: W, name: "Kaio Prates", role: "Welder", active: true, hourly_rate: 30, application_details: null }],
    [OTHER, { id: OTHER, name: "Other", role: "Helper", active: true, application_details: null }],
    [OWNER, { id: OWNER, name: "Owner", role: "Owner", active: true, is_admin: true, can_see_prices: true, application_details: null }],
  ]);
  const blobs = new Map<string, Buffer>();
  const audits: { action: string; opts: unknown }[] = [];
  const writes: string[] = [];
  const pins: Record<string, string> = { [W]: "9002", [OTHER]: "9003", [OWNER]: "9001" };
  let failures = 0;
  const deps: W9Deps = {
    orgId: ORG,
    getRecord: async id => (rows.has(id) ? structuredClone(rows.get(id)!) : null),
    listRecords: async () => [...rows.values()].map(r => structuredClone(r)),
    saveRecord: async (id, patch) => {
      writes.push(JSON.stringify(patch));
      rows.set(id, { ...rows.get(id)!, ...(patch.columns || {}), application_details: patch.details });
    },
    putObject: async (p, b) => { blobs.set(p, Buffer.from(b)); },
    getObject: async p => { const b = blobs.get(p); if (!b) throw new Error("missing"); return b; },
    audit: async (action, opts) => { audits.push({ action, opts }); },
    verifyPin: async (id, pin) => { const ok = pins[id] === pin; if (!ok) failures++; return ok; },
    recentPinFailures: async () => failures,
    org: async () => ({ name: "TEST IRON WORKS", address: "1 Test Way, Everett, MA 02149" }),
    now: () => new Date("2026-10-11T15:00:00Z"),
  };
  return { deps, rows, blobs, audits, writes };
}

const form = (over: Record<string, unknown> = {}) => ({
  name: "Kaio Henrique Barbosa Prates", businessName: "", classification: "individual",
  street: "12 Test St", unit: "Apt 2", city: "Everett", state: "MA", postalCode: "02149",
  tinMode: "new", tinType: "ssn", tin: FAKE_SSN, tinConfirm: FAKE_SSN_DIGITS,
  backupWithholding: false, certify: true, consent: true,
  typedName: "Kaio Henrique Barbosa Prates", pin: "9002", signature: signatureDataUrl(), ...over,
});
const ctx = { ip: "203.0.113.9", userAgent: "Vitest" };

function assertNoPlaintextTin(haystack: string) {
  expect(haystack).not.toContain(FAKE_SSN_DIGITS);
  expect(haystack).not.toContain(FAKE_SSN);
  expect(haystack).not.toContain("123 45 6789");
}

let logs: string[];
beforeEach(() => {
  vi.stubEnv("W9_ENCRYPTION_KEY", TEST_KEY);
  logs = [];
  for (const m of ["log", "info", "warn", "error", "debug"] as const) {
    vi.spyOn(console, m).mockImplementation((...a: unknown[]) => { logs.push(a.map(x => (typeof x === "string" ? x : JSON.stringify(x))).join(" ")); });
  }
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("AES-256-GCM", () => {
  it("round-trips text and bytes", () => {
    const aad = w9Aad(ORG, W, "tin");
    const c = encryptText(FAKE_SSN_DIGITS, aad);
    assertNoPlaintextTin(c);
    expect(decryptText(c, aad)).toBe(FAKE_SSN_DIGITS);
    const b = encryptBytes(Buffer.from("%PDF-1.7 hello"), w9Aad(ORG, W, "pdf"));
    expect(decryptBytes(b, w9Aad(ORG, W, "pdf")).toString()).toBe("%PDF-1.7 hello");
  });
  it("uses a fresh IV every time", () => {
    const aad = w9Aad(ORG, W, "tin");
    expect(encryptText("x", aad)).not.toBe(encryptText("x", aad));
  });
  it("refuses a ciphertext moved to another worker or tampered with", () => {
    const c = encryptText(FAKE_SSN_DIGITS, w9Aad(ORG, W, "tin"));
    expect(() => decryptText(c, w9Aad(ORG, OTHER, "tin"))).toThrow();
    const raw = Buffer.from(c, "base64");
    raw[raw.length - 1] ^= 1;
    expect(() => decryptText(raw.toString("base64"), w9Aad(ORG, W, "tin"))).toThrow();
  });
  it("fails closed without a valid 32-byte key", () => {
    vi.stubEnv("W9_ENCRYPTION_KEY", "");
    expect(w9KeyConfigured()).toBe(false);
    expect(() => encryptText("x", "a")).toThrow(W9KeyError);
    vi.stubEnv("W9_ENCRYPTION_KEY", Buffer.alloc(16).toString("base64"));
    expect(() => encryptText("x", "a")).toThrow(W9KeyError);
  });
});

describe("signing a W-9", () => {
  it("stores only ciphertext, last 4 and metadata — never the plaintext TIN", async () => {
    const { deps, rows, blobs, audits, writes } = world();
    const view = await signW9(deps, crew, form(), ctx);
    expect(view.w9.status).toBe("signed");
    expect(view.w9.tinLast4).toBe("6789");
    expect(view.w9.needsSignature).toBe(false);

    const stored = JSON.stringify(rows.get(W));
    assertNoPlaintextTin(stored);
    for (const w of writes) assertNoPlaintextTin(w);
    for (const b of blobs.values()) {
      assertNoPlaintextTin(b.toString("latin1"));
      expect(b.subarray(0, 4).toString("latin1")).not.toBe("%PDF");
    }
    assertNoPlaintextTin(JSON.stringify(audits));
    assertNoPlaintextTin(logs.join("\n"));
    assertNoPlaintextTin(JSON.stringify(view)); // the API response

    const w9 = (rows.get(W)!.application_details as { w9: Record<string, unknown> }).w9;
    expect(w9).toMatchObject({ status: "signed", tinType: "ssn", tinLast4: "6789", classification: "individual", signerIp: "203.0.113.9", formRevision: "Rev. March 2024" });
    expect(String(w9.pdfPath)).toMatch(new RegExp(`^w9/${ORG}/${W}/[0-9a-f]{32}\\.bin$`));
    expect(decryptText(String(w9.tinCipher), w9Aad(ORG, W, "tin"))).toBe(FAKE_SSN_DIGITS);
    expect(audits.map(a => a.action)).toContain("w9_signed");
  }, 20000);

  it("the public view strips the cipher and storage path", async () => {
    const { deps, rows } = world();
    await signW9(deps, crew, form(), ctx);
    const pub = JSON.stringify(publicW9((rows.get(W)!.application_details as { w9: never }).w9));
    expect(pub).not.toContain("tinCipher");
    expect(pub).not.toContain("pdfPath");
    expect(pub).not.toContain("w9/");
  }, 20000);

  it("requires the signer's own PIN and records a failed attempt", async () => {
    const { deps, rows, blobs, audits } = world();
    await expect(signW9(deps, crew, form({ pin: "1111" }), ctx)).rejects.toMatchObject({ status: 403, code: "pin" });
    expect(blobs.size).toBe(0);
    expect(rows.get(W)!.application_details).toBeNull();
    expect(audits.map(a => a.action)).toContain("login_fail");
  });

  it("rejects bad numbers, mismatched confirmation, and an SSN on a corporation", async () => {
    const { deps } = world();
    await expect(signW9(deps, crew, form({ tin: "666-45-6789", tinConfirm: "666-45-6789" }), ctx)).rejects.toMatchObject({ code: "tin.ssnArea" });
    await expect(signW9(deps, crew, form({ tinConfirm: "123-45-6780" }), ctx)).rejects.toMatchObject({ code: "tin.mismatch" });
    await expect(signW9(deps, crew, form({ classification: "c_corp" }), ctx)).rejects.toMatchObject({ code: "tin.einRequired" });
    await expect(signW9(deps, crew, form({ certify: false }), ctx)).rejects.toBeInstanceOf(W9Error);
    await expect(signW9(deps, crew, form({ signature: "data:image/png;base64,AAAA" }), ctx)).rejects.toMatchObject({ code: "signature" });
  });

  it("fails closed when the key is missing, writing nothing", async () => {
    vi.stubEnv("W9_ENCRYPTION_KEY", "");
    const { deps, rows, blobs } = world();
    await expect(signW9(deps, crew, form(), ctx)).rejects.toBeInstanceOf(W9KeyError);
    expect(blobs.size).toBe(0);
    expect(rows.get(W)!.application_details).toBeNull();
  });
});

describe("who can open the signed PDF", () => {
  async function signed() {
    const w = world();
    await signW9(w.deps, crew, form(), ctx);
    return w;
  }
  it("the worker can open their own, decrypted", async () => {
    const { deps, audits } = await signed();
    const { pdf, filename } = await openW9Pdf(deps, crew, W);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(filename).toBe("W-9-Kaio-Henrique-Barbosa-Prates-2026-10-11.pdf");
    expect(audits.filter(a => a.action === "w9_pdf_view")).toHaveLength(1);
  }, 20000);
  it("an owner with finance access can open anyone's, and it is audited", async () => {
    const { deps, audits } = await signed();
    await openW9Pdf(deps, owner, W);
    expect(audits.at(-1)).toMatchObject({ action: "w9_pdf_view", opts: { workerId: OWNER, entityId: W } });
  }, 20000);
  it("other crew and admins without finance access cannot, and the attempt is audited", async () => {
    const { deps, audits } = await signed();
    await expect(openW9Pdf(deps, other, W)).rejects.toMatchObject({ status: 403 });
    await expect(openW9Pdf(deps, adminNoFinance, W)).rejects.toMatchObject({ status: 403 });
    expect(audits.filter(a => a.action === "w9_view_denied")).toHaveLength(2);
  }, 20000);
  it("detects a swapped blob", async () => {
    const { deps, blobs } = await signed();
    const [p] = [...blobs.keys()];
    blobs.set(p, encryptBytes(Buffer.from("%PDF-fake"), w9Aad(ORG, W, "pdf")));
    await expect(openW9Pdf(deps, owner, W)).rejects.toMatchObject({ code: "integrity" });
  }, 20000);
});

describe("owner-entered TIN", () => {
  it("only finance owners can enter one; it is encrypted and only last 4 comes back", async () => {
    const { deps, rows, audits, writes } = world();
    await expect(prepareTin(deps, crew, W, { tinType: "ssn", tin: FAKE_SSN, tinConfirm: FAKE_SSN })).rejects.toMatchObject({ status: 403 });
    await expect(prepareTin(deps, adminNoFinance, W, { tinType: "ssn", tin: FAKE_SSN, tinConfirm: FAKE_SSN })).rejects.toMatchObject({ status: 403 });
    const res = await prepareTin(deps, owner, W, { tinType: "ssn", tin: FAKE_SSN, tinConfirm: FAKE_SSN });
    expect(res).toEqual({ tinType: "ssn", tinLast4: "6789" });
    assertNoPlaintextTin(JSON.stringify(rows.get(W)));
    assertNoPlaintextTin(writes.join(""));
    assertNoPlaintextTin(JSON.stringify(audits));
    const view = profileView(rows.get(W)!);
    expect(view.w9).toMatchObject({ status: "prepared", needsSignature: true, onFile: { tinType: "ssn", tinLast4: "6789", source: "owner" } });
    expect(showProfileBanner(rows.get(W)!)).toBe(true);
  });
  it("the worker signs with the number on file without retyping it", async () => {
    const { deps, rows, blobs } = world();
    await prepareTin(deps, owner, W, { tinType: "ssn", tin: FAKE_SSN, tinConfirm: FAKE_SSN });
    const view = await signW9(deps, crew, form({ tinMode: "onFile", tin: undefined, tinConfirm: undefined, tinType: undefined }), ctx);
    expect(view.w9).toMatchObject({ status: "signed", tinLast4: "6789", needsSignature: false });
    for (const b of blobs.values()) assertNoPlaintextTin(b.toString("latin1"));
    assertNoPlaintextTin(JSON.stringify(rows.get(W)));
    assertNoPlaintextTin(logs.join("\n"));
  }, 20000);
  it("a new number entered after signing asks for a new signature", async () => {
    const { deps, rows } = world();
    await signW9(deps, crew, form(), ctx);
    deps.now = () => new Date("2026-10-12T15:00:00Z");
    await prepareTin(deps, owner, W, { tinType: "ein", tin: "12-3456789", tinConfirm: "12-3456789" });
    expect(profileView(rows.get(W)!).w9).toMatchObject({ status: "signed", needsSignature: true, onFile: { source: "owner", tinType: "ein" } });
  }, 20000);
});

describe("profile + requests", () => {
  it("a worker edits their own profile; the owner can edit anyone's; crew cannot edit others", async () => {
    const { deps, rows, audits } = world();
    await saveProfile(deps, crew, W, { legalName: "Kaio Henrique Barbosa Prates", street: "12 Test St", city: "Everett", state: "MA", postalCode: "02149" });
    expect(rows.get(W)).toMatchObject({ name: "Kaio Prates", address: "12 Test St, Everett, MA, 02149" });
    expect(profileView(rows.get(W)!).legalName).toBe("Kaio Henrique Barbosa Prates");
    await saveProfile(deps, owner, W, { phone: "617-555-0100", email: "kaio@example.com" });
    expect(audits.at(-1)?.action).toBe("worker_profile_update_by_owner");
    await expect(saveProfile(deps, other, W, { phone: "617-555-0101" })).rejects.toMatchObject({ status: 403 });
    await expect(saveProfile(deps, crew, W, { postalCode: "abc" })).rejects.toMatchObject({ status: 400 });
    await expect(saveProfile(deps, crew, W, { tin: FAKE_SSN })).rejects.toMatchObject({ status: 400 });
  });
  it("is complete only with contact, address, emergency contact and a signed W-9", async () => {
    const { deps, rows } = world();
    await saveProfile(deps, crew, W, { legalName: "Kaio H B Prates", phone: "617-555-0100", email: "k@example.com", street: "12 Test St", city: "Everett", state: "MA", postalCode: "02149", emergencyName: "Ana", emergencyPhone: "617-555-0199", emergencyRelationship: "Wife" });
    expect(profileComplete(profileView(rows.get(W)!))).toBe(false);
    await signW9(deps, crew, form(), ctx);
    expect(profileComplete(profileView(rows.get(W)!))).toBe(true);
    expect(rosterRow(rows.get(W)!).complete).toBe(true);
    expect(showProfileBanner(rows.get(W)!)).toBe(false);
  }, 20000);
  it("owner requests from all contractors; owners and system accounts are skipped; crew cannot request", async () => {
    const { deps, rows } = world();
    rows.set("x", { id: "x", name: "Helper 1", role: "Helper", active: true });
    await expect(requestProfiles(deps, crew, { all: true })).rejects.toMatchObject({ status: 403 });
    const { requested } = await requestProfiles(deps, owner, { all: true });
    expect(requested.sort()).toEqual([OTHER, W].sort());
    expect(profileView(rows.get(W)!)).toMatchObject({ requestedAt: "2026-10-11T15:00:00.000Z", w9: { status: "requested" } });
  });
});
