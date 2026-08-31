"use client";

// Fractions within thumb reach while a measurement field has focus. A measurer
// halfway up a stair should never have to hunt for 3/16 on a system keyboard.

import { insertToken } from "../fields";

export default function FractionBar({
  show,
  tokens,
}: {
  show: boolean;
  tokens: string[];
}) {
  if (!show) return null;
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 flex gap-1.5 overflow-x-auto border-t border-neutral-700 bg-neutral-900/95 p-2 print:hidden">
      {tokens.map((f) => (
        <button
          key={f}
          // pointerdown, not click: the measurement field must keep focus, or
          // the token has nowhere to land.
          onPointerDown={(e) => {
            e.preventDefault();
            insertToken(f);
          }}
          className="shrink-0 rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2.5 text-sm font-bold text-amber-300"
        >
          {f}
        </button>
      ))}
    </div>
  );
}
