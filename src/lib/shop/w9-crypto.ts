// AES-256-GCM for W-9 data (the TIN and the signed PDF). Server-only.
//
// Key: W9_ENCRYPTION_KEY = 32 random bytes, base64. Generate with
//   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
// The key is never logged and never leaves this module. If it is missing or
// malformed every W-9 operation fails closed with W9KeyError — nothing is ever
// written unencrypted as a fallback.
//
// Envelope: [version 0x01][iv 12][tag 16][ciphertext]. The associated data
// binds each ciphertext to its organization, worker and purpose, so a blob
// copied onto another worker's record does not decrypt.

import crypto from "node:crypto";

export class W9KeyError extends Error {
  constructor() {
    super("W-9 encryption is not configured (W9_ENCRYPTION_KEY). Ask the owner to set it before collecting W-9s.");
    this.name = "W9KeyError";
  }
}

const VERSION = 1;

function loadKey(): Buffer {
  const raw = (process.env.W9_ENCRYPTION_KEY || "").trim();
  if (!raw) throw new W9KeyError();
  let key: Buffer;
  try {
    key = Buffer.from(raw, "base64");
  } catch {
    throw new W9KeyError();
  }
  if (key.length !== 32) throw new W9KeyError();
  return key;
}

export function w9KeyConfigured(): boolean {
  try {
    loadKey();
    return true;
  } catch {
    return false;
  }
}

/** Short, non-secret fingerprint of the key, stored with each ciphertext for rotation. */
export function w9KeyId(): string {
  return crypto.createHash("sha256").update(loadKey()).update("kiw-w9-key-id").digest("hex").slice(0, 12);
}

export function w9Aad(orgId: string, workerId: string, purpose: "tin" | "pdf"): string {
  return `kiw-w9|${orgId}|${workerId}|${purpose}`;
}

export function encryptBytes(plain: Buffer, aad: string): Buffer {
  const key = loadKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([Buffer.from([VERSION]), iv, cipher.getAuthTag(), ct]);
}

export function decryptBytes(blob: Buffer, aad: string): Buffer {
  const key = loadKey();
  if (blob.length < 29 || blob[0] !== VERSION) throw new Error("Unrecognized W-9 ciphertext");
  const iv = blob.subarray(1, 13);
  const tag = blob.subarray(13, 29);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(blob.subarray(29)), decipher.final()]);
}

export function encryptText(plain: string, aad: string): string {
  return encryptBytes(Buffer.from(plain, "utf8"), aad).toString("base64");
}
export function decryptText(b64: string, aad: string): string {
  return decryptBytes(Buffer.from(b64, "base64"), aad).toString("utf8");
}

export function sha256Hex(data: Buffer | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}
