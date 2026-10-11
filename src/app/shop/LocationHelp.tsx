"use client";

// Location for the payroll clock (owner rule 10/11: no location, no clock-in).
//   LocatingOverlay   — "Getting your location…" while a clock-in waits on GPS
//   LocationHelp      — why it failed and, for THIS phone only, how to allow
//                       location so it sticks (no daily prompts), + Try again
//   AllowLocationCard — the once-a-day nudge while permission isn't granted
// Short, numbered, big text. iPhone or Android steps, never both.

import { useState } from "react";
import { MapPin } from "lucide-react";

type Lang = "en" | "pt" | "es";
const L = (lang: string): Lang => (lang === "pt" || lang === "es" ? lang : "en");

const TEXT = {
  notTitle: { en: "Not clocked in — location is required", pt: "Ponto não registrado — a localização é obrigatória", es: "Entrada no marcada — se necesita tu ubicación" },
  notSubDenied: { en: "The office has been notified. Allow location so it stays on:", pt: "O escritório foi avisado. Permita a localização para ficar ativada:", es: "La oficina fue avisada. Permite la ubicación para que quede activada:" },
  notSubUnavail: { en: "The office has been notified. Turn on Location (Wi-Fi helps), then try again.", pt: "O escritório foi avisado. Ative a Localização (o Wi-Fi ajuda) e tente de novo.", es: "La oficina fue avisada. Activa la Ubicación (el Wi-Fi ayuda) e inténtalo de nuevo." },
  required: { en: "Location is required to clock in. If you don't allow location, you won't be able to clock in.", pt: "A localização é obrigatória para bater o ponto. Se você não permitir a localização, não vai conseguir bater o ponto.", es: "La ubicación es obligatoria para marcar entrada. Si no permites la ubicación, no podrás marcar entrada." },
  locating: { en: "Getting your location…", pt: "Obtendo sua localização…", es: "Obteniendo tu ubicación…" },
  deniedTitle: { en: "Location is required to clock in", pt: "A localização é obrigatória para bater o ponto", es: "Se necesita tu ubicación para marcar entrada" },
  deniedSub: { en: "We need to record your location. Allow it once and it stays on:", pt: "Precisamos registrar sua localização. Permita uma vez e fica ativado:", es: "Necesitamos registrar tu ubicación. Permítela una vez y queda activada:" },
  unavailTitle: { en: "We couldn't find your location", pt: "Não conseguimos achar sua localização", es: "No pudimos encontrar tu ubicación" },
  unavailSub: { en: "Turn on Location (Wi-Fi helps), then try again.", pt: "Ative a Localização (o Wi-Fi ajuda) e tente de novo.", es: "Activa la Ubicación (el Wi-Fi ayuda) e inténtalo de nuevo." },
  outTitle: { en: "Clock-out saved — no location", pt: "Saída registrada — sem localização", es: "Salida registrada — sin ubicación" },
  outSub: { en: "Turn on Location so the office can see where you clocked out.", pt: "Ative a Localização para o escritório ver onde você bateu a saída.", es: "Activa la Ubicación para que la oficina vea dónde marcaste la salida." },
  retry: { en: "Try again", pt: "Tentar de novo", es: "Intentar de nuevo" },
  close: { en: "Close", pt: "Fechar", es: "Cerrar" },
  still: { en: "Still no location. Check the steps above.", pt: "Ainda sem localização. Confira os passos acima.", es: "Todavía sin ubicación. Revisa los pasos de arriba." },
  done: { en: "Location saved", pt: "Localização salva", es: "Ubicación guardada" },
  cardTitle: { en: "Allow location so you can clock in", pt: "Permita a localização para bater o ponto", es: "Permite la ubicación para marcar entrada" },
  cardSub: { en: "Choose \"Allow\" — not \"Only this time\".", pt: "Escolha \"Permitir\" — não \"Só desta vez\".", es: "Elige \"Permitir\" — no \"Solo esta vez\"." },
  cardAllow: { en: "Allow location", pt: "Permitir localização", es: "Permitir ubicación" },
  later: { en: "Later", pt: "Depois", es: "Después" },
};

const STEPS: Record<"ios" | "android", Record<Lang, string[]>> = {
  ios: {
    en: ["Settings › Apps › Safari › Location → Allow", "Settings › Privacy & Security › Location Services › Safari Websites → While Using the App, Precise Location on", "Come back and tap Try again"],
    pt: ["Ajustes › Apps › Safari › Localização → Permitir", "Ajustes › Privacidade e Segurança › Serviços de Localização › Sites do Safari → Durante o Uso do App, Localização Exata ativada", "Volte e toque em Tentar de novo"],
    es: ["Ajustes › Apps › Safari › Ubicación → Permitir", "Ajustes › Privacidad y seguridad › Localización › Sitios web de Safari → Cuando se use la app, Ubicación exacta activada", "Vuelve y toca Intentar de nuevo"],
  },
  android: {
    en: ["When Chrome asks, choose \"Allow\" (not \"Only this time\")", "If blocked: tap the lock by the address › Permissions › Location › Allow", "Turn the phone's Location on"],
    pt: ["Quando o Chrome perguntar, escolha \"Permitir\" (não \"Só desta vez\")", "Se estiver bloqueado: toque no cadeado ao lado do endereço › Permissões › Localização › Permitir", "Ative a Localização do celular"],
    es: ["Cuando Chrome pregunte, elige \"Permitir\" (no \"Solo esta vez\")", "Si está bloqueado: toca el candado junto a la dirección › Permisos › Ubicación › Permitir", "Activa la Ubicación del teléfono"],
  },
};

export function phonePlatform(ua: string): "ios" | "android" {
  // iPadOS reports as a Mac; the crew's Macs are not punching.
  return /iPhone|iPad|iPod|Macintosh/.test(ua) ? "ios" : "android";
}

/** The upfront rule, shown before anyone taps Clock in. */
export function LocationRequiredLine({ lang, className = "" }: { lang: string; className?: string }) {
  return (
    <p className={`flex items-start gap-2 text-sm font-medium leading-snug text-neutral-300 ${className}`}>
      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
      <span>{TEXT.required[L(lang)]}</span>
    </p>
  );
}

export function LocatingOverlay({ lang }: { lang: string }) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/75" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-5 px-8 text-center">
        <span aria-hidden className="h-14 w-14 animate-spin rounded-full border-4 border-emerald-400 border-t-transparent" />
        <p className="text-2xl font-semibold text-white">{TEXT.locating[L(lang)]}</p>
      </div>
    </div>
  );
}

export default function LocationHelp({ mode, lang, onRetry, onClose, notified = false }: {
  notified?: boolean;
  mode: "in-denied" | "in-unavailable" | "out";
  lang: string;
  onRetry: () => Promise<boolean>;
  onClose: () => void;
}) {
  const l = L(lang);
  const [platform] = useState(() => (typeof navigator === "undefined" ? "ios" : phonePlatform(navigator.userAgent)));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const title = notified ? TEXT.notTitle[l] : mode === "in-denied" ? TEXT.deniedTitle[l] : mode === "in-unavailable" ? TEXT.unavailTitle[l] : TEXT.outTitle[l];
  const sub = notified ? (mode === "in-denied" ? TEXT.notSubDenied[l] : TEXT.notSubUnavail[l]) : mode === "in-denied" ? TEXT.deniedSub[l] : mode === "in-unavailable" ? TEXT.unavailSub[l] : TEXT.outSub[l];

  async function retry() {
    setBusy(true); setFailed(false);
    const ok = await onRetry().catch(() => false);
    setBusy(false);
    if (ok) onClose(); else setFailed(true);
  }

  return (
    <div className="fixed inset-0 z-[65] flex items-end bg-black/70 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="loc-help">
      <section className="max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] border border-white/10 bg-neutral-900 px-5 pt-6 pb-[max(24px,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-[28px]">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-red-500/15 text-red-400">
          <MapPin className="h-7 w-7" strokeWidth={2.4} />
        </div>
        <h2 id="loc-help" className="text-center text-2xl font-semibold leading-tight tracking-tight">{title}</h2>
        <p className="mt-2 text-center text-base text-neutral-400">{sub}</p>
        <ol className="mt-5 space-y-3">
          {STEPS[platform][l].map((step, i) => (
            <li key={i} className="flex gap-3 rounded-2xl bg-neutral-800/70 p-3 text-base leading-snug">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-500 text-sm font-bold text-black">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        {failed && <p role="alert" className="mt-4 rounded-xl bg-red-950/60 p-3 text-center text-base text-red-300">{TEXT.still[l]}</p>}
        <div className="mt-5 space-y-3">
          <button onClick={retry} disabled={busy} className="min-h-16 w-full rounded-2xl bg-emerald-500 text-lg font-bold text-black disabled:opacity-60">
            {busy ? "…" : TEXT.retry[l]}
          </button>
          <button onClick={onClose} className="min-h-14 w-full rounded-2xl bg-neutral-800 text-base font-semibold">{TEXT.close[l]}</button>
        </div>
      </section>
    </div>
  );
}

export function AllowLocationCard({ lang, busy, onAllow, onLater }: { lang: string; busy: boolean; onAllow: () => void; onLater: () => void }) {
  const l = L(lang);
  return (
    <section className="mx-4 my-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4" aria-label={TEXT.cardTitle[l]}>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-300"><MapPin className="h-6 w-6" /></span>
        <div className="min-w-0">
          <p className="text-lg font-semibold leading-snug">{TEXT.cardTitle[l]}</p>
          <p className="mt-1 text-sm text-neutral-300">{TEXT.required[l]}</p>
          <p className="mt-1 text-sm text-neutral-400">{TEXT.cardSub[l]}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
        <button onClick={onAllow} disabled={busy} className="min-h-14 rounded-2xl bg-emerald-500 text-base font-bold text-black disabled:opacity-60">{TEXT.cardAllow[l]}</button>
        <button onClick={onLater} className="min-h-14 rounded-2xl bg-neutral-800 px-5 text-base font-semibold">{TEXT.later[l]}</button>
      </div>
    </section>
  );
}
