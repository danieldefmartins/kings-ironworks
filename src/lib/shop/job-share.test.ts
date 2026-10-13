import { describe, expect, it } from "vitest";
import { buildJobShareText, googleMapsLink, shareScope } from "./job-share";

const job = { job_number: "KIW-1099", customer_name: "Gavin Walsh", address: "12 Elm St, Westwood MA", scope: "Restore front railing\nand galvanize", due_date: "2026-10-30" };
const url = "https://kingsironworks.com/shop/job/abc";

describe("buildJobShareText", () => {
  it("has who, where, a maps link, scope, install date and the job link", () => {
    const t = buildJobShareText(job, { lang: "en", senderName: "Daniel", jobUrl: url });
    expect(t).toContain("Daniel shared a job with you");
    expect(t).toContain("Gavin Walsh (KIW-1099)");
    expect(t).toContain("Address: 12 Elm St, Westwood MA");
    expect(t).toContain(googleMapsLink("12 Elm St, Westwood MA"));
    expect(t).toContain("Scope: Restore front railing and galvanize");
    expect(t).toContain("Install: Oct 30");
    expect(t).toContain(`Open the job: ${url}`);
  });

  it("speaks the recipient's language", () => {
    expect(buildJobShareText(job, { lang: "pt", senderName: "Daniel", jobUrl: url })).toContain("Endereço:");
    expect(buildJobShareText(job, { lang: "es", senderName: "Daniel", jobUrl: url })).toContain("Dirección:");
  });

  it("says when there is no address instead of leaving a blank", () => {
    const t = buildJobShareText({ ...job, address: null }, { lang: "en", senderName: "D", jobUrl: url });
    expect(t).toContain("No address on file yet");
    expect(t).not.toContain("google.com/maps");
  });

  it("never contains a dollar amount", () => {
    const t = buildJobShareText({ ...job, scope: null }, { lang: "en", senderName: "D", jobUrl: url, items: ["Railing 20 ft"] });
    expect(t).not.toMatch(/\$/);
  });
});

describe("shareScope", () => {
  it("falls back to estimate item descriptions, numbered", () => {
    expect(shareScope({ scope: " " }, ["Front rail", "Back rail"])).toBe("1) Front rail 2) Back rail");
  });
  it("clips long scopes", () => {
    const s = shareScope({ scope: "x".repeat(1000) })!;
    expect(s.length).toBe(320);
    expect(s.endsWith("…")).toBe(true);
  });
  it("is null when there is nothing to say", () => {
    expect(shareScope({ scope: null }, [])).toBeNull();
  });
});
