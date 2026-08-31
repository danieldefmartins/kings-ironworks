// Every measurement field must carry a plain-language explanation behind its
// "i", in all three languages. The person holding the tape is often not the
// person who designed the sheet.
//
// Static check — no server needed:  node e2e/measure.help.test.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const editor = readFileSync(join(root, "src/app/shop/job/[id]/measure/[sheetId]/MeasureEditor.tsx"), "utf8");
const help = readFileSync(join(root, "src/lib/shop/measure-help.ts"), "utf8");

let pass = 0;
let fail = 0;
const check = (ok, label, extra) => {
  console.log(`${ok ? "  ok  " : "  FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
  ok ? pass++ : fail++;
};

// Pull each language block out of measure-help.ts.
function keysOf(name) {
  const m = help.match(new RegExp(`const ${name}: HelpDict = \\{([\\s\\S]*?)\\n\\};`));
  if (!m) return null;
  return new Set([...m[1].matchAll(/^\s{2}([A-Za-z0-9_]+):/gm)].map((x) => x[1]));
}

const en = keysOf("en");
const pt = keysOf("pt");
const es = keysOf("es");
check(!!en && !!pt && !!es, "all three language blocks parse");

const missingPt = [...en].filter((k) => !pt.has(k));
const missingEs = [...en].filter((k) => !es.has(k));
check(missingPt.length === 0, "every explanation is translated to Portuguese", missingPt.slice(0, 6).join(", "));
check(missingEs.length === 0, "every explanation is translated to Spanish", missingEs.slice(0, 6).join(", "));

// Every field whose label comes from the dictionary should offer help.
const labelled = [...editor.matchAll(/<(?:MInput|MSelect|ChipRow)\b[^>]*?label=\{mt\(lang, "([A-Za-z0-9_]+)"\)\}[^>]*>/g)];
const uncovered = [];
for (const m of labelled) {
  if (!m[0].includes('help="')) uncovered.push(m[1]);
}
check(
  uncovered.length === 0,
  `all ${labelled.length} labelled fields wire up their explanation`,
  [...new Set(uncovered)].slice(0, 10).join(", ")
);

// A help key that names no real field is dead weight and usually a typo.
const used = new Set(labelled.map((m) => m[1]));
const orphans = [...en].filter((k) => !used.has(k));
check(orphans.length === 0, "no explanation is written for a field that does not exist", orphans.slice(0, 10).join(", "));

// Explanations have to actually say something.
const shorties = [...help.matchAll(/^\s{2}([A-Za-z0-9_]+): "([^"]*)"/gm)].filter(([, , v]) => v.length < 15);
check(shorties.length === 0, "no explanation is a stub", shorties.slice(0, 5).map((x) => x[1]).join(", "));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
