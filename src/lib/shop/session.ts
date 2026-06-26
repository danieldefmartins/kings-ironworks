// Lightweight signed-cookie session for the shop tablet (per-worker login).
import { cookies } from "next/headers";
import crypto from "crypto";
import { getWorkerById, type Worker } from "./db";

const SECRET = process.env.SHOP_SESSION_SECRET || "kiw-shop-dev-secret-change-me";
export const SHOP_COOKIE = "kiw_shop";

function sign(value: string): string {
  return crypto.createHmac("sha256", SECRET).update(value).digest("hex");
}

export function makeToken(workerId: string): string {
  return `${workerId}.${sign(workerId)}`;
}

export function verifyToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const idx = token.lastIndexOf(".");
  if (idx < 0) return null;
  const id = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  if (!id || !sig) return null;
  // constant-time compare
  const expected = sign(id);
  if (
    expected.length !== sig.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
  ) {
    return null;
  }
  return id;
}

export async function getSessionWorker(): Promise<Worker | null> {
  const store = await cookies();
  const id = verifyToken(store.get(SHOP_COOKIE)?.value);
  if (!id) return null;
  return getWorkerById(id);
}
