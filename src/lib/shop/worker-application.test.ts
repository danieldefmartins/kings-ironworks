import { expect, it } from "vitest";
import { applicationSchema, applicationReviewSchema } from "./worker-application";
import { sampleApplication } from "./worker-application.fixture";

it("validates a detailed application and discards applicant-supplied privileges", () => {
 const result = applicationSchema.parse({ ...sampleApplication, is_admin: true, can_see_prices: true, hourly_rate: 1000 });
 expect(result.fullName).toBe("Test Applicant"); expect(result).not.toHaveProperty("is_admin"); expect(result).not.toHaveProperty("hourly_rate");
});
it.each([{ consent: false }, { phone: "hello" }, { email: "bad" }, { experienceYears: -1 }, { availableStart: "2026-02-30" }, { street: "" }, { notes: "x".repeat(2001) }])("rejects incomplete or invalid application fields %o", patch => { expect(applicationSchema.safeParse({ ...sampleApplication, ...patch }).success).toBe(false); });
it("requires owner-provided role, pay rate and PIN to approve, and a reason to decline", () => {
 const id = "10000000-0000-4000-8000-000000000001";
 expect(applicationReviewSchema.safeParse({ id, decision: "approved" }).success).toBe(false);
 expect(applicationReviewSchema.safeParse({ id, decision: "approved", role: "Owner", hourlyRate: 25, pin: "1234" }).success).toBe(false);
 expect(applicationReviewSchema.safeParse({ id, decision: "approved", role: "Welder", hourlyRate: 25, pin: "012345" }).success).toBe(true);
 expect(applicationReviewSchema.safeParse({ id, decision: "declined", note: "" }).success).toBe(false);
});
it("accepts optional Zelle contacts and keeps older applications valid", () => {
  expect(applicationSchema.parse({ ...sampleApplication, zelleContact: undefined, zelleName: undefined }).zelleContact).toBe("");
  for (const zelleContact of ["pay@example.test", "(617) 555-0100", "+1 617 555 0100"]) {
    expect(applicationSchema.safeParse({ ...sampleApplication, zelleContact, zelleName: "Test Applicant" }).success).toBe(true);
  }
  expect(applicationSchema.safeParse({ ...sampleApplication, zelleContact: "not a phone or email", zelleName: "Test Applicant" }).success).toBe(false);
  expect(applicationSchema.safeParse({ ...sampleApplication, zelleContact: "6175550100", zelleName: "" }).success).toBe(false);
});
