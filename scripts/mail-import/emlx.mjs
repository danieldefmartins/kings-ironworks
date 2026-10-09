// Minimal, dependency-free reader for Apple Mail .emlx files.
//
// An .emlx is: a line holding the byte length of the RFC 822 message, the
// message itself, then an XML plist of Mail's flags. A ".partial.emlx" is the
// same thing with attachment bodies left out — Mail keeps those as plain files
// in ../Attachments/<message number>/<part>/<filename>.

import { readFileSync, existsSync, readdirSync, statSync, openSync, readSync, closeSync } from "node:fs";
import { basename, dirname, join } from "node:path";

/** The RFC 822 bytes inside an .emlx buffer. */
export function emlxMessage(buf) {
  const nl = buf.indexOf(0x0a);
  const len = parseInt(buf.subarray(0, nl).toString("latin1").trim(), 10);
  const start = nl + 1;
  if (!Number.isFinite(len) || len <= 0) return buf.subarray(start);
  return buf.subarray(start, Math.min(buf.length, start + len));
}

function splitHeadBody(bin) {
  const m = /\r?\n\r?\n/.exec(bin);
  if (!m) return [bin, ""];
  return [bin.slice(0, m.index), bin.slice(m.index + m[0].length)];
}

/** Parse a header block (latin1 string) into a lower-cased multimap. */
export function parseHeaders(head) {
  const out = {};
  const unfolded = head.replace(/\r?\n[ \t]+/g, " ");
  for (const line of unfolded.split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i <= 0) continue;
    const k = line.slice(0, i).trim().toLowerCase();
    (out[k] ||= []).push(line.slice(i + 1).trim());
  }
  return out;
}

function decodeCharset(bytes, charset) {
  const cs = (charset || "utf-8").toLowerCase().replace(/^"|"$/g, "");
  try {
    return new TextDecoder(cs === "utf8" ? "utf-8" : cs).decode(bytes);
  } catch {
    return Buffer.from(bytes).toString("utf8");
  }
}

/** RFC 2047 encoded words: =?utf-8?B?...?= / =?iso-8859-1?Q?...?= */
export function decodeWords(value) {
  if (!value) return "";
  return value
    .replace(/(=\?[^?]+\?[bq]\?[^?]*\?=)\s+(?==\?)/gi, "$1")
    .replace(/=\?([^?]+)\?([bq])\?([^?]*)\?=/gi, (_m, cs, enc, text) => {
      const bytes = enc.toLowerCase() === "b"
        ? Buffer.from(text, "base64")
        : Buffer.from(text.replace(/_/g, " ").replace(/=([0-9a-f]{2})/gi, (_x, h) => String.fromCharCode(parseInt(h, 16))), "latin1");
      return decodeCharset(bytes, cs);
    });
}

/** `type/sub; a=1; b="x"` → { value, params } with RFC 2231 continuations folded. */
export function parseParams(value) {
  const parts = (value || "").split(/;(?=(?:[^"]*"[^"]*")*[^"]*$)/);
  const params = {};
  const ext = {};
  for (const p of parts.slice(1)) {
    const i = p.indexOf("=");
    if (i < 0) continue;
    const key = p.slice(0, i).trim().toLowerCase();
    let v = p.slice(i + 1).trim().replace(/^"|"$/g, "");
    const m = /^([^*]+)\*(?:(\d+)\*?)?$/.exec(key);
    if (m) {
      (ext[m[1]] ||= []).push({ n: Number(m[2] || 0), v, encoded: key.endsWith("*") });
    } else {
      params[key] = v;
    }
  }
  for (const [k, list] of Object.entries(ext)) {
    list.sort((a, b) => a.n - b.n);
    let charset = "utf-8";
    const joined = list.map((x, idx) => {
      let v = x.v;
      if (idx === 0 && x.encoded) {
        const m = /^([^']*)'[^']*'(.*)$/.exec(v);
        if (m) { charset = m[1] || charset; v = m[2]; }
      }
      return v;
    }).join("");
    try {
      params[k] = decodeCharset(Buffer.from(joined.replace(/%([0-9a-f]{2})/gi, (_x, h) => String.fromCharCode(parseInt(h, 16))), "latin1"), charset);
    } catch {
      params[k] = joined;
    }
  }
  return { value: (parts[0] || "").trim().toLowerCase(), params };
}

function decodeBody(bin, cte) {
  const enc = (cte || "").toLowerCase();
  if (enc === "base64") return Buffer.from(bin.replace(/[^A-Za-z0-9+/=]/g, ""), "base64");
  if (enc === "quoted-printable") {
    return Buffer.from(bin.replace(/=\r?\n/g, "").replace(/=([0-9a-f]{2})/gi, (_x, h) => String.fromCharCode(parseInt(h, 16))), "latin1");
  }
  return Buffer.from(bin, "latin1");
}

function htmlToText(html) {
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, "\n")
    .replace(/<div class="gmail_quote[\s\S]*$/i, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

/**
 * Walk a MIME entity. Collects text bodies and file parts. `bin` is the
 * entity as a latin1 string so byte values survive the string handling.
 */
function walk(bin, acc, depth = 0, partNo = "1") {
  const [head, body] = splitHeadBody(bin);
  const h = parseHeaders(head);
  const ct = parseParams(h["content-type"]?.[0] || "text/plain");
  const cd = parseParams(h["content-disposition"]?.[0] || "");
  const cte = h["content-transfer-encoding"]?.[0];
  if (ct.value.startsWith("multipart/") && ct.params.boundary && depth < 8) {
    const b = `--${ct.params.boundary}`;
    const chunks = body.split(b).slice(1);
    let i = 0;
    for (const chunk of chunks) {
      if (chunk.startsWith("--")) break;
      i++;
      walk(chunk.replace(/^\r?\n/, ""), acc, depth + 1, depth === 0 ? String(i) : `${partNo}.${i}`);
    }
    return;
  }
  if (ct.value === "message/rfc822") return; // forwarded mail: not this customer's own words
  const filename = decodeWords(cd.params.filename || ct.params.name || "");
  const isFile = !!filename || cd.value === "attachment" || (ct.value.startsWith("image/") && depth > 0);
  if (isFile) {
    const bytes = decodeBody(body, cte);
    acc.files.push({ name: filename || `part-${partNo}`, contentType: ct.value, bytes: bytes.length ? bytes : null, partNo });
    return;
  }
  if (ct.value === "text/plain" && acc.text == null) acc.text = decodeCharset(decodeBody(body, cte), ct.params.charset);
  else if (ct.value === "text/html" && acc.html == null) acc.html = decodeCharset(decodeBody(body, cte), ct.params.charset);
}

/** Header fields only, from the first chunk of the file (cheap; used for indexing). */
export function readEmlxHeaders(path, maxBytes = 65536) {
  const fd = openSync(path, "r");
  try {
    const size = statSync(path).size;
    const buf = Buffer.alloc(Math.min(size, maxBytes));
    readSync(fd, buf, 0, buf.length, 0);
    const msg = emlxMessage(buf).toString("latin1");
    const [head] = splitHeadBody(msg);
    return headerSummary(parseHeaders(head));
  } finally {
    closeSync(fd);
  }
}

function headerSummary(h) {
  const one = (k) => decodeWords(h[k]?.[0] || "");
  return {
    messageId: (h["message-id"]?.[0] || "").trim(),
    from: one("from"),
    to: (h["to"] || []).map(decodeWords).join(", "),
    cc: (h["cc"] || []).map(decodeWords).join(", "),
    replyTo: one("reply-to"),
    subject: one("subject"),
    date: one("date"),
  };
}

/** Where Mail keeps a partial message's attachment files. */
export function attachmentDirFor(emlxPath) {
  const n = basename(emlxPath).split(".")[0];
  return join(dirname(dirname(emlxPath)), "Attachments", n);
}

function listFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(p));
    else if (e.isFile()) out.push(p);
  }
  return out;
}

/**
 * Full parse: headers, the customer's text, and every file part — inline
 * bytes from the MIME body, or the file Mail stored beside a partial message.
 */
export function readEmlx(path) {
  const msg = emlxMessage(readFileSync(path)).toString("latin1");
  const [head] = splitHeadBody(msg);
  const acc = { text: null, html: null, files: [] };
  walk(msg, acc);
  const stored = listFiles(attachmentDirFor(path));
  const files = [];
  const seen = new Set();
  for (const f of acc.files) {
    if (f.bytes) { files.push(f); seen.add(f.name); }
  }
  for (const p of stored) {
    const name = basename(p);
    if (seen.has(name)) continue;
    seen.add(name);
    files.push({ name, contentType: "", bytes: readFileSync(p), partNo: basename(dirname(p)) });
  }
  const text = acc.text != null && acc.text.trim() ? acc.text : acc.html ? htmlToText(acc.html) : "";
  return { ...headerSummary(parseHeaders(head)), text, files };
}
