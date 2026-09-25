// One-off / repeatable: load Chase CSV exports into kiw_fin_transactions using
// the exact parser and tagging rules the app uses. Safe to re-run — rows that
// already exist are skipped by fingerprint.
//
//   node --experimental-strip-types --env-file=.env.local scripts/finance-load-history.mjs <file.csv:acct> ...
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { accountFromFileName, parseChaseCsv, tagTransaction, vendorKey } from "../src/lib/shop/finance.ts";

const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://scasgwrikoqdwlwlwcff.supabase.co";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ORG = process.env.SHOP_ORG_ID || "a0000000-0000-4000-8000-000000000001";
if (!KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function rest(path, init = {}) {
  const res = await fetch(`${URL}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

const rules = await rest(`kiw_fin_rules?select=id,pattern,direction,category,grp,owner,active&org_id=eq.${ORG}&active=is.true`);
let total = 0, added = 0;
const newest = {};

for (const arg of process.argv.slice(2)) {
  const [file, forced] = arg.split(":");
  const account = forced || accountFromFileName(basename(file));
  if (!account) throw new Error(`No account for ${file}`);
  const parsed = parseChaseCsv(readFileSync(file, "utf8"), account);
  const rows = parsed.rows.map((r) => ({ ...r, ...tagTransaction(r.description, r.amount, rules, r.posted_on), vendor: vendorKey(r.description), org_id: ORG }));
  let fileAdded = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const ins = await rest(`kiw_fin_transactions?on_conflict=org_id,fingerprint`, {
      method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=representation" }, body: JSON.stringify(rows.slice(i, i + 500)),
    });
    fileAdded += ins.length;
  }
  total += rows.length; added += fileAdded;
  if (parsed.newest && (!newest[account] || parsed.newest.posted_on >= newest[account].posted_on)) newest[account] = parsed.newest;
  console.log(`${basename(file)} (…${account}): ${rows.length} posted rows, ${fileAdded} new, ${parsed.skippedPending} pending skipped`);
}
for (const [account, n] of Object.entries(newest)) {
  await rest(`kiw_fin_accounts?org_id=eq.${ORG}&account=eq.${account}&or=(balance_on.is.null,balance_on.lte.${n.posted_on})`, {
    method: "PATCH", body: JSON.stringify({ balance: n.balance, balance_on: n.posted_on, updated_at: new Date().toISOString() }),
  });
  console.log(`Balance …${account}: ${n.balance} as of ${n.posted_on}`);
}
console.log(`Done: ${total} rows read, ${added} added.`);
