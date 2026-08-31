// Signed-cookie session for the shop tablet (per-worker login).
//
// The token is a signed statement about ONE sign-in, not about a worker:
//
//   base64url(payload) "." hmac-sha256(base64url(payload))
//   payload = { v, w: workerId, iat, exp, n: nonce, f: credential fingerprint }
//
// What each part is for:
//   exp  a session ends. A tablet left on a bench does not stay signed in.
//   iat  tells us when to quietly re-issue a cookie that is past half its life.
//   n    makes every sign-in a distinct token, so one captured cookie is one
//        session rather than a permanent key to the account.
//   f    revocation. It is derived from the worker's PIN, active flag and admin
//        flag, so changing a PIN, deactivating a worker, or changing what they
//        are allowed to do invalidates every session they have open, on every
//        device, without a schema change or a token store.
import { cookies } from "next/headers";
import crypto from "crypto";
import { getWorkerById, getWorkerAuthState, type Worker } from "./db";

const SECRET = process.env.SHOP_SESSION_SECRET || "kiw-shop-dev-secret-change-me";
export const SHOP_COOKIE = "kiw_shop";

// A shift plus the trip home. Long enough that nobody is signed out mid-job,
// short enough that a lost tablet is not an open door next month.
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const TOKEN_VERSION = 2;

interface Payload {
  v: number;
  w: string;
  iat: number;
  exp: number;
  n: string;
  f: string;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function sign(value: string): string {
  return crypto.createHmac("sha256", SECRET).update(value).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

// A short, non-reversible summary of everything that should end a session when
// it changes. Not a secret in itself — it only ever travels alongside a
// signature over the same bytes.
export function credentialFingerprint(state: {
  pin?: string | null;
  active?: boolean | null;
  is_admin?: boolean | null;
}): string {
  return crypto
    .createHmac("sha256", SECRET)
    .update(`${state.pin ?? ""}|${state.active ? 1 : 0}|${state.is_admin ? 1 : 0}`)
    .digest("base64url")
    .slice(0, 16);
}

export function makeToken(workerId: string, fingerprint: string, now = Date.now()): string {
  const iat = Math.floor(now / 1000);
  const payload: Payload = {
    v: TOKEN_VERSION,
    w: workerId,
    iat,
    exp: iat + SESSION_TTL_SECONDS,
    n: crypto.randomBytes(9).toString("base64url"),
    f: fingerprint,
  };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  return `${body}.${sign(body)}`;
}

// Signature, version and expiry only. Whether the worker still exists and
// whether the fingerprint still matches is a database question, answered in
// getSessionWorker.
export function readToken(
  token: string | undefined | null,
  now = Date.now()
): Payload | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!body || !sig) return null;
  if (!safeEqual(sign(body), sig)) return null;
  let payload: Payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  // Tokens issued by an older scheme are not upgraded in place — they carried
  // no expiry, so the only safe thing to do with one is ask for the PIN again.
  if (payload?.v !== TOKEN_VERSION) return null;
  if (typeof payload.w !== "string" || !payload.w) return null;
  if (typeof payload.exp !== "number" || payload.exp * 1000 <= now) return null;
  return payload;
}

// True once the session is past half its life, which is when a route handler
// should re-issue the cookie so an active worker is never signed out mid-shift.
export function shouldRefresh(payload: Payload, now = Date.now()): boolean {
  const half = payload.iat + SESSION_TTL_SECONDS / 2;
  return Math.floor(now / 1000) >= half;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/shop",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export async function getSessionWorker(): Promise<Worker | null> {
  const store = await cookies();
  const payload = readToken(store.get(SHOP_COOKIE)?.value);
  if (!payload) return null;
  // getWorkerById already refuses inactive workers; the fingerprint additionally
  // ends every open session the moment a PIN or a privilege changes.
  const worker = await getWorkerById(payload.w);
  if (!worker) return null;
  const state = await getWorkerAuthState(payload.w);
  if (!state || credentialFingerprint(state) !== payload.f) return null;
  return worker;
}

// Keep an active worker signed in. Called by the API route handlers, which are
// hit constantly while a sheet is being measured; once the session is past half
// its life the cookie is re-issued with a fresh window and a fresh nonce.
//
// The fingerprint is copied from the token being replaced rather than re-read:
// getSessionWorker has already checked it against the database this request, so
// re-reading would only cost a round trip to learn the same thing.
export async function touchSession(): Promise<void> {
  const store = await cookies();
  const payload = readToken(store.get(SHOP_COOKIE)?.value);
  if (!payload || !shouldRefresh(payload)) return;
  try {
    store.set(SHOP_COOKIE, makeToken(payload.w, payload.f), sessionCookieOptions());
  } catch {
    // Rendering contexts cannot set cookies. Nothing is lost: the worker's
    // next API call refreshes it.
  }
}

// Fresh per-request seed for rotating the motivational quote each login.
export function randomSeed(): number {
  return crypto.randomInt(0, 1_000_000_000);
}
