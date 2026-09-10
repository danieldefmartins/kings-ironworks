import { describe, expect, it } from "vitest";
import { buildBusinessActions, type ActionJob } from "./actions";
const job = (id: string, extra: Partial<ActionJob> = {}): ActionJob => ({ id, job_number: id, customer_name: "Customer", current_stage: "Awarded", due_date: null, deposit_amount: null, archived: false, ...extra });
const now = Date.parse("2026-09-10T02:00:00Z"); // Still September 9 at the shop.
describe("business action rules", () => {
  it("uses shop dates and separates overdue, next seven days, and undated jobs", () => {
    const { today, groups } = buildBusinessActions([
      job("late", { due_date: "2026-09-08" }), job("today", { due_date: "2026-09-09" }),
      job("seven", { due_date: "2026-09-16" }), job("later", { due_date: "2026-09-17" }), job("undated"),
      job("lead", { current_stage: "Lead" }), job("done", { current_stage: "Done" }), job("archived", { archived: true }),
    ], [], [], [], now);
    expect(today).toBe("2026-09-09");
    expect(groups.overdue.map(r => r.id)).toEqual(["late"]);
    expect(groups.soon.map(r => r.id)).toEqual(["today", "seven"]);
    expect(groups.undated.map(r => r.id)).toEqual(["undated"]);
    expect(groups.deposits).toHaveLength(5);
  });
  it("flags only missing or nonpositive recorded deposits without inventing a balance", () => {
    const { groups } = buildBusinessActions([job("missing"), job("zero", { deposit_amount: "0" }), job("paid", { deposit_amount: "1500" })], [], [], [], now);
    expect(groups.deposits.map(r => r.id)).toEqual(["missing", "zero"]);
    expect(groups.deposits[0]).not.toHaveProperty("balance");
  });
  it("includes lead measurements, excludes closed jobs and approved sheets, and sorts oldest first", () => {
    const sheet = (id: string, job_id: string, status: string, day = "08") => ({ id, job_id, status, name: "Stair", updated_at: `2026-09-${day}T12:00:00Z` });
    const { groups } = buildBusinessActions([job("lead", { current_stage: "Lead" }), job("closed", { archived: true })], [sheet("draft", "lead", "in_progress"), sheet("new", "lead", "submitted", "09"), sheet("old", "lead", "submitted"), sheet("approved", "lead", "approved"), sheet("archived", "closed", "submitted")], [], [], now);
    expect(groups.review.map(r => r.id)).toEqual(["old", "new"]);
    expect(groups.drafts[0].href).toBe("/shop/job/lead/measure/draft");
  });
  it("links a pending correction directly to its review card", () => {
    const { groups } = buildBusinessActions([], [], [{ id: "request", worker_id: "w", created_at: "2026-09-09T12:00:00Z" }], [{ id: "w", name: "Worker" }], now);
    expect(groups.corrections[0]).toMatchObject({ title: "Worker", href: "/shop/admin/time#correction-request" });
  });
});
