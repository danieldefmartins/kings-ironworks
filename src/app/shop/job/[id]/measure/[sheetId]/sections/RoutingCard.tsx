"use client";

// The few answers that decide which questions the rest of the sheet needs to
// ask at all, and the measurement references that depend on them. Asked first,
// on their own, because the alternative is listing every condition that could
// possibly exist before knowing whether any of them does.

import {
  RAIL_KIND_OPTIONS,
  type MeasureData,
  type RoutingSpec,
  type FinishSpec,
  type DatumsSpec,
} from "@/lib/shop/measure";
import { mt, optLabel } from "@/lib/shop/measure-i18n";
import {
  Card,
  ChipRow,
} from "../fields";

export default function RoutingCard({
  lang,
  data,
  set,
  routing,
  setRouting,
  asksOrientation,
  asksRailKind,
  asksExisting,
  asksFloorChange,
  asksStdFinish,
  routingAnswered,
  routingTotal,
  routingDone,
  routingOpen,
  setRoutingOpen,
  setupLocked,
  setSetupUnlocked,
  showRoutingCard,
  routingSummary,
  standardFinishLine,
  usesStandardFinish,
  hasFlights,
  needsPostReference,
}: {
  lang: string;
  data: MeasureData;
  set: (fn: (d: MeasureData) => void) => void;
  routing: RoutingSpec;
  setRouting: (fn: (r: RoutingSpec) => void) => void;
  asksOrientation: boolean;
  asksRailKind: boolean;
  asksExisting: boolean;
  asksFloorChange: boolean;
  asksStdFinish: boolean;
  routingAnswered: number;
  routingTotal: number;
  routingDone: boolean;
  routingOpen: boolean;
  setRoutingOpen: (v: boolean) => void;
  setupLocked: boolean;
  setSetupUnlocked: (v: boolean) => void;
  showRoutingCard: boolean;
  routingSummary: string[];
  standardFinishLine: string;
  usesStandardFinish: boolean;
  hasFlights: boolean;
  needsPostReference: boolean;
}) {
  return (
    <>
      {showRoutingCard ? (
        <Card stage="setup" always title={`🧭 ${mt(lang, "routingTitle")}`}>
          <p className="mb-3 text-xs text-neutral-400">{mt(lang, "routingHint")}</p>
          <div className="space-y-4">
            <ChipRow
              label={mt(lang, "routingSetting")}
              value={routing.setting}
              options={[
                ["interior", mt(lang, "routingInterior")],
                ["exterior", mt(lang, "routingExterior")],
              ]}
              onChange={(v) => setRouting((r) => void (r.setting = v as typeof r.setting))}
            />
            {asksRailKind && (
              <ChipRow
                help="railKind"
                label={mt(lang, "railKind")}
                value={data.rail.kind}
                options={RAIL_KIND_OPTIONS.map((o) => [o, optLabel(lang, o)] as [string, string])}
                onChange={(v) => set((d) => void (d.rail.kind = v))}
              />
            )}
            {asksOrientation && (
              <ChipRow
                help="orientation"
                label={mt(lang, "orientationLbl")}
                value={data.datums.orientation}
                options={[
                  ["left_wall", mt(lang, "orient_left_wall")],
                  ["right_wall", mt(lang, "orient_right_wall")],
                  ["both_wall", mt(lang, "orient_both_wall")],
                  ["both_open", mt(lang, "orient_both_open")],
                ]}
                onChange={(v) => set((d) => void (d.datums.orientation = v as DatumsSpec["orientation"]))}
              />
            )}
            {asksExisting && (
              <ChipRow
                label={mt(lang, "routingExisting")}
                value={routing.existing}
                options={[
                  ["none", mt(lang, "routingExistingNone")],
                  ["posts", mt(lang, "routingExistingPosts")],
                  ["columns", mt(lang, "routingExistingColumns")],
                  ["both", mt(lang, "routingExistingBoth")],
                ]}
                onChange={(v) => setRouting((r) => void (r.existing = v as typeof r.existing))}
              />
            )}
            {asksFloorChange && (
              <>
                <ChipRow
                  help="floorChangeQuestion"
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
                <ChipRow
                  label={mt(lang, "demoPending")}
                  value={data.finish.demoPending}
                  options={[["No", mt(lang, "choiceNo")], ["Yes", mt(lang, "choiceYes")]]}
                  onChange={(v) => set((d) => void (d.finish.demoPending = v))}
                />
              </>
            )}
            {asksStdFinish && (
              <div>
                <ChipRow
                  label={mt(lang, "routingStdFinish")}
                  value={routing.standardFinish}
                  options={[
                    ["yes", mt(lang, "routingStdYes")],
                    ["no", mt(lang, "routingStdNo")],
                  ]}
                  onChange={(v) => setRouting((r) => void (r.standardFinish = v as typeof r.standardFinish))}
                />
                {usesStandardFinish && standardFinishLine && (
                  <div className="mt-1.5 text-xs text-neutral-400">
                    {mt(lang, "routingStdFinishIs")}: <span className="text-neutral-200">{standardFinishLine}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          {setupLocked && (
            <div className="mt-4 border-t border-neutral-800 pt-3">
              <div className="text-xs text-neutral-400">
                {routingAnswered}/{routingTotal} · {mt(lang, "routingRemaining")}
              </div>
              <button
                type="button"
                onClick={() => setSetupUnlocked(true)}
                className="mt-2 min-h-[48px] rounded-lg border border-neutral-700 bg-neutral-800 px-4 text-sm font-bold text-neutral-300"
              >
                {mt(lang, "routingShowAll")}
              </button>
            </div>
          )}
          {routingDone && routingOpen && (
            <button
              type="button"
              onClick={() => setRoutingOpen(false)}
              className="mt-4 min-h-[48px] w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 text-sm font-bold text-neutral-300"
            >
              {mt(lang, "routingCollapse")}
            </button>
          )}
        </Card>
      ) : (
        <Card stage="setup" always title={`🧭 ${mt(lang, "routingTitle")}`}>
          <div className="flex items-center gap-3">
            <span className="flex-1 text-sm text-neutral-300">
              ✓ {mt(lang, "routingDone")} · {routingSummary.join(" · ")}
            </span>
            <button
              type="button"
              onClick={() => setRoutingOpen(true)}
              className="min-h-[48px] shrink-0 rounded-lg border border-neutral-700 bg-neutral-800 px-4 text-sm font-bold text-neutral-300"
            >
              {mt(lang, "routingRedo")}
            </button>
          </div>
        </Card>
      )}
      {/* Datums & orientation — where every measurement originates */}
      {(hasFlights || needsPostReference) && <Card stage="setup" title={`🧭 ${mt(lang, "datumsTitle")}`}>
        <div className="mb-3 rounded-lg border border-amber-900/50 bg-amber-500/5 p-3 text-sm text-amber-200">
          {mt(lang, "sketchOrientationHint")}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          {needsPostReference && <ChipRow help="postRefLbl"
            label={mt(lang, "postRefLbl")}
            value={data.datums.postRef}
            options={[
              ["centerline", mt(lang, "postRef_centerline")],
              ["face", mt(lang, "postRef_face")],
            ]}
            onChange={(v) => set((d) => void (d.datums.postRef = v as "" | "centerline" | "face"))}
          />}
        </div>
      </Card>}

    </>
  );
}
