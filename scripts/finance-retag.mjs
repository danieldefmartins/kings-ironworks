// Re-apply the current tagging rules to transactions that were tagged
// automatically. Never touches rows an owner tagged by hand. Safe to re-run.
//
//   node --experimental-strip-types --no-warnings --env-file=.env.local scripts/finance-retag.mjs [--dry]
import { canBeDaniel, tagTransaction, vendorKey } from "../src/lib/shop/finance.ts";

const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://scasgwrikoqdwlwlwcff.supabase.co";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ORG = process.env.SHOP_ORG_ID || "a0000000-0000-4000-8000-000000000001";
const DRY = process.argv.includes("--dry");
if (!KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
async function rest(path, init = {}) {
  const res = await fetch(`${URL}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

const rules = await rest(`kiw_fin_rules?select=id,pattern,direction,category,grp,owner,active&org_id=eq.${ORG}&active=is.true`);
const rows = [];
for (let offset = 0; ; offset += 1000) {
  const page = await rest(`kiw_fin_transactions?select=id,posted_on,description,amount,vendor,category,grp,owner,tag_source,rule_id&org_id=eq.${ORG}&order=id&limit=1000&offset=${offset}`);
  rows.push(...page);
  if (page.length < 1000) break;
}

const groups = new Map(); // patch json -> ids
let changed = 0;
for (const r of rows) {
  const amount = Number(r.amount);
  let next;
  if (r.tag_source === "manual") {
    if (r.owner !== "daniel" || canBeDaniel(r.posted_on)) continue;
    next = { vendor: r.vendor, category: r.category, grp: r.grp, owner: "reginaldo", tag_source: "manual", rule_id: r.rule_id };
  } else {
    const t = tagTransaction(r.description, amount, rules, r.posted_on);
    next = { vendor: vendorKey(r.description), category: t.category, grp: t.grp, owner: t.owner, tag_source: t.tag_source, rule_id: t.rule_id };
  }
  const same = next.vendor === r.vendor && next.category === r.category && next.grp === r.grp && next.owner === r.owner && next.tag_source === r.tag_source && next.rule_id === r.rule_id;
  if (same) continue;
  changed++;
  const k = JSON.stringify(next);
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(r.id);
}

console.log(`${rows.length} transactions checked, ${changed} to update in ${groups.size} batches${DRY ? " (dry run)" : ""}`);
if (!DRY) {
  for (const [k, ids] of groups) {
    for (let i = 0; i < ids.length; i += 150) {
      await rest(`kiw_fin_transactions?org_id=eq.${ORG}&id=in.(${ids.slice(i, i + 150).join(",")})`, { method: "PATCH", body: k });
    }
  }
  console.log("Updated.");
}
