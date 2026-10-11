// @vitest-environment node
import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buildW9Pdf, pdfSafe, W9_TEMPLATE_PATH, W9_TEMPLATE_SHA256 } from "./w9-pdf";
import { sha256Hex } from "./w9-crypto";
import { readFileSync } from "node:fs";
import { FAKE_SSN, signaturePng } from "./w9.fixture";

const base = {
  name: "Kaio Henrique Barbosa Prates",
  classification: "individual" as const,
  addressLine: "12 Test St, Apt 2",
  cityStateZip: "Everett, MA 02149",
  requester: "TEST IRON WORKS\n69 Norman St, Unit 20, Everett, MA 02149",
  tinType: "ssn" as const,
  tin: FAKE_SSN,
  backupWithholding: false,
  signaturePng: signaturePng(),
  signedAt: new Date("2026-10-11T18:00:00Z"),
  typedName: "Kaio Henrique Barbosa Prates",
  certificate: { workerId: "w1", orgName: "TEST IRON WORKS", ip: "203.0.113.5", userAgent: "UA", signatureSha256: "ab", authMethod: "PIN", consentText: "I agree." },
};

describe("W-9 PDF", () => {
  it("uses the unmodified official IRS template", () => {
    expect(sha256Hex(readFileSync(W9_TEMPLATE_PATH))).toBe(W9_TEMPLATE_SHA256);
  });

  it("fills the official form, flattens it, and appends the signature record", async () => {
    const bytes = await buildW9Pdf(base);
    if (process.env.W9_PDF_OUT) writeFileSync(process.env.W9_PDF_OUT, bytes);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(7);
    expect(doc.getForm().getFields()).toHaveLength(0); // flattened: nobody can edit the TIN afterwards
    expect(doc.getTitle()).toContain("Kaio");
  }, 20000);

  it("handles EIN, LLC, other and item 2 crossed out", async () => {
    const bytes = await buildW9Pdf({ ...base, classification: "llc", llcClass: "P", foreignPartners: true, tinType: "ein", tin: "12-3456789", backupWithholding: true, businessName: "Prates Welding LLC" });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(7);
    const other = await buildW9Pdf({ ...base, classification: "other", otherText: "Cooperative" });
    expect(other.length).toBeGreaterThan(1000);
  }, 20000);

  it("never crashes on names the standard fonts cannot draw", () => {
    expect(pdfSafe("João Muñoz")).toBe("João Muñoz");
    expect(pdfSafe("Łukasz “Ł” Ćwik")).toBe("Lukasz \"L\" Cwik");
    expect(pdfSafe("王 Li")).toBe(" Li");
  });
});
