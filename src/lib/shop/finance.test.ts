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
  it("online purchases wait for an owner decision, except Amazon which is supplies", () => {
    expect(autoTag("ADOBE *CREATIVE CLOUD 408-536-6000 CA", -60).grp).toBe("review");
    expect(reviewKind({ description: "ADOBE *CREATIVE CLOUD", amount: -60 })).toBe("online");
    expect(autoTag("AMAZON MKTPL*ZX12 Amzn.com/bill WA", -40)).toMatchObject({ grp: "expense", owner: "kiw", category: "Supplies" });
  });
  it("Home Depot, Lowe's, Ace and Harbor Freight share one category", () => {
    for (const d of ["THE HOME DEPOT #2688 - EVERETT MA", "LOWE'S #1979 SEABROOK NH", "ACE HARDWARE MALDEN MA", "HARBOR FREIGHT TOOLS U MEDFORD MA"]) {
      expect(autoTag(d, -50)).toMatchObject({ grp: "expense", category: "Home Depot & hardware stores" });
    }
    // Paying the Home Depot credit card is KIW too (Daniel, 2026-09-25).
    expect(autoTag("ORIG CO NAME:HOME DEPOT ORIG ID:CITIGPUFDR DESC DATE:260923 CO ENTRY DESCR:PAYMENT", -306).grp).toBe("expense");
  });
  it("money coming in is a customer payment, except our own transfers and fee reversals", () => {
    expect(autoTag("Zelle payment from ADAM S AROESTY 30937395307", 5100)).toMatchObject({ grp: "revenue" });
    expect(autoTag("DEPOSIT ID NUMBER 449836", 132500)).toMatchObject({ grp: "revenue", category: "Customer payment" });
    expect(autoTag("ATM CASH DEPOSIT 12/02 702 GRAND UNION BLVD SOMERVILLE MA", 2000)).toMatchObject({ grp: "revenue" });
    expect(autoTag("Online Transfer from CHK ...1752 transaction#: 30942297120", 300)).toMatchObject({ grp: "transfer" });
    expect(autoTag("REVERSAL: MONTHLY SERVICE FEE CLAIMID: 9", 15)).toMatchObject({ grp: "transfer" });
  });
  it("payments to the Chase business cards are a KIW expense", () => {
    expect(autoTag("Payment to Chase card ending in 1289 02/12", -1939)).toMatchObject({ grp: "expense", owner: "kiw", category: "Credit card payment" });
  });
  it("Google Ads and GoHighLevel are business marketing", () => {
    expect(autoTag("GOOGLE *ADS572190759 cc@google.com CA 01/12", -500)).toMatchObject({ grp: "expense", category: "Software & marketing" });
    expect(autoTag("HIGHLEVEL AGENCY SUB GOHIGHLEVEL.C TX 05/28", -97)).toMatchObject({ grp: "expense" });
  });
  it("business expenses with an unknown kind land in Uncategorized, not a guess", () => {
    expect(autoTag("CHECK 149", -4000)).toMatchObject({ grp: "expense", owner: "kiw", category: "Check" });
  });
  it("steel suppliers are business materials", () => {
    expect(autoTag("GRANT STEEL 781-767-0505 MA 06/12", -1420)).toMatchObject({ grp: "expense", category: "Materials & steel" });
    expect(autoTag("POS DEBIT CENTRAL STEEL SUPPLY CO MARLBOROUGH MA", -1761.23)).toMatchObject({ grp: "expense", owner: "kiw", category: "Materials & steel" });
  });
});

describe("Daniel's rules, round 2", () => {
  const workers = ["Tiago Alves de Sena", "Andreaderson Rocha de Almeida", "Jairo", "Kaio Prates", "Office", "Helper 1"];
  it("Zelle to anyone on payroll is KIW labor", () => {
    expect(tagTransaction("Zelle payment to TIAGO ALVES DE SENA JPM99cxi7vt0", -2371.93, [], "2026-09-23", workers)).toMatchObject({ grp: "expense", owner: "kiw", category: "Labor & subcontractors" });
    expect(tagTransaction("Zelle payment to ANDREADERSON ROCHA DE ALMEIDA JPM99cxi6hyo", -1327.08, [], "2026-09-23", workers).grp).toBe("expense");
    expect(tagTransaction("Zelle payment to Jairo Abenoado JPM99", -500, [], "2026-09-21", workers).grp).toBe("expense");
    expect(tagTransaction("Zelle payment to Neto Contractor JPM99", -500, [], "2026-07-03", workers).grp).toBe("review");
  });
  it("Zelle straight to Daniel or Kayky is personal; Aline's are Daniel's", () => {
    expect(tagTransaction("Zelle payment to Daniel De Freitas Martins JPM99cxibscm", -200, [], "2026-09-23")).toMatchObject({ grp: "owner", owner: "daniel" });
    expect(tagTransaction("Zelle payment to Kayky Designer JPM99bmvxvtq", -1000, [], "2025-09-11")).toMatchObject({ grp: "owner", owner: "reginaldo" });
    expect(tagTransaction("Zelle payment to Aline Martins JPM99", -500, [], "2026-04-03")).toMatchObject({ grp: "owner", owner: "daniel" });
  });
  it("a payment to Daniel before he joined is a KIW fee, not Reginaldo's", () => {
    expect(tagTransaction("Zelle payment to Daniel Partner Group JPM99c6psl8i", -500, [], "2026-02-23")).toMatchObject({ grp: "expense", owner: "kiw", category: "Management & marketing (Daniel)" });
  });
  it("Direct Merchants is a loan: the money in is not revenue, the weekly payments are KIW financing", () => {
    expect(autoTag("FEDWIRE CREDIT VIA: OPTIMUMBANK/067015096 B/O: DIRECT MERCHANTS FUNDING", 62800)).toMatchObject({ grp: "transfer", category: "Loan received" });
    expect(autoTag("ORIG CO NAME:Direct Merchants ORIG ID:0000141316 DESC DATE:", -2140)).toMatchObject({ grp: "expense", category: "Loan & financing" });
    expect(autoTag("ORIG CO NAME:DIRCT MER COL DB ORIG ID:3471820616 CO ENTRY DESCR:PAYMENT", -20)).toMatchObject({ grp: "expense", category: "Loan & financing" });
    expect(autoTag("Zelle payment to JOELIO XAVIERDEARAGAO JPM99codn3mg", -1300)).toMatchObject({ grp: "expense", category: "Labor & subcontractors" });
  });
  it("ATM withdrawals, Gabriela Satiro and any lawyer are Kayky's (Reginaldo)", () => {
    expect(autoTag("ATM WITHDRAWAL 000286 06/12702 GRAND", -500)).toMatchObject({ grp: "owner", owner: "reginaldo" });
    expect(autoTag("Zelle payment to Gabriela Satiro JPM99x", -300)).toMatchObject({ grp: "owner", owner: "reginaldo" });
    expect(autoTag("SILVA BRAGA & SCHERR MELROSE MA 559593 03/27", -1000)).toMatchObject({ grp: "owner", owner: "reginaldo", category: "Attorney" });
    expect(autoTag("Zelle payment to Margarida attorney JPM99", -1000)).toMatchObject({ grp: "owner", owner: "reginaldo", category: "Attorney" });
    expect(autoTag("ORIG CO NAME:CHASEHOMEFINANCE IND NAME:SATIRO GABRIELA", -4253.84)).toMatchObject({ owner: "reginaldo", category: "Mortgage" });
    expect(autoTag("Zelle payment to Rosa Gabriela Mecanico JPM99", -1700).grp).toBe("review");
    expect(autoTag("LEGAL SEA FOODS BOSTON MA", -80).owner).not.toBe("reginaldo");
    expect(autoTag("Zelle payment to village laester 26200789863", -1200)).toMatchObject({ grp: "owner", owner: "reginaldo", category: "Investment" });
    expect(autoTag("Zelle payment to Aparecido Ramos. Village JPM99", -790)).toMatchObject({ owner: "reginaldo", category: "Investment" });
    expect(autoTag("TST* VILLAGE BAR & GRIL EVERETT MA 09/11", -60).grp).toBe("review");
  });
  it("former workers are KIW labor and Western Union is overseas marketing", () => {
    expect(autoTag("Zelle payment to Valteir King iron Group JPM99bo9d50u", -600)).toMatchObject({ grp: "expense", category: "Labor & subcontractors" });
    expect(autoTag("Zelle payment to Samuel Soldador JPM99cobyofs", -900)).toMatchObject({ grp: "expense", category: "Labor & subcontractors" });
    expect(autoTag("Zelle payment to Teo Santos JPM99", -900)).toMatchObject({ grp: "expense", category: "Labor & subcontractors" });
    expect(autoTag("WUVISAAFT 800-325-6000 CO 09/23 (...9016)", -455.99)).toMatchObject({ grp: "expense", owner: "kiw", category: "Overseas marketing" });
  });
  it("Erika Chelsey is Daniel's loan payment; the Home Depot card is KIW", () => {
    expect(tagTransaction("Zelle payment to Erika Chelsey 29862009331", -500, [], "2026-07-02")).toMatchObject({ grp: "owner", owner: "daniel", category: "Loan payment" });
    expect(autoTag("ORIG CO NAME:HOME DEPOT ORIG ID:CITIGPUFDR DESC DATE:260923 CO ENTRY DESCR:PAYMENT", -306)).toMatchObject({ grp: "expense", owner: "kiw", category: "Home Depot & hardware stores" });
  });
  it("Evolution Tax is our accountant", () => {
    expect(autoTag("Zelle payment to Evolution Tax Services JPM99", -1000)).toMatchObject({ grp: "expense", category: "Professional services" });
    expect(autoTag("ORIG CO NAME:EVOLUTION TAX SE ORIG ID:1800948598 DESC DATE:", -460)).toMatchObject({ grp: "expense", category: "Professional services" });
  });
  it("equipment and truck rentals are KIW, and United Rentals is not United Airlines", () => {
    expect(autoTag("UNITED RENTALS 617-387-9545 MA 08/08", -1360.42)).toMatchObject({ grp: "expense", category: "Equipment & truck rental" });
    expect(autoTag("U-HAUL CENTER MALDEN 800-789-3638 MA 09/19", -159.95)).toMatchObject({ grp: "expense", category: "Equipment & truck rental" });
    expect(vendorKey("UNITED RENTALS #16155 704-636-8002 MA")).not.toBe(vendorKey("UNITED 01621152156 UNITED.COM TX"));
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
