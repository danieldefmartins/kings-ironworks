"use client";

// Drawn shapes: a top view the measurer sketches, run by run, when the job is
// not any of the shapes the tool knows the name of — and for decks, whose
// perimeter is rarely a rectangle.
//
// A drawing holds several separate runs (wall to steps, then on past them),
// each dimensioned segment by segment.

import { planPaths, newPlanPost, type MeasureData } from "@/lib/shop/measure";
import { parseMeas } from "@/lib/shop/measure-checks";
import { mt } from "@/lib/shop/measure-i18n";
import {
  Card,
  Grid,
  SmallBtn,
  MInput,
  ChipRow,
} from "../fields";
import PlanDraw from "../PlanDraw";

export default function PlanSection({
  lang,
  data,
  set,
  isCustom,
}: {
  lang: string;
  data: MeasureData;
  set: (fn: (d: MeasureData) => void) => void;
  isCustom: boolean;
}) {
  // Older sheets stored a single run in the legacy fields. Fold them into the
  // multi-run model on first write so edits land in one place.
  function paths(d: MeasureData) {
    if (!d.plan) return [];
    if (!d.plan.paths || !d.plan.paths.length) {
      d.plan.paths = planPaths(d.plan).map((p) => ({ ...p }));
    }
    return d.plan.paths;
  }
  const seg = (pi: number, i: number, fn: (s: NonNullable<MeasureData["plan"]>["segs"][number]) => void) =>
    set((d) => {
      const ps = paths(d)[pi];
      if (ps?.segs[i]) fn(ps.segs[i]);
    });

  const drawn = planPaths(data.plan);
  const anySegs = drawn.some((p) => p.segs.length > 0);

  return (
    <>
      {isCustom && data.plan && (
        <Card stage="steps" title={`✏️ ${mt(lang, "drawTitle")}`}>
          <PlanDraw
            plan={data.plan}
            lang={lang}
            onChange={(next) => set((d) => void (d.plan = next))}
            onPlacePoint={(pathId, segIdx, t) => set((d) => {
              const po = newPlanPost(pathId, segIdx);
              // Seed the distance along the line from where the finger landed,
              // if that line already has a measured length. It is a starting
              // value the measurer corrects, never a measurement.
              const len = parseMeas(planPaths(d.plan).find((r) => r.id === pathId)?.segs[segIdx]?.len);
              if (len !== null) po.pos = String(Math.round(len * t * 4) / 4);
              d.posts.push(po);
            })}
          />
          {anySegs && (
            <div className="mt-4">
              <div className="font-bold text-sm mb-2">{mt(lang, "planSegs")}</div>
              <div className="space-y-5">
                {drawn.map((path, pi) => (
                  path.segs.length === 0 ? null : (
                  <div key={path.id}>
                    {drawn.length > 1 && (
                      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-400">
                        {path.label ? path.label : `${mt(lang, "runLbl")} ${pi + 1}`}
                        {path.closed ? ` · ${mt(lang, "closedShort")}` : ""}
                      </div>
                    )}
                    <div className="space-y-3">
                      {path.segs.map((sg, i) => (
                        <div key={i} className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-3">
                          <div className="mb-2 font-bold text-amber-400">{mt(lang, "segment")} {i + 1}</div>
                          <ChipRow help="segmentType" label={mt(lang, "segmentType")} value={sg.kind || ""}
                            options={(["flight", "landing", "level", "ramp", "curve"] as const).map((kind) => [kind, mt(lang, `segment_${kind}`)])}
                            onChange={(v) => seg(pi, i, (s) => void (s.kind = v as typeof sg.kind))} />
                          <div className="mt-3"><Grid>
                            <MInput gap="plan_lengths" help="length" label={mt(lang, "length")} value={sg.len}
                              onChange={(v) => seg(pi, i, (s) => void (s.len = v))} />
                            <MInput gap="-" help="width" label={mt(lang, "width")} value={sg.width || ""}
                              onChange={(v) => seg(pi, i, (s) => void (s.width = v))} />
                            {sg.kind === "flight" && <>
                              <MInput help="stepsThisFlight" label={mt(lang, "stepsThisFlight")} placeholder="0" value={sg.steps || ""}
                                onChange={(v) => seg(pi, i, (s) => {
                                  s.steps = v;
                                  const count = Math.max(0, Math.min(60, Number.parseInt(v, 10) || 0));
                                  s.stepMeasures = Array.from({ length: count }, (_, si) =>
                                    s.stepMeasures?.[si] || { rise: "", run: "", nosing: "", levelGap: "" }
                                  );
                                })} />
                              <MInput help="typicalRise" label={mt(lang, "typicalRise")} value={sg.rise || ""}
                                onChange={(v) => seg(pi, i, (s) => void (s.rise = v))} />
                              <MInput help="typicalRun" label={mt(lang, "typicalRun")} value={sg.run || ""}
                                onChange={(v) => seg(pi, i, (s) => void (s.run = v))} />
                            </>}
                            {(sg.kind === "ramp" || sg.kind === "curve") && (
                              <MInput help="segmentRise" label={mt(lang, "segmentRise")} value={sg.rise || ""}
                                onChange={(v) => seg(pi, i, (s) => void (s.rise = v))} />
                            )}
                          </Grid></div>
                          {sg.kind === "flight" && (sg.stepMeasures?.length || 0) > 0 && (
                            <details className="mt-3 rounded-lg border border-neutral-800 p-3">
                              <summary className="cursor-pointer text-sm font-bold text-amber-300">{mt(lang, "individualStepCorrections")}</summary>
                              <div className="mt-3">
                                <SmallBtn onClick={() => seg(pi, i, (s) => {
                                  s.stepMeasures = s.stepMeasures.map((st) => ({ ...st, rise: s.rise, run: s.run }));
                                })}>⇊ {mt(lang, "fillTypicalAll")}</SmallBtn>
                                <div className="mt-3 space-y-2">
                                  {sg.stepMeasures.map((st, si) => (
                                    <div key={si} className="grid grid-cols-[2rem_1fr_1fr] items-end gap-2">
                                      <span className="pb-3 text-center text-sm font-bold text-neutral-400">{si + 1}</span>
                                      <MInput gap="plan_flights" help="rise" label={mt(lang, "rise")} value={st.rise}
                                        onChange={(v) => seg(pi, i, (s) => void (s.stepMeasures[si].rise = v))} />
                                      <MInput gap="plan_flights" help="run" label={mt(lang, "run")} value={st.run}
                                        onChange={(v) => seg(pi, i, (s) => void (s.stepMeasures[si].run = v))} />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </details>
                          )}
                          <div className="mt-3">
                            <MInput help="notes" label={mt(lang, "notes")} placeholder="—" value={sg.note}
                              onChange={(v) => seg(pi, i, (s) => void (s.note = v))} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  )
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Photo checklist — required evidence, slot by slot */}
    </>
  );
}
