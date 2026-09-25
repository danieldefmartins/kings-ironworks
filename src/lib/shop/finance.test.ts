import { describe, expect, it } from "vitest";
import { autoTag, parseChaseCsv, rangeBounds, reviewKind, summarize, tagTransaction, vendorKey, accountFromFileName, type FinRule } from "./finance";

const CSV = [
  "Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #",
  'DEBIT,09/25/2026,"POS DEBIT                TAVVY                     +19546710529 FL",-99.00,MISC_DEBIT, ,,',
  'DEBIT,09/24/2026,"STARBUCKS 8007827282 800-782-7282 WA 09/24 (...9016)",-5.00,DEBIT_CARD,100.00,,',
  'DEBIT,09/24/2026,"STARBUCKS 8007827282 800-782-7282 WA 09/24 (...9016)",-5.00,DEBIT_CARD,105.00,,',
  'CREDIT,09/23/2026,"Zelle payment from ADAM S AROESTY 30937395307",5100.00,QUICKPAY_CREDIT,110.00,,',
].join("\n");

describe("parseChaseCsv", () => {
  it("skips pending rows, keeps same-day duplicates, and reads the newest balance", () => {
    const p = parseChaseCsv(CSV, "1752");
    expect(p.skippedPending).toBe(1);
    expect(p.rows).toHaveLength(3);
    expect(p.rows[0].posted_on).toBe("2026-09-24");
    expect(p.rows[0].fingerprint).not.toBe(p.rows[1].fingerprint);
    expect(p.newest).toEqual({ balance: 100, posted_on: "2026-09-24" });
  });
  it("gives the same fingerprints when the same file is imported again", () => {
    const a = parseChaseCsv(CSV, "1752").rows.map((r) => r.fingerprint);
    const b = parseChaseCsv(CSV, "1752").rows.map((r) => r.fingerprint);
    expect(a).toEqual(b);
  });
  it("rejects files that are not Chase exports", () => {
    expect(() => parseChaseCsv("a,b,c\n1,2,3", "1752")).toThrow();
  });
  it("reads the account from the Chase file name", () => {
    expect(accountFromFileName("Chase3971_Activity_20260925.csv")).toBe("3971");
    expect(accountFromFileName("statement.csv")).toBeNull();
  });
});

describe("autoTag — Daniel's rules", () => {
  it("transfers to 8706, 1487 and 7961 are Reginaldo's personal money", () => {
    for (const acct of ["8706", "1487", "7961"]) {
      expect(autoTag(`Online Transfer to CHK ...${acct} transaction#: 1`, -400)).toMatchObject({ grp: "owner", owner: "reginaldo" });
    }
  });
  it("transfers between the two KIW accounts are not income or expense", () => {
    expect(autoTag("Online Transfer to CHK ...3971 transaction#: 30942297120 09/24", -300)).toMatchObject({ grp: "transfer" });
  });
  it("PayPal debits go to Reginaldo", () => {
    expect(autoTag("PAYPAL *INST XFER 402-935-7733 CA", -120)).toMatchObject({ grp: "owner", owner: "reginaldo" });
  });
  it("restaurants, hotels and card payments always wait for an owner decision", () => {
    expect(autoTag("TST* T.G.I. FRIDAY'S - EVERETT MA", -90.91).grp).toBe("review");
    expect(autoTag("STAYBRIDGE SUITES BOSTON MA", -210).grp).toBe("review");
    expect(autoTag("ASPIRE MASTERCARD 855-802-5572 GA 09/23 (...9016)", -95).grp).toBe("review");
    expect(reviewKind({ description: "ASPIRE MASTERCARD 855-802-5572 GA", amount: -95 })).toBe("cards");
    expect(reviewKind({ description: "TST* T.G.I. FRIDAY'S", amount: -90 })).toBe("restaurants");
  });
  it("online purchases wait for an owner decision", () => {
    expect(autoTag("AMAZON MKTPL*ZX12 Amzn.com/bill WA", -40).grp).toBe("review");
    expect(reviewKind({ description: "AMAZON MKTPL*ZX12 Amzn.com/bill WA", amount: -40 })).toBe("online");
  });
  it("customer Zelle payments are revenue", () => {
    expect(autoTag("Zelle payment from ADAM S AROESTY 30937395307", 5100)).toMatchObject({ grp: "revenue" });
  });
  it("Google Ads and GoHighLevel are business marketing", () => {
    expect(autoTag("GOOGLE *ADS572190759 cc@google.com CA 01/12", -500)).toMatchObject({ grp: "expense", category: "Software & marketing" });
    expect(autoTag("HIGHLEVEL AGENCY SUB GOHIGHLEVEL.C TX 05/28", -97)).toMatchObject({ grp: "expense" });
  });
  it("business expenses with an unknown kind land in Uncategorized, not a guess", () => {
    expect(autoTag("CHECK 149", -4000)).toMatchObject({ grp: "review", category: "Uncategorized" });
  });
  it("steel suppliers are business materials", () => {
    expect(autoTag("GRANT STEEL 781-767-0505 MA 06/12", -1420)).toMatchObject({ grp: "expense", category: "Materials & steel" });
    expect(autoTag("POS DEBIT CENTRAL STEEL SUPPLY CO MARLBOROUGH MA", -1761.23)).toMatchObject({ grp: "expense", owner: "kiw", category: "Materials & steel" });
  });
});

describe("rules", () => {
  it("an owner-taught rule beats the built-in guess for that merchant only", () => {
    const rules: FinRule[] = [{ id: "r1", pattern: vendorKey("STARBUCKS 8007827282 WA 09/24"), direction: "out", category: "Restaurants", grp: "owner", owner: "daniel", active: true }];
    expect(tagTransaction("STARBUCKS 8007827282 800-782-7282 WA 09/25 (...9016)", -7, rules)).toMatchObject({ grp: "owner", owner: "daniel", tag_source: "rule", rule_id: "r1" });
    expect(tagTransaction("DUNKIN #338459 WAKEFIELD MA", -7, rules).grp).toBe("review");
    expect(tagTransaction("STARBUCKS REFUND", 7, rules).tag_source).toBe("auto");
  });
  it("vendor keys ignore store numbers, dates and card suffixes", () => {
    expect(vendorKey("THE HOME DEPOT #2688 - EVERETT MA 453601 09/23 (...9016)")).toBe(vendorKey("THE HOME DEPOT #2688 -S81 EVERETT MA (...9016)"));
    expect(vendorKey("Zelle payment to TIAGO ALVES DE SENA JPM99cxi7vt0")).toBe("zelle to tiago alves de sena");
    expect(vendorKey("Payment to Chase card ending in 1289 02/12")).toBe("chase card 1289");
    expect(vendorKey("Cash to Kaio — labor")).toBe("cash to kaio");
    expect(vendorKey("GOOGLE *ADS572190759 cc@google.com CA 01/12")).toBe("google ads");
    expect(vendorKey("GOOGLE *Workspace_ki cc@google.com CA 09/23 (...9016)")).toBe("google workspace");
  });
});

describe("summarize", () => {
  it("computes profit, margin and owner draws net of money put back in", () => {
    const s = summarize([
      { posted_on: "2026-09-01", amount: 1000, grp: "revenue", owner: null, category: "Customer payment", vendor: "zelle from a" },
      { posted_on: "2026-09-02", amount: -400, grp: "expense", owner: "kiw", category: "Materials & steel", vendor: "central steel" },
      { posted_on: "2026-09-03", amount: -300, grp: "owner", owner: "reginaldo", category: "Mortgage", vendor: "ach chasehomefinance" },
      { posted_on: "2026-09-04", amount: 100, grp: "owner", owner: "reginaldo", category: "Owner money in", vendor: "venmo" },
      { posted_on: "2026-09-05", amount: -50, grp: "review", owner: null, category: "Meals", vendor: "starbucks" },
      { posted_on: "2026-09-06", amount: -999, grp: "transfer", owner: null, category: "Between KIW accounts", vendor: "transfer to 3971" },
    ]);
    expect(s.revenue).toBe(1000);
    expect(s.expenses).toBe(400);
    expect(s.profit).toBe(600);
    expect(s.margin).toBeCloseTo(0.6);
    expect(s.draws.reginaldo).toBe(200);
    expect(s.review).toEqual({ count: 1, total: 50 });
    expect(s.months).toEqual([{ month: "2026-09", revenue: 1000, expenses: 400, draws: 200 }]);
  });
});

describe("rangeBounds", () => {
  it("handles month, last month across a year boundary, and year to date", () => {
    expect(rangeBounds("month", "2026-09-25")).toEqual({ from: "2026-09-01", to: "2026-09-25" });
    expect(rangeBounds("lastmonth", "2026-01-10")).toEqual({ from: "2025-12-01", to: "2025-12-31" });
    expect(rangeBounds("ytd", "2026-09-25")).toEqual({ from: "2026-01-01", to: "2026-09-25" });
    expect(rangeBounds("12m", "2026-09-25")).toEqual({ from: "2025-10-01", to: "2026-09-25" });
    expect(rangeBounds("all", "2026-09-25")).toEqual({ from: null, to: null });
  });
});
