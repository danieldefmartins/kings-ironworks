// Customer files — the rules for turning what a customer sent us (texts and
// emails with photos, "we'll go with option B") into material the crew can
// look at. Pure functions only: no env, no fetch, no imports. Shared by the
// shop server (GoHighLevel importer), client components (category lists) and
// the Mac mini mail importer (scripts/mail-import, run by Node with type
// stripping), so keep the syntax erasable — no enums, no namespaces.
//
// THE RULE: crew never see prices. Outbound messages are skipped entirely
// (they are usually our estimates, with prices), PDFs are never imported, and
// every note is run through redactMoney before it is stored.

export const CUSTOMER_PHOTO_CATEGORY = "Customer Photos";

// What an owner can file an imported image under when keeping it.
export const KEEP_CATEGORIES = [CUSTOMER_PHOTO_CATEGORY, "Design", "Inspiration", "Existing"] as const;

// The traveler's "Customer & approved design" section shows these.
export const CREW_REFERENCE_CATEGORIES: readonly string[] = [CUSTOMER_PHOTO_CATEGORY, "Design", "Inspiration"];

export type ReviewStatus = "pending" | "approved" | "rejected";

export const IMAGE_EXTS = ["jpg", "jpeg", "png", "heic", "heif", "webp", "gif"];

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", heic: "image/heic",
  heif: "image/heif", webp: "image/webp", gif: "image/gif",
};

/** Lower-case extension of a file name or URL (query/fragment ignored), or "". */
export function extOf(nameOrUrl: string): string {
  const path = nameOrUrl.split(/[?#]/)[0];
  const last = path.split("/").pop() || "";
  const m = /\.([a-z0-9]{1,5})$/i.exec(last);
  return m ? m[1].toLowerCase() : "";
}

export function mimeForExt(ext: string): string | null {
  return MIME_BY_EXT[ext.toLowerCase()] || null;
}

/** True when a name/URL is not obviously something other than an image. */
export function mayBeImage(nameOrUrl: string): boolean {
  const ext = extOf(nameOrUrl);
  return ext === "" || IMAGE_EXTS.includes(ext);
}

/**
 * Decide from what we know about a downloaded file whether it is an image we
 * import. PDFs (estimates, invoices — prices) and everything else are skipped.
 */
export function isImportableImage(file: { name?: string | null; contentType?: string | null }): boolean {
  const ct = (file.contentType || "").toLowerCase().split(";")[0].trim();
  const ext = extOf(file.name || "");
  if (ct === "application/pdf" || ext === "pdf") return false;
  if (ct.startsWith("image/")) return ct !== "image/svg+xml";
  // application/octet-stream and friends: trust a real image extension.
  return IMAGE_EXTS.includes(ext);
}

/** Pick a file extension for storage from the type, falling back to the name. */
export function storageExt(file: { name?: string | null; contentType?: string | null }): string {
  const ct = (file.contentType || "").toLowerCase().split(";")[0].trim();
  for (const [ext, mime] of Object.entries(MIME_BY_EXT)) if (mime === ct) return ext === "jpeg" ? "jpg" : ext;
  const ext = extOf(file.name || "");
  return IMAGE_EXTS.includes(ext) ? ext : "jpg";
}

// Email signatures carry little logos and social icons; a customer photo is
// never this small.
export const MIN_EMAIL_IMAGE_BYTES = 15_000;

export function isLikelySignatureImage(name: string, bytes: number): boolean {
  if (bytes < MIN_EMAIL_IMAGE_BYTES) return true;
  return bytes < 60_000 && /^(image\d{3}\.|outlook-|logo|signature|facebook|instagram|linkedin|twitter)/i.test(name);
}

// ---- Money redaction --------------------------------------------------------

export const PRICE_REMOVED = "[price removed]";

const NUM = String.raw`\d[\d,]*(?:\.\d+)?`;
const MONEY_WORDS = "price|prices|pricing|priced|cost|costs|deposit|total|balance|payment|payments|pay|paid|quote|quoted|amount|invoice|budget|preço|preco|valor|custo|sinal|entrada|pagamento|orçamento|orcamento|precio|costo|depósito|deposito|saldo|pago|presupuesto";

const RX_CURRENCY = new RegExp(String.raw`(?:US\$|R\$|USD\s?|\$)\s?${NUM}(?:\s?(?:k|mil|thousand|grand)\b)?|${NUM}\s?\$`, "gi");
const RX_NUM_MONEY_WORD = new RegExp(String.raw`\b${NUM}\s?(?:k\b|thousand\b|grand\b|dollars?\b|bucks\b|usd\b|reais\b|d[óo]lares\b|mil\b)`, "gi");
const RX_PERCENT = new RegExp(String.raw`\b\d+(?:[.,]\d+)?\s?%`, "g");
const RX_KEYWORD_NUM = new RegExp(String.raw`(^|[^\p{L}])(${MONEY_WORDS})(?![\p{L}])([^\d\n.!?]{0,30}?)(${NUM})`, "giu");
const RX_REPEAT = /\[price removed\](?:[\s,/-]*(?:and|or|e|y|\+)?[\s,/-]*\[price removed\])+/gi;

/**
 * Strip money from customer-written text: "$4,500", "5k", "2 thousand",
 * "50%", "the deposit is 1200" all become "[price removed]". Errs toward
 * removing too much — a fabricator loses nothing by not seeing a number next
 * to the word "total".
 */
export function redactMoney(text: string): string {
  let s = text.replace(RX_CURRENCY, PRICE_REMOVED);
  s = s.replace(RX_NUM_MONEY_WORD, PRICE_REMOVED);
  s = s.replace(RX_PERCENT, PRICE_REMOVED);
  // Run twice: "total 4500 and deposit 2000" has two keyword/number pairs and
  // the regex consumes the gap between them.
  for (let i = 0; i < 2; i++) s = s.replace(RX_KEYWORD_NUM, (_m, pre, word, mid) => `${pre}${word}${mid}${PRICE_REMOVED}`);
  return s.replace(RX_REPEAT, PRICE_REMOVED);
}

// ---- Approval / selection language -----------------------------------------

function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’`]/g, "'");
}

// Matched against accent-folded, lower-cased text.
const APPROVAL_PATTERNS: RegExp[] = [
  // English
  /\bapprov(e|ed|es|ing|al)\b/,
  /\baccept(ed|s|ing)?\b/,
  /\bgo(ing)? ahead\b/,
  /\b(go|going|went) with\b/,
  /\blet'?s (do|go with|move forward|proceed)\b/,
  /\b(move|moving) forward\b/,
  /\boption\s*#?\s*([a-d]|[1-4]|one|two|three)\b/,
  /\b(i|we) (really )?(like|love|prefer)\b/,
  /\b(chosen|choose|chose|picked|pick|selected)\b/,
  /\bsigned\b|\bsign(ed)? (it|the (estimate|proposal|contract|agreement))\b/,
  // "design" alone is everywhere in a GC thread; it counts when it is chosen.
  /\b(like|love|approve|chose|choose|prefer|go with|this|that|the) (\w+ )?designs?\b/,
  /\bthis one\b/,
  // Portuguese
  /\baprova(do|da|dos|r|mos)?\b|\baprovo\b/,
  /\baceit(o|amos|ei|ado|a)\b/,
  /\bpode (fazer|seguir|mandar ver|comecar)\b/,
  /\bvamos (fazer|com|fechar|seguir)\b/,
  /\bopcao\s*([a-d]|[1-4])\b/,
  /\b(eu |nos )?(gostei|gostamos|adorei)\b/,
  /\bescolh(i|emos|ido|ida)\b/,
  /\bassin(ado|ada|ei|amos)\b/,
  /\bdesenho\b/,
  /\b(esse|este|essa|esta) (aqui|mesmo|mesma)\b/,
  /\bfechado\b/,
  // Spanish
  /\baprob(ado|ada|amos)\b|\bapruebo\b/,
  /\bacept(o|amos|ado)\b/,
  /\badelante\b/,
  /\bvamos con\b/,
  /\bopcion\s*([a-d]|[1-4])\b/,
  /\bme gusta(n)?\b|\bnos gusta(n)?\b/,
  /\b(elegi|elegimos|elegido|escogi|escogimos)\b/,
  /\bfirm(ado|e|amos)\b/,
  /\bdiseno\b/,
  /\b(este|esta) (aqui|mismo|misma)\b/,
];

/** Does this customer message read like an approval or a design choice? */
export function isApprovalMessage(text: string | null | undefined): boolean {
  if (!text) return false;
  // The decision is in the first lines of a message, not in a long thread.
  const t = fold(text.slice(0, 1500));
  return APPROVAL_PATTERNS.some((rx) => rx.test(t));
}

/** Drop the quoted thread below a reply so only what the customer wrote remains. */
export function stripQuotedReply(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    const l = line.trim();
    if (/^(on|em|el) .{4,200}(wrote|escreveu|escribio|escribió):?$/i.test(l)) break;
    if (/^-{2,}\s*(original message|mensagem original|mensaje original|forwarded message)/i.test(l)) break;
    if (/^(from|de):\s.+@/i.test(l) && out.length > 0) break;
    if (l === "--" || l === "-- ") break;
    if (/^sent from my (iphone|ipad|android)/i.test(l) || /^enviado do meu/i.test(l)) break;
    if (l.startsWith(">")) continue;
    out.push(line);
  }
  return out.join("\n").trim();
}

export const MAX_NOTE_CHARS = 1200;

/** The stored form of a customer note: quoted thread dropped, money removed, tidy. */
export function customerNoteBody(text: string, opts: { stripQuotes?: boolean } = {}): string {
  const base = opts.stripQuotes ? stripQuotedReply(text) : text;
  const clean = redactMoney(base)
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return clean.length > MAX_NOTE_CHARS ? `${clean.slice(0, MAX_NOTE_CHARS - 1)}…` : clean;
}

// ---- Matching ---------------------------------------------------------------

/** Last ten digits of a phone number, or "" when there are fewer than ten. */
export function phoneDigits(phone: string | null | undefined): string {
  const d = (phone || "").replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : "";
}

export function normalizeEmail(email: string | null | undefined): string {
  return (email || "").trim().toLowerCase();
}

/** Every address in a header value like `"A" <a@x.com>, b@y.com`. */
export function addressesIn(header: string | null | undefined): string[] {
  return Array.from((header || "").matchAll(/[A-Z0-9._%+'-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi), (m) => m[0].toLowerCase());
}

/** Exact contact match on phone digits or email — never on names. */
export function contactMatchesJob(
  contact: { phone?: string | null; email?: string | null; additionalEmails?: (string | null)[] | null; additionalPhones?: (string | null)[] | null },
  job: { phone?: string | null; email?: string | null },
): boolean {
  const jp = phoneDigits(job.phone);
  const je = normalizeEmail(job.email);
  const phones = [contact.phone, ...(contact.additionalPhones || [])].map(phoneDigits).filter(Boolean);
  const emails = [contact.email, ...(contact.additionalEmails || [])].map(normalizeEmail).filter(Boolean);
  return (!!jp && phones.includes(jp)) || (!!je && emails.includes(je));
}

// ---- Planning an import -----------------------------------------------------

export interface GhlMessage {
  id: string;
  dateAdded?: string | null;
  direction?: string | null;
  messageType?: string | null;
  body?: string | null;
  attachments?: (string | null)[] | null;
}

export interface ImageCandidate {
  sourceRef: string;
  url: string;
  at: string | null;
  note: string;
}

export interface NoteCandidate {
  sourceRef: string;
  body: string;
  at: string | null;
  direction: "inbound";
}

/** A stable reference for a GHL attachment: the URL without its query string. */
export function ghlAttachmentRef(url: string): string {
  return `ghl:${url.split("?")[0]}`;
}

/**
 * From a GHL conversation, what to import: images the CUSTOMER sent (never
 * outbound — those are our estimates, with prices) and inbound texts that read
 * like approvals. Nothing here is visible to the crew until an owner keeps it.
 */
export function planGhlImports(messages: GhlMessage[]): { images: ImageCandidate[]; notes: NoteCandidate[] } {
  const images: ImageCandidate[] = [];
  const notes: NoteCandidate[] = [];
  const seen = new Set<string>();
  for (const m of messages) {
    if ((m.direction || "").toLowerCase() !== "inbound") continue;
    const kind = (m.messageType || "").replace(/^TYPE_/, "").toLowerCase();
    for (const url of m.attachments || []) {
      if (!url || !/^https?:\/\//i.test(url) || !mayBeImage(url)) continue;
      const ref = ghlAttachmentRef(url);
      if (seen.has(ref)) continue;
      seen.add(ref);
      images.push({ sourceRef: ref, url, at: m.dateAdded || null, note: `GoHighLevel ${kind || "message"}` });
    }
    const body = (m.body || "").trim();
    if (body && isApprovalMessage(body)) {
      const isEmail = kind === "email";
      const clean = customerNoteBody(isEmail ? body.replace(/<[^>]+>/g, " ") : body, { stripQuotes: isEmail });
      if (clean) notes.push({ sourceRef: `ghl:${m.id}`, body: clean, at: m.dateAdded || null, direction: "inbound" });
    }
  }
  return { images, notes };
}

/** Candidates whose source reference is not already stored for the job. */
export function onlyNew<T extends { sourceRef: string }>(candidates: T[], existingRefs: Iterable<string | null | undefined>): T[] {
  const have = new Set<string>();
  for (const r of existingRefs) if (r) have.add(r);
  const out: T[] = [];
  for (const c of candidates) {
    if (have.has(c.sourceRef)) continue;
    have.add(c.sourceRef);
    out.push(c);
  }
  return out;
}

/** Deterministic storage key for an imported file, so a retry overwrites instead of duplicating. */
export function importStoragePath(jobId: string, source: string, sourceRef: string, ext: string): string {
  let h = 2166136261;
  for (let i = 0; i < sourceRef.length; i++) {
    h ^= sourceRef.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${jobId}/${source}-${(h >>> 0).toString(36)}-${sourceRef.length.toString(36)}.${ext}`;
}
