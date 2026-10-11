"use client";
// Form W-9, one part at a time: name & tax type → address → TIN → review & sign.
//
// The TIN lives only in this component's state until the sign request is sent.
// It is never put in the URL, localStorage, or any other request, and the
// server answers with last 4 digits at most.
import { useMemo, useRef, useState } from "react";
import { Check, Eye, EyeOff, Lock } from "lucide-react";
import SignaturePad, { type SignaturePadHandle } from "@/app/shop/job/[id]/measure/[sheetId]/SignaturePad";
import { formatTin, maskedTin, validateTin, type TinType } from "@/lib/shop/tin";
import {
  W9_CERT_INSTRUCTIONS, W9_CERT_ITEMS, W9_CLASSIFICATIONS, W9_ESIGN_CONSENT, W9_JURAT_INTRO, LLC_CLASSES,
  foreignPartnersApplies, requiresEin, w9LineOneName,
  type ProfileView, type W9Classification,
} from "@/lib/shop/w9";
import { CERT_TRANSLATION, w9t } from "@/lib/shop/w9-i18n";
import { Field, GhostButton, PrimaryButton, Progress, TextInput } from "./ui";

const PARTS = ["name", "address", "tin", "sign"] as const;
type Part = (typeof PARTS)[number];

const ESIGN_EN = W9_ESIGN_CONSENT;

export default function W9Form({ profile, lang, onSigned, onBackOut, intro }: {
  profile: ProfileView;
  lang: string;
  onSigned: (p: ProfileView) => void;
  onBackOut?: () => void;
  /** Shown above the first part only (why a W-9 is needed). */
  intro?: string;
}) {
  const t = (k: string, v?: Record<string, string | number>) => w9t(lang, k, v);
  const [part, setPartState] = useState<Part>("name");
  const setPart = (p: Part) => { setPartState(p); if (typeof window !== "undefined") window.scrollTo({ top: 0 }); };
  const [f, setF] = useState({
    name: w9LineOneName(profile),
    businessName: profile.w9.businessName || "",
    classification: (profile.w9.classification || "individual") as W9Classification,
    llcClass: "" as "" | "C" | "S" | "P",
    otherText: "",
    foreignPartners: false,
    exemptPayeeCode: "",
    fatcaCode: "",
    street: profile.street,
    unit: profile.unit,
    city: profile.city,
    state: profile.state,
    postalCode: profile.postalCode,
  });
  const onFile = profile.w9.onFile;
  const [tinMode, setTinMode] = useState<"new" | "onFile">(onFile ? "onFile" : "new");
  const [tinType, setTinType] = useState<TinType>(onFile?.tinType || "ssn");
  const [tin, setTin] = useState("");
  const [tinConfirm, setTinConfirm] = useState("");
  const [showTin, setShowTin] = useState(false);
  const [tinTouched, setTinTouched] = useState(false);
  const [backup, setBackup] = useState(false);
  const [certify, setCertify] = useState(false);
  const [consent, setConsent] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [pin, setPin] = useState("");
  const [hasInk, setHasInk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pad = useRef<SignaturePadHandle>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(s => ({ ...s, [k]: v }));

  const needsEin = requiresEin(f.classification);
  const effectiveType: TinType = tinMode === "onFile" && onFile ? onFile.tinType : tinType;
  const tinErr = tinMode === "new" ? validateTin(tinType, tin, tinConfirm) : null;
  const typeErr = needsEin && effectiveType !== "ein" ? "tin.einRequired" : null;
  const today = useMemo(() => new Date().toLocaleDateString(lang === "pt" ? "pt-BR" : lang === "es" ? "es-US" : "en-US", { timeZone: "America/New_York", month: "long", day: "numeric", year: "numeric" }), [lang]);

  const partOk: Record<Part, boolean> = {
    name: f.name.trim().length >= 2 && (f.classification !== "llc" || !!f.llcClass) && (f.classification !== "other" || !!f.otherText.trim()),
    address: f.street.trim().length >= 3 && f.city.trim().length >= 2 && f.state.trim().length >= 2 && /^\d{5}(-\d{4})?$/.test(f.postalCode.trim()),
    tin: !tinErr && !typeErr,
    sign: certify && consent && hasInk && typedName.trim().length >= 3 && /^\d{4,8}$/.test(pin),
  };
  const idx = PARTS.indexOf(part);

  async function sign() {
    if (!partOk.sign || busy) return;
    setBusy(true);
    setError("");
    try {
      const form = {
        ...f,
        llcClass: f.classification === "llc" ? f.llcClass : null,
        foreignPartners: foreignPartnersApplies(f.classification, f.llcClass) && f.foreignPartners,
        tinMode,
        ...(tinMode === "new" ? { tinType, tin, tinConfirm } : {}),
        backupWithholding: backup,
        certify, consent, typedName, pin,
        signature: pad.current?.toDataURL(600) || "",
      };
      const r = await fetch("/shop/api/w9", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "sign", form }), cache: "no-store" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) {
        const code = String(d.code || "");
        if (code.startsWith("tin.")) { setPart("tin"); setError(t(code)); return; }
        setError(t(["pin", "locked", "key", "signature"].includes(code) ? `err.${code}` : "err.generic"));
        return;
      }
      setTin(""); setTinConfirm(""); setPin("");
      onSigned(d.profile);
    } catch {
      setError(t("err.generic"));
    } finally {
      setBusy(false);
    }
  }

  const header = (
    <div className="space-y-3">
      <Progress total={PARTS.length} current={idx} />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">{t("w9Title")} · {t(`w9Part_${part}`)}</p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500"><Lock aria-hidden className="h-3.5 w-3.5" />{t("w9Private")}</p>
      </div>
    </div>
  );

  const nav = (next: () => void, ok: boolean, label = t("continue")) => (
    <div className="flex gap-3 pt-2">
      {(idx > 0 || onBackOut) && <GhostButton onClick={() => (idx > 0 ? setPart(PARTS[idx - 1]) : onBackOut?.())}>{t("back")}</GhostButton>}
      <PrimaryButton disabled={!ok || busy} onClick={next} className="flex-1">{label}</PrimaryButton>
    </div>
  );

  if (part === "name") {
    return (
      <div className="space-y-5" data-w9-part="name">
        {intro && <p className="text-base leading-relaxed text-neutral-400">{intro}</p>}
        {header}
        <Field label={t("line1")} hint={t("line1Hint")}>
          <TextInput value={f.name} onChange={e => set("name", e.target.value)} autoComplete="name" />
        </Field>
        <Field label={t("line2")} hint={t("line2Hint")} optional={t("optional")}>
          <TextInput value={f.businessName} onChange={e => set("businessName", e.target.value)} autoComplete="organization" />
        </Field>
        <fieldset>
          <legend className="mb-2 text-sm text-neutral-400">{t("line3a")}</legend>
          <div className="overflow-hidden rounded-2xl border border-white/10">
            {W9_CLASSIFICATIONS.map(c => {
              const on = f.classification === c;
              return (
                <label key={c} className={`flex min-h-14 cursor-pointer items-center gap-3 border-b border-white/10 px-4 py-3 last:border-0 ${on ? "bg-amber-500/10" : "bg-neutral-900"}`}>
                  <input type="radio" name="w9class" className="sr-only" checked={on} onChange={() => set("classification", c)} />
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${on ? "border-amber-400 bg-amber-400 text-black" : "border-neutral-600"}`}>{on && <Check aria-hidden className="h-4 w-4" strokeWidth={3} />}</span>
                  <span className="min-w-0">
                    <span className="block text-base">{t(`cls_${c}`)}</span>
                    {c === "individual" && <span className="block text-xs text-neutral-500">{t("cls_individual_hint")}</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
        {f.classification === "llc" && (
          <Field label={t("llcClass")}>
            <select value={f.llcClass} onChange={e => set("llcClass", e.target.value as typeof f.llcClass)} className="min-h-14 w-full rounded-2xl border border-white/10 bg-neutral-900 px-4 text-base">
              <option value="" />
              {LLC_CLASSES.map(c => <option key={c} value={c}>{t(`llc_${c}`)}</option>)}
            </select>
          </Field>
        )}
        {f.classification === "other" && (
          <Field label={t("otherText")}><TextInput value={f.otherText} maxLength={60} onChange={e => set("otherText", e.target.value)} /></Field>
        )}
        {foreignPartnersApplies(f.classification, f.llcClass) && (
          <label className="flex min-h-14 items-start gap-3 rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3">
            <input type="checkbox" className="mt-1 h-5 w-5 accent-amber-500" checked={f.foreignPartners} onChange={e => set("foreignPartners", e.target.checked)} />
            <span className="text-sm leading-relaxed">{t("line3b")}</span>
          </label>
        )}
        <details className="rounded-2xl border border-white/10 bg-neutral-900/60 px-4 py-3">
          <summary className="flex min-h-10 cursor-pointer items-center justify-between text-sm text-neutral-300">
            <span>{t("exemptions")}</span><span className="text-xs text-neutral-500">{t("exemptionsHint")}</span>
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label={t("exemptPayee")}><TextInput value={f.exemptPayeeCode} maxLength={2} inputMode="numeric" onChange={e => set("exemptPayeeCode", e.target.value.replace(/\D/g, ""))} /></Field>
            <Field label={t("fatca")}><TextInput value={f.fatcaCode} maxLength={1} onChange={e => set("fatcaCode", e.target.value.toUpperCase().replace(/[^A-M]/g, ""))} /></Field>
          </div>
        </details>
        {nav(() => setPart("address"), partOk.name)}
      </div>
    );
  }

  if (part === "address") {
    return (
      <div className="space-y-5" data-w9-part="address">
        {header}
        <Field label={t("line5")}><TextInput value={f.street} onChange={e => set("street", e.target.value)} autoComplete="address-line1" /></Field>
        <Field label={t("unit")} optional={t("optional")}><TextInput value={f.unit} onChange={e => set("unit", e.target.value)} autoComplete="address-line2" /></Field>
        <p className="text-sm text-neutral-400">{t("line6")}</p>
        <Field label={t("city")}><TextInput value={f.city} onChange={e => set("city", e.target.value)} autoComplete="address-level2" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("state")}><TextInput value={f.state} onChange={e => set("state", e.target.value)} autoComplete="address-level1" /></Field>
          <Field label={t("postalCode")}><TextInput value={f.postalCode} inputMode="numeric" onChange={e => set("postalCode", e.target.value)} autoComplete="postal-code" /></Field>
        </div>
        {nav(() => setPart("tin"), partOk.address)}
      </div>
    );
  }

  if (part === "tin") {
    const showErr = tinTouched && tinMode === "new" && tinErr && !(tinErr === "mismatch" && !tinConfirm) ? t(`tin.${tinErr}`) : "";
    return (
      <div className="space-y-5" data-w9-part="tin">
        {header}
        {onFile && (
          <div className="overflow-hidden rounded-2xl border border-white/10">
            {(["onFile", "new"] as const).map(m => {
              const on = tinMode === m;
              return (
                <label key={m} className={`flex min-h-16 cursor-pointer items-center gap-3 border-b border-white/10 px-4 py-3 last:border-0 ${on ? "bg-amber-500/10" : "bg-neutral-900"}`}>
                  <input type="radio" name="tinmode" className="sr-only" checked={on} onChange={() => setTinMode(m)} />
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${on ? "border-amber-400 bg-amber-400 text-black" : "border-neutral-600"}`}>{on && <Check aria-hidden className="h-4 w-4" strokeWidth={3} />}</span>
                  {m === "onFile" ? (
                    <span>
                      <span className="block text-base">{t("tinOnFile")} <span className="font-mono tabular-nums">{maskedTin(onFile.tinType, onFile.tinLast4)}</span></span>
                      <span className="block text-xs text-neutral-500">{t(`tin_${onFile.tinType}_long`)} · {t(onFile.source === "owner" ? "tinOnFileOwner" : "tinOnFileSigned")}</span>
                    </span>
                  ) : <span className="text-base">{t("tinDifferent")}</span>}
                </label>
              );
            })}
          </div>
        )}
        {tinMode === "new" && (
          <>
            <fieldset>
              <legend className="mb-2 text-sm text-neutral-400">{t("tinType")}</legend>
              <div className="grid grid-cols-3 gap-1 rounded-2xl bg-white/5 p-1">
                {(["ssn", "itin", "ein"] as const).map(k => (
                  <button key={k} type="button" aria-pressed={tinType === k} onClick={() => { setTinType(k); setTin(""); setTinConfirm(""); setTinTouched(false); }} className={`min-h-12 rounded-xl text-base font-semibold ${tinType === k ? "bg-neutral-700 text-white shadow" : "text-neutral-400"}`}>{t(`tin_${k}`)}</button>
                ))}
              </div>
              <p className="mt-2 text-xs text-neutral-500">{t(`tin_${tinType}_long`)}</p>
            </fieldset>
            <Field label={t("tinEnter")} error={showErr}>
              <div className="relative">
                <TextInput
                  value={tin}
                  type={showTin ? "text" : "password"}
                  inputMode="numeric"
                  autoComplete="off"
                  spellCheck={false}
                  data-1p-ignore
                  data-testid="tin"
                  placeholder={tinType === "ein" ? "00-0000000" : "000-00-0000"}
                  onChange={e => setTin(formatTin(tinType, e.target.value))}
                  onBlur={() => setTinTouched(true)}
                  invalid={!!showErr}
                  className="pr-24 font-mono text-lg tracking-widest"
                />
                <button type="button" onClick={() => setShowTin(s => !s)} className="absolute right-2 top-1/2 flex min-h-11 -translate-y-1/2 items-center gap-1.5 rounded-xl px-3 text-sm text-neutral-400">
                  {showTin ? <EyeOff aria-hidden className="h-4 w-4" /> : <Eye aria-hidden className="h-4 w-4" />}{t(showTin ? "tinHide" : "tinShow")}
                </button>
              </div>
            </Field>
            <Field label={t("tinConfirm")}>
              <TextInput value={tinConfirm} type={showTin ? "text" : "password"} inputMode="numeric" autoComplete="off" spellCheck={false} data-1p-ignore data-testid="tin-confirm" placeholder={tinType === "ein" ? "00-0000000" : "000-00-0000"} onChange={e => { setTinConfirm(formatTin(tinType, e.target.value)); setTinTouched(true); }} className="font-mono text-lg tracking-widest" />
            </Field>
          </>
        )}
        {typeErr && <p role="alert" className="text-sm text-rose-300">{t(typeErr)}</p>}
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        {nav(() => { setError(""); setPart("sign"); }, partOk.tin)}
      </div>
    );
  }

  const tr = lang === "pt" || lang === "es" ? CERT_TRANSLATION[lang] : null;
  return (
    <div className="space-y-5" data-w9-part="sign">
      {header}
      <section className="rounded-2xl border border-white/10 bg-neutral-950/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t("partII")} · {t("legalTextNote")}</p>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-neutral-100">{W9_JURAT_INTRO}</p>
        <ol className="mt-2 space-y-2 text-sm leading-relaxed text-neutral-200">
          {W9_CERT_ITEMS.map((s, i) => (
            <li key={i} className={`flex gap-2 ${i === 1 && backup ? "text-neutral-500 line-through decoration-rose-400 decoration-2" : ""}`}><span className="tabular-nums">{i + 1}.</span><span>{s}</span></li>
          ))}
        </ol>
        <p className="mt-3 text-xs leading-relaxed text-neutral-400">{W9_CERT_INSTRUCTIONS}</p>
        {tr && (
          <details className="mt-3 border-t border-white/10 pt-3">
            <summary className="min-h-10 cursor-pointer text-sm text-amber-300">{t("translation")}</summary>
            <p className="mt-2 text-sm text-neutral-300">{tr.intro}</p>
            <ol className="mt-1 space-y-1.5 text-sm leading-relaxed text-neutral-400">{tr.items.map((s, i) => <li key={i}>{i + 1}. {s}</li>)}</ol>
          </details>
        )}
      </section>

      <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3">
        <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-amber-500" checked={backup} onChange={e => setBackup(e.target.checked)} />
        <span><span className="block text-sm leading-relaxed">{t("backupWithholding")}</span><span className="mt-0.5 block text-xs text-neutral-500">{t("backupHint")}</span></span>
      </label>
      <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3">
        <input type="checkbox" data-testid="certify" className="mt-1 h-5 w-5 shrink-0 accent-amber-500" checked={certify} onChange={e => setCertify(e.target.checked)} />
        <span className="text-sm font-medium leading-relaxed">{t("certify")}</span>
      </label>

      <section className="space-y-3">
        <h3 className="text-base font-semibold">{t("consentTitle")}</h3>
        <p className="text-xs leading-relaxed text-neutral-400">{ESIGN_EN}</p>
        {tr && <p className="text-xs leading-relaxed text-neutral-500">{tr.consent}</p>}
        <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3">
          <input type="checkbox" data-testid="consent" className="mt-1 h-5 w-5 shrink-0 accent-amber-500" checked={consent} onChange={e => setConsent(e.target.checked)} />
          <span><span className="block text-sm font-medium">{t("consentAgree")}</span><span className="mt-0.5 block text-xs leading-relaxed text-neutral-500">{t("consentHelp")}</span></span>
        </label>
      </section>

      <div>
        <p className="mb-2 text-sm text-neutral-400">{t("signHere")}</p>
        <SignaturePad ref={pad} placeholder={t("signHere")} clearLabel={t("clear")} onInk={setHasInk} />
      </div>
      <Field label={t("typedName")}>
        <TextInput value={typedName} onChange={e => setTypedName(e.target.value)} placeholder={f.name} autoComplete="off" data-testid="typed-name" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
        <Field label={t("date")}><div className="flex min-h-14 items-center rounded-2xl border border-white/5 bg-neutral-900/40 px-4 text-base text-neutral-300">{today}</div></Field>
        <Field label={t("pin")}>
          <TextInput value={pin} type="password" inputMode="numeric" autoComplete="off" maxLength={8} data-testid="pin" onChange={e => setPin(e.target.value.replace(/\D/g, ""))} className="font-mono tracking-widest" />
        </Field>
      </div>
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      {nav(sign, partOk.sign, busy ? t("signing") : t("signCta"))}
    </div>
  );
}
