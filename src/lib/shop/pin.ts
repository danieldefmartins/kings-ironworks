// Sign-in PIN rules, shared by the worker's Change PIN screen, the owner's
// Reset PIN sheet and the server that enforces both.
//
// Length: the shop login keypad shows four dots and signs in on the fourth
// digit (LoginClient), so a PIN of any other length could never be typed at
// sign-in. Four digits is therefore the only length a worker or the owner can
// choose here, even though the application-approval RPC tolerates 4–8.
//
// Uniqueness is deliberately NOT a rule: sign-in selects the worker by name
// first and only then compares that one worker's PIN, so two workers sharing a
// PIN does not let either one in as the other. Telling a worker "that PIN is
// taken" would, on the other hand, reveal a colleague's PIN.

export const PIN_LENGTH = 4;

export type PinRuleError = "format" | "repeated" | "sequence";
export type PinChangeError = PinRuleError | "same" | "mismatch";

/** Shape and strength of a PIN on its own. */
export function pinRuleError(pin: string): PinRuleError | null {
  if (!new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)) return "format";
  if (/^(\d)\1+$/.test(pin)) return "repeated";
  const d = [...pin].map(Number);
  const step = d[1] - d[0];
  if ((step === 1 || step === -1) && d.every((v, i) => i === 0 || v - d[i - 1] === step)) return "sequence";
  return null;
}

/** A new PIN chosen by the worker: strength, differs from the current one, typed the same twice. */
export function newPinError(current: string, next: string, confirm?: string): PinChangeError | null {
  const rule = pinRuleError(next);
  if (rule) return rule;
  if (next === current) return "same";
  if (confirm !== undefined && confirm !== next) return "mismatch";
  return null;
}
