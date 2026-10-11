// Test helpers for the W-9 suite: a real (tiny) signature PNG and a fake TIN.
import zlib from "node:zlib";

export const FAKE_SSN = "123-45-6789";
export const FAKE_SSN_DIGITS = "123456789";
export const TEST_KEY = Buffer.alloc(32, 7).toString("base64");

function crc32(buf: Buffer): number {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** A 300x100 RGBA PNG with a diagonal "signature" stroke. */
export function signaturePng(): Buffer {
  const w = 300, h = 100;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const on = Math.abs(y - (50 + 30 * Math.sin(x / 25))) < 3;
      const o = y * (w * 4 + 1) + 1 + x * 4;
      raw[o] = raw[o + 1] = raw[o + 2] = 17;
      raw[o + 3] = on ? 255 : 0;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export function signatureDataUrl(): string {
  return `data:image/png;base64,${signaturePng().toString("base64")}`;
}
