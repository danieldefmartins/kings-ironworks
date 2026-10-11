// Taxpayer identification numbers for Form W-9, Part I.
//
// Pure and client-safe: the signing screen uses the same rules as the server,
// so a typo is caught on the phone instead of after a round trip. Nothing here
// stores, logs or returns a full number — callers only ever keep last4().
//
// Three kinds go on a W-9:
//   SSN   Social Security number, SSN box.
//   ITIN  Individual taxpayer ID (starts with 9), also in the SSN box. Many
//         crew members file with one, so a 9xx number is not "invalid", it is
//         an ITIN and is checked as one.
//   EIN   Employer identification number, EIN box.

export type TinType = "ssn" | "itin" | "ein";
export const TIN_TYPES: TinType[] = ["ssn", "itin", "ein"];

export type TinError = "length" | "ssnArea" | "ssnGroup" | "ssnSerial" | "itinRange" | "einPrefix" | "mismatch";

export function tinDigits(raw: string): string {
  return String(raw ?? "").replace(/\D/g, "").slice(0, 9);
}

// Valid EIN campus prefixes published by the IRS. Everything else (00, 07–09,
// 17–19, 28–29, 49, 69–70, 78–79, 89, 96–97) has never been issued.
const EIN_PREFIXES = new Set<string>();
for (const [a, b] of [[1, 6], [10, 16], [20, 27], [30, 39], [40, 48], [50, 68], [71, 77], [80, 88], [90, 95], [98, 99]]) {
  for (let n = a; n <= b; n++) EIN_PREFIXES.add(String(n).padStart(2, "0"));
}

export function validateSsn(raw: string): TinError | null {
  const d = tinDigits(raw);
  if (d.length !== 9 || d !== String(raw).replace(/\D/g, "")) return "length";
  const area = d.slice(0, 3);
  if (area === "000" || area === "666" || area[0] === "9") return "ssnArea";
  if (d.slice(3, 5) === "00") return "ssnGroup";
  if (d.slice(5) === "0000") return "ssnSerial";
  return null;
}

// ITIN: 9XX-[50–65 | 70–88 | 90–92 | 94–99]-XXXX.
export function validateItin(raw: string): TinError | null {
  const d = tinDigits(raw);
  if (d.length !== 9 || d !== String(raw).replace(/\D/g, "")) return "length";
  if (d[0] !== "9") return "itinRange";
  const g = Number(d.slice(3, 5));
  const ok = (g >= 50 && g <= 65) || (g >= 70 && g <= 88) || (g >= 90 && g <= 92) || (g >= 94 && g <= 99);
  return ok ? null : "itinRange";
}

export function validateEin(raw: string): TinError | null {
  const d = tinDigits(raw);
  if (d.length !== 9 || d !== String(raw).replace(/\D/g, "")) return "length";
  return EIN_PREFIXES.has(d.slice(0, 2)) ? null : "einPrefix";
}

export function validateTin(type: TinType, raw: string, confirm?: string): TinError | null {
  const err = type === "ein" ? validateEin(raw) : type === "itin" ? validateItin(raw) : validateSsn(raw);
  if (err) return err;
  if (confirm !== undefined && tinDigits(confirm) !== tinDigits(raw)) return "mismatch";
  return null;
}

// The box a number belongs in on the paper form.
export function tinBox(type: TinType): "ssn" | "ein" {
  return type === "ein" ? "ein" : "ssn";
}

/** Formats as the user types: 123-45-6789 or 12-3456789. */
export function formatTin(type: TinType, raw: string): string {
  const d = tinDigits(raw);
  if (type === "ein") return d.length > 2 ? `${d.slice(0, 2)}-${d.slice(2)}` : d;
  if (d.length > 5) return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
  if (d.length > 3) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return d;
}

export function last4(raw: string): string {
  return tinDigits(raw).slice(-4);
}

/** "•••• 6789" — the only form a stored TIN is ever shown in (card-style, no dash/dot soup). */
export function maskedTin(_type: TinType, l4: string): string {
  return `•••• ${l4}`;
}
