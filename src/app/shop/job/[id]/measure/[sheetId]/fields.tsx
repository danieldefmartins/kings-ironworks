"use client";

// Every leaf the measure sheet is built from: the contexts the fields read,
// the stage vocabulary, and the inputs, chips, cards and solvers themselves.
//
// These are deliberately dumb. They take a value and a callback and know
// nothing about sheets, jobs, saving or shapes — which is what lets the
// section modules stay about measuring rather than about markup.

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ATTACH_TARGETS,
  CONDITION_RATINGS,
  FASTENER_METHODS,
  HARDWARE_METHODS,
  HW_REQUIRED,
  METHODS_BY_ATTACH,
  type FireCondition,
  type FlightSegment,
  type MeasureData,
  type PostMeasure,
  type TermHardware,
  type Termination,
} from "@/lib/shop/measure";
import {
  formatIn,
  parseMeas,
  sphereClearance,
  type CheckResult,
  type Gap,
} from "@/lib/shop/measure-checks";
import { mt, optLabel } from "@/lib/shop/measure-i18n";
import { helpText } from "@/lib/shop/measure-help";
import { specValue } from "@/lib/shop/i18n";

export const FRACTIONS = [
  '1/16"', '1/8"', '3/16"', '1/4"', '5/16"', '3/8"', '7/16"', '1/2"',
  '9/16"', '5/8"', '11/16"', '3/4"', '13/16"', '7/8"', '15/16"', "°",
];
// Tokens that glue directly onto the number (5 + ' = 5', not 5 ')
export const NOSPACE = new Set(["'", '"', "°"]);

// Placeholder for measurement inputs, driven by the sheet's unit choice.
export const PlaceholderCtx = createContext<string>("—");
// Leaf fields look up their own help text, so they need the language.
export const LangCtx = createContext<string>("en");

export type EditorStage = "setup" | "posts" | "level" | "steps" | "locations" | "specs" | "photos" | "review";
export const StageCtx = createContext<EditorStage>("setup");
// True while the Site step is holding everything back behind the routing card.
export const SetupLockCtx = createContext<boolean>(false);

// The order a measurer actually works in on site: read the site and what is
// already there, decide where the posts go and dimension them off the first
// step, then measure the steps themselves. Everything the shop needs but the
// tape does not comes afterwards.
// The order a measurer actually works in.
//
// Daniel: "apps that ask a lot of questions before seeing results no one
// uses." Site conditions used to come first — a page of questions before the
// tape came out. Measuring leads now, in the sequence the stair is walked:
// the steps and risers, then the pitch they add up to, then the straightedge
// gap that says whether they are true, then where the posts land off the
// first step's edge. Site, shop specs and photos follow, because they can be
// answered from memory and the stair cannot.
export const EDITOR_STAGES: { id: EditorStage; icon: string; labelKey: string }[] = [
  { id: "steps", icon: "1", labelKey: "stageSteps" },
  { id: "locations", icon: "2", labelKey: "stageAnglesLocations" },
  { id: "level", icon: "3", labelKey: "stageLevelCheck" },
  { id: "posts", icon: "4", labelKey: "stagePostsBasic" },
  { id: "setup", icon: "5", labelKey: "stageSite" },
  { id: "specs", icon: "6", labelKey: "stageShop" },
  { id: "photos", icon: "7", labelKey: "stagePhotos" },
  { id: "review", icon: "8", labelKey: "stageReview" },
];

// Insert a token into the focused measurement input via the native value
// setter so React's controlled state picks it up.
export function insertToken(tok: string) {
  const el = document.activeElement as HTMLInputElement | null;
  if (!el || el.tagName !== "INPUT" || el.dataset.m !== "1") return;
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )?.set;
  if (!setter) return;
  const sep = el.value && !el.value.endsWith(" ") && !NOSPACE.has(tok) ? " " : "";
  setter.call(el, el.value + sep + tok);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

export function stepNumber(
  flights: { seg: FlightSegment; i: number }[],
  fi: number,
  si: number
): number {
  let n = 0;
  for (let k = 0; k < fi; k++) n += flights[k].seg.steps.length;
  return n + si + 1;
}

export function postStepNumber(data: MeasureData, po: PostMeasure): number {
  let n = 0;
  for (let si = 0; si < data.segments.length; si++) {
    const seg = data.segments[si];
    if (seg.kind !== "flight") continue;
    if (si === po.segIdx) return n + (po.stepIdx ?? 0) + 1;
    n += seg.steps.length;
  }
  return (po.stepIdx ?? 0) + 1;
}

export function setPost(
  set: (fn: (d: MeasureData) => void) => void,
  id: string,
  key: keyof PostMeasure,
  value: string
) {
  set((d) => {
    const po = d.posts.find((p) => p.id === id);
    if (po) (po[key] as string) = value;
  });
}

// ---- Small UI pieces -------------------------------------------------------

// A skirt at the base of an existing column makes the gap above it bigger
// than the one the measurer took off the skirt. This asks for that gap and
// says, in inches, how big it is allowed to be.
export function SkirtSolver({
  lang,
  po,
  onGap,
}: {
  lang: string;
  po: PostMeasure;
  onGap: (v: string) => void;
}) {
  const skirt = parseMeas(po.skirtProjection);
  if (skirt === null || skirt <= 0) return null;
  const cl = sphereClearance(parseMeas(po.infillGap), skirt);
  const bad = cl.impossible || cl.fails;
  return (
    <div className={`mt-3 rounded-xl border p-3 ${bad ? "border-red-700 bg-red-950/40" : "border-green-800 bg-green-950/25"}`}>
      <p className="mb-2 text-xs text-neutral-300">{mt(lang, "skirtSolverHint")}</p>
      <MInput help="infillGap" label={mt(lang, "infillGap")} value={po.infillGap} onChange={onGap} />
      {cl.impossible ? (
        <p className="mt-2 text-sm font-bold text-red-300">{mt(lang, "skirtImpossible")}</p>
      ) : (
        <>
          <p className="mt-2 text-xl font-black text-amber-300">{formatIn(cl.allowed)}</p>
          <p className="text-[11px] text-neutral-400">
            {mt(lang, "skirtSolverMax")} · {formatIn(cl.sphere)} − {formatIn(cl.setback)}
          </p>
          {cl.real !== null && (
            <p className={`mt-1 text-sm font-bold ${cl.fails ? "text-red-300" : "text-green-300"}`}>
              {cl.fails ? "✗" : "✓"} {mt(lang, "skirtSolverReal")} {formatIn(cl.real)}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function ConditionFields({
  lang,
  c,
  onField,
}: {
  lang: string;
  c: FireCondition;
  onField: (key: string, value: string) => void;
}) {
  return (
    <>
      <ChipRow help="fireRating" label={mt(lang, "fireRating")} value={c.rating}
        options={CONDITION_RATINGS.map((r) => [r, mt(lang, `fireR_${r}`)] as [string, string])}
        onChange={(v) => onField("rating", v)} />
      <div className="mt-3">
        <Grid>
          <MInput help="fireRust" label={mt(lang, "fireRust")} placeholder="—" value={c.rust} onChange={(v) => onField("rust", v)} />
          <MInput help="fireSectionLoss" label={mt(lang, "fireSectionLoss")} placeholder="—" value={c.sectionLoss} onChange={(v) => onField("sectionLoss", v)} />
          <MInput help="fireCracks" label={mt(lang, "fireCracks")} placeholder="—" value={c.cracks} onChange={(v) => onField("cracks", v)} />
          <MInput help="fireDeckCondition" label={mt(lang, "fireDeckCondition")} placeholder="—" value={c.deck} onChange={(v) => onField("deck", v)} />
          <MInput help="fireGuardCondition" label={mt(lang, "fireGuardCondition")} placeholder="—" value={c.guards} onChange={(v) => onField("guards", v)} />
          <MInput help="fireAnchorCondition" label={mt(lang, "fireAnchorCondition")} value={c.anchors} onChange={(v) => onField("anchors", v)} />
        </Grid>
      </div>
      <div className="mt-3">
        <MInput help="fireCondNotes" label={mt(lang, "fireCondNotes")} placeholder="—" value={c.notes} onChange={(v) => onField("notes", v)} />
      </div>
    </>
  );
}

// One list of outstanding items. Rows are jump targets, sized for a gloved
// thumb rather than a mouse.
export function GapList({
  title,
  tone,
  items,
  label,
  onJump,
}: {
  title: string;
  tone: "amber" | "sky";
  items: Gap[];
  label: (g: Gap) => string;
  onJump: (g: Gap) => void;
}) {
  const arrow = tone === "amber" ? "text-amber-400" : "text-sky-400";
  return (
    <div className="border border-neutral-700 rounded-lg p-3 mb-4 bg-neutral-950/60">
      <div className="text-xs font-bold text-neutral-300 mb-1.5">{title}</div>
      <ul className="text-sm text-neutral-300 space-y-1">
        {items.map((g, i) => (
          <li key={`${g.key}${g.detail || ""}${i}`}>
            <button
              type="button"
              onClick={() => onJump(g)}
              className="flex w-full min-h-[48px] items-center gap-2 rounded-md px-2 py-2 -mx-2 text-left hover:bg-neutral-800 active:bg-neutral-700"
            >
              <span className="flex-1">{label(g)}</span>
              <span className={`shrink-0 ${arrow}`} aria-hidden>
                →
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Card({
  title,
  children,
  stage,
  /** Shown even while the Site step is still waiting on the routing answers. */
  always = false,
}: {
  title: string;
  children: React.ReactNode;
  stage: EditorStage;
  always?: boolean;
}) {
  const activeStage = useContext(StageCtx);
  const setupLocked = useContext(SetupLockCtx);
  if (activeStage !== stage) return null;
  // Until the routing questions are answered there is no point showing the
  // conditions they decide the relevance of.
  if (stage === "setup" && setupLocked && !always) return null;
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4">
      <div className="font-bold mb-3">{title}</div>
      {children}
    </div>
  );
}

export function Grid({ children }: { children: React.ReactNode }) {
  // phones: one full-width field per row; larger screens: two columns
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
}

export function SmallBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="min-h-[48px] px-4 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-neutral-200">
      {children}
    </button>
  );
}

export function MInput({
  label,
  labelClass = "",
  hint,
  hintDiagram,
  help,
  value,
  onChange,
  placeholder,
  carried,
  onClearCarried,
}: {
  label?: string;
  labelClass?: string;
  hint?: string;
  hintDiagram?: "bottom" | "top" | "nosing" | "walkline";
  /** i18n key of this field, used to find its plain-language explanation */
  help?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Set when this value was carried over from an earlier sheet. */
  carried?: string;
  onClearCarried?: () => void;
}) {
  const unitPh = useContext(PlaceholderCtx);
  const lang = useContext(LangCtx);
  const explain = hint || (help ? helpText(lang, help) : null);
  return (
    <div className="block min-w-0">
      {label && (
        <div className={`text-[11px] text-neutral-400 flex items-center mb-1 ${labelClass}`}>
          {label}
          {explain && <InfoHint text={explain} label={label} diagram={hintDiagram} />}
        </div>
      )}
      <input
        data-m="1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || unitPh}
        autoComplete="off"
        aria-label={label}
        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2.5 py-2.5 text-base"
      />
      <CarriedNote note={carried} onClear={onClearCarried} />
    </div>
  );
}

// A value the sheet started with because a previous sheet had it. Visible, so
// nobody submits a carried-over finish without having seen it.
export function CarriedNote({ note, onClear }: { note?: string; onClear?: () => void }) {
  const lang = useContext(LangCtx);
  if (!note) return null;
  return (
    <div className="mt-1 flex items-center gap-2">
      <span className="min-w-0 flex-1 truncate text-[11px] text-sky-300/90">↩ {note}</span>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 rounded-full border border-sky-800 bg-sky-950/40 px-3 py-1.5 text-[11px] font-bold text-sky-200"
        >
          {mt(lang, "carriedChange")}
        </button>
      )}
    </div>
  );
}

export function InfoHint({ text, label, diagram }: { text: string; label?: string; diagram?: "bottom" | "top" | "nosing" | "walkline" }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  // This app is new to everyone using it, so the help has to be readable
  // rather than merely present. It was a text-xs tooltip absolutely positioned
  // inside the field: small to read on a phone in daylight, clipped by any
  // ancestor that hides overflow, and at z-50 alongside other z-50 overlays.
  //
  // Now it is a proper sheet, portalled to <body> like every other sheet here,
  // at readable size, carrying the field's own name so it is obvious what is
  // being explained.
  const sheet = (
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center bg-black/70 p-4 text-neutral-100 sm:items-center"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        className="w-full max-w-sm rounded-2xl border border-neutral-600 bg-neutral-800 p-4 pb-[max(16px,env(safe-area-inset-bottom))] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {label && <div className="mb-2 text-sm font-bold text-amber-300">{label}</div>}
        {diagram && <MeasurementHintDiagram kind={diagram} />}
        <p className="text-sm leading-relaxed text-neutral-100">{text}</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-4 min-h-[48px] w-full rounded-xl border border-neutral-600 font-bold text-neutral-200"
        >
          OK
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        aria-label={text}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="ml-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-700 align-middle text-xs font-bold text-amber-300 active:bg-amber-500/20"
      >
        i
      </button>
      {open && typeof document !== "undefined" && createPortal(sheet, document.body)}
    </>
  );
}

export function ChoiceMInput({
  label,
  value,
  onChange,
  choices,
  placeholder,
  // A field with chips needs its "i" as much as a typed one — arguably more,
  // since the chips are shorthand and the help is what says what they mean.
  // ChoiceMInput simply never forwarded it, so those fields had no help at all.
  help,
  hint,
  hintDiagram,
  carried,
  onClearCarried,
}: {
  label: string;
  help?: string;
  value: string;
  onChange: (value: string) => void;
  choices: [string, string][];
  placeholder?: string;
  hint?: string;
  hintDiagram?: "bottom" | "top" | "nosing" | "walkline";
  carried?: string;
  onClearCarried?: () => void;
}) {
  return (
    <div>
      <MInput label={label} value={value} onChange={onChange} placeholder={placeholder} help={help} hint={hint} hintDiagram={hintDiagram}
        carried={carried} onClearCarried={onClearCarried} />
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {choices.map(([stored, shown]) => (
          <button key={stored} type="button" onClick={() => onChange(stored)}
            className={`min-h-[44px] rounded-full border px-3.5 text-xs ${value === stored ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-neutral-700 bg-neutral-800 text-neutral-300"}`}>
            {shown}
          </button>
        ))}
      </div>
    </div>
  );
}

export function commonThicknessChoices(lang: string): [string, string][] {
  return [
    ["0", mt(lang, "choiceNone")],
    ['3/4"', '3/4"'],
    ['1"', '1"'],
    ['1 1/2"', '1 1/2"'],
  ];
}

// Site and finish conditions. Typing still works — these are the answers that
// come up over and over, offered so a measurer taps instead of spelling
// "composite decking" on a phone in the cold, and so the same surface is not
// recorded five different ways across five sheets. Anything not listed is
// simply typed: the field is a text box with chips under it, not a dropdown.
export function surfaceChoices(lang: string): [string, string][] {
  return [
    ["Concrete", mt(lang, "surfConcrete")],
    ["Wood subfloor", mt(lang, "surfSubfloor")],
    ["Finished wood", mt(lang, "surfWood")],
    ["Tile", mt(lang, "surfTile")],
    ["Stone", mt(lang, "surfStone")],
    ["Pavers", mt(lang, "surfPavers")],
    ["Asphalt", mt(lang, "surfAsphalt")],
    ["Soil / grass", mt(lang, "surfSoil")],
    ["Composite decking", mt(lang, "surfComposite")],
  ];
}

export function treadCoveringChoices(lang: string): [string, string][] {
  return [
    ["None — bare steel", mt(lang, "coverNone")],
    ["Wood tread", mt(lang, "coverWood")],
    ["Tile", mt(lang, "surfTile")],
    ["Stone", mt(lang, "surfStone")],
    ["Carpet", mt(lang, "coverCarpet")],
    ["Concrete fill", mt(lang, "coverConcrete")],
    ["Diamond plate", mt(lang, "coverDiamond")],
  ];
}

export function wallFinishChoices(lang: string): [string, string][] {
  return [
    ["Drywall", mt(lang, "wallDrywall")],
    ["Plaster", mt(lang, "wallPlaster")],
    ["Brick", mt(lang, "wallBrick")],
    ["Block", mt(lang, "wallBlock")],
    ["Concrete", mt(lang, "surfConcrete")],
    ["Wood siding", mt(lang, "wallSiding")],
    ["Stone", mt(lang, "surfStone")],
  ];
}

export function toppingChoices(lang: string): [string, string][] {
  return [
    ["None", mt(lang, "choiceNone")],
    ["Tile", mt(lang, "surfTile")],
    ["Stone", mt(lang, "surfStone")],
    ["Wood", mt(lang, "surfWood")],
    ["Carpet", mt(lang, "coverCarpet")],
  ];
}

export function slopeDirectionChoices(lang: string): [string, string][] {
  return [
    ["Left", mt(lang, "choiceLeft")],
    ["Right", mt(lang, "choiceRight")],
    ["Toward stairs", mt(lang, "choiceTowardStairs")],
    ["Away from stairs", mt(lang, "choiceAwayStairs")],
  ];
}

export function obstructionChoices(lang: string): [string, string][] {
  return [
    ["None", mt(lang, "choiceNone")],
    ["Joist", mt(lang, "choiceJoist")],
    ["Pipe", mt(lang, "choicePipe")],
    ["Wire", mt(lang, "choiceWire")],
  ];
}

export function accessChoices(lang: string): [string, string][] {
  return [
    ["Direct walk-in", mt(lang, "choiceWalkIn")],
    ["Stairs", mt(lang, "choiceAccessStairs")],
    ["Elevator", mt(lang, "choiceElevator")],
    ["Crane / lift", mt(lang, "choiceCrane")],
  ];
}

export function MeasurementHintDiagram({ kind }: { kind: "bottom" | "top" | "nosing" | "walkline" }) {
  if (kind === "walkline") {
    return (
      <svg viewBox="0 0 220 90" className="mb-2 w-full rounded bg-neutral-950" aria-hidden>
        <path d="M18 74 L105 12 L202 74 Z" fill="none" stroke="#a3a3a3" strokeWidth="2" />
        <path d="M55 70 Q108 42 170 66" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="5 3" />
        <line x1="38" y1="70" x2="55" y2="70" stroke="#fbbf24" strokeWidth="2" />
        <path d="M38 70l5-3v6zM55 70l-5-3v6z" fill="#fbbf24" />
        <text x="106" y="42" fill="#fbbf24" fontSize="15" fontWeight="700">↟</text>
      </svg>
    );
  }
  const highlightBottom = kind === "bottom";
  const highlightTop = kind === "top";
  const highlightNosing = kind === "nosing";
  return (
    <svg viewBox="0 0 220 100" className="mb-2 w-full rounded bg-neutral-950" aria-hidden>
      <path d="M12 84h34V68h34V52h34V36h34V20h60" fill="none" stroke="#d4d4d4" strokeWidth="3" />
      <line x1="10" y1="84" x2="58" y2="84" stroke={highlightBottom ? "#f59e0b" : "#737373"} strokeWidth={highlightBottom ? 6 : 2} />
      <line x1="148" y1="20" x2="210" y2="20" stroke={highlightTop ? "#f59e0b" : "#737373"} strokeWidth={highlightTop ? 6 : 2} />
      {[46, 80, 114, 148].map((x, i) => <circle key={x} cx={x} cy={68 - i * 16} r={highlightNosing ? 5 : 2.5} fill={highlightNosing ? "#f59e0b" : "#737373"} />)}
      <text x="18" y="97" fill={highlightBottom ? "#fbbf24" : "#a3a3a3"} fontSize="11" fontWeight="700">0 ↓</text>
      <text x="180" y="13" fill={highlightTop ? "#fbbf24" : "#a3a3a3"} fontSize="11" fontWeight="700">0 ↑</text>
      {highlightNosing && <text x="91" y="92" fill="#fbbf24" fontSize="15" fontWeight="700">••••</text>}
      <path d="M18 62v-30m0 0l-5 8m5-8l5 8" stroke="#fbbf24" strokeWidth="2" />
      <text x="27" y="40" fill="#fbbf24" fontSize="13">↑</text>
    </svg>
  );
}

export function MSelect({
  label,
  value,
  options,
  onChange,
  lang,
  help,
  spec = false,
  labels,
  carried,
  onClearCarried,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  lang: string;
  help?: string;
  spec?: boolean;
  labels?: Record<string, string>;
  carried?: string;
  onClearCarried?: () => void;
}) {
  return (
    <div className="block min-w-0">
      <div className="mb-1 flex items-center text-[11px] text-neutral-400">
        {label}
        {help && helpText(lang, help) && <InfoHint text={helpText(lang, help)!} label={label} />}
      </div>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2.5 py-2.5 text-base appearance-none"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {labels?.[o] ?? (spec ? specValue(lang, o) : optLabel(lang, o))}
          </option>
        ))}
      </select>
      <CarriedNote note={carried} onClear={onClearCarried} />
    </div>
  );
}

export function PresetInput({
  label,
  value,
  presets,
  onChange,
  carried,
  onClearCarried,
}: {
  label: string;
  value: string;
  presets: string[];
  onChange: (v: string) => void;
  carried?: string;
  onClearCarried?: () => void;
}) {
  return (
    <div>
      <MInput label={label} value={value} onChange={onChange} placeholder="—"
        carried={carried} onClearCarried={onClearCarried} />
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {presets.map((pr) => (
          <button key={pr} onClick={() => onChange(pr)}
            className={`min-h-[44px] text-xs px-3.5 rounded-full border ${
              value === pr
                ? "border-amber-500 bg-amber-500/10 text-amber-300"
                : "border-neutral-700 bg-neutral-800/70 text-neutral-400"
            }`}>
            {pr}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ChipRow({
  label,
  value,
  options,
  onChange,
  help,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
  help?: string;
}) {
  const lang = useContext(LangCtx);
  const explain = help ? helpText(lang, help) : null;
  return (
    <div>
      <div className="mb-1 flex items-center text-[11px] text-neutral-400">
        {label}
        {explain && <InfoHint text={explain} label={label} />}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map(([val, lbl]) => (
          <button
            key={val}
            onClick={() => onChange(value === val ? "" : val)}
            className={`min-h-[48px] max-w-full whitespace-normal break-words px-3 rounded-lg border text-sm font-semibold ${
              value === val
                ? "border-amber-500 bg-amber-500/10 text-amber-300"
                : "border-neutral-700 bg-neutral-800 text-neutral-300"
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>
    </div>
  );
}

export function NominalFill({
  lang,
  onFill,
}: {
  lang: string;
  // Nosing belongs here with the other two. It is the same number on every
  // tread on almost every stair, and leaving it out of the filler meant
  // typing it once per step for the one field that never varies.
  onFill: (rise: string, run: string, nosing: string) => void;
}) {
  const [nr, setNr] = useState("");
  const [nu, setNu] = useState("");
  const [nn, setNn] = useState("");
  return (
    <div className="border border-neutral-800 rounded-lg p-3 mb-3 bg-neutral-950/40">
      <div className="text-xs font-bold text-neutral-300 mb-2">
        {mt(lang, "nominalTitle")}
        <span className="font-normal text-neutral-500"> — {mt(lang, "fillHint")}</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <MInput help="nominalRise" label={mt(lang, "nominalRise")} value={nr} onChange={setNr} />
        <MInput help="nominalRun" label={mt(lang, "nominalRun")} value={nu} onChange={setNu} />
        <MInput help="nosing" label={mt(lang, "nominalNosing")} value={nn} onChange={setNn} />
        <button
          onClick={() => (nr || nu || nn) && onFill(nr, nu, nn)}
          className="min-h-[48px] rounded-lg bg-amber-500/90 px-3 text-sm font-bold text-black"
        >
          {mt(lang, "fillSteps")}
        </button>
      </div>
    </div>
  );
}

export function SlotRow({
  slot,
  label,
  required,
  data,
  lang,
  busy,
  onFile,
  onTake,
}: {
  slot: string;
  label: string;
  required: boolean;
  data: MeasureData;
  lang: string;
  busy: boolean;
  onFile: (f: File) => void;
  onTake: () => void;
}) {
  const ph = data.photos.find((p) => p.slot === slot);
  return (
    <div className="flex items-center gap-3 border border-neutral-800 rounded-lg p-2.5 bg-neutral-950/40">
      <span className={`text-lg ${ph ? "" : "opacity-40"}`}>{ph ? "✅" : "📷"}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold truncate">{label}</span>
        <span className={`block text-[11px] ${required && !ph ? "text-red-400" : "text-neutral-500"}`}>
          {ph
            ? new Date(ph.takenAt).toLocaleString()
            : mt(lang, required ? "requiredLbl" : "optionalLbl")}
        </span>
      </span>
      {/* Primary: the OS's own photo sheet (Take Photo / Photo Library) */}
      <label
        className={`px-3 py-2 rounded-lg border text-xs font-bold shrink-0 cursor-pointer ${
          busy ? "opacity-50 pointer-events-none " : ""
        }${
          ph
            ? "border-neutral-700 bg-neutral-800 text-neutral-300"
            : "border-amber-600 bg-amber-500/10 text-amber-300"
        }`}
      >
        {busy ? mt(lang, "uploading") : ph ? mt(lang, "retake") : `📷 ${mt(lang, "choosePhoto")}`}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </label>
      {/* Secondary: annotate on a photo (opens the markup canvas) */}
      <button
        onClick={onTake}
        title={mt(lang, "markUp")}
        className="px-2.5 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-xs shrink-0"
        aria-label={mt(lang, "markUp")}
      >
        ✏️
      </button>
    </div>
  );
}

export const LEVEL_STYLE: Record<string, string> = {
  green: "bg-green-600/20 border-green-500 text-green-300",
  yellow: "bg-amber-500/15 border-amber-500 text-amber-300",
  red: "bg-red-600/20 border-red-500 text-red-300",
  na: "bg-neutral-800 border-neutral-700 text-neutral-500",
};

export function CheckRow({ c, lang }: { c: CheckResult; lang: string }) {
  const fmt = (n: number | null) =>
    n === null ? "—" : c.unit === "deg" ? `${n.toFixed(1)}°` : formatIn(n);
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`text-[10px] font-bold rounded-full border px-2 py-0.5 shrink-0 w-24 text-center ${LEVEL_STYLE[c.level]}`}
      >
        {c.level === "na" ? "…" : mt(lang, c.level === "green" ? "levelGreen" : c.level === "yellow" ? "levelYellow" : "levelRed")}
      </span>
      <span className="flex-1 text-neutral-300 min-w-0">
        {mt(lang, `check_${c.key}`)}
        {c.detail ? ` ${c.detail}` : ""}
      </span>
      <span className="text-xs text-neutral-500 shrink-0 text-right">
        {c.level === "na"
          ? mt(lang, "checkNa")
          : `${mt(lang, "calcLbl")} ${fmt(c.expected)} · ${mt(lang, "measLbl")} ${fmt(c.actual)}${
              c.delta !== null && c.key !== "width_var"
                ? ` · ${mt(lang, "offByLbl")} ${c.unit === "deg" ? `${Math.abs(c.delta).toFixed(1)}°` : formatIn(Math.abs(c.delta))}`
                : ""
            }`}
      </span>
    </div>
  );
}

export function TermEditor({
  lang,
  title,
  t,
  anchorOptions,
  postOptions,
  spanOptions,
  hasPhoto,
  onField,
  onHw,
  onPhoto,
}: {
  lang: string;
  title: string;
  t: Termination;
  anchorOptions: string[];
  postOptions: [string, string][];
  spanOptions: [string, string][];
  hasPhoto: boolean;
  onField: (key: string, value: string) => void;
  onHw: (key: string, value: string) => void;
  onPhoto: () => void;
}) {
  const allowed = METHODS_BY_ATTACH[t.attachTo] || [];
  const needsHw = !!t.method && (HARDWARE_METHODS as string[]).includes(t.method);
  const needsFastener = !!t.method && (FASTENER_METHODS as string[]).includes(t.method);
  const requiredDims = new Set(HW_REQUIRED[t.method] || []);
  const isWall = t.attachTo === "wall";
  const isColumn = t.attachTo === "existing_post";
  const isWoodFloor = t.attachTo === "floor" && t.material === "Wood";

  const HW_FIELDS: [keyof TermHardware, string][] = [
    ["profile", "hwProfile"],
    ["thickness", "hwThickness"],
    ["holeDia", "hwHoleDia"],
    ["holeSpacing", "hwHoleSpacing"],
    ["edgeDist", "hwEdgeDist"],
    ["embedment", "hwEmbedment"],
    ["orientation", "hwOrientation"],
    ["weldSize", "hwWeldSize"],
  ];
  const requiredFields = HW_FIELDS.filter(([k]) => requiredDims.has(k));
  const optionalFields = HW_FIELDS.filter(([k]) => !requiredDims.has(k));

  return (
    <div className="mt-3 border border-neutral-800 rounded-lg p-3">
      <div className="text-xs font-bold text-neutral-300 mb-2">⚓ {title}</div>
      <ChipRow help="connAttachTo"
        label={mt(lang, "connAttachTo")}
        value={t.attachTo}
        options={ATTACH_TARGETS.map((o) => [o, mt(lang, `attach_${o}`)] as [string, string])}
        onChange={(v) => {
          onField("attachTo", v);
          onField("method", ""); // methods depend on the target
        }}
      />
      {/* topology: this end must point at a real post / span */}
      {t.attachTo === "free_post" && (
        <div className="mt-3">
          <MSelect label={`${mt(lang, "postRefLblSel")} *`} value={t.postId}
            options={postOptions.map(([id]) => id)} lang={lang}
            labels={Object.fromEntries(postOptions)}
            onChange={(v) => onField("postId", v)} />
        </div>
      )}
      {t.attachTo === "continue" && (
        <div className="mt-3">
          <MSelect label={`${mt(lang, "spanRefLblSel")} *`} value={t.spanRef}
            options={spanOptions.map(([id]) => id)} lang={lang}
            labels={Object.fromEntries(spanOptions)}
            onChange={(v) => onField("spanRef", v)} />
        </div>
      )}
      {allowed.length > 0 && (
        <div className="mt-3">
          <ChipRow help="connMethod"
            label={mt(lang, "connMethod")}
            value={t.method}
            options={allowed.map((o) => [o, mt(lang, `method_${o}`)] as [string, string])}
            onChange={(v) => onField("method", v)}
          />
        </div>
      )}
      {(isWall || isColumn || t.attachTo === "floor") && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <MSelect help="connMaterial" label={mt(lang, "connMaterial")} value={t.material}
            options={anchorOptions} lang={lang}
            onChange={(v) => onField("material", v)} />
          {(isWall || isWoodFloor) && (
            <MInput
              label={mt(lang, isWall ? "backingLbl" : "backingWoodLbl")}
              placeholder="—" value={t.backing}
              onChange={(v) => onField("backing", v)} />
          )}
          {isColumn && (
            <>
              <MInput help="columnWLbl" label={mt(lang, "columnWLbl")} value={t.columnW}
                onChange={(v) => onField("columnW", v)} />
              <MInput help="columnDLbl" label={mt(lang, "columnDLbl")} value={t.columnD}
                onChange={(v) => onField("columnD", v)} />
            </>
          )}
        </div>
      )}
      {isColumn && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          <MInput help="moldingLbl" label={mt(lang, "moldingLbl")} placeholder="—" value={t.molding}
            onChange={(v) => onField("molding", v)} />
          {t.molding.trim() !== "" && (
            <MInput help="moldingHeightLbl" label={mt(lang, "moldingHeightLbl")} value={t.moldingHeight}
              onChange={(v) => onField("moldingHeight", v)} />
          )}
          <MInput help="plumbLbl" label={mt(lang, "plumbLbl")} placeholder="—" value={t.plumb}
            onChange={(v) => onField("plumb", v)} />
        </div>
      )}
      {needsHw && (
        <div className="mt-3 border border-neutral-800 rounded-lg p-3 bg-neutral-900/60">
          <div className="text-xs font-bold text-neutral-400 mb-2">🔩 {mt(lang, "hardwareTitle")}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {needsFastener && (
              <>
                <MInput label={`${mt(lang, "hwFastener")} *`} placeholder="—" value={t.hardware.fastener}
                  onChange={(v) => onHw("fastener", v)} />
                <MInput label={`${mt(lang, "hwQty")} *`} placeholder="—" value={t.hardware.qty}
                  onChange={(v) => onHw("qty", v)} />
              </>
            )}
            <MInput label={`${mt(lang, "hwElevation")} *`} value={t.hardware.elevation}
              onChange={(v) => onHw("elevation", v)} />
            <ChipRow
              label={`${mt(lang, "hwShopField")} *`}
              value={t.hardware.shopField}
              options={[
                ["shop_weld", mt(lang, "shop_weld")],
                ["field_bolt", mt(lang, "field_bolt")],
              ]}
              onChange={(v) => onHw("shopField", v)}
            />
            {/* the dimensions the shop needs to FABRICATE this connection */}
            {requiredFields.map(([k, lbl]) => (
              <MInput key={k} label={`${mt(lang, lbl)} *`}
                placeholder={k === "profile" || k === "orientation" ? "—" : undefined}
                value={t.hardware[k]}
                onChange={(v) => onHw(k, v)} />
            ))}
          </div>
          {optionalFields.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-amber-400/80 cursor-pointer select-none">
                + {mt(lang, "postMore")}
              </summary>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                {optionalFields.map(([k, lbl]) => (
                  <MInput key={k} label={mt(lang, lbl)}
                    placeholder={k === "profile" || k === "orientation" ? "—" : undefined}
                    value={t.hardware[k]}
                    onChange={(v) => onHw(k, v)} />
                ))}
              </div>
            </details>
          )}
          <button
            onClick={onPhoto}
            className={`mt-3 px-3 py-2.5 rounded-lg border text-sm font-bold ${
              hasPhoto
                ? "border-neutral-700 bg-neutral-800 text-neutral-300"
                : "border-amber-600 bg-amber-500/10 text-amber-300"
            }`}
          >
            📷 {mt(lang, "termPhoto")} {hasPhoto ? "✓" : "*"}
          </button>
        </div>
      )}
    </div>
  );
}
