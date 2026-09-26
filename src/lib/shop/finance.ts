// Company finance — pure logic shared by the server, the browser, and the
// one-off history loader. No imports on purpose: it must run under plain
// `node --experimental-strip-types` as well as inside Next.js.
//
// Every bank transaction lands in exactly one group:
//   revenue   money from customers
//   expense   a KIW business cost (owner = kiw)
//   owner     personal money for Daniel or Reginaldo. Negative = draw,
//             positive = the owner put money into the company.
//   transfer  moving money between the two KIW accounts, refunds — not P&L
//   review    not known yet; an owner decides, once per merchant

export type FinGroup = "revenue" | "expense" | "owner" | "transfer" | "review";
export type FinOwner = "kiw" | "daniel" | "reginaldo";
export type TagSource = "auto" | "rule" | "manual";

export interface FinTag {
  category: string;
  grp: FinGroup;
  owner: FinOwner | null;
  tag_source: TagSource;
  rule_id: string | null;
}

export interface FinTx extends FinTag {
  id?: string;
  account: string;
  posted_on: string; // YYYY-MM-DD
  description: string;
  amount: number;
  bank_type: string | null;
  balance: number | null;
  check_no: string | null;
  fingerprint: string;
  vendor: string;
  note?: string | null;
}

export interface FinRule {
  id: string;
  pattern: string; // a vendor key, matched exactly
  direction: "in" | "out";
  category: string;
  grp: Exclude<FinGroup, "review">;
  owner: FinOwner | null;
  active: boolean;
}

export const KIW_ACCOUNTS: Record<string, string> = {
  "1752": "King Iron Works LLC",
  "3971": "King Iron Group Inc",
};

export const OWNER_LABEL: Record<FinOwner, string> = { kiw: "KIW", daniel: "Daniel", reginaldo: "Reginaldo" };

export const EXPENSE_CATEGORIES = [
  "Materials & steel",
  "Home Depot & hardware stores",
  "Supplies",
  "Labor & subcontractors",
  "Equipment & truck rental",
  "Tools & equipment",
  "Shop supplies & gas",
  "Rent & utilities",
  "Vehicles & fuel",
  "Insurance",
  "Taxes & licenses",
  "Professional services",
  "Commissions",
  "Management & marketing (Daniel)",
  "Software & marketing",
  "Meals",
  "Travel",
  "Bank & card fees",
  "Loan & financing",
  "Credit card payment",
  "Office & other",
  "Uncategorized",
] as const;
/** Business expense whose category is not known yet — shows in the "Add category" tab. */
export const UNCATEGORIZED = "Uncategorized";

export const OWNER_CATEGORIES = [
  "Zelle to owner",
  "Personal (other)",
  "Restaurants",
  "Travel / hotels",
  "Credit card",
  "Online purchase",
  "Mortgage",
  "Apartment rent",
  "Car",
  "Child support",
  "Attorney",
  "Kids' school",
  "Personal taxes",
  "Haircut",
  "Transfer to personal account",
  "PayPal",
  "Church / donations",
  "Owner money in",
] as const;

export const INCOME_CATEGORIES = ["Customer payment", "Other income"] as const;
export const TRANSFER_CATEGORIES = ["Between KIW accounts", "Refund / reversal", "Loan received", "Not income / ignore"] as const;

// ---------------------------------------------------------------- parsing

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

function isoDate(mdy: string): string | null {
  const m = mdy.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

export interface ParsedRow {
  account: string;
  posted_on: string;
  description: string;
  amount: number;
  bank_type: string | null;
  balance: number | null;
  check_no: string | null;
  fingerprint: string;
}

export interface ParsedFile {
  rows: ParsedRow[];
  skippedPending: number;
  newest: { balance: number; posted_on: string } | null;
}

/** Guess the account from a Chase export file name like Chase1752_Activity_20260925.csv */
export function accountFromFileName(name: string): string | null {
  const m = name.match(/chase(\d{4})/i);
  return m ? m[1] : null;
}

/**
 * Parse a Chase "Download account activity" CSV. Pending rows (no running
 * balance) are skipped: their description changes when they post, so they
 * would duplicate. Identical rows on the same day are kept as separate
 * transactions (two $5 coffees are two coffees) by numbering them.
 */
export function parseChaseCsv(text: string, account: string): ParsedFile {
  if (!/^\d{4}$/.test(account)) throw new Error("Account must be the last 4 digits");
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { rows: [], skippedPending: 0, newest: null };
  const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const iDate = col("posting date"), iDesc = col("description"), iAmt = col("amount");
  const iType = col("type"), iBal = col("balance"), iCheck = col("check or slip #");
  if (iDate < 0 || iDesc < 0 || iAmt < 0) throw new Error("This does not look like a Chase account activity CSV");

  const seen = new Map<string, number>();
  const rows: ParsedRow[] = [];
  let skippedPending = 0;
  let newest: ParsedFile["newest"] = null;
  for (let i = 1; i < lines.length; i++) {
    const f = parseCsvLine(lines[i]);
    const posted_on = isoDate(f[iDate] || "");
    const amount = Number((f[iAmt] || "").replace(/[$,]/g, ""));
    const description = squash(f[iDesc] || "");
    if (!posted_on || !description || !Number.isFinite(amount)) continue;
    const balRaw = iBal >= 0 ? (f[iBal] || "").trim().replace(/[$,]/g, "") : "";
    if (!balRaw) { skippedPending++; continue; }
    const balance = Number(balRaw);
    const base = `${account}|${posted_on}|${description.toLowerCase()}|${amount.toFixed(2)}`;
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    if (!newest || posted_on > newest.posted_on) newest = { balance, posted_on };
    rows.push({
      account,
      posted_on,
      description,
      amount: Math.round(amount * 100) / 100,
      bank_type: iType >= 0 ? (f[iType] || "").trim() || null : null,
      balance: Number.isFinite(balance) ? balance : null,
      check_no: iCheck >= 0 ? (f[iCheck] || "").trim() || null : null,
      fingerprint: `${base}|${n}`,
    });
  }
  return { rows, skippedPending, newest };
}

// ---------------------------------------------------------------- vendors

const NOISE = new Set(["pos", "debit", "card", "purchase", "sq", "tst", "dd", "the", "recurring", "with", "pin", "ma", "nh", "ny", "ca", "tx", "wa", "ri", "ct", "fl", "ga", "az", "or", "co", "oh", "mn", "nj", "il", "de", "www", "com", "inc", "llc", "bill"]);

function zelleName(desc: string): string {
  const m = desc.match(/zelle\s+(?:payment\s+)?(?:to|from)\s+(.*)/i);
  const rest = m ? m[1] : desc;
  const toks = rest.trim().split(/\s+/);
  while (toks.length > 1 && /\d/.test(toks[toks.length - 1]) && toks[toks.length - 1].length >= 5) toks.pop();
  return toks.join(" ").replace(/[;,].*$/, "").trim();
}

/** A stable, readable merchant key. Rules match on it exactly. */
export function vendorKey(description: string): string {
  const d = squash(description);
  const low = d.toLowerCase();
  const cash = low.match(/^cash (to|from) ([a-z][a-z .'-]*?)(?:\s+[—-].*)?$/);
  if (cash) return `cash ${cash[1]} ${cash[2].trim()}`;
  if (/zelle/.test(low)) return `zelle ${/payment from|zelle from/.test(low) ? "from" : "to"} ${zelleName(d).toLowerCase()}`;
  const xfer = low.match(/online transfer (to|from) (?:chk|sav)\s*\.\.\.(\d{4})/);
  if (xfer) return `transfer ${xfer[1]} ${xfer[2]}`;
  const chk = low.match(/^check\s*#?\s*(\d+)/);
  if (chk) return `check ${chk[1]}`;
  if (/united rentals/.test(low)) return "united rentals";
  if (/u-?haul/.test(low)) return "u-haul";
  const card = low.match(/payment to chase card ending in (\d{4})/);
  if (card) return `chase card ${card[1]}`;
  const star = low.match(/^(google|amazon|apple\.com|paypal|sq|tst)\s*\*\s*([a-z]+)/);
  if (star && star[1] === "google") return `google ${star[2].replace(/\d+$/, "")}`;
  const ach = d.match(/ORIG CO NAME:\s*(.*?)\s+ORIG ID/i);
  if (ach) return `ach ${squash(ach[1]).toLowerCase()}`;
  const words = low
    .replace(/\(\.\.\.\d+\)/g, " ")
    .replace(/\d{1,2}\/\d{1,2}(\/\d{2,4})?/g, " ")
    .split(/[^a-z&]+/)
    .filter((w) => w && (w.length > 1 || w === "&") && !NOISE.has(w));
  if (!words.length) return low.slice(0, 40);
  if (words[0].length >= 5) return words[0];
  if (words[1] === "&" && words[2]) return `${words[0]} & ${words[2]}`;
  return words.slice(0, 2).join(" ");
}

// ---------------------------------------------------------------- tagging

// Zelle recipients already identified by Daniel (June 2026 labeling sheets).
const ZELLE_EXPENSE: Record<string, string> = {
  "kaio henrrique barbosa": "Labor & subcontractors", kaio: "Labor & subcontractors",
  alexandra: "Labor & subcontractors", "jairo abenoado": "Labor & subcontractors",
  "maik schulz marcio": "Labor & subcontractors", "675 978 962 8824 ( zelly) jeme": "Labor & subcontractors",
  marcelo: "Labor & subcontractors", "lucas de oliveira": "Labor & subcontractors",
  "day pool installation inc accounts": "Labor & subcontractors", gustavo: "Labor & subcontractors",
  "fabiano santos": "Labor & subcontractors", "new england trust painting and carp": "Labor & subcontractors",
  "miguel rodrigues": "Labor & subcontractors", leticia: "Labor & subcontractors",
  "ananias de lima": "Labor & subcontractors", "mayra santiago s": "Labor & subcontractors",
  "joelio xavierdearagao": "Labor & subcontractors", // electrician (Daniel, 2026-09-25)
  "grace rent office": "Rent & utilities", "jorge silva family church": "Rent & utilities", cleaning: "Rent & utilities",
  "kevin ribeiro arquiteto amigo ma": "Professional services", "davi lazzaroto": "Professional services",
  "what to wear inc": "Professional services",
  // 360 For Business is Daniel's agency — a KIW expense, not a payment to Daniel himself.
  "360 for business llc": "Management & marketing (Daniel)", "360forbusiness": "Management & marketing (Daniel)",
};
// Daniel, 2026-09-25: Zelle straight to Daniel or Kayky (Reginaldo) is personal; Aline's are Daniel's.
const ZELLE_OWNER: Record<string, [FinOwner, string]> = {
  "daniel de freitas martins": ["daniel", "Zelle to owner"], "kayky designer": ["reginaldo", "Zelle to owner"],
  "great rock church": ["reginaldo", "Kids' school"],
  "daniel partner group": ["daniel", "Personal (other)"], "aline martins": ["daniel", "Personal (other)"],
  "bash construction group llc": ["daniel", "Personal (other)"],
  "camila alvez": ["reginaldo", "Personal (other)"], "raquel hebreia": ["reginaldo", "Personal (other)"],
  camila: ["reginaldo", "Personal (other)"], "tainara melo": ["reginaldo", "Personal (other)"],
  "flavia mello cape cod": ["reginaldo", "Personal (other)"], marcela: ["reginaldo", "Personal (other)"],
  lucelia: ["reginaldo", "Personal (other)"], "manuel pacheco personal trainner": ["reginaldo", "Personal (other)"],
  "family church": ["reginaldo", "Church / donations"], "doras hars stailes": ["reginaldo", "Personal (other)"],
  robinho: ["reginaldo", "Personal (other)"], "maurao lanche malden": ["reginaldo", "Restaurants"],
  gaby: ["reginaldo", "Child support"], "margarida attorney": ["reginaldo", "Attorney"],
  "braga attorney": ["reginaldo", "Attorney"], "guilherme cabeleleiro robinho": ["reginaldo", "Haircut"],
};
const ZELLE_SELF = new Set(["daniel martins", "king iron works llc"]);
const KNOWN_CHECKS: Record<string, [FinGroup, FinOwner | null, string]> = {
  "155": ["expense", "kiw", "Materials & steel"], "123": ["expense", "kiw", "Labor & subcontractors"],
  "122": ["expense", "kiw", "Labor & subcontractors"], "119": ["expense", "kiw", "Commissions"],
  "124": ["expense", "kiw", "Taxes & licenses"], "125": ["expense", "kiw", "Taxes & licenses"],
  "127": ["expense", "kiw", "Shop supplies & gas"], "128": ["expense", "kiw", "Materials & steel"],
  "126": ["owner", "reginaldo", "Attorney"],
};
// Transfers to these accounts leave the company: they are Reginaldo's personal
// accounts (HIGH SCHOOL CHECKING, PREMIER PLUS CKG, PLAT BUS CHECKING). Daniel, 2026-09-25.
const REGINALDO_ACCOUNTS = new Set(["8706", "1487", "7961"]);

export const RESTAURANT_RE = /\btst\*|toast|restaurant|popeye|dryft|mineirao|comida|doordash|uber ?eats|grubhub|dunkin|starbucks|mcdonald|chipotle|pizza|lanche|padaria|bakery|bakeh|coffee|cafe|grill|steakhouse|sushi|taco|burger|panera|santanas|romeu|mooyah|friday|temazcal|wendy|subway|chick-fil|kfc|diner|bistro|kitchen/i;
export const HOTEL_RE = /priceln|staybridge|expedia|booking\.com|marriott|hilton|hyatt|\bsuites\b|resort|airbnb|hotel|motel|\binn\b|holiday inn|jetblue|delta air|american air|united air|spirit air|southwest/i;
export const CARD_PAYMENT_RE = /payment to chase card|chase card ending|aspire mastercard|applecard|capital one.*pymt|amex epayment|discover e-payment|citi (card|autopay)|synchrony|cardmember/i;
export const ONLINE_RE = /amazon|amzn|walmart|wal-mart|target|staples|nutrafol|adobe|facebk|facebook|godaddy|spotify|google (?!\*workspace)|openai|anthropic|claude\.ai|canva|mailchimp|hostinger|squarespace|wix|namecheap|apple\.com|experian|netflix|hulu|paramount|disney|youtube|ebay|etsy|temu|shein|best buy|homegoods|tj ?maxx|marshalls|ross stores/i;

const rev = (category: string): Omit<FinTag, "tag_source" | "rule_id"> => ({ category, grp: "review", owner: null });
const exp = (category: string): Omit<FinTag, "tag_source" | "rule_id"> => ({ category, grp: "expense", owner: "kiw" });
const own = (owner: FinOwner, category: string): Omit<FinTag, "tag_source" | "rule_id"> => ({ category, grp: "owner", owner });

/** The built-in knowledge. Owner-taught rules are checked first (see tagTransaction). */
export function autoTag(description: string, amount: number): Omit<FinTag, "tag_source" | "rule_id"> {
  const desc = squash(description);
  const d = desc.toLowerCase();
  const out = amount < 0;

  const acct = d.match(/online transfer (to|from) (?:chk|sav)\s*\.\.\.(\d{4})/);
  if (acct) {
    if (REGINALDO_ACCOUNTS.has(acct[2])) return own("reginaldo", out ? "Transfer to personal account" : "Owner money in");
    if (KIW_ACCOUNTS[acct[2]]) return { category: "Between KIW accounts", grp: "transfer", owner: null };
    return rev(out ? "Transfer to another account" : "Transfer from another account");
  }

  if (/zelle/.test(d)) {
    const name = zelleName(desc).toLowerCase();
    if (!out) {
      if (ZELLE_SELF.has(name)) return { category: "Between KIW accounts", grp: "transfer", owner: null };
      return { category: "Customer payment", grp: "revenue", owner: null };
    }
    if (ZELLE_EXPENSE[name]) return exp(ZELLE_EXPENSE[name]);
    if (ZELLE_OWNER[name]) return own(ZELLE_OWNER[name][0], ZELLE_OWNER[name][1]);
    return rev("Labor & subcontractors");
  }

  // Personal obligations already identified by vendor.
  if (/chasehomefinance|ln pmt/.test(d)) return own("reginaldo", "Mortgage");
  if (/ysi\*|the revere/.test(d)) return own("reginaldo", "Apartment rent");
  if (/usataxpymt/.test(d)) return own("reginaldo", "Personal taxes");
  if (/great rock chur/.test(d)) return own("reginaldo", "Kids' school");
  if (/stellantis/.test(d)) return own("daniel", "Car");
  if (/capital one|capitalone|\bcof\b/.test(d)) return own("daniel", "Car");
  if (/sparrow card/.test(d)) return own("daniel", "Credit card");
  if (/paypal/.test(d) && out) return own("reginaldo", "PayPal");
  if (/venmo/.test(d) && /rodrigues regi/.test(d) && !out) return own("reginaldo", "Owner money in");

  const chk = d.match(/^check\s*#?\s*(\d+)/);
  if (chk) {
    const k = KNOWN_CHECKS[chk[1]];
    if (k) return k[0] === "owner" ? own(k[1] as FinOwner, k[2]) : exp(k[2]);
    return rev(UNCATEGORIZED);
  }

  // Daniel, 2026-09-25: money coming in is always a customer payment. Only
  // moves between our own accounts and bank fee reversals are not.
  if (!out) {
    if (/reversal|refund|return/.test(d)) return { category: "Refund / reversal", grp: "transfer", owner: null };
    // Daniel, 2026-09-25: Direct Merchants is a loan — the money it sent is not revenue.
    if (/direct merch|dirct mer/.test(d)) return { category: "Loan received", grp: "transfer", owner: null };
    return { category: "Customer payment", grp: "revenue", owner: null };
  }

  if (/tavvy/.test(d)) return rev("Software & marketing");
  // Weekly loan payments to Direct Merchants (plus its daily collection debit).
  if (/dirct mer col|direct merch/.test(d)) return exp("Loan & financing");
  // Daniel, 2026-09-25: paying the Chase business cards is a KIW expense.
  if (/payment to chase card|chase card ending/.test(d)) return exp("Credit card payment");
  if (CARD_PAYMENT_RE.test(d) || (/orig co name/.test(d) && /home depot|citi|synchrony|comenity|barclays|amex|discover/.test(d))) return rev("Credit card payment");
  if (RESTAURANT_RE.test(d)) return rev("Meals");
  if (HOTEL_RE.test(d)) return rev("Travel");

  if (/google \*ads|highlevel|gohighlevel/.test(d)) return exp("Software & marketing");
  // Daniel, 2026-09-25: equipment and truck rentals are always KIW.
  if (/united rentals|u-?haul|sunbelt rentals|herc rentals|tool rental|penske|ryder truck|budget truck|nes rentals|equipment rental/.test(d)) return exp("Equipment & truck rental");
  // Daniel, 2026-09-25: Home Depot, Lowe's, Ace and Harbor Freight are one category; Amazon is supplies.
  if (/home depot|lowe'?s|ace hardware|ace hdw|harbor freight/.test(d)) return exp("Home Depot & hardware stores");
  if (/amazon|amzn/.test(d)) return exp("Supplies");
  if (/\bsteel\b|architectural iron|metal|boulter plywood|db national|fastenal|grainger/.test(d)) return exp("Materials & steel");
  if (/tractor supply|northern tool/.test(d)) return exp("Tools & equipment");
  if (/middlesex gases|airgas|welding/.test(d)) return exp("Shop supplies & gas");
  if (/magna finance|hartford|thrust insurance|geico|progressive|liberty mutual/.test(d)) return exp("Insurance");
  if (/dept of rev|\bdor\b|mass dor|irs\b|secretary of state|town of|city of/.test(d)) return exp("Taxes & licenses");
  if (/adp |payroll|gusto/.test(d)) return exp("Professional services");
  if (/monthly service fee|overdraft|service charge|atm fee|nsf|returned item|quickbooks payments|intuit/.test(d)) return exp("Bank & card fees");
  if (/google \*workspace|ipostal/.test(d)) return exp("Software & marketing");
  if (/speedway|gulf |shell |mobil|exxon|sunoco| bp |citgo|chevron|valero|irving|cumberland farms|\bgas\b/.test(d)) return exp("Vehicles & fuel");
  if (/car wash|sparkling image|autozone|o.?reilly|jiffy|ez ?pass|toll|parking|rmv|registry/.test(d)) return exp("Vehicles & fuel");

  if (ONLINE_RE.test(d)) return rev(/adobe|facebk|facebook|godaddy|google|openai|anthropic|canva|mailchimp|hostinger|squarespace|wix|namecheap|experian/.test(d) ? "Software & marketing" : UNCATEGORIZED);
  if (/stop & shop|market basket|costco|dollar general|whole foods|trader joe/.test(d)) return rev(UNCATEGORIZED);
  if (/silva braga|braga & scherr|attorney|law office|legal/.test(d)) return rev("Professional services");
  if (/church|ministry|igreja|tithe/.test(d)) return own("reginaldo", "Church / donations");
  if (/stellantis|santander|ally |gm financial/.test(d)) return rev("Loan & financing");
  return rev(UNCATEGORIZED);
}

/** Daniel joined KIW in March 2026 — nothing earlier can be his (Daniel, 2026-09-25). */
export const DANIEL_START = "2026-03-01";
export const canBeDaniel = (postedOn?: string | null) => !postedOn || postedOn >= DANIEL_START;

/**
 * Decisions Daniel already made for older periods (June 2026 labeling):
 * restaurants/food Jan–Apr 2026 were Reginaldo's; hotels Jan–Feb were KIW
 * business travel and Mar–Jun were Reginaldo's. Haircuts before May were
 * Reginaldo's; later ones were shared, so they are asked about one by one.
 */
function applyHistory(tag: Omit<FinTag, "tag_source" | "rule_id">, description: string, amount: number, postedOn: string) {
  if (amount >= 0) return tag;
  const kind = reviewKind({ description, amount });
  const d = description.toLowerCase();
  if (tag.grp === "review" && (kind === "restaurants" || /stop & shop|market basket|costco|whole foods|trader joe/.test(d)) && postedOn < "2026-05-01")
    return { category: "Restaurants", grp: "owner" as const, owner: "reginaldo" as const };
  if (tag.grp === "review" && kind === "hotels" && postedOn < "2026-07-01")
    return postedOn < DANIEL_START ? { category: "Travel", grp: "expense" as const, owner: "kiw" as const } : { category: "Travel / hotels", grp: "owner" as const, owner: "reginaldo" as const };
  if (tag.category === "Haircut" && postedOn >= "2026-05-01") return { category: "Haircut", grp: "review" as const, owner: null };
  return tag;
}

/** True when a Zelle recipient is one of our payroll workers (names from the shop's worker list). */
export function isPayrollWorker(zelleRecipient: string, workerNames: string[]): boolean {
  const z = zelleRecipient.toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
  if (!z) return false;
  return workerNames.some((raw) => {
    const w = raw.toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
    if (!w || /^(office|helper( \d+)?)$/.test(w)) return false;
    const parts = w.split(" ");
    // Full names must match all their words; a single-name worker matches the first name.
    return parts.length > 1 ? parts.every((p) => z.split(" ").includes(p)) : z.split(" ")[0] === w;
  });
}

// Payees who are Daniel. Before he joined (March 2026) a payment to him was a
// KIW service fee, not anybody's personal spending.
const DANIEL_PAYEE = /zelle to (daniel de freitas martins|daniel partner group|aline martins|bash construction group llc)$/;

export function tagTransaction(description: string, amount: number, rules: FinRule[], postedOn?: string, workerNames: string[] = []): FinTag {
  const vendor = vendorKey(description);
  const direction = amount < 0 ? "out" : "in";
  const rule = rules.find((r) => r.active && r.pattern === vendor && r.direction === direction);
  let tag: FinTag;
  if (rule) tag = { category: rule.category, grp: rule.grp, owner: rule.owner, tag_source: "rule", rule_id: rule.id };
  else if (direction === "out" && vendor.startsWith("zelle to ") && isPayrollWorker(vendor.slice(9), workerNames))
    tag = { category: "Labor & subcontractors", grp: "expense", owner: "kiw", tag_source: "auto", rule_id: null };
  else tag = { ...(postedOn ? applyHistory(autoTag(description, amount), description, amount, postedOn) : autoTag(description, amount)), tag_source: "auto", rule_id: null };
  if (tag.owner === "daniel" && !canBeDaniel(postedOn)) {
    tag = DANIEL_PAYEE.test(vendor) ? { ...tag, grp: "expense", owner: "kiw", category: "Management & marketing (Daniel)" } : { ...tag, owner: "reginaldo" };
  }
  return tag;
}

/** What kind of question the review queue should ask about this transaction. */
export type ReviewKind = "restaurants" | "hotels" | "cards" | "online" | "zelle" | "income" | "other";
export function reviewKind(tx: { description: string; amount: number }): ReviewKind {
  const d = tx.description.toLowerCase();
  if (tx.amount > 0) return "income";
  if (CARD_PAYMENT_RE.test(d) || (/orig co name/.test(d) && /home depot|citi|synchrony|comenity|barclays|amex|discover/.test(d))) return "cards";
  if (RESTAURANT_RE.test(d)) return "restaurants";
  if (HOTEL_RE.test(d)) return "hotels";
  if (/zelle|^check/.test(d)) return "zelle";
  if (ONLINE_RE.test(d)) return "online";
  return "other";
}

// ---------------------------------------------------------------- math

export interface FinSummary {
  revenue: number;
  expenses: number;
  profit: number;
  margin: number | null;
  draws: Record<"daniel" | "reginaldo", number>; // net money taken out (positive = out)
  review: { count: number; total: number };
  byCategory: { name: string; amount: number; count: number }[];
  topVendors: { name: string; amount: number; count: number }[];
  laborPayees: { name: string; amount: number; count: number }[];
  ownerCategories: Record<"daniel" | "reginaldo", { name: string; amount: number; count: number }[]>;
  months: { month: string; revenue: number; expenses: number; draws: number }[];
}

function rollup(items: { key: string; amount: number }[], limit?: number) {
  const m = new Map<string, { name: string; amount: number; count: number }>();
  for (const it of items) {
    const e = m.get(it.key) || { name: it.key, amount: 0, count: 0 };
    e.amount += it.amount;
    e.count++;
    m.set(it.key, e);
  }
  const out = [...m.values()].filter((e) => Math.abs(e.amount) >= 0.005).sort((a, b) => b.amount - a.amount);
  return limit ? out.slice(0, limit) : out;
}

const cents = (n: number) => Math.round(n * 100) / 100;

export function summarize(txs: Pick<FinTx, "posted_on" | "amount" | "grp" | "owner" | "category" | "vendor">[]): FinSummary {
  let revenue = 0, expenses = 0;
  const draws = { daniel: 0, reginaldo: 0 };
  const review = { count: 0, total: 0 };
  const cat: { key: string; amount: number }[] = [];
  const ven: { key: string; amount: number }[] = [];
  const lab: { key: string; amount: number }[] = [];
  const ownCat = { daniel: [] as { key: string; amount: number }[], reginaldo: [] as { key: string; amount: number }[] };
  const months = new Map<string, { month: string; revenue: number; expenses: number; draws: number }>();
  for (const t of txs) {
    const month = t.posted_on.slice(0, 7);
    const mo = months.get(month) || { month, revenue: 0, expenses: 0, draws: 0 };
    months.set(month, mo);
    if (t.grp === "revenue") { revenue += t.amount; mo.revenue += t.amount; }
    else if (t.grp === "expense") {
      expenses -= t.amount; mo.expenses -= t.amount;
      cat.push({ key: t.category, amount: -t.amount });
      ven.push({ key: t.vendor, amount: -t.amount });
      if (t.category === "Labor & subcontractors") lab.push({ key: t.vendor.replace(/^(zelle|cash) to /, ""), amount: -t.amount });
    } else if (t.grp === "owner" && (t.owner === "daniel" || t.owner === "reginaldo")) {
      draws[t.owner] -= t.amount; mo.draws -= t.amount;
      ownCat[t.owner].push({ key: t.category, amount: -t.amount });
    } else if (t.grp === "review") { review.count++; review.total += Math.abs(t.amount); }
  }
  const profit = revenue - expenses;
  return {
    revenue: cents(revenue),
    expenses: cents(expenses),
    profit: cents(profit),
    margin: revenue > 0 ? profit / revenue : null,
    draws: { daniel: cents(draws.daniel), reginaldo: cents(draws.reginaldo) },
    review: { count: review.count, total: cents(review.total) },
    byCategory: rollup(cat),
    topVendors: rollup(ven, 12),
    laborPayees: rollup(lab, 12),
    ownerCategories: { daniel: rollup(ownCat.daniel), reginaldo: rollup(ownCat.reginaldo) },
    months: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)).map((m) => ({ ...m, revenue: cents(m.revenue), expenses: cents(m.expenses), draws: cents(m.draws) })),
  };
}

// ---------------------------------------------------------------- periods

export type FinRange = "month" | "lastmonth" | "90d" | "ytd" | "12m" | "all";
export const FIN_RANGES: FinRange[] = ["month", "lastmonth", "90d", "ytd", "12m", "all"];

/** Inclusive YYYY-MM-DD bounds for a named period, relative to `today` (YYYY-MM-DD, shop time). */
export function rangeBounds(range: FinRange, today: string): { from: string | null; to: string | null } {
  const [y, m] = today.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = (yy: number, mm: number) => new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  switch (range) {
    case "month": return { from: `${y}-${pad(m)}-01`, to: today };
    case "lastmonth": {
      const ly = m === 1 ? y - 1 : y, lm = m === 1 ? 12 : m - 1;
      return { from: `${ly}-${pad(lm)}-01`, to: `${ly}-${pad(lm)}-${pad(lastDay(ly, lm))}` };
    }
    case "90d": {
      const d = new Date(`${today}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() - 89);
      return { from: d.toISOString().slice(0, 10), to: today };
    }
    case "ytd": return { from: `${y}-01-01`, to: today };
    case "12m": {
      const fy = m === 12 ? y : y - 1, fm = m === 12 ? 1 : m + 1;
      return { from: `${fy}-${pad(fm)}-01`, to: today };
    }
    default: return { from: null, to: null };
  }
}
