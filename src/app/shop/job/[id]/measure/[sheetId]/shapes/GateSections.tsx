"use client";

// A gate is measured as an opening, not as a run: the two widths, the
// hinge-side height and the ground clearance are what the leaf is cut to.

import { type GateData } from "@/lib/shop/measure";
import { mt } from "@/lib/shop/measure-i18n";
import { Card, ChipRow, Grid, MInput, MSelect } from "../fields";

export default function GateSections({
  lang,
  gate,
  setGate,
}: {
  lang: string;
  gate: GateData;
  setGate: (fn: (g: GateData) => void) => void;
}) {
  return (
    <>
    <Card stage="setup" title={`🚪 ${mt(lang, "gateTitle")}`}>
      <p className="mb-3 text-xs text-neutral-400">{mt(lang, "gateHint")}</p>
      <Grid>
        <MSelect help="gateUse" label={mt(lang, "gateUse")} value={gate.use} lang={lang}
          options={["driveway", "walk", "service", "pool"]}
          labels={Object.fromEntries(["driveway", "walk", "service", "pool"].map((k) => [k, mt(lang, `gateU_${k}`)]))}
          onChange={(v) => setGate((g) => void (g.use = v as GateData["use"]))} />
        <MSelect help="gateOperation" label={mt(lang, "gateOperation")} value={gate.operation} lang={lang}
          options={["single_swing", "double_swing", "slide", "bifold"]}
          labels={Object.fromEntries(["single_swing", "double_swing", "slide", "bifold"].map((k) => [k, mt(lang, `gateO_${k}`)]))}
          onChange={(v) => setGate((g) => void (g.operation = v as GateData["operation"]))} />
        <MInput help="gateWidthTop" label={mt(lang, "gateWidthTop")} value={gate.widthTop}
          onChange={(v) => setGate((g) => void (g.widthTop = v))} />
        <MInput help="gateWidthBottom" label={mt(lang, "gateWidthBottom")} value={gate.widthBottom}
          onChange={(v) => setGate((g) => void (g.widthBottom = v))} />
        <MInput help="gateHeightHinge" label={mt(lang, "gateHeightHinge")} value={gate.heightHinge}
          onChange={(v) => setGate((g) => void (g.heightHinge = v))} />
        <MInput help="gateHeightLatch" label={mt(lang, "gateHeightLatch")} placeholder="—" value={gate.heightLatch}
          onChange={(v) => setGate((g) => void (g.heightLatch = v))} />
        <MInput help="gateDiagA" label={mt(lang, "gateDiagA")} placeholder="—" value={gate.diagA}
          onChange={(v) => setGate((g) => void (g.diagA = v))} />
        <MInput help="gateDiagB" label={mt(lang, "gateDiagB")} placeholder="—" value={gate.diagB}
          onChange={(v) => setGate((g) => void (g.diagB = v))} />
      </Grid>

      <div className="mt-4 mb-2 text-sm font-bold text-neutral-300">{mt(lang, "gateGroundTitle")}</div>
      <p className="mb-2 text-xs text-neutral-400">{mt(lang, "gateGroundHint")}</p>
      <Grid>
        <MInput help="gateGroundClearance" label={mt(lang, "gateGroundClearance")} value={gate.groundClearance}
          onChange={(v) => setGate((g) => void (g.groundClearance = v))} />
        <MInput help="gateGradeRise" label={mt(lang, "gateGradeRise")} value={gate.gradeRise}
          onChange={(v) => setGate((g) => void (g.gradeRise = v))} />
        <MInput help="gateSurface" label={mt(lang, "gateSurface")} value={gate.surface}
          onChange={(v) => setGate((g) => void (g.surface = v))} />
        <ChipRow help="gateSwingDir" label={mt(lang, "gateSwingDir")} value={gate.swingDir}
          options={[["in", mt(lang, "gateSwingIn")], ["out", mt(lang, "gateSwingOut")], ["both", mt(lang, "gateSwingBoth")]]}
          onChange={(v) => setGate((g) => void (g.swingDir = v as GateData["swingDir"]))} />
        <ChipRow help="gateHingeSide" label={mt(lang, "gateHingeSide")} value={gate.hingeSide}
          options={[["left", mt(lang, "leftLookingUp")], ["right", mt(lang, "rightLookingUp")]]}
          onChange={(v) => setGate((g) => void (g.hingeSide = v as GateData["hingeSide"]))} />
      </Grid>
    </Card>

    <Card stage="specs" title={`🔧 ${mt(lang, "gatePostsHardware")}`}>
      <label className="mb-3 flex items-center gap-2 text-sm text-neutral-300">
        <input type="checkbox" checked={gate.postsExisting}
          onChange={(e) => setGate((g) => void (g.postsExisting = e.target.checked))}
          className="h-5 w-5 accent-amber-500" />
        {mt(lang, "gatePostsExisting")}
      </label>
      <Grid>
        <MInput help="gatePostSize" label={mt(lang, "gatePostSize")} value={gate.postSize}
          onChange={(v) => setGate((g) => void (g.postSize = v))} />
        <MInput help="gatePostMaterial" label={mt(lang, "gatePostMaterial")} placeholder="—" value={gate.postMaterial}
          onChange={(v) => setGate((g) => void (g.postMaterial = v))} />
        <MInput help="gateFooting" label={mt(lang, "gateFooting")} value={gate.footingDepth}
          onChange={(v) => setGate((g) => void (g.footingDepth = v))} />
        <MInput help="gateInfill" label={mt(lang, "gateInfill")} value={gate.infill}
          onChange={(v) => setGate((g) => void (g.infill = v))} />
        <MInput help="gatePicketSpacing" label={mt(lang, "gatePicketSpacing")} placeholder="—" value={gate.picketSpacing}
          onChange={(v) => setGate((g) => void (g.picketSpacing = v))} />
        <MInput help="gateHinges" label={mt(lang, "gateHinges")} value={gate.hinges}
          onChange={(v) => setGate((g) => void (g.hinges = v))} />
        <MInput help="gateLatch" label={mt(lang, "gateLatch")} value={gate.latch}
          onChange={(v) => setGate((g) => void (g.latch = v))} />
        <MInput help="gateDropRod" label={mt(lang, "gateDropRod")} placeholder="—" value={gate.dropRod}
          onChange={(v) => setGate((g) => void (g.dropRod = v))} />
      </Grid>
      <label className="mt-4 mb-3 flex items-center gap-2 text-sm text-neutral-300">
        <input type="checkbox" checked={gate.automated}
          onChange={(e) => setGate((g) => void (g.automated = e.target.checked))}
          className="h-5 w-5 accent-amber-500" />
        {mt(lang, "gateAutomated")}
      </label>
      {gate.automated && (
        <Grid>
          <MInput help="gateOpener" label={mt(lang, "gateOpener")} value={gate.opener}
            onChange={(v) => setGate((g) => void (g.opener = v))} />
          <ChipRow help="gatePower" label={mt(lang, "gatePower")} value={gate.powerAtGate}
            options={[["yes", mt(lang, "fireOp_yes")], ["no", mt(lang, "gateNo")], ["unknown", mt(lang, "gateUnknown")]]}
            onChange={(v) => setGate((g) => void (g.powerAtGate = v as GateData["powerAtGate"]))} />
          <MInput help="gateSafety" label={mt(lang, "gateSafety")} value={gate.safetyDevices}
            onChange={(v) => setGate((g) => void (g.safetyDevices = v))} />
        </Grid>
      )}
    </Card>
    </>
  );
}
