"use client";

// A fire escape sheet is two jobs wearing one name: a condition survey of
// something already hanging on the wall, or a new structure to build. The
// purpose answer decides which questions are even meaningful.

import {
  FIRE_PURPOSES,
  newFireLevel,
  type FireEscapeData,
  type FireLevel,
} from "@/lib/shop/measure";
import { mt } from "@/lib/shop/measure-i18n";
import { Card, ChipRow, ConditionFields, Grid, MInput, MSelect } from "../fields";

export default function FireEscapeSections({
  lang,
  fire,
  firePurpose,
  fireSurvey,
  setFire,
  setLevel,
}: {
  lang: string;
  fire: FireEscapeData;
  firePurpose: string;
  fireSurvey: boolean;
  setFire: (fn: (f: FireEscapeData) => void) => void;
  setLevel: (id: string, fn: (l: FireLevel) => void) => void;
}) {
  return (
    <>
    <Card stage="setup" title={`🧯 ${mt(lang, "fireTitle")}`}>
      <p className="mb-3 text-xs text-neutral-400">{mt(lang, "fireHint")}</p>
      <div className="mb-4">
        <div className="mb-2 text-sm font-bold text-neutral-300">{mt(lang, "firePurpose")}</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {FIRE_PURPOSES.map((k) => (
            <button key={k} type="button"
              onClick={() => setFire((f) => void (f.purpose = k))}
              className={`rounded-xl border p-3 text-left ${firePurpose === k ? "border-amber-500 bg-amber-500/10 text-amber-300" : "border-neutral-700 bg-neutral-800 text-neutral-400"}`}>
              <div className="text-sm font-bold">{mt(lang, `fireP_${k}`)}</div>
              <div className="mt-0.5 text-[11px] opacity-80">{mt(lang, `firePd_${k}`)}</div>
            </button>
          ))}
        </div>
      </div>
      <Grid>
        <MInput help="fireStories" label={mt(lang, "fireStories")} value={fire.stories}
          onChange={(v) => setFire((f) => void (f.stories = v))} />
        <MInput help="fireWallMaterial" label={mt(lang, "fireWallMaterial")} value={fire.wallMaterial}
          onChange={(v) => setFire((f) => void (f.wallMaterial = v))} />
        <MInput help="fireTotalHeight" label={mt(lang, "fireTotalHeight")} value={fire.totalHeight}
          onChange={(v) => setFire((f) => void (f.totalHeight = v))} />
        <MInput help="fireAccess" label={mt(lang, "fireAccess")} placeholder="—" value={fire.access}
          onChange={(v) => setFire((f) => void (f.access = v))} />
      </Grid>
      {fire.purpose === "repair" && (
        <div className="mt-3">
          <MInput help="fireViolations" label={mt(lang, "fireViolations")} value={fire.violations}
            onChange={(v) => setFire((f) => void (f.violations = v))} />
        </div>
      )}
    </Card>

    {fire.levels.map((l, i) => {
      const lowest = i === fire.levels.length - 1;
      return (
        <Card key={l.id} stage="steps" title={`${mt(lang, "fireLevel")} ${l.label || i + 1}`}>
          <div className="mb-3 flex items-center gap-2">
            <input value={l.label} onChange={(e) => setLevel(l.id, (x) => void (x.label = e.target.value))}
              placeholder={mt(lang, "fireLevelLabel")}
              className="w-40 rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-2 text-base" />
            {fire.levels.length > 1 && (
              <button type="button"
                onClick={() => setFire((f) => void (f.levels = f.levels.filter((x) => x.id !== l.id)))}
                className="ml-auto rounded-full border border-red-900 px-2.5 py-1 text-xs text-red-400">
                ✕ {mt(lang, "removePost")}
              </button>
            )}
          </div>
          <Grid>
            <MInput help="firePlatLength" label={mt(lang, "firePlatLength")} value={l.platLength}
              onChange={(v) => setLevel(l.id, (x) => void (x.platLength = v))} />
            <MInput help="firePlatWidth" label={mt(lang, "firePlatWidth")} value={l.platWidth}
              onChange={(v) => setLevel(l.id, (x) => void (x.platWidth = v))} />
            <MInput help="fireHeightGrade" label={mt(lang, "fireHeightGrade")} value={l.heightAboveGrade}
              onChange={(v) => setLevel(l.id, (x) => void (x.heightAboveGrade = v))} />
            {!lowest && (
              <MInput help="fireFloorToFloor" label={mt(lang, "fireFloorToFloor")} value={l.floorToFloor}
                onChange={(v) => setLevel(l.id, (x) => void (x.floorToFloor = v))} />
            )}
            <MInput help="fireDeck" label={mt(lang, "fireDeck")} value={l.deck}
              onChange={(v) => setLevel(l.id, (x) => void (x.deck = v))} />
            <ChipRow help="fireOpening" label={mt(lang, "fireOpening")} value={l.openingType}
              options={[["window", mt(lang, "feWindow")], ["door", mt(lang, "feDoor")]]}
              onChange={(v) => setLevel(l.id, (x) => void (x.openingType = v as FireLevel["openingType"]))} />
            <MInput help="fireOpeningW" label={mt(lang, "fireOpeningW")} placeholder="—" value={l.openingW}
              onChange={(v) => setLevel(l.id, (x) => void (x.openingW = v))} />
            <MInput help="fireSillToPlatform" label={mt(lang, "fireSillToPlatform")} placeholder="—" value={l.sillToPlatform}
              onChange={(v) => setLevel(l.id, (x) => void (x.sillToPlatform = v))} />
            <MInput help="fireGuardHeight" label={mt(lang, "fireGuardHeight")} value={l.guardHeight}
              onChange={(v) => setLevel(l.id, (x) => void (x.guardHeight = v))} />
            <MInput help="firePicketSpacing" label={mt(lang, "firePicketSpacing")} value={l.picketSpacing}
              onChange={(v) => setLevel(l.id, (x) => void (x.picketSpacing = v))} />
          </Grid>

          {!lowest && (
            <>
              <div className="mt-4 mb-2 text-sm font-bold text-neutral-300">{mt(lang, "fireStairDown")}</div>
              <Grid>
                <MInput help="fireStairRisers" label={mt(lang, "fireStairRisers")} value={l.stairRisers}
                  onChange={(v) => setLevel(l.id, (x) => void (x.stairRisers = v))} />
                <MInput help="fireStairRise" label={mt(lang, "fireStairRise")} value={l.stairRise}
                  onChange={(v) => setLevel(l.id, (x) => void (x.stairRise = v))} />
                <MInput help="fireStairRun" label={mt(lang, "fireStairRun")} value={l.stairRun}
                  onChange={(v) => setLevel(l.id, (x) => void (x.stairRun = v))} />
                <MInput help="fireStairWidth" label={mt(lang, "fireStairWidth")} value={l.stairWidth}
                  onChange={(v) => setLevel(l.id, (x) => void (x.stairWidth = v))} />
                <MInput help="fireStairAngle" label={mt(lang, "fireStairAngle")} placeholder="°" value={l.stairAngle}
                  onChange={(v) => setLevel(l.id, (x) => void (x.stairAngle = v))} />
              </Grid>
            </>
          )}

          <div className="mt-4 mb-2 text-sm font-bold text-neutral-300">{mt(lang, "fireAnchorage")}</div>
          <Grid>
            <MInput help="fireAnchorType" label={mt(lang, "fireAnchorType")} value={l.anchorType}
              onChange={(v) => setLevel(l.id, (x) => void (x.anchorType = v))} />
            <MInput help="fireAnchorCount" label={mt(lang, "fireAnchorCount")} value={l.anchorCount}
              onChange={(v) => setLevel(l.id, (x) => void (x.anchorCount = v))} />
            <MInput help="fireAnchorSpacing" label={mt(lang, "fireAnchorSpacing")} placeholder="—" value={l.anchorSpacing}
              onChange={(v) => setLevel(l.id, (x) => void (x.anchorSpacing = v))} />
          </Grid>

          {fireSurvey && (
            <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/60 p-3">
              <div className="mb-2 text-sm font-bold text-neutral-300">{mt(lang, "fireConditionTitle")}</div>
              <ConditionFields lang={lang} c={l.condition}
                onField={(k, v) => setLevel(l.id, (x) => void ((x.condition as unknown as Record<string, string>)[k] = v))} />
            </div>
          )}
        </Card>
      );
    })}

    <Card stage="steps" title={mt(lang, "fireAddLevelTitle")}>
      <button type="button"
        onClick={() => setFire((f) => void f.levels.push(newFireLevel(String(f.levels.length + 1))))}
        className="w-full rounded-xl border border-amber-600 bg-amber-500/10 py-3 font-bold text-amber-300">
        + {mt(lang, "fireAddLevel")}
      </button>
    </Card>

    <Card stage="specs" title={`🪜 ${mt(lang, "fireLadderTitle")}`}>
      <label className="mb-3 flex items-center gap-2 text-sm text-neutral-300">
        <input type="checkbox" checked={fire.ladder.present}
          onChange={(e) => setFire((f) => void (f.ladder.present = e.target.checked))}
          className="h-5 w-5 accent-amber-500" />
        {mt(lang, "fireLadderPresent")}
      </label>
      {fire.ladder.present && (
        <>
          <Grid>
            <MSelect help="fireLadderType" label={mt(lang, "fireLadderType")} value={fire.ladder.type} lang={lang}
              options={["drop", "swing", "counterbalance", "fixed"]}
              labels={Object.fromEntries(["drop", "swing", "counterbalance", "fixed"].map((k) => [k, mt(lang, `fireLT_${k}`)]))}
              onChange={(v) => setFire((f) => void (f.ladder.type = v as never))} />
            <MInput help="fireLadderLength" label={mt(lang, "fireLadderLength")} value={fire.ladder.length}
              onChange={(v) => setFire((f) => void (f.ladder.length = v))} />
            <MInput help="fireLadderWidth" label={mt(lang, "fireLadderWidth")} value={fire.ladder.width}
              onChange={(v) => setFire((f) => void (f.ladder.width = v))} />
            <MInput help="fireLadderRung" label={mt(lang, "fireLadderRung")} value={fire.ladder.rungSpacing}
              onChange={(v) => setFire((f) => void (f.ladder.rungSpacing = v))} />
            <MInput help="fireStowed" label={mt(lang, "fireStowed")} value={fire.ladder.stowedAboveGrade}
              onChange={(v) => setFire((f) => void (f.ladder.stowedAboveGrade = v))} />
            <MInput help="fireDeployed" label={mt(lang, "fireDeployed")} value={fire.ladder.deployedAboveGrade}
              onChange={(v) => setFire((f) => void (f.ladder.deployedAboveGrade = v))} />
            <MInput help="fireLandingSurface" label={mt(lang, "fireLandingSurface")} value={fire.ladder.landingSurface}
              onChange={(v) => setFire((f) => void (f.ladder.landingSurface = v))} />
            <MInput help="fireObstructions" label={mt(lang, "fireObstructions")} placeholder="—" value={fire.ladder.obstructions}
              onChange={(v) => setFire((f) => void (f.ladder.obstructions = v))} />
          </Grid>
          {fireSurvey && (
            <div className="mt-3">
              <ChipRow help="fireLadderOperates" label={mt(lang, "fireLadderOperates")} value={fire.ladder.operates}
                options={[["yes", mt(lang, "fireOp_yes")], ["stiff", mt(lang, "fireOp_stiff")], ["seized", mt(lang, "fireOp_seized")]]}
                onChange={(v) => setFire((f) => void (f.ladder.operates = v as never))} />
            </div>
          )}
        </>
      )}
    </Card>

    {fireSurvey && (
      <Card stage="review" title={`📋 ${mt(lang, "fireOverallTitle")}`}>
        <ConditionFields lang={lang} c={fire.overall}
          onField={(k, v) => setFire((f) => void ((f.overall as unknown as Record<string, string>)[k] = v))} />
        <div className="mt-3">
          <Grid>
            <MInput help="fireLoadTest" label={mt(lang, "fireLoadTest")} value={fire.loadTest}
              onChange={(v) => setFire((f) => void (f.loadTest = v))} />
            <MInput help="firePaintSystem" label={mt(lang, "firePaintSystem")} placeholder="—" value={fire.paintSystem}
              onChange={(v) => setFire((f) => void (f.paintSystem = v))} />
          </Grid>
        </div>
      </Card>
    )}
    </>
  );
}
