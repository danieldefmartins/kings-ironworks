#!/usr/bin/env node
// KIW mailbox → shop job customer files. Runs ON THE MAC MINI (launchd, every
// 30 min), where Apple Mail keeps info@kingsironworks.com synced locally.
//
// For every active shop job with an email, finds INBOUND messages (not from
// @kingsironworks.com) where the job's address is the sender or on To/Cc, and
// imports, as PENDING for an owner to review:
//   - image attachments → kiw_shop_photos (category "Customer Photos")
//   - approval / design-choice text → kiw_shop_customer_notes, money redacted
// Outbound mail is never read for imports (our estimates carry prices); PDFs
// are never imported. Same rules as the in-app GoHighLevel importer — they
// live in src/lib/shop/customer-files.ts and are imported directly (Node
// strips the TypeScript types).
//
//   node import-mail.mjs --env ~/Projects/tavvy-review-agent/.env [--dry-run]
//        [--mail-root <Mail account dir>] [--state <file>] [--folders "All Mail"]
//
// Needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the env file. Never commit it.

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { homedir, tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { readEmlx, readEmlxHeaders } from "./emlx.mjs";
import {
  CUSTOMER_PHOTO_CATEGORY,
  addressesIn,
  customerNoteBody,
  importStoragePath,
  isApprovalMessage,
  isImportableImage,
  isLikelySignatureImage,
  mimeForExt,
  extOf,
  redactMoney,
  stripQuotedReply,
  storageExt,
} from "../../src/lib/shop/customer-files.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_MAIL_ROOT = join(homedir(), "Library/Mail/V10/989E6E2D-53C2-4E97-9626-7FFC6DAAD4F5");
const OUR_DOMAIN = "kingsironworks.com";
const PHOTO_BUCKET = "kiw-shop-photos";
const DEFAULT_ORG = "a0000000-0000-4000-8000-000000000001";
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const REPEATED_IMAGE_MESSAGES = 3;

export function parseArgs(argv) {
  const a = { env: null, mailRoot: DEFAULT_MAIL_ROOT, state: join(HERE, "state.json"), dryRun: false, folders: ["[Gmail].mbox/All Mail.mbox"] };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--env") a.env = argv[++i];
    else if (k === "--mail-root") a.mailRoot = argv[++i];
    else if (k === "--state") a.state = argv[++i];
    else if (k === "--dry-run") a.dryRun = true;
    else if (k === "--folders") a.folders = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
  }
  return a;
}

export function readEnvFile(path) {
  const out = {};
  for (const line of readFileSync(path.replace(/^~/, homedir()), "utf8").split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return out;
}

/** Is this message one the customer sent us, about this job? */
export function inboundMatch(h, jobEmails) {
  const from = addressesIn(h.from);
  if (!from.length || from.some((a) => a.endsWith(`@${OUR_DOMAIN}`))) return false;
  const everyone = new Set([...from, ...addressesIn(h.to), ...addressesIn(h.cc), ...addressesIn(h.replyTo)]);
  return jobEmails.some((e) => everyone.has(e));
}

function* emlxFiles(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "Attachments") yield* emlxFiles(p); }
    else if (e.name.endsWith(".emlx")) yield p;
  }
}

function loadState(path) {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return { index: {}, done: {} }; }
}

/** Header index of the mailbox, refreshed only for new or changed files. */
export function refreshIndex(state, roots) {
  const live = new Set();
  let added = 0;
  for (const root of roots) {
    for (const p of emlxFiles(root)) {
      live.add(p);
      let st;
      try { st = statSync(p); } catch { continue; }
      const cur = state.index[p];
      if (cur && cur.m === st.mtimeMs && cur.s === st.size) continue;
      try {
        const h = readEmlxHeaders(p);
        state.index[p] = { m: st.mtimeMs, s: st.size, id: h.messageId, f: h.from, t: h.to, c: h.cc, r: h.replyTo };
        added++;
      } catch { /* unreadable: retry next run */ }
    }
  }
  for (const p of Object.keys(state.index)) if (!live.has(p)) delete state.index[p];
  return added;
}

function makeDb(env, org) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from env file");
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  async function rest(path, init = {}) {
    const res = await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...headers, "Content-Type": "application/json", ...(init.headers || {}) } });
    const text = await res.text();
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : null;
  }
  return {
    org,
    jobs: () => rest(`kiw_shop_jobs?select=id,job_number,email&org_id=eq.${org}&archived=eq.false&email=not.is.null`),
    schemaReady: async () => {
      try { await rest(`kiw_shop_customer_notes?select=id&limit=1`); await rest(`kiw_shop_photos?select=source_ref,review_status&limit=1`); return true; } catch { return false; }
    },
    refs: async (jobId) => {
      const [p, n] = await Promise.all([
        rest(`kiw_shop_photos?select=source_ref&org_id=eq.${org}&job_id=eq.${jobId}&source_ref=not.is.null`),
        rest(`kiw_shop_customer_notes?select=source_ref&org_id=eq.${org}&job_id=eq.${jobId}`),
      ]);
      return new Set([...p, ...n].map((r) => r.source_ref));
    },
    upload: async (path, bytes, contentType) => {
      const res = await fetch(`${url}/storage/v1/object/${PHOTO_BUCKET}/${encodeURI(path)}`, {
        method: "POST", headers: { ...headers, "Content-Type": contentType, "x-upsert": "true" }, body: bytes,
      });
      if (!res.ok) throw new Error(`Storage ${res.status}: ${(await res.text()).slice(0, 200)}`);
    },
    insert: (table, rows) => rest(`${table}?on_conflict=org_id,job_id,source_ref`, {
      method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=representation" }, body: JSON.stringify(rows),
    }),
    audit: (detail) => rest("kiw_shop_audit", { method: "POST", body: JSON.stringify({ org_id: org, worker_id: null, action: "customer_import_email", entity: "job", detail }) }),
  };
}

/** HEIC → JPEG with macOS `sips`, so every browser can show it. */
function heicToJpeg(bytes) {
  const dir = mkdtempSync(join(tmpdir(), "kiw-heic-"));
  try {
    const src = join(dir, "in.heic");
    const out = join(dir, "out.jpg");
    writeFileSync(src, bytes);
    execFileSync("/usr/bin/sips", ["-s", "format", "jpeg", src, "--out", out], { stdio: "ignore", timeout: 60000 });
    return readFileSync(out);
  } catch {
    return null;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** What one message contributes to one job (pure apart from reading the file). */
export function planMessage(msg) {
  const id = msg.messageId || "";
  const images = [];
  for (const f of msg.files) {
    if (!f.bytes || f.bytes.length > MAX_IMAGE_BYTES) continue;
    const contentType = f.contentType || mimeForExt(extOf(f.name)) || "";
    if (!isImportableImage({ name: f.name, contentType })) continue;
    if (isLikelySignatureImage(f.name, f.bytes.length)) continue;
    // Keyed by content, not by message: the same photo forwarded or quoted in
    // three replies is one photo to review.
    const hash = createHash("sha1").update(f.bytes).digest("hex");
    images.push({ sourceRef: `email:sha1:${hash}`, hash, name: f.name, contentType, bytes: f.bytes, messageId: id });
  }
  const own = stripQuotedReply(msg.text || "");
  const note = own && isApprovalMessage(own) ? customerNoteBody(own) : "";
  return { images, note: note ? { sourceRef: `email:${id}`, body: note } : null };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.env) throw new Error("--env <path to env file> is required");
  const env = readEnvFile(args.env);
  const db = makeDb(env, env.SHOP_ORG_ID || DEFAULT_ORG);
  const started = new Date().toISOString();

  if (!args.dryRun && !(await db.schemaReady())) {
    console.log(`${started} customer-files migration not applied yet; nothing to do`);
    return;
  }

  // launchd processes need Full Disk Access to read ~/Library/Mail; without it
  // readdir fails with EPERM. Fail loudly instead of "finding" an empty mailbox
  // (which would also wipe the header index).
  for (const f of args.folders) {
    try { readdirSync(join(args.mailRoot, f)); }
    catch (e) { throw new Error(`cannot read ${join(args.mailRoot, f)} (${e.code || e.message}) — grant Full Disk Access to ${process.execPath}`); }
  }
  const state = loadState(args.state);
  const indexed = refreshIndex(state, args.folders.map((f) => join(args.mailRoot, f)));
  const jobs = await db.jobs();
  const totals = { jobs: 0, messages: 0, photos: 0, notes: 0, errors: 0 };

  for (const job of jobs) {
    const emails = addressesIn(job.email);
    if (!emails.length) continue;
    totals.jobs++;
    const done = new Set(state.done[job.id] || []);
    const hits = [];
    const seenIds = new Set();
    for (const [path, h] of Object.entries(state.index)) {
      if (!h.id || done.has(h.id) || seenIds.has(h.id)) continue;
      if (!inboundMatch({ from: h.f, to: h.t, cc: h.c, replyTo: h.r }, emails)) continue;
      seenIds.add(h.id);
      hits.push(path);
    }
    if (!hits.length) continue;
    const have = await db.refs(job.id).catch((e) => { if (args.dryRun) return new Set(); throw e; });
    const parsed = [];
    for (const path of hits) {
      try { const msg = readEmlx(path); parsed.push({ msg, plan: planMessage(msg) }); }
      catch (e) { totals.errors++; console.error("read", path, e.message); }
    }
    // An image that turns up in several different messages is a signature
    // logo or banner, not something the customer is showing us.
    const seenIn = new Map();
    for (const { plan } of parsed) for (const h of new Set(plan.images.map((i) => i.hash))) seenIn.set(h, (seenIn.get(h) || 0) + 1);
    for (const { msg, plan: raw } of parsed) {
      totals.messages++;
      const plan = { ...raw, images: raw.images.filter((i) => (seenIn.get(i.hash) || 0) < REPEATED_IMAGE_MESSAGES) };
      const at = msg.date && !Number.isNaN(Date.parse(msg.date)) ? new Date(msg.date).toISOString() : null;
      let ok = true;
      for (const img of plan.images) {
        if (have.has(img.sourceRef)) continue;
        try {
          let bytes = img.bytes;
          let file = { name: img.name, contentType: img.contentType };
          let ext = storageExt(file);
          if (ext === "heic" || ext === "heif") {
            const jpg = heicToJpeg(bytes);
            if (jpg) { bytes = jpg; ext = "jpg"; file = { name: img.name.replace(/\.hei[cf]$/i, ".jpg"), contentType: "image/jpeg" }; }
          }
          const contentType = file.contentType || mimeForExt(ext) || "image/jpeg";
          const storagePath = importStoragePath(job.id, "email", img.sourceRef, ext);
          if (args.dryRun) { console.log(`[dry] ${job.job_number} photo ${img.name} (${bytes.length} bytes)`); totals.photos++; have.add(img.sourceRef); continue; }
          await db.upload(storagePath, bytes, contentType);
          const rows = await db.insert("kiw_shop_photos", [{
            org_id: db.org, job_id: job.id, url: storagePath, kind: "image", category: CUSTOMER_PHOTO_CATEGORY,
            uploaded_by: null, uploaded_at: new Date().toISOString(), source: "email", source_ref: img.sourceRef,
            review_status: "pending", source_note: redactMoney(`Email · ${msg.subject || img.name}`).slice(0, 300), source_at: at,
          }]);
          totals.photos += rows.length;
          have.add(img.sourceRef);
        } catch (e) { ok = false; totals.errors++; console.error("photo", job.job_number, img.name, e.message); }
      }
      if (plan.note && !have.has(plan.note.sourceRef)) {
        try {
          if (args.dryRun) { console.log(`[dry] ${job.job_number} note: ${plan.note.body.slice(0, 120).replace(/\n/g, " ")}`); totals.notes++; }
          else {
            const rows = await db.insert("kiw_shop_customer_notes", [{
              org_id: db.org, job_id: job.id, source: "email", source_ref: plan.note.sourceRef, body: plan.note.body,
              author_direction: "inbound", message_at: at, review_status: "pending",
            }]);
            totals.notes += rows.length;
            have.add(plan.note.sourceRef);
          }
        } catch (e) { ok = false; totals.errors++; console.error("note", job.job_number, e.message); }
      }
      if (ok && !args.dryRun) done.add(msg.messageId);
    }
    state.done[job.id] = [...done];
  }

  if (!args.dryRun) {
    mkdirSync(dirname(resolve(args.state)), { recursive: true });
    writeFileSync(args.state, JSON.stringify(state));
    await db.audit({ ...totals, indexed }).catch(() => {});
  }
  console.log(`${started} indexed=${indexed} ${JSON.stringify(totals)}${args.dryRun ? " (dry run)" : ""}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(new Date().toISOString(), e.message); process.exit(1); });
}

