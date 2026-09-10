import { z } from "zod";
const description = z.string().trim().min(3).max(1000);
const date = z.iso.date().nullable();
export const moneyChangeSchema = z.object({
  jobId: z.uuid(),
  change: z.discriminatedUnion("action", [
    z.object({ action: z.literal("add"), id: z.uuid(), kind: z.enum(["contract", "payment"]), amount: z.number().finite().min(-9999999999.99).max(9999999999.99).refine(n => Math.abs(n * 100 - Math.round(n * 100)) < 0.0001, "Use dollars and cents"), description, date }),
    z.object({ action: z.literal("void"), id: z.uuid(), description }),
    z.object({ action: z.literal("estimate"), id: z.uuid(), mode: z.enum(["added", "included", "excluded"]), description }),
  ]),
});
export type MoneyChange = z.infer<typeof moneyChangeSchema>["change"];
export type MoneyEntry = { id: string; kind: "contract" | "payment"; amount: number | string; description: string; occurred_on: string | null; created_at: string; voided_at: string | null; void_reason: string | null; source_estimate_id: string | null };
export type MoneyEstimate = { id: string; estimate_number: string; title: string; total_amount: number | string; money_status: "review" | "added" | "included" | "excluded"; money_note: string | null };
export type JobMoneyLedger = { entries: MoneyEntry[]; estimates: MoneyEstimate[] };
