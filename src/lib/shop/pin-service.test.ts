// @vitest-environment node
// Change PIN / Reset PIN: rules, lockout, ownership, and that no PIN value ever
// reaches the audit trail or the console.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newPinError, pinRuleError } from "./pin";
import { changeOwnPin, checkCurrentPin, MAX_PIN_FAILURES, PinError, pinResetOf, resetWorkerPin, type PinDeps } from "./pin-service";
import { rosterRow, type TeamRecord } from "./w9-service";
import { PIN_STRINGS } from "./pin-i18n";

const W = "b1000000-0000-4000-8000-000000000002";
const OTHER = "b1000000-0000-4000-8000-000000000003";
const OWNER = "b1000000-0000-4000-8000-000000000001";
const crew = { id: W, name: "Kaio Prates", is_admin: false, can_see_prices: false };
const owner = { id: OWNER, name: "Owner", is_admin: true, can_see_prices: true };
const leadNoFinance = { id: OTHER, name: "Lead", is_admin: true, can_see_prices: false };

function world() {
  const rows = new Map<string, TeamRecord & { pin: string }>([
    [W, { id: W, name: "Kaio Prates", role: "Welder", active: true, pin: "9002", application_details: { legalName: "Kaio" } }],
    [OTHER, { id: OTHER, name: "Other", role: "Helper", active: true, pin: "9003", application_details: null }],
    [OWNER, { id: OWNER, name: "Owner", role: "Owner", active: true, is_admin: true, can_see_prices: true, pin: "9001", application_details: null }],
  ]);
  const audits: { action: string; opts: unknown }[] = [];
  const failures: Record<string, number> = {};
  let changes = 0;
  const deps: PinDeps = {
    getRecord: async id => (rows.has(id) ? structuredClone(rows.get(id)!) : null),
    saveRecord: async (id, patch) => {
      const r = rows.get(id)!;
      rows.set(id, { ...r, ...(patch.columns || {}), application_details: patch.details } as TeamRecord & { pin: string });
    },
    verifyPin: async (id, pin) => rows.get(id)?.pin === pin,
    recentPinFailures: async id => failures[id] || 0,
    recentPinChanges: async () => changes,
    audit: async (action, opts) => {
      audits.push({ action, opts });
      if (action === "login_fail") failures[opts.workerId!] = (failures[opts.workerId!] || 0) + 1;
      if (action === "pin_change" || action === "pin_reset") changes++;
    },
    now: () => new Date("2026-10-11T15:00:00Z"),
  };
  return { deps, rows, audits, failures };
}

async function code(p: Promise<unknown>): Promise<string> {
  try { await p; return "ok"; } catch (e) { return e instanceof PinError ? e.code : `throw:${String(e)}`; }
}

let logs: string[];
beforeEach(() => {
  logs = [];
  for (const m of ["log", "info", "warn", "error", "debug"] as const) {
    vi.spyOn(console, m).mockImplementation((...a: unknown[]) => { logs.push(a.map(x => (typeof x === "string" ? x : JSON.stringify(x))).join(" ")); });
  }
});
afterEach(() => vi.restoreAllMocks());

describe("PIN rules", () => {
  it("accepts an ordinary 4-digit PIN", () => {
    for (const p of ["2580", "1357", "9024", "1123", "0912"]) expect(pinRuleError(p)).toBeNull();
  });
  it("rejects wrong length and non-digits (the login keypad takes exactly 4)", () => {
    for (const p of ["", "123", "12345", "12a4", " 123", "１２３４"]) expect(pinRuleError(p)).toBe("format");
  });
  it("rejects all-same digits", () => {
    for (const p of ["0000", "1111", "9999"]) expect(pinRuleError(p)).toBe("repeated");
  });
  it("rejects simple ascending and descending sequences", () => {
    for (const p of ["0123", "1234", "3456", "6789", "4321", "9876", "3210"]) expect(pinRuleError(p)).toBe("sequence");
    expect(pinRuleError("1235")).toBeNull();
    expect(pinRuleError("7890")).toBeNull();
  });
  it("rejects the current PIN and a confirmation that does not match", () => {
    expect(newPinError("9002", "9002")).toBe("same");
    expect(newPinError("9002", "2580", "2581")).toBe("mismatch");
    expect(newPinError("9002", "2580", "2580")).toBeNull();
    expect(newPinError("9002", "1234", "1234")).toBe("sequence");
  });
});

describe("changeOwnPin", () => {
  it("changes the signed-in worker's PIN and audits without the PIN", async () => {
    const { deps, rows, audits } = world();
    await changeOwnPin(deps, crew, { current: "9002", next: "2580", confirm: "2580" });
    expect(rows.get(W)!.pin).toBe("2580");
    expect(rows.get(OTHER)!.pin).toBe("9003");
    expect(rows.get(W)!.application_details).toEqual({ legalName: "Kaio" });
    expect(audits.map(a => a.action)).toEqual(["pin_change"]);
    expect(audits[0].opts).toMatchObject({ workerId: W, entityId: W });
    const blob = JSON.stringify(audits) + logs.join("\n");
    expect(blob).not.toContain("2580");
    expect(blob).not.toContain("9002");
  });

  it("a wrong current PIN counts toward the shared login lockout", async () => {
    const { deps, rows, audits, failures } = world();
    for (let i = 0; i < MAX_PIN_FAILURES - 1; i++) {
      expect(await code(changeOwnPin(deps, crew, { current: "7351", next: "2580", confirm: "2580" }))).toBe("current");
    }
    expect(failures[W]).toBe(MAX_PIN_FAILURES - 1);
    expect(audits.every(a => a.action === "login_fail")).toBe(true);
    // the fifth wrong PIN reaches the limit and reports the lock immediately
    expect(await code(changeOwnPin(deps, crew, { current: "7351", next: "2580", confirm: "2580" }))).toBe("locked");
    // and now even the right PIN is refused until the window passes
    expect(await code(changeOwnPin(deps, crew, { current: "9002", next: "2580", confirm: "2580" }))).toBe("locked");
    expect(audits.at(-1)!.action).toBe("login_locked");
    expect(rows.get(W)!.pin).toBe("9002");
    expect(JSON.stringify(audits)).not.toMatch(/7351|2580|9002/);
  });

  it("the verify step uses the same lockout counter as sign-in", async () => {
    const { deps, failures } = world();
    expect(await code(checkCurrentPin(deps, crew, "1111"))).toBe("current");
    expect(await code(checkCurrentPin(deps, crew, ""))).toBe("current");
    expect(failures[W]).toBe(2);
    expect(await code(checkCurrentPin(deps, crew, "9002"))).toBe("ok");
  });

  it("cannot change another worker's PIN: another worker's current PIN is useless", async () => {
    const { deps, rows } = world();
    // The crew member knows a colleague's PIN; the change still targets only themselves
    // and is refused because it is not *their* current PIN.
    expect(await code(changeOwnPin(deps, crew, { current: "9003", next: "2580", confirm: "2580" }))).toBe("current");
    expect(rows.get(OTHER)!.pin).toBe("9003");
    // Extra fields naming a target are ignored by the service (no target parameter exists).
    await changeOwnPin(deps, crew, { current: "9002", next: "2580", confirm: "2580", workerId: OTHER } as never);
    expect(rows.get(OTHER)!.pin).toBe("9003");
    expect(rows.get(W)!.pin).toBe("2580");
  });

  it("rejects weak, same and mismatched PINs without writing", async () => {
    const { deps, rows } = world();
    expect(await code(changeOwnPin(deps, crew, { current: "9002", next: "0000", confirm: "0000" }))).toBe("repeated");
    expect(await code(changeOwnPin(deps, crew, { current: "9002", next: "4321", confirm: "4321" }))).toBe("sequence");
    expect(await code(changeOwnPin(deps, crew, { current: "9002", next: "9002", confirm: "9002" }))).toBe("same");
    expect(await code(changeOwnPin(deps, crew, { current: "9002", next: "2580", confirm: "2581" }))).toBe("mismatch");
    expect(await code(changeOwnPin(deps, crew, { current: "9002", next: "25801", confirm: "25801" }))).toBe("format");
    expect(rows.get(W)!.pin).toBe("9002");
  });

  it("is rate-limited", async () => {
    const { deps } = world();
    let pin = "9002";
    const fresh = ["2580", "1357", "2468", "3579", "1470"];
    for (const n of fresh) { await changeOwnPin(deps, crew, { current: pin, next: n, confirm: n }); pin = n; }
    expect(await code(changeOwnPin(deps, crew, { current: pin, next: "5820", confirm: "5820" }))).toBe("rate");
  });

  it("clears the owner's temporary-PIN flag", async () => {
    const { deps, rows } = world();
    await resetWorkerPin(deps, owner, W, { pin: "4826" });
    expect(pinResetOf(rows.get(W)!)).toEqual({ at: "2026-10-11T15:00:00.000Z", by: OWNER });
    expect(rosterRow(rows.get(W)!).pinReset).toBe(true);
    await changeOwnPin(deps, crew, { current: "4826", next: "2580", confirm: "2580" });
    expect(pinResetOf(rows.get(W)!)).toBeNull();
    expect(rosterRow(rows.get(W)!).pinReset).toBe(false);
    expect(rows.get(W)!.application_details).toEqual({ legalName: "Kaio" });
  });
});

describe("resetWorkerPin", () => {
  it("lets an owner set a temporary PIN, audited without the value", async () => {
    const { deps, rows, audits } = world();
    await resetWorkerPin(deps, owner, W, { pin: "4826" });
    expect(rows.get(W)!.pin).toBe("4826");
    expect(audits).toEqual([{ action: "pin_reset", opts: { workerId: OWNER, entity: "worker", entityId: W, detail: { by: "owner" } } }]);
    expect(JSON.stringify(audits) + logs.join("\n")).not.toContain("4826");
  });
  it("is owner-only and never targets yourself", async () => {
    const { deps, rows } = world();
    expect(await code(resetWorkerPin(deps, crew, OTHER, { pin: "4826" }))).toBe("forbidden");
    expect(await code(resetWorkerPin(deps, leadNoFinance, W, { pin: "4826" }))).toBe("forbidden");
    expect(await code(resetWorkerPin(deps, owner, OWNER, { pin: "4826" }))).toBe("self");
    expect(await code(resetWorkerPin(deps, owner, W, { pin: "1111" }))).toBe("repeated");
    expect(await code(resetWorkerPin(deps, owner, "b1000000-0000-4000-8000-00000000dead", { pin: "4826" }))).toBe("notFound");
    expect(rows.get(W)!.pin).toBe("9002");
    expect(rows.get(OTHER)!.pin).toBe("9003");
  });
});

it("has every PIN string in EN, PT and ES", () => {
  const en = Object.keys(PIN_STRINGS.en).sort();
  expect(Object.keys(PIN_STRINGS.pt).sort()).toEqual(en);
  expect(Object.keys(PIN_STRINGS.es).sort()).toEqual(en);
});
