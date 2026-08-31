"use client";

// Drawn shapes: a top view the measurer sketches, segment by segment, when
// the stair is not any of the shapes the tool knows the name of.

import {
  type MeasureData,
} from "@/lib/shop/measure";
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
  return (
    <>
      {isCustom && data.plan && (
        <Card stage="steps" title={`✏️ ${mt(lang, "drawTitle")}`}>
          <PlanDraw
            plan={data.plan}
            lang={lang}
            onChange={(next) => set((d) => void (d.plan = next))}
          />
          {data.plan.segs.length > 0 && (
            <div className="mt-4">
              <div className="font-bold text-sm mb-2">{mt(lang, "planSegs")}</div>
              <div className="space-y-3">
                {data.plan.segs.map((sg, i) => (
                  <div key={i} className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-3">
                    <div className="mb-2 font-bold text-amber-400">{mt(lang, "segment")} {i + 1}</div>
                    <ChipRow help="segmentType" label={mt(lang, "segmentType")} value={sg.kind || ""}
                      options={(["flight", "landing", "level", "ramp", "curve"] as const).map((kind) => [kind, mt(lang, `segment_${kind}`)])}
                      onChange={(v) => set((d) => void (d.plan!.segs[i].kind = v as typeof sg.kind))} />
                    <div className="mt-3"><Grid>
                      <MInput help="length" label={mt(lang, "length")} value={sg.len}
                        onChange={(v) => set((d) => void (d.plan!.segs[i].len = v))} />
                      <MInput help="width" label={mt(lang, "width")} value={sg.width || ""}
                        onChange={(v) => set((d) => void (d.plan!.segs[i].width = v))} />
                      {sg.kind === "flight" && <>
                        <MInput help="stepsThisFlight" label={mt(lang, "stepsThisFlight")} placeholder="0" value={sg.steps || ""}
                          onChange={(v) => set((d) => {
                            const ps = d.plan!.segs[i];
                            ps.steps = v;
                            const count = Math.max(0, Math.min(60, Number.parseInt(v, 10) || 0));
                            ps.stepMeasures = Array.from({ length: count }, (_, si) =>
                              ps.stepMeasures?.[si] || { rise: "", run: "", nosing: "", levelGap: "" }
                            );
                          })} />
                        <MInput help="typicalRise" label={mt(lang, "typicalRise")} value={sg.rise || ""}
                          onChange={(v) => set((d) => void (d.plan!.segs[i].rise = v))} />
                        <MInput help="typicalRun" label={mt(lang, "typicalRun")} value={sg.run || ""}
                          onChange={(v) => set((d) => void (d.plan!.segs[i].run = v))} />
                      </>}
                      {(sg.kind === "ramp" || sg.kind === "curve") && (
                        <MInput help="segmentRise" label={mt(lang, "segmentRise")} value={sg.rise || ""}
                          onChange={(v) => set((d) => void (d.plan!.segs[i].rise = v))} />
                      )}
                    </Grid></div>
                    {sg.kind === "flight" && (sg.stepMeasures?.length || 0) > 0 && (
                      <details className="mt-3 rounded-lg border border-neutral-800 p-3">
                        <summary className="cursor-pointer text-sm font-bold text-amber-300">{mt(lang, "individualStepCorrections")}</summary>
                        <div className="mt-3">
                          <SmallBtn onClick={() => set((d) => {
                            const ps = d.plan!.segs[i];
                            ps.stepMeasures = ps.stepMeasures.map((st) => ({ ...st, rise: ps.rise, run: ps.run }));
                          })}>⇊ {mt(lang, "fillTypicalAll")}</SmallBtn>
                          <div className="mt-3 space-y-2">
                            {sg.stepMeasures.map((st, si) => (
                              <div key={si} className="grid grid-cols-[2rem_1fr_1fr] items-end gap-2">
                                <span className="pb-3 text-center text-sm font-bold text-neutral-400">{si + 1}</span>
                                <MInput help="rise" label={mt(lang, "rise")} value={st.rise}
                                  onChange={(v) => set((d) => void (d.plan!.segs[i].stepMeasures[si].rise = v))} />
                                <MInput help="run" label={mt(lang, "run")} value={st.run}
                                  onChange={(v) => set((d) => void (d.plan!.segs[i].stepMeasures[si].run = v))} />
                              </div>
                            ))}
                          </div>
                        </div>
                      </details>
                    )}
                    <div className="mt-3">
                      <MInput help="notes" label={mt(lang, "notes")} placeholder="—" value={sg.note}
                        onChange={(v) => set((d) => void (d.plan!.segs[i].note = v))} />
                    </div>
                  </div>
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
