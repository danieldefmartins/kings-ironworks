// Company finance — server-only data access. Owner-only callers (checked in
// the pages and the API route); everything is scoped to this deployment's org.
import { ORG_ID, audit, listWorkers, sbInsert, sbInsertIgnoreDuplicates, sbSelect, sbUpdate } from "./db";
import { DANIEL_START, parseChaseCsv, tagTransaction, vendorKey, type FinGroup, type FinOwner, type FinRule, type FinTx } from "./finance";

const TX_FIELDS = "id,account,posted_on,description,amount,bank_type,balance,check_no,fingerprint,vendor,category,grp,owner,tag_source,rule_id,note";
const PAGE = 1000;

export interface FinAccount { account: string; name: string; balance: number | null; balance_on: string | null }

function toTx(r: FinTx & { amount: number | string; balance: number | string | null }): FinTx {
  return { ...r, amount: Number(r.amount), balance: r.balance === null ? null : Number(r.balance) };
}

async function pages(filter: string, order = "posted_on.desc,id.asc", max = 20000): Promise<FinTx[]> {
  const out: FinTx[] = [];
  for (let offset = 0; offset < max; offset += PAGE) {
    const page = await sbSelect<FinTx[]>("kiw_fin_transactions", `select=${TX_FIELDS}&org_id=eq.${ORG_ID}${filter}&order=${order}&limit=${PAGE}&offset=${offset}`);
    out.push(...page.map(toTx));
    if (page.length < PAGE) break;
  }
  return out;
}

export function listFinTransactions(opts: { from?: string | null; to?: string | null; account?: string | null } = {}): Promise<FinTx[]> {
  let f = "";
  if (opts.from) f += `&posted_on=gte.${opts.from}`;
  if (opts.to) f += `&posted_on=lte.${opts.to}`;
  if (opts.account && /^\d{4}$/.test(opts.account)) f += `&account=eq.${opts.account}`;
  return pages(f);
}

export function listReviewQueue(): Promise<FinTx[]> {
  return pages("&grp=eq.review", "posted_on.desc,id.asc");
}

export async function searchFinTransactions(opts: {
  q?: string; grp?: string; owner?: string; account?: string; month?: string; limit?: number; offset?: number;
}): Promise<FinTx[]> {
  let f = "";
  const q = (opts.q || "").replace(/[*,()]/g, " ").trim();
  if (q) f += `&description=ilike.${encodeURIComponent(`*${q}*`)}`;
  if (opts.grp && /^(revenue|expense|owner|transfer|review)$/.test(opts.grp)) f += `&grp=eq.${opts.grp}`;
  if (opts.owner && /^(kiw|daniel|reginaldo)$/.test(opts.owner)) f += `&owner=eq.${opts.owner}`;
  if (opts.account && /^\d{4}$/.test(opts.account)) f += `&account=eq.${opts.account}`;
  if (opts.month && /^\d{4}-\d{2}$/.test(opts.month)) {
    const [y, m] = opts.month.split("-").map(Number);
    const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
    f += `&posted_on=gte.${opts.month}-01&posted_on=lt.${next}`;
  }
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  const rows = await sbSelect<FinTx[]>("kiw_fin_transactions", `select=${TX_FIELDS}&org_id=eq.${ORG_ID}${f}&order=posted_on.desc,id.asc&limit=${limit}&offset=${Math.max(opts.offset ?? 0, 0)}`);
  return rows.map(toTx);
}

export async function listFinRules(): Promise<FinRule[]> {
  return sbSelect<FinRule[]>("kiw_fin_rules", `select=id,pattern,direction,category,grp,owner,active&org_id=eq.${ORG_ID}&active=is.true`);
}

export async function listFinAccounts(): Promise<FinAccount[]> {
  const rows = await sbSelect<(FinAccount & { balance: string | number | null })[]>("kiw_fin_accounts", `select=account,name,balance,balance_on&org_id=eq.${ORG_ID}&order=account.asc`);
  return rows.map((r) => ({ ...r, balance: r.balance === null ? null : Number(r.balance) }));
}

export interface ImportResult { parsed: number; added: number; duplicates: number; pending: number; toReview: number; balance: { balance: number; posted_on: string } | null }

/** Parse a Chase CSV, tag every row, and add only the rows we have not seen before. */
export async function importChaseCsv(account: string, csv: string, workerId: string | null): Promise<ImportResult> {
  const parsed = parseChaseCsv(csv, account);
  const [rules, workers] = await Promise.all([listFinRules(), listWorkers()]);
  // Owners are never "payroll": a Zelle to Daniel or Kayky is personal money.
  const workerNames = workers.filter((w) => !(w.is_admin && w.can_see_prices)).map((w) => w.name);
  const rows = parsed.rows.map((r) => {
    const tag = tagTransaction(r.description, r.amount, rules, r.posted_on, workerNames);
    return { ...r, ...tag, org_id: ORG_ID, vendor: vendorKey(r.description) };
  });
  let added = 0, toReview = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const inserted = await sbInsertIgnoreDuplicates<{ grp: FinGroup }[]>("kiw_fin_transactions", rows.slice(i, i + 500), "org_id,fingerprint");
    added += inserted.length;
    toReview += inserted.filter((r) => r.grp === "review").length;
  }
  if (parsed.newest) {
    const [acct] = await sbSelect<FinAccount[]>("kiw_fin_accounts", `select=account,name,balance,balance_on&org_id=eq.${ORG_ID}&account=eq.${account}`);
    if (!acct) {
      await sbInsert("kiw_fin_accounts", { org_id: ORG_ID, account, name: `Account …${account}`, balance: parsed.newest.balance, balance_on: parsed.newest.posted_on });
    } else if (!acct.balance_on || parsed.newest.posted_on >= acct.balance_on) {
      await sbUpdate("kiw_fin_accounts", `org_id=eq.${ORG_ID}&account=eq.${account}`, { balance: parsed.newest.balance, balance_on: parsed.newest.posted_on, updated_at: new Date().toISOString() });
    }
  }
  const result = { parsed: rows.length, added, duplicates: rows.length - added, pending: parsed.skippedPending, toReview, balance: parsed.newest };
  await audit("finance_import", { workerId, entity: "fin_account", detail: { account, ...result } });
  return result;
}

export interface FinTagInput { grp: FinGroup; owner: FinOwner | null; category: string; note?: string | null }

/** Tag specific transactions by hand. Manual tags are never overwritten by rules. */
export async function tagFinTransactions(ids: string[], tag: FinTagInput, workerId: string): Promise<number> {
  if (!ids.length) return 0;
  if (tag.owner === "daniel") {
    const early = await sbSelect<{ id: string }[]>("kiw_fin_transactions", `select=id&org_id=eq.${ORG_ID}&id=in.(${ids.join(",")})&posted_on=lt.${DANIEL_START}`);
    if (early.length) throw new Error("Daniel joined KIW in March 2026 — this is from before that. Choose Reginaldo or KIW.");
  }
  const patch: Record<string, unknown> = {
    grp: tag.grp, owner: tag.owner, category: tag.category,
    tag_source: tag.grp === "review" ? "auto" : "manual", rule_id: null,
    reviewed_by: tag.grp === "review" ? null : workerId, reviewed_at: tag.grp === "review" ? null : new Date().toISOString(),
  };
  if (tag.note !== undefined) patch.note = tag.note;
  const updated = await sbUpdate<{ id: string }[]>("kiw_fin_transactions", `org_id=eq.${ORG_ID}&id=in.(${ids.join(",")})`, patch);
  await audit("finance_tag", { workerId, entity: "fin_transaction", detail: { ids, ...tag } });
  return updated.length;
}

/**
 * "Everything from this merchant is X": save a rule (replacing any earlier
 * rule for the same merchant and direction) and apply it to every existing
 * transaction from that merchant that was not tagged individually by hand.
 */
export async function applyVendorRule(vendor: string, direction: "in" | "out", tag: FinTagInput, workerId: string): Promise<number> {
  if (tag.grp === "review") throw new Error("A rule must decide something");
  await sbUpdate("kiw_fin_rules", `org_id=eq.${ORG_ID}&pattern=eq.${encodeURIComponent(vendor)}&direction=eq.${direction}&active=is.true`, { active: false });
  const [rule] = await sbInsert<FinRule[]>("kiw_fin_rules", {
    org_id: ORG_ID, pattern: vendor, direction, category: tag.category, grp: tag.grp, owner: tag.owner, created_by: workerId,
  });
  const base = `org_id=eq.${ORG_ID}&vendor=eq.${encodeURIComponent(vendor)}&amount=${direction === "out" ? "lt" : "gt"}.0&tag_source=neq.manual`;
  const patch = { grp: tag.grp, owner: tag.owner, category: tag.category, tag_source: "rule", rule_id: rule.id, reviewed_by: workerId, reviewed_at: new Date().toISOString() };
  let updated: { id: string }[];
  if (tag.owner === "daniel") {
    // Before Daniel joined, the same merchant's charges can only be Reginaldo's.
    const [late, early] = await Promise.all([
      sbUpdate<{ id: string }[]>("kiw_fin_transactions", `${base}&posted_on=gte.${DANIEL_START}`, patch),
      sbUpdate<{ id: string }[]>("kiw_fin_transactions", `${base}&posted_on=lt.${DANIEL_START}`, { ...patch, owner: "reginaldo" }),
    ]);
    updated = [...late, ...early];
  } else {
    updated = await sbUpdate<{ id: string }[]>("kiw_fin_transactions", base, patch);
  }
  await audit("finance_rule", { workerId, entity: "fin_rule", entityId: rule.id, detail: { vendor, direction, ...tag, applied: updated.length } });
  return updated.length;
}

export async function getFinTransaction(id: string): Promise<FinTx | null> {
  const [row] = await sbSelect<FinTx[]>("kiw_fin_transactions", `select=${TX_FIELDS}&org_id=eq.${ORG_ID}&id=eq.${id}`);
  return row ? toTx(row) : null;
}

/** Business expenses that still need a category ("Add category" tab). */
export function listNeedsCategory(): Promise<FinTx[]> {
  return pages(`&grp=eq.expense&category=eq.Uncategorized`, "posted_on.desc,id.asc");
}

async function countWhere(filter: string): Promise<number> {
  let n = 0;
  for (let offset = 0; offset < 50000; offset += PAGE) {
    const page = await sbSelect<{ id: string }[]>("kiw_fin_transactions", `select=id&org_id=eq.${ORG_ID}${filter}&limit=${PAGE}&offset=${offset}`);
    n += page.length;
    if (page.length < PAGE) break;
  }
  return n;
}

/** Badge counts for the finance tabs. */
export async function financeCounts(): Promise<{ review: number; uncategorized: number }> {
  const [review, uncategorized] = await Promise.all([countWhere("&grp=eq.review"), countWhere("&grp=eq.expense&category=eq.Uncategorized")]);
  return { review, uncategorized };
}

export interface CashEntryInput { id: string; date: string; description: string; amount: number; tag: FinTagInput }

/** Record cash paid or received by hand. `id` is a client request UUID, so a retried save never duplicates. */
export async function addCashEntry(input: CashEntryInput, workerId: string): Promise<boolean> {
  if (input.tag.grp === "review") throw new Error("Choose who the cash belongs to");
  if (input.tag.owner === "daniel" && input.date < DANIEL_START) throw new Error("Daniel joined KIW in March 2026 — this is from before that. Choose Reginaldo or KIW.");
  const inserted = await sbInsertIgnoreDuplicates<{ id: string }[]>("kiw_fin_transactions", [{
    id: input.id, org_id: ORG_ID, account: "cash", posted_on: input.date, description: input.description.trim(),
    amount: input.amount, bank_type: "CASH", balance: null, check_no: null, fingerprint: `cash|${input.id}`,
    vendor: vendorKey(input.description), category: input.tag.category, grp: input.tag.grp, owner: input.tag.owner,
    tag_source: "manual", rule_id: null, note: input.tag.note ?? null, reviewed_by: workerId, reviewed_at: new Date().toISOString(), created_by: workerId,
  }], "org_id,fingerprint");
  await audit("finance_cash_entry", { workerId, entity: "fin_transaction", entityId: input.id, detail: input });
  return inserted.length > 0;
}
