// "Show me where that is": the Next-measurement card points at a number on a
// sheet that draws its own form (an opening's elevation, a steel member's
// sketch). The card does not know those forms, so it says what it is on —
// which opening or member, which dimension — and the form listening for it
// selects that piece, lights the dimension and, when asked, scrolls to it.

import { useEffect, useRef } from "react";

export const MEASURE_LOCATE_EVENT = "kiw:measure-locate";

export interface MeasureLocate {
  /** Opening unit id, member id or "frame". */
  groupId?: string;
  groupKind?: "opening" | "member" | "frame";
  /** Dimension within it: wTop, diagA, span, bearingL, height:0, cc … */
  part?: string;
  /** A requirement that is not a single number (a choice, a photo). */
  gap?: string;
  gapDetail?: string;
  /** Scroll the drawing or field into view (an explicit tap), or only follow along. */
  scroll: boolean;
}

export function locateMeasure(detail: MeasureLocate) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<MeasureLocate>(MEASURE_LOCATE_EVENT, { detail }));
}

export function useMeasureLocate(handler: (d: MeasureLocate) => void) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    const on = (e: Event) => ref.current((e as CustomEvent<MeasureLocate>).detail);
    window.addEventListener(MEASURE_LOCATE_EVENT, on);
    return () => window.removeEventListener(MEASURE_LOCATE_EVENT, on);
  }, []);
}

/** Scroll an element to the middle of the screen, below the sticky header. */
export function revealElement(el: Element | null | undefined) {
  if (!el) return;
  (el as HTMLElement).scrollIntoView?.({ block: "center", behavior: "smooth" });
}
