// Changing and resetting sign-in PINs. Server-only.
//
// I/O comes in as `deps` (same pattern as w9-service) so the rules below are
// tested without a database:
//  - A worker can only ever change their OWN PIN: the target is the session's
//    worker, never a value from the request.
//  - The current PIN must be re-entered, and every wrong one counts toward the
//    same 5-in-15-minutes lockout as the sign-in screen and W-9 signing
//    (audit action "login_fail").
//  - Only an owner (finance access) can reset someone else's PIN. The worker is
//    then asked to choose their own on their next visit (details.pinReset).
//  - No PIN value is ever written to the audit trail or returned.
//  - Changing a PIN changes the session fingerprint (session.ts), which signs
//    the worker out on every other device; the route re-issues this device's
//    cookie so the person who just changed it stays signed in.

import { canViewOwnerFinancials } from "./shared";
import { newPinError, pinRuleError } from "./pin";
import type { Actor, TeamRecord } from "./w9-service";

export interface PinDeps {
  getRecord(id: string): Promise<TeamRecord | null>;
  saveRecord(id: string, patch: { columns?: Record<string, unknown>; details: Record<string, unknown> }): Promise<void>;
  verifyPin(workerId: string, pin: string): Promise<boolean>;
  recentPinFailures(workerId: string): Promise<number>;
  recentPinChanges(workerId: string): Promise<number>;
  audit(action: string, opts: { workerId?: string | null; entity?: string; entityId?: string; detail?: unknown }): Promise<void>;
  now(): Date;
}

export class PinError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
    this.name = "PinError";
  }
}

export const MAX_PIN_FAILURES = 5;
/** Successful changes allowed per worker in the rate-limit window. */
export const MAX_PIN_CHANGES = 5;

export interface PinReset { at: string; by: string }

function details(rec: TeamRecord): Record<string, unknown> {
  const d = rec.application_details;
  return d && typeof d === "object" && !Array.isArray(d) ? { ...d } : {};
}

/** Set when the owner gave this worker a temporary PIN they have not replaced yet. */
export function pinResetOf(rec: TeamRecord | null | undefined): PinReset | null {
  if (!rec) return null;
  const r = details(rec).pinReset as Partial<PinReset> | undefined;
  return r && typeof r === "object" && typeof r.at === "string" ? { at: r.at, by: String(r.by || "") } : null;
}

const str = (v: unknown) => (typeof v === "string" ? v : "");

/**
 * Re-authenticate the signed-in worker with their current PIN. Shared by the
 * "current PIN" step and the final change, so both count toward the lockout.
 */
export async function checkCurrentPin(deps: PinDeps, actor: Actor, current: unknown, ua?: string | null): Promise<void> {
  if ((await deps.recentPinFailures(actor.id)) >= MAX_PIN_FAILURES) {
    await deps.audit("login_locked", { workerId: actor.id, entity: "pin", entityId: actor.id });
    throw new PinError(429, "locked");
  }
  const pin = str(current);
  if (!pin || !(await deps.verifyPin(actor.id, pin))) {
    await deps.audit("login_fail", { workerId: actor.id, entity: "pin", entityId: actor.id, detail: { ua: ua?.slice(0, 200) || null } });
    const left = MAX_PIN_FAILURES - (await deps.recentPinFailures(actor.id));
    throw new PinError(left <= 0 ? 429 : 403, left <= 0 ? "locked" : "current");
  }
}

/** The signed-in worker changes their own PIN. There is no target parameter on purpose. */
export async function changeOwnPin(
  deps: PinDeps,
  actor: Actor,
  input: { current?: unknown; next?: unknown; confirm?: unknown },
  ua?: string | null
): Promise<void> {
  await checkCurrentPin(deps, actor, input.current, ua);
  const current = str(input.current);
  const next = str(input.next);
  const bad = newPinError(current, next, str(input.confirm));
  if (bad) throw new PinError(400, bad);
  if ((await deps.recentPinChanges(actor.id)) >= MAX_PIN_CHANGES) throw new PinError(429, "rate");
  const rec = await deps.getRecord(actor.id);
  if (!rec) throw new PinError(404, "notFound");
  const d = details(rec);
  delete d.pinReset;
  await deps.saveRecord(actor.id, { columns: { pin: next }, details: d });
  await deps.audit("pin_change", { workerId: actor.id, entity: "worker", entityId: actor.id, detail: { by: "self", hadReset: !!pinResetOf(rec) } });
}

/** An owner gives another worker a temporary PIN (the worker is then asked to change it). */
export async function resetWorkerPin(deps: PinDeps, actor: Actor, targetId: unknown, input: { pin?: unknown }): Promise<void> {
  if (!canViewOwnerFinancials(actor)) throw new PinError(403, "forbidden");
  const target = str(targetId);
  // Your own PIN goes through Change PIN, which asks for the current one.
  if (!target || target === actor.id) throw new PinError(400, "self");
  const pin = str(input.pin);
  const bad = pinRuleError(pin);
  if (bad) throw new PinError(400, bad);
  if ((await deps.recentPinChanges(actor.id)) >= MAX_PIN_CHANGES * 4) throw new PinError(429, "rate");
  const rec = await deps.getRecord(target);
  if (!rec) throw new PinError(404, "notFound");
  const d = details(rec);
  d.pinReset = { at: deps.now().toISOString(), by: actor.id } satisfies PinReset;
  await deps.saveRecord(target, { columns: { pin }, details: d });
  await deps.audit("pin_reset", { workerId: actor.id, entity: "worker", entityId: target, detail: { by: "owner" } });
}
