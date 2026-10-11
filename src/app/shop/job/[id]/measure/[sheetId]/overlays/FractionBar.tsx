"use client";

// Fractions within thumb reach while a measurement field has focus. A measurer
// halfway up a stair should never have to hunt for 3/16 on a system keyboard.
//
// iPhone: the numeric keypad has no space and no "/", so this bar is the only
// way to type 7 3/4. Safari does not shrink the layout viewport for the
// keyboard, so a plain `bottom: 0` bar sits hidden behind it — the bar follows
// the visual viewport instead and rides on top of the keypad.

import { useEffect, useState } from "react";
import { insertToken } from "../fields";

const EIGHTHS = ['1/8"', '1/4"', '3/8"', '1/2"', '5/8"', '3/4"', '7/8"'];

/** Eighths first (what a tape is read in), then sixteenths and symbols. */
export function orderTokens(tokens: string[]): string[] {
  const first = EIGHTHS.filter((t) => tokens.includes(t));
  return [...tokens.filter((t) => t === "'" || t === '"'), ...first, ...tokens.filter((t) => !first.includes(t) && t !== "'" && t !== '"')];
}

export function keyboardInset(innerHeight: number, vv: { height: number; offsetTop: number } | null | undefined): number {
  if (!vv) return 0;
  return Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop));
}

export default function FractionBar({
  show,
  tokens,
}: {
  show: boolean;
  tokens: string[];
}) {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    if (!show) return;
    const vv = window.visualViewport;
    const update = () => setInset(keyboardInset(window.innerHeight, vv));
    update();
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
    };
  }, [show]);
  if (!show) return null;
  return (
    <div
      data-fraction-bar=""
      style={{ bottom: inset }}
      className="fixed inset-x-0 z-[60] flex gap-1.5 overflow-x-auto border-t border-neutral-700 bg-neutral-900/95 p-2 pb-[max(8px,env(safe-area-inset-bottom))] backdrop-blur print:hidden"
    >
      {orderTokens(tokens).map((f) => (
        <button
          key={f}
          type="button"
          // pointerdown, not click: the measurement field must keep focus, or
          // the token has nowhere to land.
          onPointerDown={(e) => {
            e.preventDefault();
            insertToken(f);
          }}
          className="min-h-11 min-w-12 shrink-0 rounded-xl border border-neutral-600 bg-neutral-800 px-3 text-base font-bold text-amber-300 active:bg-neutral-700"
        >
          {f}
        </button>
      ))}
    </div>
  );
}
