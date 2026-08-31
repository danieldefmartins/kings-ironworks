"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Job } from "@/lib/shop/shared";
import {
  MEASURE_SHAPES,
  MEASURE_PRESETS,
  TWO_FLIGHT_SHAPES,
  sheetProgress,
  type MeasureShape,
  type MeasurePreset,
  type MeasureSheet,
} from "@/lib/shop/measure";
import { mt, shapeLabel } from "@/lib/shop/measure-i18n";
import { requiredGaps } from "@/lib/shop/measure-checks";
import ShapeIcon from "./ShapeIcon";

export default function MeasureListClient({
  job,
  sheets,
  lang,
  nameById,
}: {
  job: Job;
  sheets: MeasureSheet[];
  lang: string;
  nameById: Record<string, string>;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [shape, setShape] = useState<MeasureShape | null>(null);
  const [preset, setPreset] = useState<MeasurePreset | null>(null);
  const [steps1, setSteps1] = useState(5);
  const [steps2, setSteps2] = useState(5);
  const [steps3, setSteps3] = useState(5);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const twoFlights = shape ? TWO_FLIGHT_SHAPES.includes(shape) : false;
  const needsSteps = shape !== "level_run" && shape !== "ramp" && shape !== "custom" && shape !== "window_well";

  async function create() {
    if (!shape) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/shop/api/measure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "create",
          jobId: job.id,
          shape,
          preset,
          steps1,
          steps2: twoFlights || preset === "three_flight" || preset === "bifurcated" ? steps2 : 0,
          steps3: preset === "three_flight" || preset === "bifurcated" ? steps3 : 0,
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
    <div className="p-4 max-w-4xl mx-auto pb-24">
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
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-6">
          <div className="font-bold mb-3">{mt(lang, "chooseShape")}</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {MEASURE_SHAPES.map((s) => (
              <button
                key={s}
                onClick={() => { setShape(s); setPreset(null); }}
                className={`rounded-xl border p-3 flex flex-col items-center gap-2 text-xs font-semibold text-center ${
                  shape === s
                    ? "border-amber-500 bg-amber-500/10 text-amber-300"
                    : "border-neutral-700 bg-neutral-800/60 text-neutral-300"
                }`}
              >
                <ShapeIcon shape={s} />
                {shapeLabel(lang, s)}
              </button>
            ))}
          </div>

          <div className="font-bold mb-2 mt-5">{mt(lang, "commonSpecialLayouts")}</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {MEASURE_PRESETS.map((p) => {
              const presetShape: MeasureShape = p === "winder_l" ? "l_shape" : p === "winder_u" ? "u_shape" : "builder";
              return (
                <button
                  key={p}
                  onClick={() => {
                    setPreset(p);
                    setShape(presetShape);
                    setName(mt(lang, `preset_${p}`));
                  }}
                  className={`rounded-xl border p-3 flex flex-col items-center gap-2 text-xs font-semibold text-center ${
                    preset === p
                      ? "border-amber-500 bg-amber-500/10 text-amber-300"
                      : "border-neutral-700 bg-neutral-800/60 text-neutral-300"
                  }`}
                >
                  <ShapeIcon shape={presetShape} preset={p} />
                  {mt(lang, `preset_${p}`)}
                </button>
              );
            })}
          </div>

          {shape && needsSteps && (
            <div className="flex flex-wrap gap-4 mb-4">
              <Stepper
                label={
                  preset === "three_flight" || preset === "bifurcated" || shape === "builder"
                    ? mt(lang, "stepsFlight1")
                    : shape === "fire_escape"
                    ? mt(lang, "fireStories")
                    : shape === "spiral"
                    ? mt(lang, "treadsCount")
                    : twoFlights
                      ? mt(lang, "stepsFlight1")
                      : mt(lang, "treadsCount")
                }
                value={steps1}
                onChange={setSteps1}
              />
              {twoFlights && (
                <Stepper label={mt(lang, "stepsFlight2")} value={steps2} onChange={setSteps2} />
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
              disabled={!shape || busy}
              className="flex-1 bg-amber-500 text-black font-bold rounded-xl py-3 disabled:opacity-40"
            >
              {busy ? "…" : mt(lang, "create")}
            </button>
            <button
              onClick={() => {
                setCreating(false);
                setShape(null);
                setPreset(null);
              }}
              className="px-5 rounded-xl border border-neutral-700 text-neutral-300"
            >
              {mt(lang, "cancel")}
            </button>
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
          const prog = sheetProgress(s.data);
          const missing = requiredGaps(s.data, s.shape).length;
          const pct = missing === 0
            ? 100
            : prog.total
              ? Math.round((prog.filled / (prog.total + missing)) * 100)
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
                <span className="text-xs text-neutral-400 block">
                  {shapeLabel(lang, s.shape)} · {prog.filled}/{prog.total}{" "}
                  {mt(lang, "filled")}
                  {missing > 0 ? ` · ${missing} ${mt(lang, "stageMissing")}` : ` · ${mt(lang, "stageComplete")}`}
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
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="text-xs text-neutral-400 mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(1, value - 1))}
          className="w-11 h-11 rounded-lg bg-neutral-800 border border-neutral-700 text-xl font-bold"
        >
          −
        </button>
        <span className="w-10 text-center text-xl font-bold">{value}</span>
        <button
          onClick={() => onChange(Math.min(40, value + 1))}
          className="w-11 h-11 rounded-lg bg-neutral-800 border border-neutral-700 text-xl font-bold"
        >
          +
        </button>
      </div>
    </div>
  );
}
