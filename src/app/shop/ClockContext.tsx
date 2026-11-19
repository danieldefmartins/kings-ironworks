"use client";

import { createContext, useContext } from "react";
import type { TimeBreak, TimeShift } from "@/lib/shop/shared";

// The payroll clock, shared from ShopShell (which owns the durable punch
// outbox, location rule, missed clock-out question…) with the big home button.
// One punch path: the home button calls exactly what the clock sheet calls.
export interface ClockApi {
  shift: TimeShift | null;
  breaks: TimeBreak[];
  onBreak: boolean;
  /** Paid hours of the open shift, ticking. */
  hours: number;
  todayHours: number;
  weekHours: number;
  ready: boolean;
  busy: boolean;
  needsLogin: boolean;
  /** A punch waiting on the server. */
  pendingType: "shift_start" | "shift_stop" | null;
  unconfirmed: boolean;
  error: string;
  clockIn: () => void;
  clockOut: () => void;
  breakStart: () => void;
  breakEnd: () => void;
  /** The full clock sheet (pay, week-to-date $, location status). */
  openDetails: () => void;
}

export const ClockContext = createContext<ClockApi | null>(null);

export function useClock(): ClockApi | null {
  return useContext(ClockContext);
}
