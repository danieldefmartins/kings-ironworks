import { describe, expect, it } from "vitest";
import {
  PRICE_REMOVED, redactMoney, isApprovalMessage, stripQuotedReply, customerNoteBody,
  planGhlImports, onlyNew, isImportableImage, mayBeImage, contactMatchesJob, phoneDigits,
  isLikelySignatureImage, importStoragePath, addressesIn, storageExt,
} from "./customer-files";
import { partitionJobAttachments, type Photo } from "./shared";

describe("redactMoney", () => {
  it.each([
    ["Total is $4,500 for both", "4,500"],
    ["We can do $ 1250.50 today", "1250"],
    ["ok with 5k", "5k"],
    ["about 12.5K right", "12.5"],
    ["2 thousand is fine", "2 thousand"],
    ["send 300 dollars now", "300"],
    ["50% deposit", "50"],
    ["the deposit is 1200 right?", "1200"],
    ["balance of 3,000 after install", "3,000"],
    ["o valor é 4500 reais", "4500"],
    ["el precio 900", "900"],
    ["R$ 500 de entrada", "500"],
    ["quote was 7800 and deposit 3900", "3900"],
  ])("removes money from %j", (text, secret) => {
    const out = redactMoney(text);
    expect(out).not.toContain(secret);
    expect(out).toContain(PRICE_REMOVED);
  });
  it("keeps measurements and ordinary words", () => {
    expect(redactMoney("Rail at 36 inches, 3 posts, 42 ft run. Option B please")).toBe("Rail at 36 inches, 3 posts, 42 ft run. Option B please");
  });
  it("collapses neighbouring removals", () => {
    expect(redactMoney("$4,500 / $5,000")).toBe(PRICE_REMOVED);
  });
});

describe("isApprovalMessage", () => {
  it.each([
    "We approve the design you sent",
    "Approved! Go ahead",
    "Let's do option B",
    "we'll go with the second one",
    "I like this one",
    "Signed it this morning",
    "Pode fazer, aprovado",
    "Gostei da opção A",
    "Vamos con la opción 2, me gusta",
    "Aprobado, adelante",
  ])("detects %j", (t) => expect(isApprovalMessage(t)).toBe(true));
  it.each(["Okay thanks!", "What time tomorrow?", "124 high rock lane Westwood", "", null])("ignores %j", (t) => expect(isApprovalMessage(t)).toBe(false));
});

describe("notes", () => {
  it("drops the quoted thread and money", () => {
    const body = "We'd like option A, the deposit is $2,000.\n\nOn Tue, Oct 6, 2026 at 5:59 PM Kings Iron works <info@kingsironworks.com> wrote:\n> Total $9,000";
    expect(stripQuotedReply(body)).toBe("We'd like option A, the deposit is $2,000.");
    const note = customerNoteBody(body, { stripQuotes: true });
    expect(note).not.toMatch(/2,000|9,000/);
    expect(note).toContain("option A");
  });
});

describe("planGhlImports", () => {
  const msgs = [
    { id: "m1", direction: "inbound", messageType: "TYPE_SMS", body: "Here is the railing we like", attachments: ["https://cdn.x/abc/photo.jpg?tok=1", "https://cdn.x/abc/estimate.pdf", "https://cdn.x/abc/noext"] },
    { id: "m2", direction: "outbound", messageType: "TYPE_EMAIL", body: "Approved estimate total $9,000", attachments: ["https://cdn.x/our/estimate.png"] },
    { id: "m3", direction: "inbound", messageType: "TYPE_SMS", body: "Approved, deposit $2,500 sent", attachments: ["https://cdn.x/abc/photo.jpg?tok=2"] },
    { id: "m4", direction: "inbound", messageType: "TYPE_SMS", body: "Yes!", attachments: [] },
  ];
  const plan = planGhlImports(msgs);
  it("imports inbound images only, skipping PDFs and outbound attachments", () => {
    expect(plan.images.map((i) => i.url)).toEqual(["https://cdn.x/abc/photo.jpg?tok=1", "https://cdn.x/abc/noext"]);
  });
  it("dedupes the same attachment URL with a new token", () => {
    expect(plan.images.filter((i) => i.sourceRef === "ghl:https://cdn.x/abc/photo.jpg")).toHaveLength(1);
  });
  it("keeps inbound approval notes with money removed, never outbound ones", () => {
    expect(plan.notes.map((n) => n.sourceRef)).toEqual(["ghl:m1", "ghl:m3"]);
    expect(plan.notes[1].body).not.toContain("2,500");
    expect(JSON.stringify(plan)).not.toContain("9,000");
  });
  it("onlyNew skips refs already stored and repeats", () => {
    const c = [{ sourceRef: "a" }, { sourceRef: "b" }, { sourceRef: "b" }, { sourceRef: "c" }];
    expect(onlyNew(c, ["a", null]).map((x) => x.sourceRef)).toEqual(["b", "c"]);
  });
});

describe("attachment filtering", () => {
  it("accepts images by type or extension and rejects PDFs/SVG", () => {
    expect(isImportableImage({ name: "a.jpg", contentType: "application/octet-stream" })).toBe(true);
    expect(isImportableImage({ name: "x", contentType: "image/heic" })).toBe(true);
    expect(isImportableImage({ name: "est.pdf", contentType: "image/png" })).toBe(false);
    expect(isImportableImage({ name: "a.png", contentType: "application/pdf" })).toBe(false);
    expect(isImportableImage({ name: "logo.svg", contentType: "image/svg+xml" })).toBe(false);
    expect(isImportableImage({ name: "notes.docx", contentType: "" })).toBe(false);
    expect(mayBeImage("https://x/y/file.PDF")).toBe(false);
    expect(storageExt({ name: "IMG.HEIC", contentType: "" })).toBe("heic");
    expect(storageExt({ name: "x", contentType: "image/jpeg" })).toBe("jpg");
  });
  it("skips signature-sized images", () => {
    expect(isLikelySignatureImage("image001.png", 40_000)).toBe(true);
    expect(isLikelySignatureImage("IMG_2231.jpg", 8_000)).toBe(true);
    expect(isLikelySignatureImage("IMG_2231.jpg", 900_000)).toBe(false);
  });
  it("storage paths are deterministic per source ref", () => {
    expect(importStoragePath("j", "ghl", "ref-1", "jpg")).toBe(importStoragePath("j", "ghl", "ref-1", "jpg"));
    expect(importStoragePath("j", "ghl", "ref-1", "jpg")).not.toBe(importStoragePath("j", "ghl", "ref-2", "jpg"));
  });
});

describe("contact matching", () => {
  const job = { phone: "(857) 636-1308", email: "ESMcVittie@comcast.net " };
  it("matches exact phone digits or email, never names", () => {
    expect(phoneDigits("+1 857-636-1308")).toBe("8576361308");
    expect(contactMatchesJob({ phone: "+18576361308" }, job)).toBe(true);
    expect(contactMatchesJob({ email: "esmcvittie@comcast.net" }, job)).toBe(true);
    expect(contactMatchesJob({ phone: "+18576361309", email: "other@x.com" }, job)).toBe(false);
    expect(contactMatchesJob({ phone: "", email: "" }, { phone: null, email: null })).toBe(false);
    expect(contactMatchesJob({ additionalEmails: ["esmcvittie@comcast.net"] }, job)).toBe(true);
  });
  it("reads addresses from headers", () => {
    expect(addressesIn('"Rachel M" <Rachel@Gmail.com>, b@y.org')).toEqual(["rachel@gmail.com", "b@y.org"]);
  });
});

describe("crew attachment payloads", () => {
  const row = (id: string, category: string, review_status?: Photo["review_status"], extra: Partial<Photo> = {}) =>
    ({ id, url: `job/${id}.jpg`, category, kind: "image", review_status, ...extra } as Photo);
  const rows = [
    row("app", "Existing"),
    row("kept", "Customer Photos", "approved", { source: "ghl", source_ref: "ghl:https://x", source_note: "GoHighLevel sms" }),
    row("pending", "Customer Photos", "pending", { source: "email" }),
    row("rejected", "Customer Photos", "rejected", { source: "email" }),
    row("price", "Approved Estimate"),
  ];
  it("crew get approved, non-price photos only, without import metadata", () => {
    const crew = partitionJobAttachments(rows, false);
    expect(crew.photos.map((p) => p.id)).toEqual(["app", "kept"]);
    expect(crew.pending).toEqual([]);
    expect(crew.photos[1].source_ref).toBeNull();
    expect(crew.photos[1].source_note).toBeNull();
  });
  it("owners get pending separately and never see rejected", () => {
    const owner = partitionJobAttachments(rows, true);
    expect(owner.photos.map((p) => p.id)).toEqual(["app", "kept", "price"]);
    expect(owner.pending.map((p) => p.id)).toEqual(["pending"]);
  });
});
