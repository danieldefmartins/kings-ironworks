"use client";

// The measuring keypad. On a phone the system keyboard has no fractions, no
// feet mark and no idea what is being measured — and it covers half the
// screen, so the drawing and the number box are never visible together.
//
// On touch devices this pad replaces it for every measurement field
// (`data-m="1"`): digits, tape fractions in one tap, feet mark, and a Next key
// that walks to the following measurement. While it is up, the Next card is
// pinned directly above it and the 3D view is sized to the space that is left,
// so the measurer sees what is being asked and what they typed at once.
//
// The system keyboard stays one tap away (the keyboard key) for anything the
// pad cannot type.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronRight, Delete, Keyboard } from "lucide-react";
import { useShopAppearance } from "../../../../../ShopAppearance";

const EIGHTHS = ["1/8", "1/4", "3/8", "1/2", "5/8", "3/4", "7/8"];
const SIXTEENTHS = ["1/16", "3/16", "5/16", "7/16", "9/16", "11/16", "13/16", "15/16"];

/** A trailing tape fraction, with the space before it and the inch mark after. */
const FRACTION_TAIL = /\s?\d+\/\d+"?$/;

/** Backspace: a fraction leaves in one tap (it arrived in one), anything else a character at a time. */
export function padBackspace(value: string): string {
  if (FRACTION_TAIL.test(value)) return value.replace(FRACTION_TAIL, "");
  return value.slice(0, -1).replace(/\s+$/, "");
}

/** Append a key to the value the way a measurer writes it: `3' 6 1/2"`. */
export function padType(value: string, key: string, inchMark: boolean): string {
  if (key.includes("/")) {
    // One fraction per number: a second tap corrects the first instead of stacking.
    const base = value.replace(FRACTION_TAIL, "");
    const sep = base && !base.endsWith(" ") ? " " : "";
    return `${base}${sep}${key}${inchMark ? '"' : ""}`;
  }
  if (key === "'") return /\d$/.test(value) && !value.includes("'") ? `${value}' ` : value;
  if (key === ".") return /\d$/.test(value) && !/[./]\d*$/.test(value) ? `${value}.` : value;
  // A digit after a finished fraction starts over rather than producing `7 1/2"3`.
  if (FRACTION_TAIL.test(value)) return value;
  return value + key;
}

function isMeasureInput(el: Element | null): el is HTMLInputElement {
  return !!el && el.tagName === "INPUT" && (el as HTMLInputElement).dataset.m === "1" && !(el as HTMLInputElement).disabled && !(el as HTMLInputElement).readOnly;
}

function writeValue(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  if (!setter) return;
  setter.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

const NEXT_LABEL: Record<string, string> = { en: "Next", pt: "Próxima", es: "Siguiente" };
const DONE_LABEL: Record<string, string> = { en: "Done", pt: "Pronto", es: "Listo" };
const A11Y: Record<string, { pad: string; del: string; sys: string; fine: string; feet: string }> = {
  en: { pad: "Measuring keypad", del: "Delete", sys: "Use the device keyboard", fine: "Sixteenths", feet: "Feet" },
  pt: { pad: "Teclado de medição", del: "Apagar", sys: "Usar o teclado do aparelho", fine: "Dezesseis avos", feet: "Pés" },
  es: { pad: "Teclado de medición", del: "Borrar", sys: "Usar el teclado del dispositivo", fine: "Dieciseisavos", feet: "Pies" },
};

/**
 * @param feet the sheet is measured in feet + inches (shows the feet key).
 * @returns `true` from `onActive` while the pad owns the bottom of the screen, so the
 *          editor can keep its plain fraction bar for mouse-and-keyboard devices.
 */
export default function MeasureKeypad({ lang, feet, onActive }: { lang: string; feet: boolean; onActive?: (active: boolean) => void }) {
  const dark = useShopAppearance() === "dark";
  const [target, setTarget] = useState<HTMLInputElement | null>(null);
  const [fine, setFine] = useState(false);
  const [, bump] = useState(0);
  const coarse = useRef(false);
  /** The field the measurer sent to the device keyboard; cleared when they leave it. */
  const system = useRef<HTMLInputElement | null>(null);
  const pad = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { targetRef.current = target; }, [target]);

  useEffect(() => {
    const mq = window.matchMedia?.("(pointer: coarse)");
    coarse.current = !!mq?.matches;
    const onMq = () => { coarse.current = !!mq?.matches; };
    mq?.addEventListener?.("change", onMq);

    const claim = (el: HTMLInputElement) => {
      if (!coarse.current || system.current === el) return;
      // Before focus lands, or the device keyboard is already on its way up.
      if (el.dataset.padMode === undefined) el.dataset.padMode = el.getAttribute("inputmode") ?? "";
      el.setAttribute("inputmode", "none");
    };
    const onPointerDown = (e: PointerEvent) => {
      const el = e.target as Element | null;
      if (isMeasureInput(el)) { claim(el); return; }
      // A button on the Next card (Skip, Back, Same for all…) must not take the
      // focus away mid-number: the pad would drop and the card would jump.
      const active = document.activeElement;
      if (isMeasureInput(active) && active.getAttribute("inputmode") === "none" && el?.closest?.("[data-next-measure] button")) e.preventDefault();
    };
    const sync = () => {
      const el = document.activeElement;
      if (isMeasureInput(el) && coarse.current && system.current !== el) { claim(el); setTarget(el); }
      else {
        if (system.current && system.current !== el) system.current = null;
        setTarget(null);
      }
    };
    const onFocusOut = () => requestAnimationFrame(sync);
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("focusin", sync);
    window.addEventListener("focusout", onFocusOut);
    // A focused field can be unmounted without a blur (the card moved on to an Approve step).
    const poll = window.setInterval(() => { if (document.activeElement !== targetRef.current) sync(); }, 400);
    return () => {
      mq?.removeEventListener?.("change", onMq);
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("focusin", sync);
      window.removeEventListener("focusout", onFocusOut);
      window.clearInterval(poll);
    };
  }, []);

  const active = !!target;
  useEffect(() => { onActive?.(active); }, [active, onActive]);

  // Make room: pin the Next card above the pad and size the drawing to what is left.
  const targetId = target?.id ?? "";
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (!target || !pad.current) return;
    const card = target.closest<HTMLElement>("[data-next-measure]");
    const apply = () => {
      const padH = pad.current?.offsetHeight ?? 0;
      root.style.setProperty("--mk-h", `${padH}px`);
      if (card) {
        // Phone: the card is pinned above the pad. Wide: it stays under the drawing in its sticky column.
        const chrome = window.innerWidth >= 1024 ? 72 + 44 : 64 + 24;
        const sceneH = Math.round(window.innerHeight - chrome - card.offsetHeight - padH);
        root.style.setProperty("--mk-scene-h", `${Math.max(120, sceneH)}px`);
      }
    };
    apply();
    root.dataset.measureKeypad = card ? "next" : "field";
    apply();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(apply);
    if (card) observer?.observe(card);
    const settle = window.setTimeout(() => {
      if (card) {
        const scene = document.querySelector<HTMLElement>("[data-scene-viewport]:not([data-fullscreen])");
        if (scene && scene.offsetParent !== null) window.scrollTo({ top: Math.max(0, scene.getBoundingClientRect().top + window.scrollY - 64), behavior: "smooth" });
      } else {
        // No device keyboard is going to scroll the field into view for us.
        const r = target.getBoundingClientRect(), limit = window.innerHeight - (pad.current?.offsetHeight ?? 0) - 24;
        if (r.bottom > limit || r.top < 72) window.scrollBy({ top: r.bottom - limit + 40, behavior: "smooth" });
      }
    }, 60);
    return () => {
      observer?.disconnect();
      window.clearTimeout(settle);
      delete root.dataset.measureKeypad;
      root.style.removeProperty("--mk-h");
      root.style.removeProperty("--mk-scene-h");
    };
  }, [target, targetId]);

  const unit = target?.dataset.laserUnit ?? "len";
  const length = unit === "len";
  const press = useCallback((fn: (el: HTMLInputElement) => void) => (e: React.PointerEvent) => {
    // pointerdown + preventDefault: the field keeps the focus, so the caret and the pad stay.
    e.preventDefault();
    const el = targetRef.current;
    if (!el || !el.isConnected) return;
    try { navigator.vibrate?.(6); } catch { /* not on iOS */ }
    fn(el);
    bump((n) => n + 1);
  }, []);
  const type = (key: string) => press((el) => {
    const max = el.maxLength > 0 ? el.maxLength : 60;
    const next = padType(el.value, key, unit === "len");
    if (next.length <= max) writeValue(el, next);
  });
  const next = press((el) => {
    if (el.id === "next-measure-input") {
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
      return;
    }
    const fields = Array.from(document.querySelectorAll<HTMLInputElement>('input[data-m="1"]')).filter((f) => f.offsetParent !== null && !f.disabled);
    const following = fields[fields.indexOf(el) + 1];
    if (following) following.focus(); else el.blur();
  });
  function toSystem(e: React.PointerEvent) {
    e.preventDefault();
    const el = targetRef.current;
    if (!el || !el.isConnected) return;
    system.current = el;
    const before = el.dataset.padMode;
    if (before) el.setAttribute("inputmode", before); else el.removeAttribute("inputmode");
    delete el.dataset.padMode;
    // The device keyboard only opens on a fresh focus.
    el.blur();
    setTarget(null);
    window.setTimeout(() => el.focus(), 0);
  }

  if (!target) return null;
  const a11y = A11Y[lang] ?? A11Y.en;
  const isNext = target.id === "next-measure-input";
  const filled = target.value.trim() !== "";
  const c = dark
    ? { sheet: "rgba(22,24,29,.96)", line: "rgba(255,255,255,.08)", key: "#2c2f36", keyText: "#f8fafc", soft: "#1f2228", softText: "#cbd5e1", frac: "#3a2f14", fracText: "#fcd34d" }
    : { sheet: "rgba(214,218,226,.97)", line: "rgba(15,23,42,.08)", key: "#ffffff", keyText: "#0f172a", soft: "#b9c0cc", softText: "#1e293b", frac: "#fff7e0", fracText: "#8a5a00" };
  const keyBase = "grid h-[52px] select-none place-items-center rounded-[10px] text-[25px] font-medium tabular-nums transition-transform duration-75 active:scale-[.96] active:brightness-90";
  const keyStyle = { background: c.key, color: c.keyText, boxShadow: "0 1px 0 rgba(0,0,0,.28)" } as const;
  const softStyle = { background: c.soft, color: c.softText, boxShadow: "0 1px 0 rgba(0,0,0,.28)" } as const;
  const fractions = fine ? SIXTEENTHS : EIGHTHS;
  const digit = (d: string) => <button key={d} type="button" data-mk-key={d} tabIndex={-1} onPointerDown={type(d)} className={keyBase} style={keyStyle}>{d}</button>;

  return (
    <div ref={pad} data-measure-keypad="" role="group" aria-label={a11y.pad}
      className="fixed inset-x-0 bottom-0 z-[60] touch-manipulation backdrop-blur-xl print:hidden"
      style={{ background: c.sheet, borderTop: `1px solid ${c.line}`, paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
      // A stray tap between keys must not blur the field.
      onPointerDown={(e) => e.preventDefault()}>
      <style>{STYLE}</style>
      <div className="mx-auto w-full max-w-[520px] px-1.5 pt-1.5">
        {length && (
          <div className="mb-1.5 flex gap-1">
            {fractions.map((f) => (
              <button key={f} type="button" data-mk-key={f} tabIndex={-1} onPointerDown={type(f)}
                className="grid h-11 min-w-0 flex-1 select-none place-items-center rounded-[10px] text-[15px] font-semibold tabular-nums transition-transform duration-75 active:scale-[.95]"
                style={{ background: c.frac, color: c.fracText, boxShadow: "0 1px 0 rgba(0,0,0,.2)" }}>{f}</button>
            ))}
            <button type="button" data-mk-key="fine" tabIndex={-1} aria-label={a11y.fine} aria-pressed={fine}
              onPointerDown={(e) => { e.preventDefault(); setFine((v) => !v); }}
              className="grid h-11 w-12 shrink-0 select-none place-items-center rounded-[10px] text-[13px] font-semibold tabular-nums active:scale-[.95]" style={softStyle}>{fine ? "1/8" : "1/16"}</button>
          </div>
        )}
        <div className="grid grid-cols-4 gap-1.5">
          {["7", "8", "9"].map(digit)}
          <button type="button" data-mk-key="del" tabIndex={-1} aria-label={a11y.del} onPointerDown={press((el) => writeValue(el, padBackspace(el.value)))} className={keyBase} style={softStyle}><Delete aria-hidden className="h-6 w-6" /></button>
          {["4", "5", "6"].map(digit)}
          {length && feet
            ? <button type="button" data-mk-key="ft" tabIndex={-1} aria-label={a11y.feet} onPointerDown={type("'")} className={`${keyBase} text-[17px] font-semibold`} style={softStyle}>ft ′</button>
            : <button type="button" data-mk-key="sys" tabIndex={-1} aria-label={a11y.sys} onPointerDown={toSystem} className={keyBase} style={softStyle}><Keyboard aria-hidden className="h-6 w-6" /></button>}
          {["1", "2", "3"].map(digit)}
          <button type="button" data-mk-key="next" tabIndex={-1} onPointerDown={next}
            className="row-span-2 flex select-none flex-col items-center justify-center gap-0.5 rounded-[10px] text-[16px] font-semibold text-white transition-transform duration-75 active:scale-[.97]"
            style={{ background: filled || !isNext ? "#4f46e5" : "#64748b", boxShadow: "0 1px 0 rgba(0,0,0,.3)" }}>
            <ChevronRight aria-hidden className="h-6 w-6" strokeWidth={2.5} />
            {isNext ? (NEXT_LABEL[lang] ?? NEXT_LABEL.en) : (DONE_LABEL[lang] ?? DONE_LABEL.en)}
          </button>
          <button type="button" data-mk-key="." tabIndex={-1} onPointerDown={type(".")} className={keyBase} style={softStyle}>.</button>
          {length && feet
            ? <>{digit("0")}<button type="button" data-mk-key="sys" tabIndex={-1} aria-label={a11y.sys} onPointerDown={toSystem} className={keyBase} style={softStyle}><Keyboard aria-hidden className="h-6 w-6" /></button></>
            : <button type="button" data-mk-key="0" tabIndex={-1} onPointerDown={type("0")} className={`${keyBase} col-span-2`} style={keyStyle}>0</button>}
        </div>
      </div>
    </div>
  );
}

// While the pad is up: the page keeps its last field reachable and the drawing
// takes exactly the space left above the Next card and the keys. On a phone the
// card is pinned to the pad; on a wide screen it already sits under the drawing.
const STYLE = `
html[data-measure-keypad] body{padding-bottom:calc(var(--mk-h,300px) + 16px)}
html[data-measure-keypad="next"] [data-scene-viewport]:not([data-fullscreen])>div:first-child{height:var(--mk-scene-h,220px)!important;min-height:0!important;transition:height .22s cubic-bezier(.32,.72,0,1)}
html[data-measure-keypad="next"] [data-scene-viewport]:not([data-fullscreen])>details{display:none}
@media (max-width:1023px){
html[data-measure-keypad="next"] [data-next-measure]{position:fixed;left:8px;right:8px;bottom:calc(var(--mk-h,300px) + 8px);z-index:59;max-width:520px;margin-inline:auto;box-shadow:0 -1px 0 rgba(15,23,42,.04),0 14px 34px -12px rgba(15,23,42,.45)}
html[data-measure-keypad="next"] [data-scene-viewport]:not([data-fullscreen]) [data-scene-dimension]:not([data-dim-state="asked"]){display:none!important}
}
@media (prefers-reduced-motion:reduce){html[data-measure-keypad="next"] [data-scene-viewport]>div:first-child{transition:none}}
`;
