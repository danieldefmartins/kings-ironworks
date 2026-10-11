// Fills the official IRS Form W-9 (Rev. March 2024) and signs it. Server-only.
//
// The template is the fillable PDF published at irs.gov/pub/irs-pdf/fw9.pdf,
// vendored unchanged (IRS forms are U.S. Government works — public domain).
// Page 1 is the form; the IRS instruction pages are kept so the worker's copy
// is the complete official document. A final page records the electronic
// signature: who, when, from where, and the consent they gave.
//
// The returned bytes contain the full TIN. Callers encrypt them before they go
// anywhere (see w9-service.ts); they are never written to disk in the clear.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { tinBox, tinDigits, type TinType } from "./tin";
import { W9_FORM_REVISION, W9_JURAT_INTRO, W9_CERT_ITEMS, type W9Classification } from "./w9";

export const W9_TEMPLATE_PATH = path.join(process.cwd(), "src/lib/shop/assets/irs-fw9-rev-2024-03.pdf");
export const W9_TEMPLATE_SHA256 = "2d420cbb4123dcf1fb82595b2359cfbb5d81f00b9df9d359fcc7af361d093f53";

const F = "topmostSubform[0].Page1[0].";
const BOX = `${F}Boxes3a-b_ReadOrder[0].`;
const CLASS_BOX: Record<W9Classification, string> = {
  individual: `${BOX}c1_1[0]`,
  c_corp: `${BOX}c1_1[1]`,
  s_corp: `${BOX}c1_1[2]`,
  partnership: `${BOX}c1_1[3]`,
  trust_estate: `${BOX}c1_1[4]`,
  llc: `${BOX}c1_1[5]`,
  other: `${BOX}c1_1[6]`,
};

export interface W9PdfInput {
  name: string;
  businessName?: string | null;
  classification: W9Classification;
  llcClass?: string | null;
  otherText?: string | null;
  foreignPartners?: boolean;
  exemptPayeeCode?: string | null;
  fatcaCode?: string | null;
  addressLine: string;
  cityStateZip: string;
  requester: string;
  accountNumbers?: string | null;
  tinType: TinType;
  tin: string;
  backupWithholding: boolean;
  signaturePng: Buffer;
  signedAt: Date;
  typedName: string;
  certificate: {
    workerId: string;
    orgName: string;
    ip: string | null;
    userAgent: string | null;
    signatureSha256: string;
    authMethod: string;
    consentText: string;
    preparedBy?: string | null;
  };
}

// Standard PDF fonts only speak WinAnsi. Accented Latin names (João, Muñoz)
// are fine; anything outside is folded to its base letter instead of crashing.
export function pdfSafe(s: string | null | undefined, keepNewlines = false): string {
  return String(s ?? "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/Ł/g, "L").replace(/ł/g, "l").replace(/Đ/g, "D").replace(/đ/g, "d").replace(/Ħ/g, "H").replace(/ħ/g, "h").replace(/ı/g, "i")
    .split("")
    .map(ch => {
      const c = ch.charCodeAt(0);
      if ((c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff)) return ch;
      if (ch === "\n") return keepNewlines ? "\n" : " ";
      const base = ch.normalize("NFD").replace(/\p{M}/gu, "");
      return /^[\x20-\x7e]+$/.test(base) ? base : "";
    })
    .join("");
}

function shopDate(d: Date): string {
  return d.toLocaleDateString("en-US", { timeZone: "America/New_York", month: "2-digit", day: "2-digit", year: "numeric" });
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > width && line) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

function certificatePage(doc: PDFDocument, page: PDFPage, font: PDFFont, bold: PDFFont, input: W9PdfInput, sig: Awaited<ReturnType<PDFDocument["embedPng"]>>) {
  const { width, height } = page.getSize();
  const left = 54;
  const maxW = width - left * 2;
  let y = height - 64;
  const ink = rgb(0.1, 0.1, 0.12);
  const muted = rgb(0.38, 0.38, 0.42);
  page.drawText("Electronic signature record", { x: left, y, size: 18, font: bold, color: ink });
  y -= 20;
  page.drawText(pdfSafe(`Form W-9 (${W9_FORM_REVISION}) - ${input.certificate.orgName}`), { x: left, y, size: 10.5, font, color: muted });
  y -= 30;
  const rows: [string, string][] = [
    ["Signer (line 1)", input.name],
    ["Typed legal signature", input.typedName],
    ["Signed", `${input.signedAt.toISOString()} (UTC) - ${shopDate(input.signedAt)} Eastern`],
    ["Authentication", input.certificate.authMethod],
    ["Worker ID", input.certificate.workerId],
    ["IP address", input.certificate.ip || "not available"],
    ["Device", input.certificate.userAgent || "not available"],
    ["Signature image SHA-256", input.certificate.signatureSha256],
    ["Item 2 crossed out", input.backupWithholding ? "Yes - signer reported being subject to backup withholding" : "No"],
  ];
  if (input.certificate.preparedBy) rows.push(["TIN entered by", `${input.certificate.preparedBy} (owner); confirmed and signed by the signer`]);
  for (const [k, v] of rows) {
    page.drawText(k, { x: left, y, size: 9.5, font: bold, color: muted });
    const lines = wrap(pdfSafe(v), font, 10, maxW - 150);
    lines.forEach((l, i) => page.drawText(l, { x: left + 150, y: y - i * 13, size: 10, font, color: ink }));
    y -= Math.max(1, lines.length) * 13 + 7;
  }
  y -= 10;
  page.drawText("Consent to sign electronically", { x: left, y, size: 11, font: bold, color: ink });
  y -= 15;
  for (const l of wrap(pdfSafe(input.certificate.consentText), font, 9.5, maxW)) {
    page.drawText(l, { x: left, y, size: 9.5, font, color: ink });
    y -= 12.5;
  }
  y -= 12;
  page.drawText("Perjury statement accepted (as on the paper form)", { x: left, y, size: 11, font: bold, color: ink });
  y -= 15;
  const jurat = [W9_JURAT_INTRO, ...W9_CERT_ITEMS.map((s, i) => `${i + 1}. ${s}${i === 1 && input.backupWithholding ? " [CROSSED OUT BY SIGNER]" : ""}`)];
  for (const para of jurat) {
    for (const l of wrap(pdfSafe(para), font, 9.5, maxW)) {
      page.drawText(l, { x: left, y, size: 9.5, font, color: ink });
      y -= 12.5;
    }
    y -= 3;
  }
  y -= 16;
  const sw = 210, sh = sw / 3;
  page.drawImage(sig, { x: left, y: y - sh, width: sw, height: sh });
  page.drawLine({ start: { x: left, y: y - sh - 2 }, end: { x: left + 260, y: y - sh - 2 }, thickness: 0.6, color: muted });
  page.drawText(pdfSafe(`Signature of U.S. person - ${input.typedName} - ${shopDate(input.signedAt)}`), { x: left, y: y - sh - 14, size: 9, font, color: muted });
  page.drawText("Generated by the shop system. The signed form is stored encrypted (AES-256-GCM); access is limited and logged.", { x: left, y: 40, size: 8, font, color: muted });
}

export async function buildW9Pdf(input: W9PdfInput, template?: Buffer): Promise<Buffer> {
  const bytes = template ?? (await readFile(W9_TEMPLATE_PATH));
  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const set = (name: string, value: string | null | undefined) => {
    const v = pdfSafe(value, true).trim();
    if (v) form.getTextField(name).setText(v);
  };

  set(`${F}f1_01[0]`, input.name);
  set(`${F}f1_02[0]`, input.businessName);
  form.getCheckBox(CLASS_BOX[input.classification]).check();
  if (input.classification === "llc") set(`${BOX}f1_03[0]`, input.llcClass);
  if (input.classification === "other") set(`${BOX}f1_04[0]`, input.otherText);
  if (input.foreignPartners) form.getCheckBox(`${BOX}c1_2[0]`).check();
  set(`${F}f1_05[0]`, input.exemptPayeeCode);
  set(`${F}f1_06[0]`, input.fatcaCode);
  set(`${F}Address_ReadOrder[0].f1_07[0]`, input.addressLine);
  set(`${F}Address_ReadOrder[0].f1_08[0]`, input.cityStateZip);
  const requester = form.getTextField(`${F}f1_09[0]`);
  requester.enableMultiline();
  requester.setFontSize(8);
  set(`${F}f1_09[0]`, input.requester);
  set(`${F}f1_10[0]`, input.accountNumbers);

  const d = tinDigits(input.tin);
  if (tinBox(input.tinType) === "ein") {
    set(`${F}f1_14[0]`, d.slice(0, 2));
    set(`${F}f1_15[0]`, d.slice(2));
  } else {
    set(`${F}f1_11[0]`, d.slice(0, 3));
    set(`${F}f1_12[0]`, d.slice(3, 5));
    set(`${F}f1_13[0]`, d.slice(5));
  }

  form.updateFieldAppearances(font);
  form.flatten();

  const page = doc.getPage(0);
  const ink = rgb(0.05, 0.05, 0.1);
  // Part II item 2, struck through when the signer is subject to backup withholding.
  if (input.backupWithholding) {
    for (const [y, x2] of [[306.5, 566], [296.8, 576], [287.2, 210]] as const) {
      page.drawLine({ start: { x: 36, y }, end: { x: x2, y }, thickness: 0.9, color: ink });
    }
  }
  // "Sign Here": signature between the label and "Date", date after it.
  const sig = await doc.embedPng(input.signaturePng);
  const sw = 96, sh = sw / 3;
  page.drawImage(sig, { x: 175, y: 193, width: sw, height: sh });
  const typed = pdfSafe(`/s/ ${input.typedName}`);
  page.drawText(typed, { x: 278, y: 196, size: Math.min(7.5, 104 / font.widthOfTextAtSize(typed, 1)), font, color: ink });
  page.drawText(shopDate(input.signedAt), { x: 406, y: 196, size: 10, font, color: ink });

  certificatePage(doc, doc.addPage([612, 792]), font, bold, input, sig);

  doc.setTitle(`Form W-9 - ${pdfSafe(input.name)}`);
  doc.setSubject(`Form W-9 (${W9_FORM_REVISION}) signed electronically`);
  doc.setProducer("KIW Shop");
  doc.setCreator("KIW Shop");
  doc.setCreationDate(input.signedAt);
  doc.setModificationDate(input.signedAt);
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}
