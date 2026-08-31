"use client";

// What the shop needs that the tape does not give it: what it is made of,
// what surface existed on the day, and the site constraints that decide how it
// is fabricated and how it gets in the door.

import {
  type MeasureData,
  type MeasureShape,
  type RoutingSpec,
  type CarryoverKey,
  type FinishSpec,
} from "@/lib/shop/measure";
import {
} from "@/lib/shop/measure-checks";
import { mt } from "@/lib/shop/measure-i18n";
import {
  Card,
  Grid,
  MInput,
  MSelect,
  PresetInput,
  ChipRow,
  ChoiceMInput,
  accessChoices,
} from "../fields";

export default function ShopSections({
  lang,
  data,
  set,
  presets,
  finishOptions,
  colorOptions,
  carriedNote,
  setRouting,
  usesStandardFinish,
  standardFinishLine,
  asksFloorChange,
  hasGuardrail,
  hasFlights,
  multiFlight,
  isSpiral,
  isWallRail,
  isCustom,
  shape,
}: {
  lang: string;
  data: MeasureData;
  set: (fn: (d: MeasureData) => void) => void;
  presets: Record<string, string[]>;
  finishOptions: string[];
  colorOptions: string[];
  carriedNote: (key: CarryoverKey, current: string) => string | undefined;
  setRouting: (fn: (r: RoutingSpec) => void) => void;
  usesStandardFinish: boolean;
  standardFinishLine: string;
  asksFloorChange: boolean;
  hasGuardrail: boolean;
  hasFlights: boolean;
  multiFlight: boolean;
  isSpiral: boolean;
  isWallRail: boolean;
  isCustom: boolean;
  shape: MeasureShape;
}) {
  return (
    <>
      <Card stage="specs" title={mt(lang, "materialsTitle")}>
        <div className="space-y-3">
          {!isWallRail && <PresetInput label={mt(lang, "matPost")} value={data.materials.post}
            presets={presets.post}
            carried={carriedNote("materials.post", data.materials.post)}
            onClearCarried={() => set((d) => void (d.materials.post = ""))}
            onChange={(v) => { set((d) => void (d.materials.post = v)); }} />}
          <PresetInput label={mt(lang, "matTopRail")} value={data.materials.topRail}
            presets={presets.topRail}
            carried={carriedNote("materials.topRail", data.materials.topRail)}
            onClearCarried={() => set((d) => void (d.materials.topRail = ""))}
            onChange={(v) => { set((d) => void (d.materials.topRail = v)); }} />
          {hasGuardrail && <PresetInput label={mt(lang, "matPicket")} value={data.materials.picket}
            presets={presets.picket}
            carried={carriedNote("materials.picket", data.materials.picket)}
            onClearCarried={() => set((d) => void (d.materials.picket = ""))}
            onChange={(v) => { set((d) => void (d.materials.picket = v)); }} />}
          <Grid>
            {hasGuardrail && <>
              <MInput help="matPicketSpacing" label={mt(lang, "matPicketSpacing")} value={data.materials.picketSpacing}
                carried={carriedNote("materials.picketSpacing", data.materials.picketSpacing)}
                onClearCarried={() => set((d) => void (d.materials.picketSpacing = ""))}
                onChange={(v) => { set((d) => void (d.materials.picketSpacing = v)); }} />
              <MSelect help="matBottomRail" label={mt(lang, "matBottomRail")} value={data.materials.bottomRail}
                options={presets.bottomRail} lang={lang}
                carried={carriedNote("materials.bottomRail", data.materials.bottomRail)}
                onClearCarried={() => set((d) => void (d.materials.bottomRail = ""))}
                onChange={(v) => { set((d) => void (d.materials.bottomRail = v)); }} />
            </>}
            {usesStandardFinish ? (
              <div className="sm:col-span-2 flex items-center gap-3 rounded-lg border border-neutral-700 bg-neutral-950/60 p-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] text-neutral-400">{mt(lang, "routingStdFinishIs")}</span>
                  <span className="block truncate text-sm font-bold text-neutral-100">
                    {standardFinishLine || "—"}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setRouting((r) => void (r.standardFinish = "no"))}
                  className="min-h-[48px] shrink-0 rounded-lg border border-neutral-700 bg-neutral-800 px-4 text-sm font-bold text-neutral-300"
                >
                  {mt(lang, "carriedChange")}
                </button>
              </div>
            ) : (
              <>
                <MSelect help="finish" label={mt(lang, "finish")} value={data.materials.finish}
                  options={finishOptions} lang={lang} spec
                  carried={carriedNote("materials.finish", data.materials.finish)}
                  onClearCarried={() => set((d) => void (d.materials.finish = ""))}
                  onChange={(v) => { set((d) => void (d.materials.finish = v)); }} />
                <MSelect help="color" label={mt(lang, "color")} value={data.materials.color}
                  options={colorOptions} lang={lang} spec
                  carried={carriedNote("materials.color", data.materials.color)}
                  onClearCarried={() => set((d) => void (d.materials.color = ""))}
                  onChange={(v) => { set((d) => void (d.materials.color = v)); }} />
              </>
            )}
          </Grid>
          <MInput help="matNotes" label={mt(lang, "matNotes")} placeholder="—" value={data.materials.notes}
            onChange={(v) => set((d) => void (d.materials.notes = v))} />
        </div>
      </Card>

      {/* Site & finish conditions — what surface existed when measured */}
      <Card stage="setup" title={`🧱 ${mt(lang, "finishTitle")}`}>
        {!asksFloorChange && (
          <ChipRow help="floorChangeQuestion"
            label={mt(lang, "floorChangeQuestion")}
            value={data.finish.floorChange}
            options={[
              ["none", mt(lang, "floorChangeNone")],
              ["bottom", mt(lang, "floorChangeBottom")],
              ["top", mt(lang, "floorChangeTop")],
              ["both", mt(lang, "floorChangeBoth")],
            ]}
            onChange={(v) => set((d) => void (d.finish.floorChange = v as FinishSpec["floorChange"]))}
          />
        )}
        <Grid>
          {(data.finish.floorChange === "bottom" || data.finish.floorChange === "both") && (
            <MInput help="bottomAdjustment" label={mt(lang, "bottomAdjustment")} placeholder='+ 3/4"' value={data.finish.bottomAdjustment}
              onChange={(v) => set((d) => void (d.finish.bottomAdjustment = v))} />
          )}
          {(data.finish.floorChange === "top" || data.finish.floorChange === "both") && (
            <MInput help="topAdjustment" label={mt(lang, "topAdjustment")} placeholder='+ 3/4"' value={data.finish.topAdjustment}
              onChange={(v) => set((d) => void (d.finish.topAdjustment = v))} />
          )}
          {(hasFlights || isSpiral) && (
            <MInput help="treadCovering" label={mt(lang, "treadCovering")} placeholder="—" value={data.finish.treadCovering}
              onChange={(v) => set((d) => void (d.finish.treadCovering = v))} />
          )}
          {(isWallRail || data.datums.orientation.includes("wall")) && (
            <MInput help="wallFinish" label={mt(lang, "wallFinish")} placeholder="—" value={data.finish.wallFinish}
              onChange={(v) => set((d) => void (d.finish.wallFinish = v))} />
          )}
          {!asksFloorChange && (
            <ChoiceMInput label={mt(lang, "demoPending")} placeholder="—" value={data.finish.demoPending}
              choices={[["No", mt(lang, "choiceNo")], ["Yes", mt(lang, "choiceYes")]]}
              onChange={(v) => set((d) => void (d.finish.demoPending = v))} />
          )}
        </Grid>
        {((data.finish.floorChange !== "" && data.finish.floorChange !== "none") || data.finish.demoPending === "Yes") && <button
          onClick={() => set((d) => void (d.finish.verifyAfterFinishes = !d.finish.verifyAfterFinishes))}
          className={`mt-3 px-3 py-2.5 rounded-lg border text-sm font-semibold ${
            data.finish.verifyAfterFinishes
              ? "border-amber-500 bg-amber-500/10 text-amber-300"
              : "border-neutral-700 bg-neutral-800 text-neutral-300"
          }`}
        >
          {data.finish.verifyAfterFinishes ? "☑" : "☐"} {mt(lang, "verifyAfterFinishes")}
        </button>}
      </Card>

      {/* Field-observed constraints that determine later fabrication decisions. */}
      <Card stage="specs" title={`🔩 ${mt(lang, "fabTitle")}`}>
        <Grid>
          <ChoiceMInput label={mt(lang, "fabMaxPiece")} placeholder="—" value={data.fab.maxPiece}
            carried={carriedNote("fab.maxPiece", data.fab.maxPiece)}
            onClearCarried={() => set((d) => void (d.fab.maxPiece = ""))}
            choices={[["No restriction", mt(lang, "choiceNoRestriction")]]}
            onChange={(v) => set((d) => void (d.fab.maxPiece = v))} />
          <ChoiceMInput label={mt(lang, "fabAccess")} placeholder="—" value={data.fab.access}
            choices={accessChoices(lang)}
            onChange={(v) => set((d) => void (d.fab.access = v))} />
          {shape === "level_run" && (
            <ChoiceMInput label={mt(lang, "fabGate")} placeholder="—" value={data.fab.gate}
              choices={[["No gate", mt(lang, "choiceNoGate")], ["Gate included", mt(lang, "choiceGateIncluded")]]}
              onChange={(v) => set((d) => void (d.fab.gate = v))} />
          )}
        </Grid>
      </Card>

      {/* Control dimensions — independent measurements the software cross-checks */}
      {!isCustom && hasFlights && (
      <Card stage="locations" title={`🎯 ${mt(lang, "controlsTitle")}`}>
        <div className="text-xs text-neutral-500 mb-3">{mt(lang, "controlsHint")}</div>
        <Grid>
          {!isSpiral && shape !== "level_run" && shape !== "ramp" && (
            <MInput help="floorToFloor" label={mt(lang, "floorToFloor")} value={data.overall.floorToFloor}
              onChange={(v) => set((d) => void (d.overall.floorToFloor = v))} />
          )}
          {!multiFlight && (
            <MInput help="totalRun" label={mt(lang, "totalRun")} value={data.overall.totalRun}
              onChange={(v) => set((d) => void (d.overall.totalRun = v))} />
          )}
          {!isSpiral && !multiFlight && (
            <MInput help="rakeLength" label={mt(lang, "rakeLength")} value={data.overall.rakeLength}
              onChange={(v) => set((d) => void (d.overall.rakeLength = v))} />
          )}
          {!isSpiral && shape !== "level_run" && (
            <>
              <MInput help="widthBottom" label={mt(lang, "widthBottom")} value={data.overall.widthBottom}
                onChange={(v) => set((d) => void (d.overall.widthBottom = v))} />
              <MInput help="widthMid" label={mt(lang, "widthMid")} value={data.overall.widthMid}
                onChange={(v) => set((d) => void (d.overall.widthMid = v))} />
              <MInput help="widthTop" label={mt(lang, "widthTop")} value={data.overall.widthTop}
                onChange={(v) => set((d) => void (d.overall.widthTop = v))} />
            </>
          )}
        </Grid>
        <div className="mt-3">
          <div className="text-[11px] text-neutral-400 mb-1">{mt(lang, "notes")}</div>
          <textarea
            value={data.overall.notes}
            onChange={(e) => set((d) => void (d.overall.notes = e.target.value))}
            rows={3}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-base"
          />
        </div>
      </Card>
      )}

      {/* Custom shape: draw the plan, then dimension every line */}
    </>
  );
}
