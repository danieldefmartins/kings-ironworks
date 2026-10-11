"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileCheck2, FileText } from "lucide-react";
import { maskedTin } from "@/lib/shop/tin";
import type { ProfileView } from "@/lib/shop/w9";
import { w9t } from "@/lib/shop/w9-i18n";
import W9Form from "../W9Form";
import { GhostButton } from "../ui";

function fmtDate(iso: string, lang: string) {
  return new Date(iso).toLocaleDateString(lang === "pt" ? "pt-BR" : lang === "es" ? "es-US" : "en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric" });
}

export default function W9Status({ profile: initial, lang }: { profile: ProfileView; lang: string }) {
  const t = (k: string, v?: Record<string, string | number>) => w9t(lang, k, v);
  const router = useRouter();
  const [profile, setProfile] = useState(initial);
  const [editing, setEditing] = useState(profile.w9.needsSignature);
  const w9 = profile.w9;

  return (
    <div className="space-y-6">
      {w9.status === "signed" && w9.signedAt && (
        <section className="rounded-[24px] border border-emerald-500/25 bg-emerald-500/5 p-5">
          <div className="flex items-start gap-4">
            <FileCheck2 aria-hidden className="h-9 w-9 shrink-0 text-emerald-400" strokeWidth={1.6} />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold">{t("w9Title")} · {t("st_signed")}</h1>
              <p className="mt-1 text-sm text-neutral-400">{t("signedOn", { date: fmtDate(w9.signedAt, lang) })}{w9.tinType && w9.tinLast4 ? ` · ${t(`tin_${w9.tinType}`)} ${maskedTin(w9.tinType, w9.tinLast4)}` : ""}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <a href="/shop/api/w9/pdf" target="_blank" rel="noopener" className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 text-base font-semibold"><FileText aria-hidden className="h-5 w-5" />{t("viewMyW9")}</a>
            {!editing && <GhostButton onClick={() => setEditing(true)}>{t("updateW9")}</GhostButton>}
          </div>
        </section>
      )}
      {editing && (
        <section className="space-y-4">
          {w9.status !== "signed" && (
            <header>
              <h1 className="text-3xl font-semibold tracking-tight">{t("bannerW9Title")}</h1>
              <p className="mt-2 text-base leading-relaxed text-neutral-400">{t("step_w9_hint")}</p>
            </header>
          )}
          <W9Form
            profile={profile}
            lang={lang}
            onBackOut={w9.status === "signed" ? () => setEditing(false) : undefined}
            onSigned={p => { setProfile(p); setEditing(false); router.refresh(); }}
          />
        </section>
      )}
    </div>
  );
}
