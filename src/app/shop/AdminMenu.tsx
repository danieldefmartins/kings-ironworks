"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronDown, ShieldCheck } from "lucide-react";
import { ADMIN_DESTS } from "./adminNav";
import { t } from "@/lib/shop/i18n";

// Admin from anywhere, for Daniel and Kayky.
//
// It used to live two taps deep inside More, which is where you put something
// people rarely need — and they need this constantly. Rendered as a full-width
// sheet rather than a conventional dropdown because a 32px menu row is not a
// target you can hit with work gloves on a tablet; every row here is 60px.
export default function AdminMenu({ lang = "en" }: { lang?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  // Portalled to <body>: the top bar is sticky with a backdrop-blur, and a
  // backdrop-filter becomes the containing block for fixed descendants, so a
  // sheet rendered inside it would be trapped in the bar.
  const sheet = (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/70 p-4 pt-16 sm:items-center sm:pt-4"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-label={t(lang, "admHubTitle")}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <ShieldCheck aria-hidden className="h-4 w-4 text-amber-400" />
          <span className="font-semibold">{t(lang, "admHubTitle")}</span>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {ADMIN_DESTS.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              onClick={() => setOpen(false)}
              className="flex min-h-[60px] items-center gap-3 border-b border-white/5 px-4 py-2 last:border-0 active:bg-neutral-800"
            >
              <d.icon aria-hidden className={`h-5 w-5 shrink-0 ${d.tone}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{t(lang, d.key)}</span>
                <span className="block truncate text-xs text-neutral-500">{t(lang, d.hintKey)}</span>
              </span>
            </Link>
          ))}
        </div>
        <Link
          href="/shop/admin"
          onClick={() => setOpen(false)}
          className="flex min-h-[52px] items-center justify-center border-t border-white/10 font-bold text-amber-400"
        >
          {t(lang, "admOpenHub")}
        </Link>
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
        className="flex min-h-[38px] items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 text-sm font-semibold text-amber-400 sm:px-3 active:bg-amber-500/20"
      >
        <ShieldCheck aria-hidden className="h-4 w-4" />
        <span className="hidden sm:inline">{t(lang, "admNavShort")}</span>
        <ChevronDown aria-hidden className="h-3.5 w-3.5" />
      </button>
      {open && typeof document !== "undefined" && createPortal(sheet, document.body)}
    </>
  );
}
