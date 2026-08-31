"use client";

// A window well is a clearance argument. The wall profile and its setbacks
// decide where a post is allowed to sit; the solver in here says so in
// inches rather than leaving it to be discovered in the field.

import {
  WELL_DELIVERABLES,
  newWallBand,
  type WellData,
  type WellDeliverable,
  type WallBand,
} from "@/lib/shop/measure";
import { formatIn, type WellClearance } from "@/lib/shop/measure-checks";
import { mt } from "@/lib/shop/measure-i18n";
import { Card, ChipRow, Grid, MInput, MSelect } from "../fields";

export default function WellSections({
  lang,
  well,
  clearance,
  setWell,
  toggleDeliverable,
  setBand,
  wellWants,
}: {
  lang: string;
  well: WellData;
  clearance: WellClearance | null;
  setWell: (fn: (w: WellData) => void) => void;
  toggleDeliverable: (k: WellDeliverable) => void;
  setBand: (id: string, key: keyof WallBand, value: string) => void;
  wellWants: (k: WellDeliverable) => boolean;
}) {
  return (
    <>
    <Card stage="setup" title={`🪟 ${mt(lang, "wellTitle")}`}>
      <p className="mb-3 text-xs text-neutral-400">{mt(lang, "wellHint")}</p>
      <div className="mb-4">
        <div className="mb-2 text-sm font-bold text-neutral-300">{mt(lang, "wellDeliverables")}</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {WELL_DELIVERABLES.map((k) => {
            const on = well.deliverables.includes(k);
            return (
              <button key={k} type="button" onClick={() => toggleDeliverable(k)}
                className={`rounded-xl border p-3 text-sm font-bold ${on ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-neutral-700 bg-neutral-800 text-neutral-400"}`}>
                {on ? "✓ " : ""}{mt(lang, `wellD_${k}`)}
              </button>
            );
          })}
        </div>
      </div>
      <Grid>
        <MSelect help="wellConstruction" label={mt(lang, "wellConstruction")} value={well.construction} lang={lang}
          options={["poured_concrete", "block", "corrugated", "stone", "timber"]}
          labels={Object.fromEntries(["poured_concrete", "block", "corrugated", "stone", "timber"].map((k) => [k, mt(lang, `wellC_${k}`)]))}
          onChange={(v) => setWell((w) => void (w.construction = v as WellData["construction"]))} />
        <MInput help="wellLengthAtHouse" label={mt(lang, "wellLengthAtHouse")} value={well.lengthAtHouse}
          onChange={(v) => setWell((w) => void (w.lengthAtHouse = v))} />
        <MInput help="wellProjection" label={mt(lang, "wellProjection")} value={well.projection}
          onChange={(v) => setWell((w) => void (w.projection = v))} />
        <MInput help="wellWallThickness" label={mt(lang, "wellWallThickness")} value={well.wallThickness}
          onChange={(v) => setWell((w) => void (w.wallThickness = v))} />
        <MInput help="wellInsideLength" label={mt(lang, "wellInsideLength")} value={well.insideLength}
          onChange={(v) => setWell((w) => void (w.insideLength = v))} />
        <MInput help="wellInsideProjection" label={mt(lang, "wellInsideProjection")} value={well.insideProjection}
          onChange={(v) => setWell((w) => void (w.insideProjection = v))} />
        <MInput help="wellDepth" label={mt(lang, "wellDepth")} value={well.depth}
          onChange={(v) => setWell((w) => void (w.depth = v))} />
        <MInput help="wellTopToGrade" label={mt(lang, "wellTopToGrade")} placeholder="—" value={well.topToGrade}
          onChange={(v) => setWell((w) => void (w.topToGrade = v))} />
        <MInput help="wellDiagA" label={mt(lang, "wellDiagA")} value={well.diagA}
          onChange={(v) => setWell((w) => void (w.diagA = v))} />
        <MInput help="wellDiagB" label={mt(lang, "wellDiagB")} value={well.diagB}
          onChange={(v) => setWell((w) => void (w.diagB = v))} />
      </Grid>
      <div className="mt-4 mb-2 text-sm font-bold text-neutral-300">{mt(lang, "wellWindowTitle")}</div>
      <Grid>
        <MInput help="wellWindowW" label={mt(lang, "wellWindowW")} value={well.windowW}
          onChange={(v) => setWell((w) => void (w.windowW = v))} />
        <MInput help="wellWindowH" label={mt(lang, "wellWindowH")} value={well.windowH}
          onChange={(v) => setWell((w) => void (w.windowH = v))} />
        <MInput help="wellSillToFloor" label={mt(lang, "wellSillToFloor")} value={well.sillToFloor}
          onChange={(v) => setWell((w) => void (w.sillToFloor = v))} />
        <MSelect help="wellWindowSwing" label={mt(lang, "wellWindowSwing")} value={well.windowSwing} lang={lang}
          options={["in", "out", "slider", "fixed"]}
          labels={{ in: mt(lang, "wellSwingIn"), out: mt(lang, "wellSwingOut"), slider: mt(lang, "wellSlider"), fixed: mt(lang, "wellFixed") }}
          onChange={(v) => setWell((w) => void (w.windowSwing = v as WellData["windowSwing"]))} />
      </Grid>
    </Card>

    {wellWants("guard") && (
      <Card stage="locations" title={`📐 ${mt(lang, "wellWallTitle")}`}>
        <p className="mb-3 text-xs text-neutral-400">{mt(lang, "wellWallHint")}</p>
        <Grid>
          <MInput help="wellWallRef" label={mt(lang, "wellWallRef")} value={well.wallRef}
            onChange={(v) => setWell((w) => void (w.wallRef = v))} />
          <MInput help="wellMaxSphere" label={mt(lang, "wellMaxSphere")} value={well.maxSphere}
            onChange={(v) => setWell((w) => void (w.maxSphere = v))} />
        </Grid>

        <div className="mt-4 mb-2 flex items-center">
          <span className="text-sm font-bold text-neutral-300">{mt(lang, "wellBands")}</span>
          <button type="button"
            onClick={() => setWell((w) => void w.bands.push(newWallBand()))}
            className="ml-auto rounded-full border border-amber-600 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300">
            + {mt(lang, "wellAddBand")}
          </button>
        </div>
        {well.bands.length === 0 && (
          <p className="mb-3 text-sm text-neutral-500">{mt(lang, "wellNoBands")}</p>
        )}
        <div className="space-y-3">
          {well.bands.map((b, i) => (
            <div key={b.id} className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3">
              <div className="mb-2 flex items-center">
                <span className="font-bold text-amber-400">{mt(lang, "wellBand")} {i + 1}</span>
                <button type="button"
                  onClick={() => setWell((w) => void (w.bands = w.bands.filter((x) => x.id !== b.id)))}
                  className="ml-auto rounded-full border border-red-900 px-2.5 py-1 text-xs text-red-400">
                  ✕ {mt(lang, "removePost")}
                </button>
              </div>
              <Grid>
                <MInput help="wellBandLabel" label={mt(lang, "wellBandLabel")} value={b.label}
                  onChange={(v) => setBand(b.id, "label", v)} />
                <MInput help="wellBandSetback" label={mt(lang, "wellBandSetback")} value={b.setback}
                  onChange={(v) => setBand(b.id, "setback", v)} />
                <MInput help="wellBandFrom" label={mt(lang, "wellBandFrom")} placeholder="—" value={b.fromTop}
                  onChange={(v) => setBand(b.id, "fromTop", v)} />
                <MInput help="wellBandTo" label={mt(lang, "wellBandTo")} placeholder="—" value={b.toTop}
                  onChange={(v) => setBand(b.id, "toTop", v)} />
              </Grid>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <MInput help="wellPostToWall" label={mt(lang, "wellPostToWall")} value={well.postToWall}
            onChange={(v) => setWell((w) => void (w.postToWall = v))} />
        </div>

        {/* The answer: where the post is allowed to sit. */}
        {clearance && (
          <div className={`mt-4 rounded-xl border p-4 ${clearance.impossible || (clearance.worst !== null && clearance.worst > clearance.sphere) ? "border-red-700 bg-red-950/40" : "border-green-700 bg-green-950/30"}`}>
            <div className="text-sm font-bold text-neutral-200">{mt(lang, "wellSolverTitle")}</div>
            {clearance.impossible ? (
              <p className="mt-2 text-sm text-red-300">{mt(lang, "wellSolverImpossible")}</p>
            ) : (
              <>
                <p className="mt-2 text-2xl font-black text-amber-300">
                  {formatIn(clearance.allowed)}
                </p>
                <p className="text-xs text-neutral-400">
                  {mt(lang, "wellSolverMax")} {well.wallRef || mt(lang, "wellProudFace")}
                </p>
                <p className="mt-2 text-xs text-neutral-400">
                  {formatIn(clearance.sphere)} − {formatIn(clearance.maxSetback)} ({clearance.deepest || "—"})
                </p>
                {clearance.worst !== null && (
                  <p className={`mt-2 text-sm font-bold ${clearance.worst > clearance.sphere ? "text-red-300" : "text-green-300"}`}>
                    {clearance.worst > clearance.sphere ? "✗" : "✓"} {mt(lang, "wellSolverActual")} {formatIn(clearance.worst)} {mt(lang, "wellAt")} {clearance.deepest || "—"}
                  </p>
                )}
              </>
            )}
          </div>
        )}
        <Grid>
          <MInput help="wellGuardHeight" label={mt(lang, "wellGuardHeight")} value={well.guardHeight}
            onChange={(v) => setWell((w) => void (w.guardHeight = v))} />
        </Grid>
      </Card>
    )}

    {(wellWants("gate") || wellWants("ladder") || wellWants("grate")) && (
      <Card stage="specs" title={`🔧 ${mt(lang, "wellPartsTitle")}`}>
        {wellWants("gate") && (
          <div className="mb-4">
            <div className="mb-2 text-sm font-bold text-neutral-300">{mt(lang, "wellD_gate")}</div>
            <Grid>
              <MInput help="wellGateWidth" label={mt(lang, "wellGateWidth")} value={well.gateWidth}
                onChange={(v) => setWell((w) => void (w.gateWidth = v))} />
              <ChipRow help="wellGateSwing" label={mt(lang, "wellGateSwing")} value={well.gateSwing}
                options={[["in", mt(lang, "wellSwingIn")], ["out", mt(lang, "wellSwingOut")]]}
                onChange={(v) => setWell((w) => void (w.gateSwing = v as WellData["gateSwing"]))} />
              <ChipRow help="wellGateHinge" label={mt(lang, "wellGateHinge")} value={well.gateHinge}
                options={[["left", mt(lang, "leftLookingUp")], ["right", mt(lang, "rightLookingUp")]]}
                onChange={(v) => setWell((w) => void (w.gateHinge = v as WellData["gateHinge"]))} />
              <MInput help="wellGateLatch" label={mt(lang, "wellGateLatch")} placeholder="—" value={well.gateLatch}
                onChange={(v) => setWell((w) => void (w.gateLatch = v))} />
            </Grid>
          </div>
        )}
        {wellWants("ladder") && (
          <div className="mb-4">
            <div className="mb-2 text-sm font-bold text-neutral-300">{mt(lang, "wellD_ladder")}</div>
            <Grid>
              <MInput help="wellLadderWidth" label={mt(lang, "wellLadderWidth")} value={well.ladderWidth}
                onChange={(v) => setWell((w) => void (w.ladderWidth = v))} />
              <MInput help="wellLadderRungs" label={mt(lang, "wellLadderRungs")} value={well.ladderRungs}
                onChange={(v) => setWell((w) => void (w.ladderRungs = v))} />
              <MInput help="wellLadderSpacing" label={mt(lang, "wellLadderSpacing")} value={well.ladderSpacing}
                onChange={(v) => setWell((w) => void (w.ladderSpacing = v))} />
              <MInput help="wellLadderStandoff" label={mt(lang, "wellLadderStandoff")} value={well.ladderStandoff}
                onChange={(v) => setWell((w) => void (w.ladderStandoff = v))} />
              <MInput help="wellLadderTopExt" label={mt(lang, "wellLadderTopExt")} placeholder="—" value={well.ladderTopExt}
                onChange={(v) => setWell((w) => void (w.ladderTopExt = v))} />
            </Grid>
          </div>
        )}
        {wellWants("grate") && (
          <div>
            <div className="mb-2 text-sm font-bold text-neutral-300">{mt(lang, "wellD_grate")}</div>
            <Grid>
              <MSelect help="wellGrateBearing" label={mt(lang, "wellGrateBearing")} value={well.grateBearing} lang={lang}
                options={["surface", "recessed", "angle_frame"]}
                labels={Object.fromEntries(["surface", "recessed", "angle_frame"].map((k) => [k, mt(lang, `wellGB_${k}`)]))}
                onChange={(v) => setWell((w) => void (w.grateBearing = v as WellData["grateBearing"]))} />
              <MInput help="wellGrateInfill" label={mt(lang, "wellGrateInfill")} value={well.grateInfill}
                onChange={(v) => setWell((w) => void (w.grateInfill = v))} />
              <MInput help="wellGrateLoad" label={mt(lang, "wellGrateLoad")} value={well.grateLoad}
                onChange={(v) => setWell((w) => void (w.grateLoad = v))} />
            </Grid>
            <label className="mt-3 flex items-center gap-2 text-sm text-neutral-300">
              <input type="checkbox" checked={well.grateHinged}
                onChange={(e) => setWell((w) => void (w.grateHinged = e.target.checked))}
                className="h-5 w-5 accent-amber-500" />
              {mt(lang, "wellGrateHinged")}
            </label>
          </div>
        )}
      </Card>
    )}
    </>
  );
}
