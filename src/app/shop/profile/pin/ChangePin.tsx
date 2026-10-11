"use client";
// iOS-passcode style PIN change: current → new → confirm, one keypad, masked
// dots. The current PIN is checked as soon as it is typed (and counts toward
// the sign-in lockout), so nobody types a new PIN twice for nothing.
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Delete, KeyRound } from "lucide-react";
import { PIN_LENGTH, newPinError } from "@/lib/shop/pin";
import { pint } from "@/lib/shop/pin-i18n";

type Step = "current" | "new" | "confirm" | "done";

async function post(body: unknown): Promise<{ ok: boolean; code?: string }> {
  try {
    const r = await fetch("/shop/api/pin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
    const d = await r.json().catch(() => ({}));
    return r.ok && d.ok ? { ok: true } : { ok: false, code: d.code || "server" };
  } catch {
    return { ok: false, code: "server" };
  }
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export default function ChangePin({ lang }: { lang: string }) {
  const t = (k: string) => pint(lang, k);
  const router = useRouter();
  const [step, setStep] = useState<Step>("current");
  const [entry, setEntry] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(false);
  const [shake, setShake] = useState(0);
  const current = useRef("");
  const next = useRef("");

  const fail = useCallback((code: string, to: Step) => {
    setErr(t(`err.${code}`));
    setShake(s => s + 1);
    setEntry("");
    if (code === "locked") setLocked(true);
    if (to === "current") current.current = "";
    if (to !== "confirm") next.current = "";
    setStep(to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const complete = useCallback(async (pin: string) => {
    if (step === "current") {
      setBusy(true);
      const r = await post({ type: "verify", current: pin });
      setBusy(false);
      if (!r.ok) return fail(r.code === "locked" ? "locked" : r.code === "current" ? "current" : "server", "current");
      current.current = pin;
      setErr(null); setEntry(""); setStep("new");
      return;
    }
    if (step === "new") {
      const bad = newPinError(current.current, pin);
      if (bad) return fail(bad, "new");
      next.current = pin;
      setErr(null); setEntry(""); setStep("confirm");
      return;
    }
    if (step === "confirm") {
      if (pin !== next.current) return fail("mismatch", "new");
      setBusy(true);
      const r = await post({ type: "change", current: current.current, next: next.current, confirm: pin });
      setBusy(false);
      if (!r.ok) {
        const code = r.code || "server";
        if (code === "current" || code === "locked") return fail(code, "current");
        return fail(["repeated", "sequence", "same", "format", "rate"].includes(code) ? code : "server", "new");
      }
      current.current = ""; next.current = "";
      setErr(null); setEntry(""); setStep("done");
    }
  }, [step, fail]);

  const press = useCallback((d: string) => {
    if (busy || locked || step === "done" || entry.length >= PIN_LENGTH) return;
    const v = entry + d;
    setEntry(v);
    // A beat so the last dot fills before the screen moves on.
    if (v.length === PIN_LENGTH) setTimeout(() => complete(v), 140);
  }, [busy, locked, step, entry, complete]);

  const back = useCallback(() => { if (!busy) setEntry(e => e.slice(0, -1)); }, [busy]);

  // A hardware keyboard (tablet case) types into the same keypad.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^\d$/.test(e.key)) { e.preventDefault(); press(e.key); }
      else if (e.key === "Backspace") { e.preventDefault(); back(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press, back]);

  useEffect(() => {
    if (step !== "done") return;
    const id = setTimeout(() => router.replace("/shop/profile"), 1800);
    return () => clearTimeout(id);
  }, [step, router]);

  if (step === "done") {
    return (
      <div role="status" className="flex min-h-[60dvh] flex-col items-center justify-center text-center" data-testid="pin-done">
        <span className="grid h-24 w-24 place-items-center rounded-full bg-emerald-500/15 pin-pop">
          <Check aria-hidden className="h-12 w-12 text-emerald-400" strokeWidth={2.5} />
        </span>
        <h2 className="mt-6 text-3xl font-semibold tracking-tight">{t("done")}</h2>
        <p className="mt-2 text-base text-neutral-400">{t("doneSub")}</p>
        <Link href="/shop/profile" replace className="mt-10 flex min-h-14 w-full max-w-xs items-center justify-center rounded-2xl bg-amber-500 text-lg font-bold text-black">{t("doneBtn")}</Link>
        <style>{`.pin-pop{animation:pinPop .45s cubic-bezier(.2,1.4,.4,1)}@keyframes pinPop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
      </div>
    );
  }

  const title = step === "current" ? t("stepCurrent") : step === "new" ? t("stepNew") : t("stepConfirm");
  const stepIndex = step === "current" ? 0 : step === "new" ? 1 : 2;
  return (
    <div className="flex flex-col items-center text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-amber-500/10">
        <KeyRound aria-hidden className="h-7 w-7 text-amber-300" strokeWidth={1.8} />
      </span>
      <h2 className="mt-5 text-2xl font-semibold tracking-tight" aria-live="polite">{title}</h2>
      <p className="mt-1 text-sm text-neutral-400">{t("stepNewSub")}</p>

      <div key={shake} className={`mt-7 flex h-6 items-center justify-center gap-5 ${shake ? "pin-shake" : ""}`} role="img" aria-label={`${entry.length} / ${PIN_LENGTH}`}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span key={i} className={`h-4 w-4 rounded-full border-2 transition ${entry.length > i ? "border-amber-500 bg-amber-500" : "border-neutral-500"}`} />
        ))}
      </div>
      <p role="alert" className="mt-4 min-h-6 text-sm font-medium text-rose-300">{err || ""}</p>

      <div className="mt-4 flex gap-1.5" aria-hidden>
        {[0, 1, 2].map(i => <span key={i} className={`h-1.5 w-8 rounded-full ${i <= stepIndex ? "bg-amber-400" : "bg-white/10"}`} />)}
      </div>

      <div className={`mt-6 grid w-full max-w-[288px] grid-cols-3 gap-x-6 gap-y-3 ${locked ? "opacity-40" : ""}`}>
        {KEYS.map(d => (
          <button key={d} type="button" disabled={busy || locked} onClick={() => press(d)} className="mx-auto grid h-[72px] w-[72px] place-items-center rounded-full bg-neutral-800 text-3xl font-medium tabular-nums text-neutral-100 transition active:scale-95 active:bg-neutral-700 disabled:active:scale-100">
            {d}
          </button>
        ))}
        <Link href="/shop/profile" className="mx-auto grid h-[72px] w-[72px] place-items-center rounded-full text-base font-medium text-neutral-300">{t("cancel")}</Link>
        <button type="button" disabled={busy || locked} onClick={() => press("0")} className="mx-auto grid h-[72px] w-[72px] place-items-center rounded-full bg-neutral-800 text-3xl font-medium tabular-nums text-neutral-100 transition active:scale-95 active:bg-neutral-700">
          0
        </button>
        <button type="button" aria-label={t("delete")} disabled={busy || !entry} onClick={back} className="mx-auto grid h-[72px] w-[72px] place-items-center rounded-full text-neutral-300 disabled:opacity-30">
          <Delete aria-hidden className="h-7 w-7" strokeWidth={1.8} />
        </button>
      </div>
      <style>{`.pin-shake{animation:pinShake .4s}@keyframes pinShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-10px)}40%{transform:translateX(10px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}`}</style>
    </div>
  );
}
