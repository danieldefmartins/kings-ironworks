"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const key = "kiw-shop-appearance";
const event = "kiw-appearance-change";
type Appearance = "light" | "dark";
let fallback: Appearance = "light";
function snapshot(): Appearance {
  try { return localStorage.getItem(key) === "dark" ? "dark" : "light"; }
  catch { return fallback; }
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(event, callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener(event, callback); };
}
export function useShopAppearance() {
  return useSyncExternalStore(subscribe, snapshot, () => "light" as const);
}
function setAppearance(value: Appearance) {
  fallback = value;
  try { localStorage.setItem(key, value); } catch { /* Still usable when device storage is unavailable. */ }
  window.dispatchEvent(new Event(event));
}
export default function ShopAppearance({ lang }: { lang: string }) {
  const appearance = useShopAppearance();
  const label = lang === "pt" ? ["Aparência", "Claro", "Escuro"] : lang === "es" ? ["Apariencia", "Claro", "Oscuro"] : ["Appearance", "Light", "Dark"];
  return <fieldset className="shop-appearance"><legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">{label[0]}</legend><div className="grid grid-cols-2 gap-2 rounded-2xl bg-neutral-800/50 p-1.5">{(["light", "dark"] as const).map((value, i) => {
    const Icon = value === "light" ? Sun : Moon;
    return <button key={value} type="button" aria-pressed={appearance === value} onClick={() => setAppearance(value)} className="flex min-h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold"><Icon aria-hidden className="h-4 w-4" />{label[i + 1]}</button>;
  })}</div></fieldset>;
}
