// Reading and writing the strings a measurer actually types.
//
// Its own module because everything else depends on it: the checks, the
// derivations, the drawings. Keeping it at the bottom of the import graph is
// what lets measure-checks ask measure-derive what a total should be without
// the two of them importing each other in a circle.


// "23 3/4", "23-3/4", '23 3/4"', "3' 6 1/2\"", "41.75", "32°" → number (inches
// or degrees, caller's context). Returns null when empty or unreadable.
export function parseMeas(s: string | undefined | null): number | null {
  if (!s) return null;
  let t = s.trim().toLowerCase();
  if (t === "") return null;
  t = t.replace(/[°º]/g, "").replace(/(in|inch|inches|deg)\b/g, "").trim();

  let total = 0;
  // feet component: 3' or 3ft
  const ft = t.match(/^(\d+(?:\.\d+)?)\s*(?:'|ft)\s*/);
  if (ft) {
    total += parseFloat(ft[1]) * 12;
    t = t.slice(ft[0].length);
  }
  t = t.replace(/"/g, "").trim();
  if (t === "") return ft ? total : null;

  // inches: "a b/c", "a-b/c", "b/c", or decimal
  const m = t.match(/^(\d+(?:\.\d+)?)?(?:[\s-]*(\d+)\s*\/\s*(\d+))?$/);
  if (!m || (!m[1] && !m[2])) return null;
  if (m[1]) total += parseFloat(m[1]);
  if (m[2] && m[3]) {
    const den = parseInt(m[3], 10);
    if (!den) return null;
    total += parseInt(m[2], 10) / den;
  }
  return total;
}

// 41.766 → '41 3/4"' (nearest 1/16 for display only — never written back).
export function formatIn(n: number): string {
  const sixteenths = Math.round(n * 16);
  const whole = Math.floor(sixteenths / 16);
  let num = sixteenths % 16;
  if (num === 0) return `${whole}"`;
  let den = 16;
  while (num % 2 === 0) {
    num /= 2;
    den /= 2;
  }
  return `${whole ? `${whole} ` : ""}${num}/${den}"`;
}

