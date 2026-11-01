import { describe, expect, it } from "vitest";
import { MAX_SHIFT_HOURS, floorToMinute, isMissedClockOut, payableShiftMs, payableSpanMs, shiftHold } from "./clock-rules";

const t = (iso: string) => Date.parse(iso);
const H = 3_600_000;

describe("clock rules (shared with 360 CRM)", () => {
  it("counts whole minutes: 7:45:18 → 6:56:17 is 11:11, not 11:10:58", () => {
    expect(floorToMinute(t("2026-10-19T11:45:18.868Z"))).toBe(t("2026-10-19T11:45:00Z"));
    expect(payableSpanMs(t("2026-10-19T11:45:18.868Z"), t("2026-10-19T22:56:17.530Z")) / 60000).toBe(671);
  });

  it("never pays a negative span", () => {
    expect(payableSpanMs(t("2026-10-19T12:00:00Z"), t("2026-10-19T11:00:00Z"))).toBe(0);
  });

  it("subtracts unpaid breaks on whole minutes, clipped and merged", () => {
    const s = t("2026-10-20T12:00:30Z"), e = t("2026-10-20T21:00:45Z");
    const breaks = [
      [t("2026-10-20T16:00:40Z"), t("2026-10-20T16:30:10Z")],
      [t("2026-10-20T16:20:00Z"), t("2026-10-20T16:40:00Z")], // overlaps
      [t("2026-10-20T22:00:00Z"), t("2026-10-20T23:00:00Z")], // after the shift
    ] as const;
    expect(payableShiftMs(s, e, breaks) / 60000).toBe(9 * 60 - 40);
  });

  it("a shift over MAX_SHIFT_HOURS is a missed clock-out; real long days are not", () => {
    expect(MAX_SHIFT_HOURS).toBe(16);
    const start = t("2026-10-21T11:44:07Z");
    expect(isMissedClockOut(start, t("2026-10-22T11:35:13Z"), 0)).toBe(true); // 23.9 h
    expect(isMissedClockOut(start, start + 15.7 * H, 0)).toBe(false); // longest real KIW day
    expect(isMissedClockOut(start, null, start + 17 * H)).toBe(true); // still open
  });

  it("holds a missed clock-out, releases it once approved, always holds a pending correction", () => {
    const shift = { startMs: 0, endMs: 23.9 * H };
    expect(shiftHold(shift, 24 * H)).toBe("missed_clock_out");
    expect(shiftHold({ ...shift, approved: true }, 24 * H)).toBeNull();
    expect(shiftHold({ startMs: 0, endMs: 9 * H, correctionPending: true }, 24 * H)).toBe("correction_pending");
    expect(shiftHold({ startMs: 0, endMs: 9 * H }, 24 * H)).toBeNull();
  });
});
