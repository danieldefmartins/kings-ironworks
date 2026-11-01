// Worker A (anonymized), Oct 19–24 2026 — the week a third-party timesheet
// showed our clock was wrong. Every instant below is the ACTUAL tap the
// server received (from the audit trail), to the millisecond, plus the
// "did your team leader ask?" answers as they happened.
//
// The third-party sheet (owner-confirmed correct), $22.00/h:
//   10/19  7:45 AM – 6:56 PM   11:11   $246.03
//   10/20  7:47 AM – 4:57 PM    9:10   $201.67
//   10/21  7:44 AM – 5:55 PM   10:11   $224.03   ← forgot to clock out
//   10/22  7:35 AM – 12:33 PM   4:58   $109.27
//   10/23  7:31 AM – 5:19 PM    9:48   $215.60
//          7:09 PM – 8:23 PM    1:14    $27.13   ← evening call-back
//   10/24  7:46 AM – 6:51 PM   11:05   $243.83
//   Total                      57:37 $1,267.56
//
// Shared with 360 CRM's replay test (server/test/fixtures/worker-a-oct-19-24.json).

export const WORKER_A_RATE = 22;

export interface WorkerATap {
  id: string;
  day: string;
  in: string;
  out: string;
  /** Answer to "did the team leader ask?" for a clock-out after 5:00 PM. */
  endAnswer?: "yes" | "denied";
  /** Owner-approved correction (the worker's own request). */
  correctedOut?: string;
}

export const WORKER_A_TAPS: WorkerATap[] = [
  { id: "a-1019", day: "2026-10-19", in: "2026-10-19T11:45:18.868Z", out: "2026-10-19T22:56:17.530Z", endAnswer: "yes" },
  { id: "a-1020", day: "2026-10-20", in: "2026-10-20T11:47:51.949Z", out: "2026-10-20T20:57:31.123Z" },
  // Never tapped out; tapped "out" at 7:35 AM next morning, answered "yes".
  // Their correction request: out 5:55 PM.
  { id: "a-1021", day: "2026-10-21", in: "2026-10-21T11:44:07.452Z", out: "2026-10-22T11:35:13.510Z", endAnswer: "yes", correctedOut: "2026-10-21T21:55:00.000Z" },
  { id: "a-1022", day: "2026-10-22", in: "2026-10-22T11:35:42.986Z", out: "2026-10-22T16:33:02.612Z" },
  { id: "a-1023a", day: "2026-10-23", in: "2026-10-23T11:31:33.591Z", out: "2026-10-23T21:19:59.309Z", endAnswer: "yes" },
  // Started after the window; the owner later pressed "deny".
  { id: "a-1023b", day: "2026-10-23", in: "2026-10-23T23:09:46.455Z", out: "2026-10-24T00:23:13.674Z", endAnswer: "denied" },
  { id: "a-1024", day: "2026-10-24", in: "2026-10-24T11:46:38.735Z", out: "2026-10-24T22:51:58.844Z", endAnswer: "yes" },
];

/** Third-party sheet, minutes per day. */
export const WORKER_A_EXPECTED_MINUTES: Record<string, number> = {
  "2026-10-19": 671, "2026-10-20": 550, "2026-10-21": 611, "2026-10-22": 298,
  "2026-10-23": 662, "2026-10-24": 665,
};
export const WORKER_A_EXPECTED_DAILY_PAY: Record<string, number> = {
  "2026-10-19": 246.03, "2026-10-20": 201.67, "2026-10-21": 224.03, "2026-10-22": 109.27,
  "2026-10-23": 242.73, "2026-10-24": 243.83,
};
export const WORKER_A_EXPECTED_TOTAL_MINUTES = 3457; // 57:37
export const WORKER_A_EXPECTED_TOTAL_PAY = 1267.56;
