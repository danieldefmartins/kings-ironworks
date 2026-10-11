"use client";

// Customer sign-off: one card on the review step, one full-screen sheet the
// crew hands to the customer. Optional — never required to submit — but shown
// as recommended until signed, and flagged "out of date" the moment a
// measurement changes after signing.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { MeasureData, MeasureShape } from "@/lib/shop/measure";
import {
  SIGNATURE_MAX_CHARS,
  SIGNOFF_LANGS,
  makeSignoff,
  signoffState,
  signoffSummary,
  type SignoffLang,
} from "@/lib/shop/measure-signoff";
import { ct } from "@/lib/shop/measure-code-i18n";
import { shapeLabel } from "@/lib/shop/measure-i18n";
import { specValue } from "@/lib/shop/i18n";
import SignaturePad, { type SignaturePadHandle } from "../SignaturePad";
import { useBrand } from "@/app/shop/brand/BrandContext";
import { brandInitials } from "@/lib/shop/org-brand";

const LANG_NAME: Record<SignoffLang, string> = { en: "English", pt: "Português", es: "Español" };

function when(iso: string, lang: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(lang === "pt" ? "pt-BR" : lang === "es" ? "es" : "en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export default function CustomerSignoff({
  lang,
  data,
  shape,
  sheetName,
  set,
  readOnly = false,
}: {
  lang: string;
  data: MeasureData;
  shape: MeasureShape;
  sheetName?: string;
  set?: (fn: (d: MeasureData) => void) => void;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState("light");
  const anchor = useRef<HTMLDivElement>(null);
  const state = signoffState(data);
  const so = data.signoff;
  const canEdit = !!set && !readOnly;

  const pill =
    state === "valid"
      ? "bg-emerald-500/10 text-emerald-300"
      : state === "stale"
        ? "bg-amber-500/10 text-amber-300"
        : "bg-neutral-800 text-neutral-400";

  return (
    <div ref={anchor} data-testid="customer-signoff" className="mb-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-center gap-3">
        <h3 className="flex-1 text-lg font-semibold text-neutral-100">{ct(lang, "signTitle")}</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${pill}`}>
          {state === "valid" ? `✓ ${ct(lang, "signValid")}` : state === "stale" ? ct(lang, "signStale") : ct(lang, "signRecommended")}
        </span>
      </div>

      {so && state !== "none" ? (
        <div className="mt-3">
          {/* Paper-white behind the ink in both themes. */}
          <div className={`rounded-xl border border-neutral-800 p-3 ${state === "stale" ? "opacity-50" : ""}`} style={{ background: "#fff" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={so.signature} alt={ct(lang, "signTitle")} className="h-20 w-auto max-w-full" />
          </div>
          <div className="mt-2 text-base font-semibold text-neutral-100">{so.name}</div>
          <div className="text-sm text-neutral-500">
            {/* Server renders UTC, the tablet its own zone: the time is allowed to differ. */}
            <span suppressHydrationWarning>{when(so.signedAt, lang)}</span> · {LANG_NAME[so.lang]}
            {so.email ? ` · ${so.email}` : ""}
          </div>
          {state === "stale" && <div className="mt-2 text-sm font-medium text-amber-300">{ct(lang, "signStaleNote")}</div>}
          {canEdit && (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => { setTheme(anchor.current?.closest("[data-shop-theme]")?.getAttribute("data-shop-theme") || "light"); setOpen(true); }}
                className={`min-h-12 rounded-xl font-semibold ${state === "stale" ? "flex-1 bg-indigo-600 text-white" : "px-4 text-indigo-700"}`}
              >
                {ct(lang, "signResign")}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(ct(lang, "signRemoveConfirm"))) set!((d) => void (d.signoff = null));
                }}
                className="min-h-12 rounded-xl px-4 font-semibold text-neutral-500"
              >
                {ct(lang, "signRemove")}
              </button>
            </div>
          )}
        </div>
      ) : (
        canEdit && (
          <button
            type="button"
            onClick={() => { setTheme(anchor.current?.closest("[data-shop-theme]")?.getAttribute("data-shop-theme") || "light"); setOpen(true); }}
            className="mt-3 min-h-12 w-full rounded-xl border border-indigo-200 bg-indigo-50 font-semibold text-indigo-700"
          >
            {ct(lang, "signStart")}
          </button>
        )
      )}

      {open && canEdit && (
        <SignSheet
          lang={lang}
          data={data}
          shape={shape}
          sheetName={sheetName}
          theme={theme}
          onCancel={() => setOpen(false)}
          onSign={(v) => {
            set!((d) => {
              d.signoff = makeSignoff(d, v);
            });
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function SignSheet({
  lang,
  data,
  shape,
  sheetName,
  theme,
  onCancel,
  onSign,
}: {
  lang: string;
  data: MeasureData;
  shape: MeasureShape;
  sheetName?: string;
  theme: string;
  onCancel: () => void;
  onSign: (v: { name: string; email: string; lang: SignoffLang; signature: string; summary: { label: string; value: string }[] }) => void;
}) {
  const [cl, setCl] = useState<SignoffLang>(
    (data.signoff?.lang as SignoffLang) || (SIGNOFF_LANGS.includes(lang as SignoffLang) ? (lang as SignoffLang) : "en")
  );
  const [name, setName] = useState(data.signoff?.name || "");
  const [email, setEmail] = useState(data.signoff?.email || "");
  const [ink, setInk] = useState(false);
  const [err, setErr] = useState("");
  const pad = useRef<SignaturePadHandle>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => void (document.body.style.overflow = prev);
  }, []);

  const shapeName = [sheetName, shapeLabel(cl, shape)].filter(Boolean).join(" · ");
  const summary = signoffSummary(data, shape, cl, { shapeName, finishLabel: (v) => specValue(cl, v) });
  const ready = ink && name.trim().length > 1;
  const T = (k: string) => ct(cl, k);
  const brand = useBrand();

  const sheet = (
    <div data-shop-theme={theme} className="shop-ui fixed inset-0 z-[60] flex items-stretch justify-center bg-black/50 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={T("signHeading")}>
      <div className="flex h-full w-full flex-col bg-neutral-900 text-neutral-100 sm:h-auto sm:max-h-[92dvh] sm:max-w-2xl sm:rounded-3xl sm:shadow-2xl">
        {/* Header: cancel · language */}
        <div className="flex items-center gap-2 border-b border-neutral-800 px-4 pb-2 pt-[max(12px,env(safe-area-inset-top))]">
          <button type="button" onClick={onCancel} className="min-h-11 rounded-lg px-2 text-base text-indigo-700">
            {T("signCancel")}
          </button>
          <div className="ml-auto flex rounded-xl bg-neutral-800 p-1" role="radiogroup" aria-label={T("signLanguage")}>
            {SIGNOFF_LANGS.map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={cl === l}
                onClick={() => setCl(l)}
                className={`min-h-9 min-w-12 rounded-lg px-3 text-sm font-semibold transition-colors ${cl === l ? "bg-neutral-900 text-neutral-100 shadow-sm" : "text-neutral-500"}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4 pt-5 sm:px-8">
          {/* Whose work the customer is signing for — the organization's brand. */}
          <div className="mb-5 flex items-center gap-3" data-testid="signoff-brand">
            {brand.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logo} alt="" className="h-11 w-auto max-w-[9rem] rounded-lg object-contain" style={{ background: "#fff" }} />
            ) : (
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[15px] font-bold"
                style={{ background: brand.accent, color: brand.onAccent }}
              >
                {brandInitials(brand.name)}
              </span>
            )}
            <div className="min-w-0">
              <div className="truncate text-[17px] font-semibold text-neutral-100">{brand.name}</div>
              <div className="truncate text-sm text-neutral-500">{[brand.phone, brand.website].filter(Boolean).join(" · ")}</div>
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-100">{T("signHeading")}</h2>

          <dl className="mt-4 divide-y divide-neutral-800 rounded-2xl bg-neutral-800 px-4">
            {summary.map((l, i) => (
              <div key={`${l.label}${i}`} className="flex items-baseline gap-4 py-3">
                <dt className="flex-1 text-[15px] text-neutral-400">{l.label}</dt>
                <dd className="max-w-[60%] text-right text-[17px] font-semibold tabular-nums text-neutral-100">{l.value}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-5 text-[15px] leading-relaxed text-neutral-300">{T("signConfirm")}</p>

          <div className="mt-4">
            <SignaturePad ref={pad} placeholder={T("signHere")} clearLabel={T("signClear")} onInk={(v) => { setInk(v); setErr(""); }} />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm text-neutral-500">{T("signName")}</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="min-h-12 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-lg"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-neutral-500">{T("signEmail")}</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                inputMode="email"
                autoComplete="email"
                className="min-h-12 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-lg"
              />
            </label>
          </div>
          {err && <div className="mt-3 text-sm font-medium text-red-300">{err}</div>}
        </div>

        <div className="border-t border-neutral-800 px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 sm:px-8">
          <button
            type="button"
            disabled={!ready}
            onClick={() => {
              const sig = pad.current?.toDataURL(600) || "";
              if (!sig || sig.length > SIGNATURE_MAX_CHARS) {
                setErr(T("signTooBig"));
                return;
              }
              onSign({ name, email, lang: cl, signature: sig, summary });
            }}
            className="min-h-14 w-full rounded-2xl bg-indigo-600 text-lg font-semibold text-white transition-opacity disabled:opacity-35"
          >
            {T("signSave")}
          </button>
        </div>
      </div>
    </div>
  );
  return typeof document !== "undefined" ? createPortal(sheet, document.body) : null;
}
