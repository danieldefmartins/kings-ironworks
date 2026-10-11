"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Job } from "@/lib/shop/shared";
import {
  newMeasureData,
  MEASURE_PRESETS,
  TWO_FLIGHT_SHAPES,
  sheetProgress,
  type FlightSegment,
  type MeasureShape,
  type MeasurePreset,
  type MeasureSheet,
} from "@/lib/shop/measure";
import { mt, shapeLabel } from "@/lib/shop/measure-i18n";
import { sheetReadiness, flightGaps, type Tolerances } from "@/lib/shop/measure-checks";
import ShapeIcon from "./ShapeIcon";
import SceneStart from "./[sheetId]/SceneStart";
import {sceneProjectShape,type SceneSetup} from "@/lib/shop/measure-scene-setup";

export default function MeasureListClient({
  job,
  sheets,
  lang,
  nameById,
  tolerances,
}: {
  job: Job;
  sheets: MeasureSheet[];
  lang: string;
  nameById: Record<string, string>;
  tolerances?: Tolerances;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [sceneDraft,setSceneDraft]=useState<ReturnType<typeof newMeasureData>&{sceneSetup?:SceneSetup}>(()=>newMeasureData('custom',1));
  const [shape, setShape] = useState<MeasureShape | null>(null);
  const tx=(en:string,pt:string,es:string)=>lang==='pt'?pt:lang==='es'?es:en;
  const [specialLayoutsOpen,setSpecialLayoutsOpen]=useState(false);
  const layoutClass=(selected:boolean)=>`rounded-lg border p-3 flex flex-col items-center gap-2 text-xs font-semibold text-center ${selected?'border-amber-500 bg-amber-500/10 text-amber-300':'border-neutral-700 bg-neutral-800/60 text-neutral-300'}`;
  const [preset, setPreset] = useState<MeasurePreset | null>(null);
  const [steps1, setSteps1] = useState(5);
  const [steps2, setSteps2] = useState(5);
  const [flightCount, setFlightCount] = useState(2);
  const [steps3, setSteps3] = useState(5);
  const [endsOnPlatform, setEndsOnPlatform] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const twoFlights = shape ? TWO_FLIGHT_SHAPES.includes(shape) : false;
  // Multi-flight starts with one flight and grows on site, so asking for a
  // step count up front asks about a stair nobody has walked yet. The first
  // flight's steps are set in the sheet like every other flight's.
  const isMulti = preset === "multi_flight";
  const needsSteps = shape !== "level_run" && shape !== "ramp" && shape !== "custom" && shape !== "window_well" && shape !== "gate" && shape !== "balcony" && shape !== "opening" && shape !== "structural";

  async function create() {
    if (!shape || !sceneDraft.sceneSetup?.environment || !sceneDraft.sceneSetup?.projectType) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/shop/api/measure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "create",
          sceneSetup: sceneDraft.sceneSetup,
          jobId: job.id,
          shape,
          preset,
          steps1,
          steps2: isMulti ? flightCount : twoFlights || preset === "three_flight" || preset === "bifurcated" ? steps2 : 0,
          steps3: preset === "three_flight" || preset === "bifurcated" ? steps3 : 0,
          endsOnPlatform: isMulti ? endsOnPlatform : false,
          name,
        }),
      });
      const d = await res.json();
      if (!res.ok || !d.id) {
        setErr(d.error || "Failed");
      } else {
        router.push(`/shop/job/${job.id}/measure/${d.id}`);
      }
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-measure-ui className="p-4 max-w-4xl mx-auto pb-24">
      <h1 className="text-2xl font-display font-bold mb-1">📐 {mt(lang, "fieldMeasure")}</h1>
      <div className="text-sm text-neutral-400 mb-4">{job.address || job.job_number}</div>

      {err && (
        <div className="text-red-400 bg-red-950/40 border border-red-800 rounded-lg p-3 mb-4 text-sm">
          {err}
        </div>
      )}

      {/* New sheet */}
      {!creating ? (
        <button
          onClick={() => setCreating(true)}
          className="w-full bg-amber-500 text-black font-bold rounded-xl py-4 text-lg mb-6 active:scale-[0.99]"
        >
          + {mt(lang, "newSheet")}
        </button>
      ) : (
        <div className="mb-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <SceneStart data={sceneDraft} set={fn=>setSceneDraft(old=>{const next=structuredClone(old);fn(next);return next;})} lang={lang} onProjectChange={project=>{if(project!==sceneDraft.sceneSetup?.projectType){setShape(sceneProjectShape(project));setPreset(null);}}}/>
          {sceneDraft.sceneSetup?.projectType==='stairs'&&<>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">{tx('Stair layout','Formato da escada','Forma de escalera')}</div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {(['straight','stair_platform'] as const).map(sh=><button key={sh} type="button" aria-pressed={!preset&&shape===sh} onClick={()=>{setPreset(null);setShape(sh);}} className={layoutClass(!preset&&shape===sh)}><span aria-hidden="true"><ShapeIcon shape={sh} size={32}/></span>{shapeLabel(lang,sh)}</button>)}
            <button type="button" aria-pressed={isMulti} onClick={()=>{setPreset('multi_flight');setShape('builder');}} className={layoutClass(isMulti)}><span aria-hidden="true"><ShapeIcon shape="builder" preset="multi_flight" size={32}/></span>{tx('Multi-flight','Vários lances','Varios tramos')}</button>
          </div>
          <details className="mb-4" open={specialLayoutsOpen||!!(preset&&!isMulti)} onToggle={e=>setSpecialLayoutsOpen(e.currentTarget.open)}>
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-neutral-400">{mt(lang, "commonSpecialLayouts")}</summary>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
            {MEASURE_PRESETS.filter(p=>p!=='multi_flight').map((p) => {
              const presetShape: MeasureShape = p === "winder_l" ? "l_shape" : p === "winder_u" ? "u_shape" : "builder";
              return (
                <button
                  key={p}
                  aria-pressed={preset===p}
                  onClick={() => {
                    setPreset(p);
                    setShape(presetShape);
                  }}
                  className={`rounded-xl border p-3 flex flex-col items-center gap-2 text-xs font-semibold text-center ${
                    preset === p
                      ? "border-amber-500 bg-amber-500/10 text-amber-300"
                      : "border-neutral-700 bg-neutral-800/60 text-neutral-300"
                  }`}
                >
                  <span aria-hidden="true"><ShapeIcon shape={presetShape} preset={p} size={32}/></span>
                  {mt(lang, `preset_${p}`)}
                </button>
              );
            })}
          </div>
          </details>
          </>}
          {shape && needsSteps && (
            <div className="mb-4 rounded-lg border border-neutral-700 p-3">
              <div className="mb-3 text-sm font-semibold text-neutral-300">{sceneDraft.sceneSetup?.projectType==='stairs'?tx('Treads & flights','Degraus e lances','Peldaños y tramos'):tx('Counts','Quantidades','Cantidades')}</div>
            <div className="flex flex-wrap gap-4">
              <Stepper
                label={
                  isMulti || preset === "three_flight" || preset === "bifurcated" || shape === "builder"
                    ? mt(lang, "stepsFlight1")
                    : shape === "fire_escape"
                    ? mt(lang, "fireStories")
                    : shape === "fence"
                    ? mt(lang, "fenceSegment")
                    : shape === "deck"
                    ? mt(lang, "deckSideCount")
                    : shape === "spiral"
                    ? mt(lang, "treadsCount")
                    : twoFlights
                      ? mt(lang, "stepsFlight1")
                      : mt(lang, "treadsCount")
                }
                value={steps1}
                onChange={setSteps1}
              />
              {twoFlights && !isMulti && (
                <Stepper label={mt(lang, "stepsFlight2")} value={steps2} onChange={setSteps2} />
              )}
              {isMulti && (
                <>
                  <Stepper label={mt(lang, "howManyFlights")} value={flightCount} onChange={setFlightCount} min={2} max={8} />
                  {/* Usually you arrive on the finished floor, which is not
                      ours to guard. But a stair can land on a balcony or a top
                      landing that is. */}
                  <button
                    type="button"
                    onClick={() => setEndsOnPlatform((v) => !v)}
                    className={`min-h-[48px] self-end rounded-xl border px-4 text-left text-xs font-semibold ${
                      endsOnPlatform
                        ? "border-amber-500 bg-amber-500/10 text-amber-300"
                        : "border-neutral-700 bg-neutral-800 text-neutral-300"
                    }`}
                  >
                    <span className="block">{mt(lang, "endsOnPlatform")}</span>
                  </button>
                </>
              )}
              {preset === "three_flight" && (
                <>
                  <Stepper label={mt(lang, "stepsFlight2")} value={steps2} onChange={setSteps2} />
                  <Stepper label={mt(lang, "stepsFlight3")} value={steps3} onChange={setSteps3} />
                </>
              )}
              {preset === "bifurcated" && (
                <>
                  <Stepper label={mt(lang, "stepsLeftBranch")} value={steps2} onChange={setSteps2} />
                  <Stepper label={mt(lang, "stepsRightBranch")} value={steps3} onChange={setSteps3} />
                </>
              )}
            </div>
              {sceneDraft.sceneSetup?.projectType==='stairs'&&<div className="mt-3 text-xs text-neutral-400">
                {isMulti
                  ? `${flightCount} ${mt(lang, "countsFlights")} · ${steps1} ${mt(lang, "countsSteps")} ${mt(lang, "ofWord")} ${mt(lang, "flight")} 1`
                  : preset === "three_flight" || preset === "bifurcated"
                    ? `${steps1} + ${steps2} + ${steps3} ${mt(lang, "countsSteps")}`
                    : twoFlights
                      ? `${steps1} + ${steps2} ${mt(lang, "countsSteps")} · 2 ${mt(lang, "countsFlights")}`
                      : `${steps1} ${mt(lang, "countsSteps")}`}
              </div>}
            </div>
          )}

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`${mt(lang, "sheetName")} — ${mt(lang, "sheetNameHint")}`}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-3 text-sm mb-4"
          />

          <div className="flex gap-2">
            <button
              onClick={create}
              disabled={!shape || !sceneDraft.sceneSetup?.environment || !sceneDraft.sceneSetup?.projectType || busy}
              className="flex-1 bg-amber-500 text-black font-bold rounded-xl py-3 disabled:opacity-40"
            >
              {busy ? "…" : mt(lang, "create")}
            </button>
            <button
              onClick={() => {
                setCreating(false);
              }}
              className="px-5 rounded-xl border border-neutral-700 text-neutral-300"
            >
              {mt(lang, "cancel")}
            </button>
          </div>
        </div>
        </div>
      )}

      {/* Existing sheets */}
      <h2 className="font-bold text-lg mb-2">{mt(lang, "measureSheets")}</h2>
      {sheets.length === 0 && (
        <div className="text-neutral-500 text-sm">{mt(lang, "noSheets")}</div>
      )}
      <div className="space-y-3">
        {sheets.map((s) => {
          // Same readiness model as the editor — the list must not report a
          // different answer from the sheet it opens.
          const r = sheetReadiness(s.data, s.shape, tolerances);
          const prog = sheetProgress(s.data);
          // A multi-flight stair says how many flights are done right here, so
          // "come back tomorrow and finish flight 3" survives the walk to the
          // truck. Without it the list shows one bar for a stair that is two
          // thirds unmeasured.
          const fls = s.data.segments.filter((sg) => sg.kind === "flight") as FlightSegment[];
          const flightsLeft =
            fls.length > 1
              ? fls.filter((f, i) => flightGaps(f, i, { needRake: true, multi: true }).length > 0)
                  .length
              : 0;
          const pct = r.ready
            ? 100
            : prog.total
              ? Math.round((prog.filled / (prog.total + r.remaining)) * 100)
              : 0;
          return (
            <button
              key={s.id}
              onClick={() => router.push(`/shop/job/${job.id}/measure/${s.id}`)}
              className="w-full text-left bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center gap-4 active:bg-neutral-800"
            >
              <span className="text-amber-400 shrink-0">
                <ShapeIcon shape={s.shape} size={36} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="font-bold block truncate">
                  {s.name || shapeLabel(lang, s.shape)}
                </span>
                {fls.length > 1 && (
                  <span
                    className={`mt-0.5 block text-xs font-bold ${
                      flightsLeft > 0 ? "text-amber-300" : "text-green-400"
                    }`}
                  >
                    {flightsLeft > 0
                      ? `⚠ ${fls.length - flightsLeft}/${fls.length} ${mt(lang, "flightsMeasured")}`
                      : `✓ ${mt(lang, "allFlightsDone")}`}
                  </span>
                )}
                <span className="text-xs text-neutral-400 block">
                  {shapeLabel(lang, s.shape)}
                  {r.remaining > 0
                    ? ` · ${r.remaining} ${mt(lang, r.remaining === 1 ? "itemLeft" : "itemsLeft")}`
                    : ` · ${mt(lang, r.complete ? "stageDone" : "readyForShop")}`}
                  {r.docRemaining > 0 ? ` · ${r.docRemaining} ${mt(lang, "stageToAdd")}` : ""}
                  {s.updated_by && nameById[s.updated_by]
                    ? ` · ${mt(lang, "by")} ${nameById[s.updated_by]}`
                    : ""}
                </span>
                <span className="block mt-2 h-1.5 rounded bg-neutral-800 overflow-hidden">
                  <span
                    className="block h-full bg-amber-500"
                    style={{ width: `${pct}%` }}
                  />
                </span>
              </span>
              {s.status === "approved" ? (
                <span className="text-[10px] font-bold bg-green-600/20 border border-green-500 text-green-300 rounded-full px-2 py-1 shrink-0">
                  ✓ {mt(lang, "approvedBadge")} · {mt(lang, "revLabel")} {s.current_rev || 0}
                </span>
              ) : s.status === "submitted" ? (
                <span className="text-[10px] font-bold bg-amber-500/10 border border-amber-500 text-amber-300 rounded-full px-2 py-1 shrink-0">
                  {mt(lang, "submittedBadge")}
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-neutral-800 border border-neutral-700 text-neutral-400 rounded-full px-2 py-1 shrink-0">
                  {s.review_comment ? "📝 " : ""}
                  {mt(lang, "inProgress")}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  onChange,
  min = 1,
  max = 40,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div role="group" aria-label={label}>
      <div className="mb-1 text-xs font-bold text-neutral-300">{label}</div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label="−"
          className="h-12 w-12 rounded-lg border border-neutral-600 bg-neutral-800 text-2xl font-bold"
        >
          −
        </button>
        <span className="w-12 text-center text-3xl font-bold tabular-nums">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label="+"
          className="h-12 w-12 rounded-lg border border-neutral-600 bg-neutral-800 text-2xl font-bold"
        >
          +
        </button>
      </div>
    </div>
  );
}
