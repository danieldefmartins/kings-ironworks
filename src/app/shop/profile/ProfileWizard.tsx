"use client";
// "Complete your profile": contact → address → emergency → payment → W-9.
// Each step saves on Continue, so leaving halfway keeps what was entered.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { PROFILE_STEPS, fieldOk, stepDone, type ProfileFields, type ProfileStep, type ProfileView } from "@/lib/shop/w9";
import { w9t } from "@/lib/shop/w9-i18n";
import W9Form from "./W9Form";
import { Field, GhostButton, PrimaryButton, Progress, TextInput } from "./ui";

const STEP_FIELDS: Record<Exclude<ProfileStep, "w9">, (keyof ProfileFields)[]> = {
  contact: ["legalName", "phone", "email"],
  address: ["street", "unit", "city", "state", "postalCode"],
  emergency: ["emergencyName", "emergencyPhone", "emergencyRelationship"],
  payment: ["zelleContact", "zelleName"],
};
const OPTIONAL = new Set<keyof ProfileFields>(["unit", "zelleContact", "zelleName"]);
const INPUT: Partial<Record<keyof ProfileFields, { type?: string; inputMode?: "tel" | "email" | "numeric"; autoComplete?: string }>> = {
  legalName: { autoComplete: "name" },
  phone: { type: "tel", inputMode: "tel", autoComplete: "tel" },
  email: { type: "email", inputMode: "email", autoComplete: "email" },
  street: { autoComplete: "address-line1" },
  unit: { autoComplete: "address-line2" },
  city: { autoComplete: "address-level2" },
  state: { autoComplete: "address-level1" },
  postalCode: { inputMode: "numeric", autoComplete: "postal-code" },
  emergencyPhone: { type: "tel", inputMode: "tel" },
};

export default function ProfileWizard({ profile: initial, lang, initialStep }: { profile: ProfileView; lang: string; initialStep: ProfileStep | "done" }) {
  const t = (k: string, v?: Record<string, string | number>) => w9t(lang, k, v);
  const router = useRouter();
  const [profile, setProfile] = useState(initial);
  const [step, setStep] = useState<ProfileStep | "done">(initialStep);
  const [draft, setDraft] = useState<ProfileFields>(() => {
    const out = {} as ProfileFields;
    for (const k of Object.keys(initial) as (keyof ProfileView)[]) if (typeof initial[k] === "string") (out as unknown as Record<string, string>)[k] = initial[k] as string;
    return out;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);

  const idx = step === "done" ? PROFILE_STEPS.length : PROFILE_STEPS.indexOf(step);
  const go = (s: ProfileStep | "done") => { setStep(s); setError(""); setTouched(false); window.scrollTo({ top: 0 }); };
  const nextStep = (from: ProfileStep): ProfileStep | "done" => {
    const i = PROFILE_STEPS.indexOf(from);
    return PROFILE_STEPS[i + 1] ?? "done";
  };

  async function saveStep(s: Exclude<ProfileStep, "w9">, skip = false) {
    if (skip) return go(nextStep(s));
    const keys = STEP_FIELDS[s];
    setTouched(true);
    const bad = keys.filter(k => !(OPTIONAL.has(k) && !String(draft[k] || "").trim()) && !fieldOk(draft, k));
    if (bad.length) return;
    const fields = Object.fromEntries(keys.map(k => [k, String(draft[k] ?? "").trim()]));
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/shop/api/w9", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "profile", fields }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error();
      setProfile(d.profile);
      go(nextStep(s));
    } catch {
      setError(t("saveError"));
    } finally {
      setBusy(false);
    }
  }

  const fieldErr = (k: keyof ProfileFields) =>
    touched && !(OPTIONAL.has(k) && !String(draft[k] || "").trim()) && !fieldOk(draft, k) ? t("fixField") : undefined;
  const input = (k: keyof ProfileFields) => (
    <Field key={k} label={t(k)} optional={OPTIONAL.has(k) ? t("optional") : undefined} error={fieldErr(k)}>
      <TextInput
        value={draft[k] ?? ""}
        onChange={e => setDraft(d => ({ ...d, [k]: e.target.value }))}
        invalid={!!fieldErr(k)}
        data-field={k}
        {...INPUT[k]}
      />
    </Field>
  );

  if (step === "done") {
    return (
      <div className="flex flex-col items-center px-2 py-10 text-center">
        <CheckCircle2 aria-hidden className="h-16 w-16 text-emerald-400" strokeWidth={1.5} />
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">{t("doneTitle")}</h1>
        <p className="mt-2 max-w-sm text-base text-neutral-400">{stepDone(profile, "w9") ? t("doneBody") : t("bannerBody")}</p>
        <Link href="/shop" onClick={() => router.refresh()} className="mt-8 flex min-h-14 w-full max-w-sm items-center justify-center rounded-2xl bg-amber-500 text-lg font-bold text-black">{t("doneCta")}</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Progress total={PROFILE_STEPS.length} current={idx} />
        <p className="text-sm text-neutral-500">{t("stepOf", { n: idx + 1, total: PROFILE_STEPS.length })}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{t(`step_${step}`)}</h1>
        {step !== "w9" && <p className="text-base leading-relaxed text-neutral-400">{t(`step_${step}_hint`)}</p>}
      </div>

      {step === "w9" ? (
        <W9Form
          profile={{ ...profile, ...draft, w9: profile.w9 }}
          lang={lang}
          intro={t("step_w9_hint")}
          onBackOut={() => go("payment")}
          onSigned={p => { setProfile(p); go("done"); router.refresh(); }}
        />
      ) : (
        <>
          <div className="space-y-4">
            {step === "address" ? (
              <>
                {input("street")}
                {input("unit")}
                {input("city")}
                <div className="grid grid-cols-2 gap-3">{input("state")}{input("postalCode")}</div>
              </>
            ) : STEP_FIELDS[step].map(input)}
          </div>
          {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
          <div className="flex gap-3">
            {idx > 0 && <GhostButton onClick={() => go(PROFILE_STEPS[idx - 1])}>{t("back")}</GhostButton>}
            <PrimaryButton disabled={busy} onClick={() => saveStep(step)} className="flex-1">{busy ? t("saving") : t("continue")}</PrimaryButton>
          </div>
          {step === "payment" && (
            <button type="button" onClick={() => saveStep("payment", true)} className="mx-auto block min-h-11 px-4 text-sm text-neutral-400 underline-offset-4 hover:underline">{t("skip")}</button>
          )}
        </>
      )}
    </div>
  );
}
