"use client";

// Structural steel sheet: beams, lintels, columns, posts, moment frames,
// column covers and ledgers. One screen, measured top to bottom:
//
//   drawing summary → engineering → members → frame → finish → access → checks
//
// Every member card ends in its cut length with the terms that made it, so the
// fabricator never has to guess what "span" meant on the porch.

import { useContext, useMemo, useRef, useState } from "react";
import { revealElement, useMeasureLocate } from "@/lib/shop/measure-locate";
import type { MeasureData } from "@/lib/shop/measure";
import { mt } from "@/lib/shop/measure-i18n";
import {
  applyTemplate,
  blankStructural,
  isBearingRole,
  isSpanning,
  isVertical,
  memberCut,
  memberQty,
  memberWeight,
  newMember,
  newReading,
  nextMark,
  PLATE_PRESETS,
  PROFILE_PRESETS,
  profileInfo,
  requiredBearing,
  ROLE_PREFIX,
  STRUCT_CARRIES,
  STRUCT_CONDITIONS,
  STRUCT_FINISHES,
  STRUCT_FOOTINGS,
  STRUCT_LIFTS,
  STRUCT_ROLES,
  STRUCT_SHORING,
  STRUCT_SUBSTRATES,
  STRUCT_TEMPLATES,
  STRUCT_TOL,
  structuralChecks,
  structuralGaps,
  structuralSummary,
  weightVerdict,
  type StructBearing,
  type StructMember,
  type StructRole,
  type StructTemplate,
  type StructuralData,
} from "@/lib/shop/measure-structural";
import { parseMeas } from "@/lib/shop/measure-parse";
import type { CheckLevel, CheckResult } from "@/lib/shop/measure-checks";
import { MInput } from "../fields";
import StructuralSketch, { fmtLen, type SketchHot } from "./StructuralSketch";
import SubstrateEditor, { MATERIALS_MASONRY_STEEL, SubstrateCtx } from "../SubstrateEditor";

type SetFn = (fn: (d: MeasureData) => void) => void;

const DOT: Record<CheckLevel, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
  na: "bg-slate-300",
};
const PILL: Record<CheckLevel, string> = {
  green: "bg-green-600/20 border-green-500 text-green-300",
  yellow: "bg-amber-500/15 border-amber-500 text-amber-300",
  red: "bg-red-600/20 border-red-500 text-red-300",
  na: "bg-neutral-800 border-neutral-700 text-neutral-500",
};

function worst(levels: CheckLevel[]): CheckLevel {
  if (levels.includes("red")) return "red";
  if (levels.includes("yellow")) return "yellow";
  if (levels.includes("green")) return "green";
  return "na";
}

// Which panel answers a requirement that is not a member's own number.
const GAP_PANEL: [RegExp, string][] = [
  [/^struct_(eng_|permit)/, "eng"],
  [/^struct_(members|datum)/, "members"],
  [/^struct_frame_/, "frame"],
  [/^struct_(finish|fire_rating)/, "finish"],
  [/^struct_(max_length|access_path|lift)/, "access"],
];

export default function StructuralSections({ lang, data, set }: { lang: string; data: MeasureData; set: SetFn }) {
  const s = data.structural ?? null;
  const t = (k: string) => mt(lang, k);
  const [openId, setOpenId] = useState<string | null>(() => s?.members[0]?.id ?? null);
  const checks = useMemo(() => structuralChecks(s), [s]);
  const gaps = useMemo(() => structuralGaps(s), [s]);
  const summary = useMemo(() => structuralSummary(s), [s]);
  const rootRef = useRef<HTMLDivElement>(null);
  const sketchRef = useRef<HTMLDivElement>(null);
  const [hot, setHot] = useState<SketchHot | null>(null);
  // The Next-measurement card walks the members: open the one it is on, light
  // that dimension on the elevation, and scroll there when asked.
  useMeasureLocate((d) => {
    const members = s?.members ?? [];
    const byGap = d.gapDetail ? members.find((m) => m.mark && (d.gapDetail === m.mark || d.gapDetail!.startsWith(`${m.mark} `))) : undefined;
    const member = d.groupKind === "member" ? members.find((m) => m.id === d.groupId) : byGap;
    if (member) setOpenId(member.id);
    if (d.groupId || d.part) setHot({ groupId: d.groupId, part: d.part });
    if (!d.scroll) return;
    requestAnimationFrame(() => {
      const root = rootRef.current;
      if (!root) return;
      if (d.groupId) return revealElement(sketchRef.current);
      const panel = d.gap ? GAP_PANEL.find(([re]) => re.test(d.gap!))?.[1] : undefined;
      const target =
        (d.part === "maxLength" && root.querySelector('[data-st-panel="access"]')) ||
        (member && root.querySelector(`[data-member="${member.id}"]`)) ||
        (d.gap === "photo" && document.querySelector("[data-st-photos]")) ||
        (panel && root.querySelector(`[data-st-panel="${panel}"]`)) ||
        root.firstElementChild;
      revealElement(target);
    });
  });

  const up = (fn: (x: StructuralData) => void) =>
    set((d) => {
      if (!d.structural) d.structural = blankStructural();
      fn(d.structural);
    });

  if (!s) {
    return (
      <Panel>
        <button type="button" onClick={() => up(() => {})} className="min-h-12 w-full rounded-xl bg-indigo-600 px-4 font-semibold text-white">
          {t("st_start")}
        </button>
      </Panel>
    );
  }

  const stamped = s.eng.stamped === "yes";
  const reds = checks.filter((c) => c.level === "red").length;
  const yellows = checks.filter((c) => c.level === "yellow").length;
  const fabGaps = gaps.filter((g) => (g.tier || "fab") === "fab").length;

  function addMember(role: StructRole) {
    // A second column usually matches the first.
    const same = s!.members.find((o) => o.role === role);
    const m = newMember(role, nextMark(s!.members, role), same && isVertical(role) ? same.profile : "");
    up((x) => void x.members.push(structuredClone(m)));
    setOpenId(m.id);
  }
  function addTemplate(tp: StructTemplate) {
    const draft = structuredClone(s!);
    applyTemplate(draft, tp);
    const added = draft.members.slice(s!.members.length);
    up((x) => {
      x.members.push(...structuredClone(added));
      x.frame.on = draft.frame.on;
    });
    setOpenId(added[0]?.id ?? null);
  }

  // Nothing measured yet: one decision on screen — what kind of steel is this.
  if (s.members.length === 0) {
    return (
      <Panel>
        <h2 className="text-xl font-semibold text-slate-900">{t("st_title")}</h2>
        <p className="mt-0.5 text-sm text-slate-500">{t("st_subtitle")}</p>
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {STRUCT_TEMPLATES.map((tp) => (
            <button key={tp} type="button" onClick={() => addTemplate(tp)}
              className="flex min-h-28 flex-col items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-left transition active:scale-[0.98]">
              <TemplateIcon t={tp} />
              <span>
                <span className="block text-[15px] font-semibold text-slate-900">{t(`st_tpl_${tp}`)}</span>
                <span className="block text-xs text-slate-500">{t(`st_tplHint_${tp}`)}</span>
              </span>
            </button>
          ))}
        </div>
      </Panel>
    );
  }

  return (
    <div ref={rootRef} className="space-y-4">
      {/* ---- Summary + elevation ---- */}
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">{t("st_title")}</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {s.members.length
                ? `${summary.pieces} ${t(summary.pieces === 1 ? "st_piece" : "st_pieces")}${s.eng.drawingNo ? ` · ${t("st_dwgShort")} ${s.eng.drawingNo}${s.eng.revision ? ` ${t("st_revShort")} ${s.eng.revision}` : ""}` : ""}`
                : t("st_subtitle")}
            </p>
          </div>
          {s.members.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              {reds > 0 && <span className={`rounded-full border px-2.5 py-1 ${PILL.red}`}>{reds} {t("st_toFix")}</span>}
              {yellows > 0 && <span className={`rounded-full border px-2.5 py-1 ${PILL.yellow}`}>{yellows} {t("st_toReview")}</span>}
              {reds === 0 && yellows === 0 && fabGaps === 0 && <span className={`rounded-full border px-2.5 py-1 ${PILL.green}`}>✓ {t("st_allGood")}</span>}
            </div>
          )}
        </div>
        <div ref={sketchRef} className="mx-auto mt-3 max-w-[600px] scroll-mt-24 overflow-hidden rounded-xl border border-slate-200">
          <StructuralSketch s={s} lang={lang} focusId={openId} hot={hot} />
        </div>
        {s.members.length > 0 && (
          <dl className="mt-3 grid grid-cols-3 gap-2">
            <Stat label={t("st_totalWeight")} value={summary.totalWeight === null ? "—" : `${summary.approx || !summary.weightComplete ? "≈ " : ""}${Math.round(summary.totalWeight).toLocaleString()} lb`} />
            <Stat label={t("st_longest")} value={summary.longest ? fmtLen(summary.longest.length) : "—"} sub={summary.longest?.mark} />
            <Stat label={t("st_heaviest")} value={summary.heaviest ? `${Math.round(summary.heaviest.weight)} lb` : "—"} sub={summary.heaviest?.mark} />
          </dl>
        )}
      </Panel>

      {/* ---- Engineering ---- */}
      <Panel tag="eng" title={t("st_engTitle")}>
        <Seg label={t("st_stamped")} value={s.eng.stamped} options={[["yes", t("st_yes")], ["no", t("st_no")]]}
          required={!s.eng.stamped} onChange={(v) => up((x) => void (x.eng.stamped = v as StructuralData["eng"]["stamped"]))} />
        {stamped && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <MInput label={t("st_drawingNo")} placeholder="S-1" value={s.eng.drawingNo} gap="struct_eng_drawing_no" onChange={(v) => up((x) => void (x.eng.drawingNo = v))} />
            <MInput label={t("st_revision")} placeholder="0" value={s.eng.revision} onChange={(v) => up((x) => void (x.eng.revision = v))} />
          </div>
        )}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {!stamped && (
            <Seg label={t("st_engRequired")} value={s.eng.required} options={[["yes", t("st_yes")], ["no", t("st_no")]]}
              onChange={(v) => up((x) => void (x.eng.required = v as StructuralData["eng"]["required"]))} />
          )}
          <Seg label={t("st_permit")} value={s.eng.permit} options={[["yes", t("st_yes")], ["no", t("st_no")], ["others", t("st_byOthers")]]}
            onChange={(v) => up((x) => void (x.eng.permit = v as StructuralData["eng"]["permit"]))} />
        </div>
        <More lang={lang}>
          {stamped && <MInput label={t("st_engineer")} placeholder="—" value={s.eng.engineer} onChange={(v) => up((x) => void (x.eng.engineer = v))} />}
          <MInput label={t("st_connection")} placeholder={t("st_connectionPh")} value={s.eng.connection} onChange={(v) => up((x) => void (x.eng.connection = v))} />
        </More>
      </Panel>

      {/* ---- Members ---- */}
      <Panel tag="members" title={t("st_membersTitle")} aside={s.members.length ? `${s.members.length}` : undefined}>
          <>
            {(s.datum.trim() || s.members.some((m) => m.elevation.trim())) && (
              <div className="mb-3">
                <MInput label={t("st_datum")} placeholder={t("st_datumPh")} value={s.datum} gap="struct_datum" onChange={(v) => up((x) => void (x.datum = v))} />
              </div>
            )}
            <div className="space-y-2.5">
              {s.members.map((m, i) => (
                <MemberCard key={m.id} lang={lang} s={s} m={m} open={openId === m.id} stamped={stamped}
                  checks={checks.filter((c) => c.key !== "struct_piece_length" && (c.detail === m.mark || (c.detail || "").startsWith(`${m.mark} `)))}
                  gapCount={gaps.filter((g) => (g.tier || "fab") === "fab" && (g.detail === m.mark || (g.detail || "").startsWith(`${m.mark} `))).length}
                  onToggle={() => setOpenId(openId === m.id ? null : m.id)}
                  update={(fn) => up((x) => { const mm = x.members[i]; if (mm && mm.id === m.id) fn(mm); })}
                  onRemove={() => { up((x) => void (x.members = x.members.filter((o) => o.id !== m.id))); if (openId === m.id) setOpenId(null); }}
                  onDuplicate={() => {
                    const copy: StructMember = { ...structuredClone(m), id: newMember(m.role).id, mark: nextMark(s.members, m.role) };
                    copy.heights = copy.heights.map((r) => ({ ...r, id: newReading().id }));
                    up((x) => void x.members.splice(i + 1, 0, structuredClone(copy)));
                    setOpenId(copy.id);
                  }}
                />
              ))}
            </div>
            <AddMember lang={lang} onAdd={addMember} />
            <label className="mt-3 flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl bg-slate-50 px-3">
              <span className="text-sm font-semibold text-slate-900">{t("st_frameToggle")}</span>
              <Switch on={s.frame.on} onChange={(v) => up((x) => void (x.frame.on = v))} label={t("st_frameToggle")} />
            </label>
          </>
      </Panel>

      {/* ---- Moment frame ---- */}
      {s.frame.on && (
        <Panel tag="frame" title={t("st_frameTitle")}>
          <div className="grid grid-cols-2 gap-3">
            <MInput label={t("st_frameOpening")} value={s.frame.opening} gap="struct_frame_opening" onChange={(v) => up((x) => void (x.frame.opening = v))} />
            <MInput label={t("st_frameCc")} value={s.frame.cc} gap="struct_frame_cc" onChange={(v) => up((x) => void (x.frame.cc = v))} />
            <MInput label={t("st_diagA")} value={s.frame.diagA} gap="struct_frame_diag" onChange={(v) => up((x) => void (x.frame.diagA = v))} />
            <MInput label={t("st_diagB")} value={s.frame.diagB} gap="struct_frame_diag" onChange={(v) => up((x) => void (x.frame.diagB = v))} />
            {stamped && (
              <>
                <DwgInput lang={lang} value={s.frame.dwgOpening} field={parseMeas(s.frame.opening)} onChange={(v) => up((x) => void (x.frame.dwgOpening = v))} />
                <DwgInput lang={lang} value={s.frame.dwgCc} field={parseMeas(s.frame.cc)} onChange={(v) => up((x) => void (x.frame.dwgCc = v))} />
              </>
            )}
          </div>
          <CheckList lang={lang} checks={checks.filter((c) => ["struct_frame_square", "struct_frame_fit", "struct_frame_heights", "struct_dwg_cc", "struct_dwg_opening"].includes(c.key))} issuesOnly />
        </Panel>
      )}

      {/* ---- Finish, then getting it in: side by side on a tablet ---- */}
      <div className="grid items-start gap-4 md:grid-cols-2">
      <Panel tag="finish" title={t("st_finishTitle")}>
        <Seg label={t("st_finish")} value={s.finish} required={!s.finish}
          options={STRUCT_FINISHES.map((f) => [f, t(`st_fin_${f}`)] as [string, string])}
          onChange={(v) => up((x) => void (x.finish = v as StructuralData["finish"]))} />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <MInput label={t("st_color")} placeholder="—" value={s.color} onChange={(v) => up((x) => void (x.color = v))} />
          <MInput label={t("st_fireRating")} placeholder={s.finish === "intumescent" ? "1 hr" : "—"} value={s.fireRating} gap="struct_fire_rating" onChange={(v) => up((x) => void (x.fireRating = v))} />
        </div>
      </Panel>

      {/* ---- Install logistics ---- */}
      <AccessPanel lang={lang} s={s} up={up} checks={checks} />
      </div>

      {/* ---- Every check, one place ---- */}
      {checks.length > 0 && (
        <Panel title={t("st_checksTitle")} aside={reds + yellows ? `${reds + yellows}` : "✓"}>
          <CheckList lang={lang} checks={checks} collapsePassed />
        </Panel>
      )}

      <Panel>
        <label className="block">
          <span className="mb-1 block text-[11px] text-neutral-400">{t("st_notes")}</span>
          <textarea value={s.notes} onChange={(e) => up((x) => void (x.notes = e.target.value))} rows={3}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-2.5 text-base" />
        </label>
      </Panel>
    </div>
  );
}

// ---- Member card -------------------------------------------------------------------

function MemberCard({
  lang, s, m, open, stamped, checks, gapCount, onToggle, update, onRemove, onDuplicate,
}: {
  lang: string;
  s: StructuralData;
  m: StructMember;
  open: boolean;
  stamped: boolean;
  checks: CheckResult[];
  gapCount: number;
  onToggle: () => void;
  update: (fn: (m: StructMember) => void) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const t = (k: string) => mt(lang, k);
  const cut = memberCut(m, s);
  const w = memberWeight(m, s);
  const info = profileInfo(m.profile);
  const level = worst(checks.map((c) => c.level));
  const status: CheckLevel = level === "red" ? "red" : gapCount > 0 ? "na" : level;
  const qty = memberQty(m);
  return (
    <div data-member={m.id} className={`scroll-mt-24 overflow-hidden rounded-2xl border bg-white ${open ? "border-indigo-200 shadow-sm" : "border-slate-200"}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-h-16 w-full items-center gap-3 px-3 py-2.5 text-left">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-700">{m.mark || ROLE_PREFIX[m.role]}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-slate-900">
            {t(`st_role_${m.role}`)}{qty > 1 ? ` ×${qty}` : ""}
          </span>
          <span className="block truncate text-xs text-slate-500">{m.profile || t("st_noProfile")}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-[15px] font-semibold tabular-nums text-slate-900">{fmtLen(cut.length)}</span>
          {w.each !== null && <span className="block text-[11px] text-slate-500">{`${w.approx ? "≈ " : ""}${Math.round(w.each)} lb`}</span>}
        </span>
        <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${DOT[status]}`} />
        <span aria-hidden="true" className={`shrink-0 text-slate-400 transition ${open ? "rotate-90" : ""}`}>›</span>
      </button>
      {open && (
        <div className="space-y-4 border-t border-slate-100 px-3 pb-4 pt-3">
          {/* Profile, qty, mark */}
          <div>
            <div className="grid grid-cols-[1fr_auto] items-end gap-3">
              <MInput label={t("st_profile")} placeholder="W8x15" value={m.profile} gap="struct_profile" onChange={(v) => update((x) => void (x.profile = v))} />
              <Stepper label={t("st_qty")} value={qty} onChange={(n) => update((x) => void (x.qty = String(n)))} />
            </div>
            {!m.profile.trim() && <div className="mt-2 flex flex-wrap gap-1.5">
              {PROFILE_PRESETS[m.role].map((p) => (
                <button key={p} type="button" onClick={() => update((x) => void (x.profile = p))}
                  className={`min-h-9 rounded-full border px-3 text-xs font-semibold ${m.profile === p ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-600"}`}>
                  {p === "TBD by engineer" ? t("st_tbd") : p}
                </button>
              ))}
            </div>}
            <p className="mt-2 text-xs text-slate-500">
              {info
                ? `${info.label} · ${info.approx ? "≈ " : ""}${info.lbPerFt.toFixed(info.lbPerFt < 10 ? 2 : 1)} lb/ft${info.depth ? ` · ${t("st_depth")} ${fmtLen(info.depth)}` : ""}`
                : m.profile.trim() && !/tbd/i.test(m.profile) ? t("st_profileUnknown") : /tbd/i.test(m.profile) ? t("st_profileTbdHint") : ""}
            </p>
          </div>

          {isSpanning(m.role) && <SpanBlock lang={lang} s={s} m={m} stamped={stamped} update={update} />}
          {isVertical(m.role) && <ColumnBlock lang={lang} m={m} stamped={stamped} update={update} />}

          <More lang={lang}>
            <div>
              <div className="mb-1 text-[11px] text-neutral-400">{t("st_roleCol")}</div>
          <div className="flex flex-wrap gap-1.5">
            {STRUCT_ROLES.map((r) => (
              <button key={r} type="button" aria-pressed={m.role === r}
                onClick={() => update((x) => {
                  if (x.role === r) return;
                  const wasV = isVertical(x.role);
                  x.role = r;
                  if (isVertical(r) && !wasV && x.heights.length === 0) x.heights = [newReading(), newReading()];
                })}
                className={`min-h-10 shrink-0 rounded-full px-3.5 text-sm font-semibold ${m.role === r ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                {t(`st_role_${r}`)}
              </button>
            ))}
          </div>

            </div>
            {isSpanning(m.role) && <SpanMore lang={lang} m={m} stamped={stamped} update={update} />}
            {isVertical(m.role) && <ColumnMore lang={lang} m={m} update={update} />}
            <div className="grid grid-cols-[auto_1fr] gap-3">
              <label className="block">
                <span className="mb-1 block text-[11px] text-neutral-400">{t("st_mark")}</span>
                <input value={m.mark} onChange={(e) => update((x) => void (x.mark = e.target.value.toUpperCase().slice(0, 8)))}
                  aria-label={t("st_mark")} className="h-[46px] w-20 rounded-lg border border-neutral-700 bg-neutral-800 px-2 text-center text-base font-semibold" />
              </label>
              <MInput label={t("st_memberNotes")} placeholder="—" value={m.notes} onChange={(v) => update((x) => void (x.notes = v))} />
            </div>
          </More>

          <CheckList lang={lang} checks={checks} issuesOnly />

          {/* Result */}
          <CutResult lang={lang} m={m} s={s} />

          <div className="flex items-center gap-2">
            <span className="flex-1" />
            <button type="button" onClick={onDuplicate} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-indigo-700">{t("st_duplicate")}</button>
            <button type="button" onClick={() => { if (confirm(t("st_removeConfirm"))) onRemove(); }} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-red-700">{t("st_remove")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SpanBlock({ lang, s, m, stamped, update }: { lang: string; s: StructuralData; m: StructMember; stamped: boolean; update: (fn: (m: StructMember) => void) => void }) {
  const t = (k: string) => mt(lang, k);
  const bearing = isBearingRole(m.role);
  const framed = m.role === "beam" && s.frame.on && !m.spanA.trim() && !m.spanB.trim();
  const a = parseMeas(m.spanA), b = parseMeas(m.spanB);
  const diff = a !== null && b !== null ? Math.abs(a - b) : null;
  return (
    <>
      <Group title={bearing ? t("st_clearSpanTitle") : t("st_lengthTitle")}
        badge={diff !== null ? <DeltaBadge delta={diff} tol={STRUCT_TOL.span} /> : null}>
        <div className="grid grid-cols-2 gap-3">
          <MInput label={bearing ? t("st_spanA") : t("st_lengthA")} value={m.spanA} gap={framed ? undefined : "struct_span"} onChange={(v) => update((x) => void (x.spanA = v))} />
          <MInput label={bearing ? t("st_spanB") : t("st_lengthB")} value={m.spanB} gap={framed ? undefined : "struct_span_second"} onChange={(v) => update((x) => void (x.spanB = v))} />
          {stamped && !framed && (
            <DwgInput lang={lang} value={m.dwgSpan} field={a !== null || b !== null ? Math.max(a ?? 0, b ?? 0) : null} onChange={(v) => update((x) => void (x.dwgSpan = v))} />
          )}
        </div>
      </Group>

      {bearing && !framed && (
        <Group title={t("st_bearingTitle")}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(["bearingL", "bearingR"] as const).map((k) => (
              <BearingEnd key={k} lang={lang} m={m} end={m[k]} title={t(k === "bearingL" ? "st_endL" : "st_endR")} locKey={`struct:${m.id}:${k === "bearingL" ? "L" : "R"}`}
                update={(fn) => update((x) => fn(x[k]))} />
            ))}
          </div>
        </Group>
      )}

      {bearing && (
        <Seg label={t("st_carries")} value={m.carries} required={!m.carries}
          options={STRUCT_CARRIES.map((c) => [c, t(`st_carry_${c}`)] as [string, string])}
          onChange={(v) => update((x) => void (x.carries = v as StructMember["carries"]))} />
      )}
    </>
  );
}

/** Secondary details for a spanning member: behind "More details". */
function SpanMore({ lang, m, stamped, update }: { lang: string; m: StructMember; stamped: boolean; update: (fn: (m: StructMember) => void) => void }) {
  const t = (k: string) => mt(lang, k);
  if (!isBearingRole(m.role)) return null;
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <MInput label={t("st_existing")} placeholder={t("st_existingPh")} value={m.existing} onChange={(v) => update((x) => void (x.existing = v))} />
        <MInput label={t("st_minBearing")} placeholder={t("st_shopRule")} value={m.minBearing} onChange={(v) => update((x) => void (x.minBearing = v))} />
        <MInput label={t("st_elevation")} placeholder="—" value={m.elevation} onChange={(v) => update((x) => void (x.elevation = v))} />
        {stamped && <DwgInput lang={lang} value={m.dwgElevation} field={parseMeas(m.elevation)} onChange={(v) => update((x) => void (x.dwgElevation = v))} />}
      </div>
      <Seg label={t("st_shoring")} value={m.shoring}
        options={STRUCT_SHORING.map((c) => [c, t(`st_shore_${c}`)] as [string, string])}
        onChange={(v) => update((x) => void (x.shoring = v as StructMember["shoring"]))} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(["bearingL", "bearingR"] as const).map((k) => (
          <Seg key={k} small label={`${t("st_condition")} · ${t(k === "bearingL" ? "st_endL" : "st_endR")}`} value={m[k].condition}
            options={STRUCT_CONDITIONS.map((c) => [c, t(`st_cond_${c}`)] as [string, string])}
            onChange={(v) => update((x) => void (x[k].condition = v as StructBearing["condition"]))} />
        ))}
      </div>
    </>
  );
}

function BearingEnd({ lang, m, end, title, update, locKey }: { lang: string; m: StructMember; end: StructBearing; title: string; update: (fn: (b: StructBearing) => void) => void; locKey: string }) {
  const shared = useContext(SubstrateCtx);
  const t = (k: string) => mt(lang, k);
  const need = requiredBearing(m, end);
  const have = parseMeas(end.length);
  const short = have !== null && need !== null && have < need;
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-900">{title}</span>
        {need !== null && (
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${short ? PILL.red : have !== null ? PILL.green : "border-slate-200 text-slate-500"}`}>
            {t("st_min")} {fmtLen(need)}
          </span>
        )}
      </div>
      {shared ? (
        <SubstrateEditor locKey={locKey} title={t("st_substrate")} materials={MATERIALS_MASONRY_STEEL} hide={["mount", "depth", "edge"]} />
      ) : (
        <Select label={t("st_substrate")} value={end.substrate} required={!end.substrate}
          options={STRUCT_SUBSTRATES.map((x) => [x, t(`st_sub_${x}`)] as [string, string])}
          onChange={(v) => update((b) => void (b.substrate = v as StructBearing["substrate"]))} />
      )}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <MInput label={t("st_bearingLen")} value={end.length} gap="struct_bearing_len" onChange={(v) => update((b) => void (b.length = v))} />
        <MInput label={t("st_wallThk")} value={end.wall} gap={end.substrate === "wood" || end.substrate === "steel" ? undefined : "struct_wall"} onChange={(v) => update((b) => void (b.wall = v))} />
      </div>
    </div>
  );
}

function ColumnBlock({ lang, m, stamped, update }: { lang: string; m: StructMember; stamped: boolean; update: (fn: (m: StructMember) => void) => void }) {
  const shared = useContext(SubstrateCtx);
  const t = (k: string) => mt(lang, k);
  const vals = m.heights.map((r) => parseMeas(r.value)).filter((n): n is number => n !== null && n > 0);
  const spread = vals.length >= 2 ? Math.max(...vals) - Math.min(...vals) : null;
  const cover = m.role === "cover";
  return (
    <>
      <Group title={t(cover ? "st_coverHeightsTitle" : "st_heightsTitle")}
        badge={spread !== null ? <DeltaBadge delta={spread} tol={STRUCT_TOL.height} /> : null}>
        <div className="space-y-2">
          {m.heights.map((r, i) => (
            <div key={r.id} className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_auto] items-end gap-2">
              <label className="block min-w-0">
                <span className="mb-1 block text-[11px] text-neutral-400">{t("st_where")}</span>
                <input value={r.label} onChange={(e) => update((x) => void (x.heights[i].label = e.target.value))}
                  placeholder={`${t("st_point")} ${i + 1}`} aria-label={`${t("st_where")} ${i + 1}`}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-2.5 text-base" />
              </label>
              <MInput label={t("st_height")} value={r.value} gap={i === 0 ? "struct_heights" : "struct_heights_second"} onChange={(v) => update((x) => void (x.heights[i].value = v))} />
              <button type="button" aria-label={t("st_remove")} disabled={m.heights.length <= 1}
                onClick={() => update((x) => void x.heights.splice(i, 1))}
                className="mb-0.5 size-11 rounded-lg text-lg text-slate-400 disabled:opacity-30">×</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => update((x) => void x.heights.push(newReading()))}
          className="mt-1 min-h-11 rounded-lg px-1 text-sm font-semibold text-indigo-700">+ {t("st_addReading")}</button>
        {(stamped || cover) && (
          <div className="mt-2 grid grid-cols-2 gap-3">
            {stamped && <DwgInput lang={lang} value={m.dwgHeight} field={vals.length ? Math.min(...vals) : null} onChange={(v) => update((x) => void (x.dwgHeight = v))} />}
            {cover && <MInput label={t("st_existingCol")} placeholder={t("st_existingColPh")} value={m.existing} gap="struct_existing" onChange={(v) => update((x) => void (x.existing = v))} />}
          </div>
        )}
      </Group>

      {!cover && (
        <Group title={t("st_baseTitle")}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {!shared && <Select label={t("st_baseOn")} value={m.base.substrate} required={!m.base.substrate}
              options={STRUCT_SUBSTRATES.map((x) => [x, t(`st_sub_${x}`)] as [string, string])}
              onChange={(v) => update((x) => void (x.base.substrate = v as StructBearing["substrate"]))} />}
            <Seg label={t("st_footing")} value={m.footing} required={!m.footing}
              options={STRUCT_FOOTINGS.map((c) => [c, t(`st_foot_${c}`)] as [string, string])}
              onChange={(v) => update((x) => void (x.footing = v as StructMember["footing"]))} />
          </div>
          {shared && <SubstrateEditor locKey={`struct:${m.id}:base`} title={t("st_baseOn")} materials={[...MATERIALS_MASONRY_STEEL, "tile_slab"]} hide={["depth"]} />}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <PlateInput lang={lang} label={t("st_basePlate")} value={m.basePlate} gap="struct_base_plate" onChange={(v) => update((x) => void (x.basePlate = v))} />
            <PlateInput lang={lang} label={t("st_capPlate")} value={m.capPlate} gap="struct_cap_plate" onChange={(v) => update((x) => void (x.capPlate = v))} />
          </div>
          {m.basePlate.trim() && m.basePlate.trim().toLowerCase() !== "none" && (
            <div className="mt-3">
              <MInput label={t("st_anchors")} placeholder={t("st_anchorsPh")} value={m.anchors} gap="struct_anchors" onChange={(v) => update((x) => void (x.anchors = v))} />
            </div>
          )}
        </Group>
      )}
    </>
  );
}

/** Secondary details for a vertical member: behind "More details". */
function ColumnMore({ lang, m, update }: { lang: string; m: StructMember; update: (fn: (m: StructMember) => void) => void }) {
  const t = (k: string) => mt(lang, k);
  const cover = m.role === "cover";
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {!cover && <MInput label={t("st_existingCol")} placeholder={t("st_existingColPh")} value={m.existing} onChange={(v) => update((x) => void (x.existing = v))} />}
        {!cover && <MInput label={t("st_plumb")} placeholder="0" value={m.plumb} onChange={(v) => update((x) => void (x.plumb = v))} />}
        {!cover && <MInput label={t("st_footingSize")} placeholder={m.footing === "unknown" ? "?" : "24x24x12"} value={m.footingSize} onChange={(v) => update((x) => void (x.footingSize = v))} />}
        <MInput label={t("st_shim")} placeholder="0" value={m.shim} onChange={(v) => update((x) => void (x.shim = v))} />
        {!cover && <MInput label={t("st_finishFloor")} placeholder="—" value={m.finishFloor} onChange={(v) => update((x) => void (x.finishFloor = v))} />}
      </div>
      {!cover && (
        <Seg small label={t("st_condition")} value={m.base.condition}
          options={STRUCT_CONDITIONS.map((c) => [c, t(`st_cond_${c}`)] as [string, string])}
          onChange={(v) => update((x) => void (x.base.condition = v as StructBearing["condition"]))} />
      )}
    </>
  );
}

function More({ lang, children }: { lang: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}
        className="flex min-h-11 items-center gap-1.5 text-sm font-semibold text-indigo-700">
        <span aria-hidden="true" className={`inline-block transition ${open ? "rotate-90" : ""}`}>›</span>
        {mt(lang, open ? "st_lessDetails" : "st_moreDetails")}
      </button>
      {open && <div className="mt-2 space-y-3">{children}</div>}
    </div>
  );
}

function AddMember({ lang, onAdd }: { lang: string; onAdd: (r: StructRole) => void }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 text-sm font-semibold text-indigo-700">
        + {mt(lang, "st_addMember")}
      </button>
    );
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2">
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {STRUCT_ROLES.map((r) => (
          <button key={r} type="button" onClick={() => { onAdd(r); setOpen(false); }}
            className="min-h-12 rounded-lg bg-white px-3 text-left text-sm font-semibold text-slate-800 shadow-sm">
            {mt(lang, `st_role_${r}`)}
          </button>
        ))}
        <button type="button" onClick={() => setOpen(false)} className="min-h-12 rounded-lg px-3 text-sm font-semibold text-slate-500">
          {mt(lang, "st_cancel")}
        </button>
      </div>
    </div>
  );
}

function CutResult({ lang, m, s }: { lang: string; m: StructMember; s: StructuralData }) {
  const t = (k: string) => mt(lang, k);
  const cut = memberCut(m, s);
  const w = memberWeight(m, s);
  const qty = memberQty(m);
  return (
    <div className="rounded-xl bg-indigo-50 p-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">{t("st_cutLength")}</span>
        <span className="text-xl font-bold tabular-nums text-indigo-900">{fmtLen(cut.length)}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-1.5 text-xs leading-relaxed text-slate-600">
        {cut.parts.map((p, i) => (
          <span key={i} className="whitespace-nowrap">
            {i > 0 ? (p.sign < 0 ? "− " : "+ ") : ""}
            {t(`st_part_${p.key}`)} {fmtLen(p.value)}
          </span>
        ))}
        {cut.length === null && cut.missing ? <span className="block w-full text-amber-800">{t(`st_needs_${cut.missing}`)}</span> : null}
      </div>
      {(w.each !== null || w.lbPerFt !== null) && (
        <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-indigo-100 pt-2 text-sm">
          <span className="text-slate-600">{w.lbPerFt !== null ? `${w.approx ? "≈ " : ""}${w.lbPerFt.toFixed(w.lbPerFt < 10 ? 2 : 1)} lb/ft` : ""}</span>
          <span className="font-semibold tabular-nums text-slate-900">
            {w.each !== null ? `${w.approx ? "≈ " : ""}${Math.round(w.each)} lb${qty > 1 ? ` × ${qty} = ${Math.round(w.total!)} lb` : ""}` : "—"}
          </span>
        </div>
      )}
    </div>
  );
}

function AccessPanel({ lang, s, up, checks }: { lang: string; s: StructuralData; up: (fn: (x: StructuralData) => void) => void; checks: CheckResult[] }) {
  const t = (k: string) => mt(lang, k);
  const wv = weightVerdict(s);
  const pieceCheck = checks.find((c) => c.key === "struct_piece_length");
  return (
    <Panel tag="access" title={t("st_accessTitle")}>
      <MInput label={t("st_accessPath")} placeholder={t("st_accessPathPh")} value={s.access.path} onChange={(v) => up((x) => void (x.access.path = v))} />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <MInput label={t("st_maxLength")} value={s.access.maxLength} gap="struct_max_length" onChange={(v) => up((x) => void (x.access.maxLength = v))} />
        <MInput label={t("st_maxWeight")} placeholder="lb" value={s.access.maxWeight} onChange={(v) => up((x) => void (x.access.maxWeight = v))} />
      </div>
      <div className="mt-3">
        <Seg label={t("st_lift")} value={s.access.lift}
          options={STRUCT_LIFTS.map((c) => [c, t(`st_lift_${c}`)] as [string, string])}
          onChange={(v) => up((x) => void (x.access.lift = v as StructuralData["access"]["lift"]))} />
      </div>
      {(pieceCheck && pieceCheck.level !== "green") || s.access.splice ? (
        <div className="mt-3">
          <MInput label={t("st_splice")} placeholder={t("st_splicePh")} value={s.access.splice} onChange={(v) => up((x) => void (x.access.splice = v))} />
        </div>
      ) : null}
      <More lang={lang}>
        <div className="grid grid-cols-2 gap-3">
          <MInput label={t("st_doorWidth")} placeholder="—" value={s.access.doorWidth} onChange={(v) => up((x) => void (x.access.doorWidth = v))} />
          <MInput label={t("st_stairWidth")} placeholder="—" value={s.access.stairWidth} onChange={(v) => up((x) => void (x.access.stairWidth = v))} />
        </div>
      </More>
      {(pieceCheck || wv.level !== "na") && (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {pieceCheck && (
            <Verdict level={pieceCheck.level} title={t("st_fitsLength")}
              text={`${pieceCheck.detail} ${fmtLen(pieceCheck.actual)} · ${t("st_maxShort")} ${fmtLen(pieceCheck.expected)}`} />
          )}
          {wv.level !== "na" && (
            <Verdict level={wv.level} title={t("st_fitsWeight")}
              text={`${Math.round(wv.heaviest!)} lb · ${t("st_maxShort")} ${Math.round(wv.max!)} lb${wv.level === "yellow" ? ` · ${t("st_needsLift")}` : ""}`} />
          )}
        </div>
      )}
    </Panel>
  );
}

// ---- Small building blocks ---------------------------------------------------------

function Panel({ title, aside, tag, children }: { title?: string; aside?: string; tag?: string; children: React.ReactNode }) {
  return (
    <section data-st-panel={tag} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      {title && (
        <h3 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-slate-900">
          {title}
          {aside && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{aside}</span>}
        </h3>
      )}
      {children}
    </section>
  );
}

function Group({ title, hint, badge, children }: { title: string; hint?: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</div>
        {badge}
      </div>
      {hint && <p className="-mt-1 mb-2 text-xs text-slate-500">{hint}</p>}
      {children}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2.5">
      <dt className="truncate text-[11px] font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 whitespace-nowrap text-[15px] font-semibold leading-tight tabular-nums text-slate-900 sm:text-lg">{value}</dd>
      {sub ? <dd className="text-[11px] font-medium text-slate-500">{sub}</dd> : null}
    </div>
  );
}

function Seg({ label, value, options, onChange, required = false, small = false }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void; required?: boolean; small?: boolean }) {
  return (
    <div role="group" aria-label={label} className="min-w-0">
      <div className={`mb-1 text-[11px] ${required ? "text-red-300" : "text-neutral-400"}`}>{label}</div>
      {/* A system-style segmented control: one track, the choice lifts out of it. */}
      <div className={`${options.length > 3 ? "grid grid-cols-2 sm:flex" : "flex sm:max-w-md"} gap-1 rounded-xl bg-slate-100 p-1 ${required ? "ring-1 ring-red-400" : ""}`}>
        {options.map(([v, l]) => (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(value === v ? "" : v)}
            className={`${small ? "min-h-9 text-xs" : "min-h-11 text-sm"} min-w-0 flex-1 rounded-lg px-2 font-semibold transition ${
              value === v ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200" : "text-slate-600"
            }`}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

function Select({ label, value, options, onChange, required = false }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label className="block min-w-0">
      <span className={`mb-1 block text-[11px] ${required ? "text-red-300" : "text-neutral-400"}`}>{label}</span>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}
        className={`min-h-11 w-full rounded-lg border bg-white px-2.5 text-base ${required ? "border-red-500" : "border-slate-200"}`}>
        <option value="">—</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function PlateInput({ lang, label, value, gap, onChange }: { lang: string; label: string; value: string; gap: string; onChange: (v: string) => void }) {
  return (
    <div>
      <MInput label={label} placeholder="12x12x3/8" value={value} gap={gap} onChange={onChange} />
      {!value.trim() && <div className="mt-1.5 flex flex-wrap gap-1.5">
        {PLATE_PRESETS.map((p) => (
          <button key={p} type="button" onClick={() => onChange(p)}
            className={`min-h-9 rounded-full border px-2.5 text-xs font-semibold ${value === p ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-600"}`}>
            {p === "none" ? mt(lang, "st_none") : p}
          </button>
        ))}
      </div>}
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div role="group" aria-label={label}>
      <div className="mb-1 text-[11px] text-neutral-400">{label}</div>
      <div className="flex h-[46px] items-center rounded-lg border border-slate-200 bg-white">
        <button type="button" aria-label="−" onClick={() => onChange(Math.max(1, value - 1))} className="h-full w-10 text-lg font-semibold text-slate-600">−</button>
        <span className="w-7 text-center text-base font-semibold tabular-nums">{value}</span>
        <button type="button" aria-label="+" onClick={() => onChange(Math.min(99, value + 1))} className="h-full w-10 text-lg font-semibold text-slate-600">+</button>
      </div>
    </div>
  );
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={(e) => { e.preventDefault(); onChange(!on); }}
      className={`relative h-8 w-[52px] shrink-0 rounded-full transition ${on ? "bg-indigo-600" : "bg-slate-300"}`}>
      <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-all ${on ? "left-[24px]" : "left-1"}`} />
    </button>
  );
}

function DeltaBadge({ delta, tol }: { delta: number; tol: { green: number; yellow: number } }) {
  const level: CheckLevel = delta <= tol.green ? "green" : delta <= tol.yellow ? "yellow" : "red";
  return <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${PILL[level]}`}>Δ {fmtLen(delta)}</span>;
}

/** The engineer's value, typed beside the field value it is checked against. */
function DwgInput({ lang, value, field, onChange }: { lang: string; value: string; field: number | null; onChange: (v: string) => void }) {
  const dwg = parseMeas(value);
  const delta = dwg !== null && field !== null ? field - dwg : null;
  const level: CheckLevel = delta === null ? "na" : Math.abs(delta) <= STRUCT_TOL.drawing.green ? "green" : Math.abs(delta) <= STRUCT_TOL.drawing.yellow ? "yellow" : "red";
  return (
    <div className="min-w-0">
      <MInput label={`${mt(lang, "st_perDrawing")}`} placeholder="—" value={value} onChange={onChange} />
      {delta !== null && (
        <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${PILL[level]}`}>
          {level === "green" ? `✓ ${mt(lang, "st_matchesDrawing")}` : `${mt(lang, "st_offDrawing")} ${fmtLen(Math.abs(delta))}`}
        </span>
      )}
    </div>
  );
}

function Verdict({ level, title, text }: { level: CheckLevel; title: string; text: string }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${PILL[level]}`}>
      <div className="text-xs font-semibold">{level === "green" ? "✓ " : level === "red" ? "✕ " : "! "}{title}</div>
      <div className="text-xs opacity-90">{text}</div>
    </div>
  );
}

const CHECK_LABELS: Record<string, [string, string]> = {
  struct_dwg_span: ["st_lbl_drawing", "st_lbl_field"],
  struct_dwg_elev: ["st_lbl_drawing", "st_lbl_field"],
  struct_dwg_height: ["st_lbl_drawing", "st_lbl_field"],
  struct_dwg_cc: ["st_lbl_drawing", "st_lbl_field"],
  struct_dwg_opening: ["st_lbl_drawing", "st_lbl_field"],
  struct_bearing: ["st_min", "st_lbl_have"],
  struct_bearing_wall: ["st_wallShort", "st_bearingLen"],
  struct_piece_length: ["st_maxShort", "st_lbl_piece"],
  struct_frame_fit: ["st_lbl_frame", "st_opening"],
};

export function checkLine(lang: string, c: CheckResult): string {
  if (c.expected === null || c.actual === null) return "";
  if (c.key === "struct_plumb") return fmtLen(c.actual);
  const labels = CHECK_LABELS[c.key];
  if (labels) return `${mt(lang, labels[0])} ${fmtLen(c.expected)} · ${mt(lang, labels[1])} ${fmtLen(c.actual)}`;
  return `${fmtLen(c.expected)} / ${fmtLen(c.actual)} · Δ ${fmtLen(Math.abs(c.delta ?? 0))}`;
}

function CheckList({ lang, checks, issuesOnly = false, collapsePassed = false }: { lang: string; checks: CheckResult[]; issuesOnly?: boolean; collapsePassed?: boolean }) {
  const [showPassed, setShowPassed] = useState(false);
  const order: Record<CheckLevel, number> = { red: 0, yellow: 1, green: 2, na: 3 };
  const sorted = [...checks].sort((a, b) => order[a.level] - order[b.level]);
  const issues = sorted.filter((c) => c.level === "red" || c.level === "yellow");
  const passed = sorted.filter((c) => c.level === "green");
  const shown = issuesOnly || (collapsePassed && !showPassed) ? issues : sorted;
  if (!shown.length && !(collapsePassed && passed.length)) return null;
  return (
    <div className="mt-3">
      {shown.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {shown.map((c, i) => (
            <li key={i} className="flex items-start gap-2.5 px-3 py-2.5">
              <span aria-hidden="true" className={`mt-1.5 size-2.5 shrink-0 rounded-full ${DOT[c.level]}`} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-slate-800">{mt(lang, `check_${c.key}`)}{c.detail ? <span className="text-slate-500"> · {c.detail}</span> : null}</span>
                {checkLine(lang, c) && <span className="block text-xs tabular-nums text-slate-500">{checkLine(lang, c)}</span>}
              </span>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${PILL[c.level]}`}>
                {mt(lang, c.level === "green" ? "st_ok" : c.level === "yellow" ? "st_review" : "st_fix")}
              </span>
            </li>
          ))}
        </ul>
      )}
      {collapsePassed && passed.length > 0 && (
        <button type="button" onClick={() => setShowPassed(!showPassed)} className="mt-2 flex min-h-11 items-center gap-2 text-sm font-semibold text-emerald-700">
          <span aria-hidden="true" className={`size-2.5 rounded-full ${DOT.green}`} />
          {showPassed ? mt(lang, "st_hidePassed") : `${passed.length} ${mt(lang, "st_passed")}`}
        </button>
      )}
    </div>
  );
}

function TemplateIcon({ t }: { t: StructTemplate }) {
  const c = { width: 40, height: 28, viewBox: "0 0 40 28", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className: "text-indigo-600" };
  switch (t) {
    case "frame":
      return <svg {...c}><path d="M6 7h28v4H6zM9 11v14M31 11v14M4 25h32" /></svg>;
    case "beam":
      return <svg {...c}><path d="M2 6h8v20H2M38 6h-8v20h8M6 10h28v5H6z" /><path d="M6 11.5h28M6 13.5h28" strokeWidth={0.8} /></svg>;
    case "lintel":
      return <svg {...c}><path d="M2 4h36v6H2zM2 10h9v16M38 10h-9v16" /><path d="M8 10h24v3H8z" /></svg>;
    case "columns":
      return <svg {...c}><path d="M4 4h32v3H4zM12 7v18M28 7v18M8 25h8M24 25h8" /></svg>;
    case "porch":
      return <svg {...c}><path d="M3 9l17-6 17 6M6 9v16M20 9v16M34 9v16M2 25h36" /></svg>;
    case "ledger":
      return <svg {...c}><path d="M6 3v22M6 12h12M6 12v4" /><path d="M18 12h16" strokeDasharray="2 2" /></svg>;
  }
}
