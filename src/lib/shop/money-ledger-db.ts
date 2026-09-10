import { ORG_ID, sbSelect } from "./db";
import type { MoneyEntry, MoneyEstimate, JobMoneyLedger } from "./money-ledger";
export async function getJobMoneyLedger(jobId: string): Promise<JobMoneyLedger> {
  async function pages<T>(table: string, fields: string) {
    const rows: T[] = [];
    for (let offset = 0; ; offset += 200) {
      const page = await sbSelect<T[]>(table, `select=${fields}&org_id=eq.${ORG_ID}&job_id=eq.${jobId}&order=created_at.asc,id.asc&limit=200&offset=${offset}`);
      rows.push(...page);
      if (page.length < 200) return rows;
    }
  }
  const [entries, estimates] = await Promise.all([
    pages<MoneyEntry>("kiw_shop_money_entries", "id,kind,amount,description,occurred_on,created_at,voided_at,void_reason,source_estimate_id"),
    pages<MoneyEstimate>("kiw_shop_estimates", "id,estimate_number,title,total_amount,money_status,money_note"),
  ]);
  return { entries, estimates };
}
