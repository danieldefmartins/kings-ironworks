"use client";

// A fence is a run broken into segments, each with its own length and
// height because the grade rarely cooperates.

import {
  newFenceSegment,
  type FenceData,
  type FenceSegment,
} from "@/lib/shop/measure";
import { mt } from "@/lib/shop/measure-i18n";
import { Card, ChipRow, Grid, MInput } from "../fields";

export default function FenceSections({
  lang,
  fence,
  setFence,
  setSeg,
}: {
  lang: string;
  fence: FenceData;
  setFence: (fn: (f: FenceData) => void) => void;
  setSeg: (id: string, fn: (sg: FenceSegment) => void) => void;
}) {
  return (
    <>
    <Card stage="setup" title={`🚧 ${mt(lang, "fenceTitle")}`}>
      <p className="mb-3 text-xs text-neutral-400">{mt(lang, "fenceHint")}</p>
      <Grid>
        <MInput help="fenceTotalRun" label={mt(lang, "fenceTotalRun")} value={fence.totalRun}
          onChange={(v) => setFence((f) => void (f.totalRun = v))} />
        <MInput help="fenceHeight" label={mt(lang, "fenceHeight")} value={fence.height}
          onChange={(v) => setFence((f) => void (f.height = v))} />
        <MInput help="fencePanelWidth" label={mt(lang, "fencePanelWidth")} placeholder="—" value={fence.panelWidth}
          onChange={(v) => setFence((f) => void (f.panelWidth = v))} />
        <MInput help="fencePostSpacing" label={mt(lang, "fencePostSpacing")} value={fence.postSpacing}
          onChange={(v) => setFence((f) => void (f.postSpacing = v))} />
        <MInput help="fencePostSize" label={mt(lang, "fencePostSize")} value={fence.postSize}
          onChange={(v) => setFence((f) => void (f.postSize = v))} />
        <MInput help="fenceFooting" label={mt(lang, "fenceFooting")} value={fence.footingDepth}
          onChange={(v) => setFence((f) => void (f.footingDepth = v))} />
        <MInput help="fencePicketSpacing" label={mt(lang, "fencePicketSpacing")} placeholder="—" value={fence.picketSpacing}
          onChange={(v) => setFence((f) => void (f.picketSpacing = v))} />
        <MInput help="fenceGates" label={mt(lang, "fenceGates")} placeholder="—" value={fence.gates}
          onChange={(v) => setFence((f) => void (f.gates = v))} />
        <MInput help="fenceStartTerm" label={mt(lang, "fenceStartTerm")} value={fence.startTerm}
          onChange={(v) => setFence((f) => void (f.startTerm = v))} />
        <MInput help="fenceEndTerm" label={mt(lang, "fenceEndTerm")} value={fence.endTerm}
          onChange={(v) => setFence((f) => void (f.endTerm = v))} />
        <MInput help="fenceUtilities" label={mt(lang, "fenceUtilities")} value={fence.utilities}
          onChange={(v) => setFence((f) => void (f.utilities = v))} />
      </Grid>
    </Card>

    {fence.segments.map((sg, i) => (
      <Card key={sg.id} stage="steps" title={`${mt(lang, "fenceSegment")} ${sg.label || i + 1}`}>
        <div className="mb-3 flex items-center gap-2">
          <input value={sg.label} onChange={(e) => setSeg(sg.id, (x) => void (x.label = e.target.value))}
            placeholder={mt(lang, "fenceSegLabel")}
            className="w-40 rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-2 text-base" />
          {fence.segments.length > 1 && (
            <button type="button"
              onClick={() => setFence((f) => void (f.segments = f.segments.filter((x) => x.id !== sg.id)))}
              className="ml-auto rounded-full border border-red-900 px-2.5 py-1 text-xs text-red-400">
              ✕ {mt(lang, "removePost")}
            </button>
          )}
        </div>
        <Grid>
          <MInput help="fenceSegLength" label={mt(lang, "fenceSegLength")} value={sg.length}
            onChange={(v) => setSeg(sg.id, (x) => void (x.length = v))} />
          <MInput help="fenceSegPanels" label={mt(lang, "fenceSegPanels")} placeholder="—" value={sg.panels}
            onChange={(v) => setSeg(sg.id, (x) => void (x.panels = v))} />
          <MInput help="fenceSegHeight" label={mt(lang, "fenceSegHeight")} placeholder="—" value={sg.height}
            onChange={(v) => setSeg(sg.id, (x) => void (x.height = v))} />
          <MInput help="fenceSegTurn" label={mt(lang, "fenceSegTurn")} placeholder="°" value={sg.turnDeg}
            onChange={(v) => setSeg(sg.id, (x) => void (x.turnDeg = v))} />
          <MInput help="fenceSegGrade" label={mt(lang, "fenceSegGrade")} placeholder="—" value={sg.gradeChange}
            onChange={(v) => setSeg(sg.id, (x) => void (x.gradeChange = v))} />
          <ChipRow help="fenceSegFollows" label={mt(lang, "fenceSegFollows")} value={sg.followsGrade}
            options={[["racked", mt(lang, "fenceRacked")], ["stepped", mt(lang, "fenceStepped")]]}
            onChange={(v) => setSeg(sg.id, (x) => void (x.followsGrade = v as FenceSegment["followsGrade"]))} />
          <MInput help="fenceSegObstruction" label={mt(lang, "fenceSegObstruction")} placeholder="—" value={sg.obstruction}
            onChange={(v) => setSeg(sg.id, (x) => void (x.obstruction = v))} />
        </Grid>
      </Card>
    ))}

    <Card stage="steps" title={mt(lang, "fenceMoreTitle")}>
      <button type="button"
        onClick={() => setFence((f) => void f.segments.push(newFenceSegment(String(f.segments.length + 1))))}
        className="w-full rounded-xl border border-amber-600 bg-amber-500/10 py-3 font-bold text-amber-300">
        + {mt(lang, "fenceAddSegment")}
      </button>
    </Card>
    </>
  );
}
