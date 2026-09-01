"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Secondary controls — print, units, admin, sign out, delete — behind one
// button, so the primary screen can be about the work instead of the system.
// Opens as a bottom sheet: on a tablet held one-handed, the reachable half of
// the screen is the bottom.
export default function MoreMenu({
  label,
  closeLabel,
  children,
  align = "right",
}: {
  label: string;
  closeLabel: string;
  /** Rendered inside the sheet. `close` dismisses it after an action. */
  children: (close: () => void) => React.ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  // The sheet MUST be portalled to <body>. This menu sits inside the sticky top
  // bar, and that bar uses backdrop-blur — a backdrop-filter makes an element a
  // containing block for fixed-position descendants, so `fixed inset-0` would
  // resolve against the 66px-tall bar instead of the viewport. On a phone that
  // put the whole sheet off-screen except its last button. Reported from the
  // floor: "I only see the close button all the way on top."
  const sheet = (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 sm:items-center"
      onClick={close}
    >
      <div
        role="dialog"
        aria-label={label}
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-neutral-700 bg-neutral-900 p-4 pb-[max(16px,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 text-lg font-bold">{label}</div>
        <div className="space-y-2">{children(close)}</div>
        <button
          type="button"
          onClick={close}
          className="mt-3 min-h-[48px] w-full rounded-xl border border-neutral-700 font-bold text-neutral-300"
        >
          {closeLabel}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex min-h-[48px] min-w-[48px] items-center justify-center rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-neutral-200 active:bg-neutral-800 ${
          align === "left" ? "mr-auto" : ""
        }`}
      >
        <span aria-hidden className="text-lg leading-none">
          ⋯
        </span>
        <span className="sr-only">{label}</span>
      </button>

      {open && typeof document !== "undefined" && createPortal(sheet, document.body)}
    </>
  );
}

// One row inside a MoreMenu. Sized for a gloved thumb, separated from its
// neighbours, and tinted red when it destroys something.
export function MoreItem({
  onClick,
  href,
  children,
  danger = false,
}: {
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  const cls = `flex min-h-[56px] w-full items-center rounded-xl border px-4 text-left font-bold ${
    danger
      ? "mt-4 border-red-800 bg-red-950/40 text-red-300 active:bg-red-950/70"
      : "border-neutral-700 bg-neutral-800 text-neutral-200 active:bg-neutral-700"
  }`;
  if (href) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}
