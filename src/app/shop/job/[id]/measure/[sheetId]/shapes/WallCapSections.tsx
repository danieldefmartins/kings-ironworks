"use client";

// Railing on a wall cap: retaining walls, parapets, knee walls, roof edges.
// One screen, top to bottom:
//
//   drawing (elevation · section · 3D) → the wall → drop & guard → mount →
//   runs & posts → finish → checks
//
// The posts are what the shop drills, so every post carries its own cap width,
// top of cap and, when cored, the edge distance to both cap faces.

import { useMemo, useState } from "react";
import type { MeasureData } from "@/lib/shop/measure";
import { mt } from "@/lib/shop/measure-i18n";
import { parseMeas } from "@/lib/shop/measure-parse";
import {
  blankWallCap,
  guardHeight,
  guardRequirement,
  newWallCapPost,
  newWallCapRun,
  postCut,
  postsOf,
  cornerTop,
  runRailLength,
  runRise,
  runSloped,
  runTag,
  WC_FINISHES,
  WC_KINDS,
  WC_MATERIALS,
  WC_MOUNTS,
  WC_TOL,
  wallCapChecks,
  wallCapGaps,
  wallCapLimits,
  wallCapSummary,
  type WallCapData,
  type WallCapPost,
  type WallCapRun,
} from "@/lib/shop/measure-wall-cap";
import type { CheckLevel, CheckResult } from "@/lib/shop/measure-checks";
import { MInput } from "../fields";
import SceneViewport from "../SceneViewport";
import { CapSection, WallCapElevation } from "./WallCapSketch";
import { CheckList, Chips, DOT, fmtIn, fmtLen, Group, More, Notes, Panel, PILL, Seg, Stat, StatusPills, Verdict, ViewToggle, worst, type CheckLabels } from "./MeasureFormKit";

type SetFn = (fn: (d: MeasureData) => void) => void;

export const WC_CHECK_LABELS: CheckLabels = {
  wc_edge: ["wc_lbl_min", "wc_lbl_edge"],
  wc_edge_sum: ["wc_cap", "wc_lbl_edges"],
  wc_cap_narrow_core: ["wc_lbl_needs", "wc_cap"],
  wc_plate_fit: ["wc_cap", "wc_lbl_plate"],
  wc_guard_height: ["wc_lbl_required", "wc_lbl_have"],
  wc_slope_decision: ["wc_lbl_tol", "wc_lbl_rise"],
};

export default function WallCapSections({ lang, data, set }: { lang: string; data: MeasureData; set: SetFn }) {
  const w = data.wallCap ?? null;
  const t = (k: string) => mt(lang, k);
  const limits = useMemo(() => wallCapLimits(data), [data]);
  const checks = useMemo(() => wallCapChecks(w, limits), [w, limits]);
  const gaps = useMemo(() => wallCapGaps(w), [w]);
  const summary = useMemo(() => wallCapSummary(w), [w]);
  const [openRun, setOpenRun] = useState<string | null>(() => w?.runs[0]?.id ?? null);
  const [focus, setFocus] = useState<string | null>(null);
  const [view, setView] = useState("elev");

  const up = (fn: (x: WallCapData) => void) =>
    set((d) => {
      if (!d.wallCap) d.wallCap = blankWallCap();
      fn(d.wallCap);
    });

  if (!w) {
    return (
      <Panel>
        <button type="button" onClick={() => up(() => {})} className="min-h-12 w-full rounded-xl bg-indigo-600 px-4 font-semibold text-white">{t("wc_start")}</button>
      </Panel>
    );
  }

  const posts = postsOf(w);
  const redMarks = [...new Set(checks.filter((c) => c.level === "red" && c.detail).map((c) => (c.detail || "").split(" ")[0]))];
  const fabGaps = gaps.filter((g) => (g.tier || "fab") === "fab").length;
  // The section shows the post being worked on, else the tightest one.
  const sectionPost = (() => {
    if (focus) { const f = posts.find((p) => p.mark === focus); if (f) return f; }
    const scored = posts.map((p) => ({ p, e: Math.min(parseMeas(p.p.edgeHigh) ?? 99, parseMeas(p.p.edgeLow) ?? 99) }));
    scored.sort((a, b) => a.e - b.e);
    return scored[0]?.p ?? null;
  })();
  const req = guardRequirement(w, limits);
  const have = guardHeight(w);
  const guardCheck = checks.find((c) => c.key === "wc_guard_height");
  const cut = postCut(w);

  function pickPost(mark: string) {
    const hit = posts.find((p) => p.mark === mark);
    if (!hit) return;
    setFocus(mark);
    setOpenRun(w!.runs[hit.run].id);
    requestAnimationFrame(() => document.getElementById(`wc-post-${mark}`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
  }

  return (
    <div className="space-y-4">
      {/* ---- Drawing + summary ---- */}
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">{w.kind ? t(`wc_kind_${w.kind}`) : t("wc_title")}</h2>
            <p className="mt-0.5 text-[15px] text-slate-500">
              {`${summary.runs} ${t(summary.runs === 1 ? "wc_run" : "wc_runs")} · ${summary.posts} ${t(summary.posts === 1 ? "wc_post" : "wc_posts")}${w.material ? ` · ${t(`wc_mat_${w.material}`)}` : ""}`}
            </p>
          </div>
          <StatusPills lang={lang} checks={checks} gaps={fabGaps} />
        </div>
        <div className="mt-3 flex justify-center">
          <ViewToggle label={t("wc_views")} value={view} onChange={setView}
            options={[["elev", t("wc_elevation")], ["section", t("wc_section")], ["3d", "3D"]]} />
        </div>
        <div className="mx-auto mt-3 max-w-[960px] overflow-hidden rounded-xl border border-slate-200">
          {view === "elev" && <WallCapElevation w={w} lang={lang} red={redMarks} focus={focus} onPost={pickPost} />}
          {view === "section" && (
            <div className="mx-auto max-w-[380px]">
              <CapSection w={w} post={sectionPost?.p ?? null} mark={sectionPost?.mark} lang={lang} />
            </div>
          )}
          {view === "3d" && <SceneViewport data={data} lang={lang} className="!rounded-none !border-0 !shadow-none" />}
        </div>
        {view === "section" && posts.length > 1 && (
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {posts.map((p) => (
              <button key={p.mark} type="button" aria-pressed={sectionPost?.mark === p.mark} onClick={() => setFocus(p.mark)}
                className={`min-h-9 min-w-11 rounded-full border px-3 text-[13px] font-semibold ${sectionPost?.mark === p.mark ? "border-indigo-500 bg-indigo-50 text-indigo-700" : redMarks.includes(p.mark) ? "border-red-300 text-red-700" : "border-slate-200 text-slate-600"}`}>
                {p.mark}
              </button>
            ))}
          </div>
        )}
        <dl className="mt-3 grid grid-cols-3 gap-2">
          <Stat label={t("wc_railLength")} value={summary.railLength === null ? "—" : fmtLen(summary.railLength)} />
          <Stat label={t("wc_guard")} value={fmtIn(have)} tone={guardCheck?.level}
            sub={req.required !== null ? `${t("wc_lbl_needs")} ${fmtIn(req.required)}` : req.drop !== null ? t("wc_noGuardShort") : undefined} />
          <Stat label={t("wc_minCap")} value={fmtIn(summary.minCap)} sub={summary.maxRise !== null ? `${t("wc_capFalls")} ${fmtIn(summary.maxRise)}` : undefined} />
        </dl>
      </Panel>

      {/* ---- The wall ---- */}
      <div className="grid items-start gap-4 md:grid-cols-2">
        <Panel title={t("wc_wallTitle")}>
          <Seg label={t("wc_kind")} value={w.kind} required={!w.kind} cols={2}
            options={WC_KINDS.map((k) => [k, t(`wc_kind_${k}`)] as [string, string])}
            onChange={(v) => up((x) => void (x.kind = v as WallCapData["kind"]))} />
          <div className="mt-3">
            <Seg label={t("wc_material")} value={w.material} required={!w.material} cols={3}
              options={WC_MATERIALS.map((k) => [k, t(`wc_mat_${k}`)] as [string, string])}
              onChange={(v) => up((x) => void (x.material = v as WallCapData["material"]))} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Seg label={t("wc_loose")} value={w.loose} required={!w.loose} options={[["yes", t("st_yes")], ["no", t("st_no")]]}
              onChange={(v) => up((x) => void (x.loose = v as WallCapData["loose"]))} />
            <Seg label={t("wc_cracked")} value={w.cracked} required={!w.cracked} options={[["yes", t("st_yes")], ["no", t("st_no")]]}
              onChange={(v) => up((x) => void (x.cracked = v as WallCapData["cracked"]))} />
          </div>
          {w.kind === "roof_edge" && (
            <div className="mt-3 space-y-3 rounded-xl bg-slate-50 p-3">
              <Seg label={t("wc_membrane")} value={w.membrane} required={!w.membrane} options={[["yes", t("st_yes")], ["no", t("st_no")]]}
                onChange={(v) => up((x) => void (x.membrane = v as WallCapData["membrane"]))} />
              {w.membrane === "yes" && (
                <>
                  <Seg label={t("wc_noPenetration")} value={w.noPenetration} required={!w.noPenetration} options={[["yes", t("st_yes")], ["no", t("st_no")]]}
                    onChange={(v) => up((x) => void (x.noPenetration = v as WallCapData["noPenetration"]))} />
                  {w.noPenetration === "no" && (
                    <Seg label={t("wc_flashBy")} value={w.flashBy} required={!w.flashBy}
                      options={[["roofer", t("wc_flash_roofer")], ["kiw", t("wc_flash_kiw")], ["others", t("st_byOthers")]]}
                      onChange={(v) => up((x) => void (x.flashBy = v as WallCapData["flashBy"]))} />
                  )}
                </>
              )}
            </div>
          )}
          <CheckList lang={lang} labels={WC_CHECK_LABELS} checks={checks.filter((c) => ["wc_loose", "wc_cracked", "wc_membrane"].includes(c.key))} issuesOnly />
        </Panel>

        {/* ---- Drop & guard ---- */}
        <Panel title={t("wc_guardTitle")}>
          <Seg label={t("wc_dropSide")} value={w.dropSide} required={!w.dropSide}
            options={[["left", t("wc_left")], ["right", t("wc_right")]]}
            onChange={(v) => up((x) => void (x.dropSide = v as WallCapData["dropSide"]))} />
          <p className="mt-1 text-[13px] text-slate-500">{t("wc_dropSideHint")}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <MInput label={t("wc_drop")} value={w.drop} gap="wc_drop" onChange={(v) => up((x) => void (x.drop = v))} />
            <MInput label={t("wc_capAboveWalk")} placeholder="0" value={w.capAboveWalk} onChange={(v) => up((x) => void (x.capAboveWalk = v))} />
          </div>
          <div className="mt-3">
            <MInput label={t("wc_railHeight")} value={w.railHeight} gap="wc_rail_height" onChange={(v) => up((x) => void (x.railHeight = v))} />
            {!w.railHeight.trim() && (
              <Chips value={w.railHeight} onPick={(v) => up((x) => void (x.railHeight = v))}
                options={(req.required !== null ? [Math.max(0, req.required - (parseMeas(w.capAboveWalk) ?? 0))] : [36, 42]).map((n) => [fmtIn(n), fmtIn(n)] as [string, string])} />
            )}
          </div>
          <div className="mt-3">
            <Seg label={t("wc_occupancy")} value={w.occupancy} small
              options={[["residential", t("wc_occ_residential")], ["commercial", t("wc_occ_commercial")]]}
              onChange={(v) => up((x) => void (x.occupancy = v as WallCapData["occupancy"]))} />
          </div>
          {req.drop !== null && (
            <div className="mt-3">
              {req.required === null ? (
                <Verdict level="green" title={t("wc_noGuardReq")} text={`${t("wc_drop")} ${fmtIn(req.drop)} ≤ ${fmtIn(limits.guardDrop)}`} />
              ) : (
                <Verdict level={guardCheck?.level ?? "yellow"} title={`${t("wc_guardRequired")} ${fmtIn(req.required)}`}
                  text={have === null ? t("wc_guardFromWalk") : `${t("wc_lbl_have")} ${fmtIn(have)} · ${t("wc_guardFromWalk")}`} />
              )}
            </div>
          )}
        </Panel>
      </div>

      {/* ---- Mount ---- */}
      <Panel title={t("wc_mountTitle")}>
        <Seg label={t("wc_mount")} value={w.mount} required={!w.mount} cols={2}
          options={WC_MOUNTS.map((k) => [k, t(`wc_mount_${k}`)] as [string, string])}
          onChange={(v) => up((x) => void (x.mount = v as WallCapData["mount"]))} />
        {w.mount === "core" && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <MInput label={t("wc_coreDia")} value={w.coreDia} gap="wc_core_dia" onChange={(v) => up((x) => void (x.coreDia = v))} />
              {!w.coreDia.trim() && <Chips value={w.coreDia} onPick={(v) => up((x) => void (x.coreDia = v))} options={[['2"', '2"'], ['2 1/2"', '2 1/2"'], ['3"', '3"']]} />}
            </div>
            <div>
              <MInput label={t("wc_coreDepth")} value={w.coreDepth} gap="wc_core_depth" onChange={(v) => up((x) => void (x.coreDepth = v))} />
              {!w.coreDepth.trim() && <Chips value={w.coreDepth} onPick={(v) => up((x) => void (x.coreDepth = v))} options={[['4"', '4"'], ['5"', '5"'], ['6"', '6"']]} />}
            </div>
          </div>
        )}
        {w.mount === "plate" && (
          <div className="mt-3">
            <MInput label={t("wc_plateSize")} placeholder="4x4x3/8" value={w.plateSize} gap="wc_plate" onChange={(v) => up((x) => void (x.plateSize = v))} />
            {!w.plateSize.trim() && <Chips value={w.plateSize} onPick={(v) => up((x) => void (x.plateSize = v))} options={[["4x4x3/8", "4×4×3/8"], ["5x5x1/2", "5×5×1/2"], ["4x6x3/8", "4×6×3/8"]]} />}
          </div>
        )}
        {(w.mount === "side_high" || w.mount === "side_low") && (
          <div className="mt-3">
            <MInput label={t("wc_faceDepth")} value={w.faceDepth} gap="wc_face_depth" onChange={(v) => up((x) => void (x.faceDepth = v))} />
          </div>
        )}
        {cut.length !== null && (
          <div className="mt-3 rounded-xl bg-indigo-50 p-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-semibold uppercase tracking-wider text-indigo-700">{t("wc_postCut")}</span>
              <span className="text-xl font-bold tabular-nums text-indigo-900">{fmtIn(cut.length)}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-1.5 text-[13px] text-slate-600">
              {cut.parts.map((p, i) => <span key={i} className="whitespace-nowrap">{i ? "+ " : ""}{t(`wc_part_${p.key}`)} {fmtIn(p.value)}</span>)}
            </div>
          </div>
        )}
      </Panel>

      {/* ---- Runs & posts ---- */}
      <Panel title={t("wc_runsTitle")} aside={`${w.runs.length}`}>
        <div className="space-y-2.5">
          {w.runs.map((r, i) => (
            <RunCard key={r.id} lang={lang} w={w} r={r} i={i} open={openRun === r.id} focus={focus}
              checks={checks} onToggle={() => setOpenRun(openRun === r.id ? null : r.id)}
              update={(fn) => up((x) => { const rr = x.runs[i]; if (rr && rr.id === r.id) fn(rr); })}
              onRemove={() => up((x) => void (x.runs = x.runs.filter((o) => o.id !== r.id)))}
              onFocus={setFocus}
              markOffset={posts.findIndex((p) => p.run === i)} />
          ))}
        </div>
        <button type="button" onClick={() => { const r = newWallCapRun(1, { turn: "90" }); up((x) => void x.runs.push(structuredClone(r))); setOpenRun(r.id); }}
          className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 text-[15px] font-semibold text-indigo-700">
          + {t("wc_addRun")}
        </button>
        <More lang={lang}>
          <MInput label={t("wc_datum")} placeholder={t("wc_datumPh")} value={w.datum} onChange={(v) => up((x) => void (x.datum = v))} />
        </More>
      </Panel>

      {/* ---- Finish ---- */}
      <Panel title={t("wc_finishTitle")}>
        <Seg label={t("st_finish")} value={w.finish} cols={2}
          options={WC_FINISHES.map((f) => [f, t(`wc_fin_${f}`)] as [string, string])}
          onChange={(v) => up((x) => void (x.finish = v as WallCapData["finish"]))} />
        <div className="mt-3">
          <MInput label={t("st_color")} placeholder="—" value={w.color} onChange={(v) => up((x) => void (x.color = v))} />
        </div>
      </Panel>

      {checks.some((c) => c.level !== "na") && (
        <Panel title={t("st_checksTitle")}>
          <CheckList lang={lang} labels={WC_CHECK_LABELS} checks={checks} collapsePassed />
        </Panel>
      )}

      <Panel>
        <Notes label={t("st_notes")} value={w.notes} onChange={(v) => up((x) => void (x.notes = v))} />
      </Panel>
    </div>
  );
}

function RunCard({ lang, w, r, i, open, focus, checks, onToggle, update, onRemove, onFocus, markOffset }: {
  lang: string; w: WallCapData; r: WallCapRun; i: number; open: boolean; focus: string | null; checks: CheckResult[];
  onToggle: () => void; update: (fn: (r: WallCapRun) => void) => void; onRemove: () => void; onFocus: (m: string) => void; markOffset: number;
}) {
  const t = (k: string) => mt(lang, k);
  const tag = runTag(i);
  const corner = cornerTop(w, i);
  const rise = runRise(r, corner);
  const sloped = runSloped(r, corner);
  const railLen = runRailLength(r, corner);
  const marks = r.posts.map((_, j) => `P${markOffset + j + 1}`);
  const mine = checks.filter((c) => c.detail === tag || marks.some((m) => c.detail === m || (c.detail || "").startsWith(`${m} `)));
  const level: CheckLevel = worst(mine.map((c) => c.level));
  return (
    <div className={`overflow-hidden rounded-2xl border bg-white ${open ? "border-indigo-200 shadow-sm" : "border-slate-200"}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-h-16 w-full items-center gap-3 px-3 py-2.5 text-left">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-[15px] font-bold text-indigo-700">{tag}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-slate-900">
            {r.length.trim() ? fmtLen(parseMeas(r.length)) : "—"}
            {i > 0 && r.turnDir ? <span className="font-medium text-slate-500"> · {r.turn || "—"}° {t(r.turnDir === "left" ? "wc_leftShort" : "wc_rightShort")}</span> : null}
          </span>
          <span className="block truncate text-[13px] text-slate-500">
            {r.posts.length} {t(r.posts.length === 1 ? "wc_post" : "wc_posts")}
            {r.rail ? ` · ${t(`wc_rail_${r.rail}`)}` : sloped ? ` · ${t("wc_decide")}` : ""}
          </span>
        </span>
        <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${DOT[level]}`} />
        <span aria-hidden="true" className={`shrink-0 text-slate-400 transition ${open ? "rotate-90" : ""}`}>›</span>
      </button>
      {open && (
        <div className="space-y-4 border-t border-slate-100 px-3 pb-4 pt-3">
          {i > 0 && (
            <Group title={t("wc_turnTitle")}>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-end gap-3">
                <Seg label={t("wc_turnDir")} value={r.turnDir} required={!r.turnDir}
                  options={[["left", t("wc_left")], ["right", t("wc_right")]]}
                  onChange={(v) => update((x) => void (x.turnDir = v as WallCapRun["turnDir"]))} />
                <MInput label={t("wc_turnAngle")} placeholder="90" value={r.turn} gap="wc_turn" onChange={(v) => update((x) => void (x.turn = v))} />
              </div>
              <Chips value={r.turn} onPick={(v) => update((x) => void (x.turn = v))} options={[["90", "90°"], ["45", "45°"], ["135", "135°"]]} />
            </Group>
          )}
          <MInput label={t("wc_runLength")} value={r.length} gap="wc_run_length" onChange={(v) => update((x) => void (x.length = v))} />

          <Group title={t("wc_postsTitle")} badge={rise ? <span className={`rounded-full border px-2 py-0.5 text-[13px] font-semibold ${sloped ? PILL.yellow : PILL.green}`}>{t("wc_capFalls")} {fmtIn(rise.rise)}</span> : null}>
            <div className="space-y-2">
              {r.posts.map((p, j) => (
                <PostRow key={p.id} lang={lang} w={w} p={p} mark={marks[j]} on={focus === marks[j]} checks={checks.filter((c) => c.detail === marks[j] || (c.detail || "").startsWith(`${marks[j]} `))}
                  onFocus={() => onFocus(marks[j])}
                  update={(fn) => update((x) => { const pp = x.posts[j]; if (pp && pp.id === p.id) fn(pp); })}
                  onRemove={r.posts.length > 1 ? () => update((x) => void (x.posts = x.posts.filter((o) => o.id !== p.id))) : undefined} />
              ))}
            </div>
            <button type="button" onClick={() => update((x) => void x.posts.push(newWallCapPost({ capWidth: x.posts[x.posts.length - 1]?.capWidth || "" })))}
              className="mt-2 min-h-11 rounded-lg px-1 text-[15px] font-semibold text-indigo-700">+ {t("wc_addPost")}</button>
          </Group>

          <div>
            <Seg label={t("wc_railStyle")} value={r.rail} required={sloped && !r.rail}
              options={[["raked", t("wc_rail_raked")], ["stepped", t("wc_rail_stepped")]]}
              onChange={(v) => update((x) => void (x.rail = v as WallCapRun["rail"]))} />
            {sloped && rise && (
              <p className="mt-1 text-[13px] text-slate-500">{t("wc_slopeHint")} {fmtIn(rise.rise)}{railLen !== null && r.rail === "raked" ? ` · ${t("wc_railLength")} ${fmtLen(railLen)}` : ""}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="flex-1" />
            {i > 0 && <button type="button" onClick={() => { if (confirm(t("st_removeConfirm"))) onRemove(); }} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-red-700">{t("st_remove")}</button>}
          </div>
        </div>
      )}
    </div>
  );
}

function PostRow({ lang, w, p, mark, on, checks, update, onRemove, onFocus }: {
  lang: string; w: WallCapData; p: WallCapPost; mark: string; on: boolean; checks: CheckResult[];
  update: (fn: (p: WallCapPost) => void) => void; onRemove?: () => void; onFocus: () => void;
}) {
  const t = (k: string) => mt(lang, k);
  const level = worst(checks.map((c) => c.level));
  const core = w.mount === "core";
  const edgeBad = (v: string) => { const n = parseMeas(v); return core && n !== null && n < WC_TOL.edgeMin; };
  const [more, setMore] = useState(!!(p.at || p.material));
  return (
    <div id={`wc-post-${mark}`} onFocusCapture={onFocus} className={`scroll-mt-24 rounded-xl border p-2.5 ${on ? "border-indigo-300 bg-indigo-50/40" : "border-slate-200"}`}>
      <div className="mb-2 flex items-center gap-2">
        <span className={`flex h-7 min-w-9 items-center justify-center rounded-lg px-1.5 text-[13px] font-bold ${level === "red" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}`}>{mark}</span>
        <span className="flex-1" />
        <button type="button" aria-expanded={more} onClick={() => setMore(!more)} className="min-h-9 rounded-lg px-2 text-[13px] font-semibold text-indigo-700">{t(more ? "wc_positionLess" : "wc_positionMore")}</button>
        {onRemove && <button type="button" aria-label={`${t("st_remove")} ${mark}`} onClick={onRemove} className="size-9 rounded-lg text-lg text-slate-400">×</button>}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <MInput label={t("wc_capWidth")} value={p.capWidth} gap="wc_cap_width" onChange={(v) => update((x) => void (x.capWidth = v))} />
        <MInput label={t("wc_top")} placeholder="+0" value={p.top} gap="wc_top" onChange={(v) => update((x) => void (x.top = v))} />
        {core && (
          <>
            <div className={edgeBad(p.edgeHigh) ? "rounded-lg ring-2 ring-red-400" : ""}>
              <MInput label={`▲ ${t("wc_edgeHigh")}`} value={p.edgeHigh} gap="wc_edges" onChange={(v) => update((x) => void (x.edgeHigh = v))} />
            </div>
            <div className={edgeBad(p.edgeLow) ? "rounded-lg ring-2 ring-red-400" : ""}>
              <MInput label={`▼ ${t("wc_edgeLow")}`} value={p.edgeLow} gap="wc_edges" onChange={(v) => update((x) => void (x.edgeLow = v))} />
            </div>
          </>
        )}
      </div>
      <CheckList lang={lang} labels={WC_CHECK_LABELS} checks={checks} issuesOnly />
      {more && (
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <MInput label={t("wc_at")} placeholder="—" value={p.at} onChange={(v) => update((x) => void (x.at = v))} />
          <label className="block min-w-0">
            <span className="mb-1 block text-[13px] text-neutral-400">{t("wc_material")}</span>
            <select value={p.material} onChange={(e) => update((x) => void (x.material = e.target.value as WallCapPost["material"]))}
              className="min-h-[46px] w-full rounded-lg border border-slate-200 bg-white px-2.5 text-base">
              <option value="">{t("wc_sameAsWall")}</option>
              {WC_MATERIALS.map((m) => <option key={m} value={m}>{t(`wc_mat_${m}`)}</option>)}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
