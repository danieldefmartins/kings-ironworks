"use client";
// Small building blocks shared by the profile wizard, the W-9 form and the
// owner's edit sheet: one field look everywhere, big tap targets.
import type { InputHTMLAttributes, ReactNode } from "react";

export const inputCls =
  "min-h-14 w-full rounded-2xl border border-white/10 bg-neutral-900 px-4 text-base outline-none transition focus:border-amber-500 aria-[invalid=true]:border-rose-400";

export function Field({ label, hint, error, optional, children }: { label: string; hint?: string; error?: string; optional?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-3 text-sm text-neutral-400">
        <span>{label}</span>
        {optional && <span className="text-xs text-neutral-500">{optional}</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1.5 block text-xs leading-relaxed text-neutral-500">{hint}</span>}
      {error && <span role="alert" className="mt-1.5 block text-sm text-rose-300">{error}</span>}
    </label>
  );
}

export function TextInput({ invalid, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input {...props} aria-invalid={invalid || undefined} className={`${inputCls} ${props.className || ""}`} />;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`space-y-4 rounded-[24px] border border-white/10 bg-neutral-900/60 p-5 ${className}`}>{children}</section>;
}

export function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...props} className={`min-h-14 w-full rounded-2xl bg-amber-500 px-5 text-lg font-bold text-black transition active:scale-[0.99] disabled:opacity-40 ${props.className || ""}`}>
      {children}
    </button>
  );
}

export function GhostButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...props} className={`min-h-14 rounded-2xl border border-white/10 px-5 text-base font-semibold text-neutral-200 active:bg-white/5 disabled:opacity-40 ${props.className || ""}`}>
      {children}
    </button>
  );
}

/** Segmented progress: one pill per step, the current one lit. */
export function Progress({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex gap-1.5" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-1.5 flex-1 rounded-full ${i < current ? "bg-amber-500" : i === current ? "bg-amber-400" : "bg-white/10"}`} />
      ))}
    </div>
  );
}
