"use client";

// Where a sheet is judged: what the geometry checks say, what is still
// missing and what is merely still owed, and the gate itself — submit,
// approve, send back.

import {
  type MeasureSheet,
} from "@/lib/shop/measure";
import {
  type CheckResult,
  type Gap,
  type Readiness,
} from "@/lib/shop/measure-checks";
import type { Job } from "@/lib/shop/shared";
import type { SaveState } from "../useSheetSync";
import { mt } from "@/lib/shop/measure-i18n";
import {
  Card,
  GapList,
  CheckRow,
  type EditorStage,
} from "../fields";

export default function ReviewSection({
  lang,
  sheet,
  job,
  status,
  rev,
  isAdmin,
  nameById,
  history,
  checks,
  ready,
  redChecks,
  orderedGaps,
  orderedDocGaps,
  carriedSummary,
  canSubmit,
  pendingLocal,
  saveState,
  gapLabel,
  gapStage,
  jumpToGap,
  submitSheet,
  approveSheet,
  sendBackSheet,
}: {
  lang: string;
  sheet: MeasureSheet;
  job: Job;
  status: string;
  rev: number;
  isAdmin: boolean;
  nameById: Record<string, string>;
  history: { at: string; action: string; workerId: string | null }[];
  checks: CheckResult[];
  ready: Readiness;
  redChecks: CheckResult[];
  orderedGaps: Gap[];
  orderedDocGaps: Gap[];
  carriedSummary: string[];
  canSubmit: boolean;
  pendingLocal: boolean;
  saveState: SaveState;
  gapLabel: (g: Gap) => string;
  gapStage: (key: string) => EditorStage;
  jumpToGap: (st: EditorStage, flight?: number) => void;
  submitSheet: () => void;
  approveSheet: () => void;
  sendBackSheet: () => void;
}) {
  return (
    <>
      {history.length > 0 && (
        <Card stage="review" title={`🕘 ${mt(lang, "historyTitle")}`}>
          {sheet.created_by && (
            <div className="text-xs text-neutral-500 mb-2">
              {mt(lang, "histOriginalBy")}{" "}
              <span className="text-neutral-300 font-semibold">
                {nameById[sheet.created_by] || "—"}
              </span>
            </div>
          )}
          <div className="space-y-1.5">
            {history.map((h, i) => {
              const otherEdit =
                h.action === "sheet_update" &&
                !!sheet.created_by &&
                !!h.workerId &&
                h.workerId !== sheet.created_by;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2 text-sm rounded-lg px-2.5 py-1.5 border ${
                    otherEdit
                      ? "border-amber-700/60 bg-amber-950/30"
                      : "border-neutral-800 bg-neutral-950/40"
                  }`}
                >
                  <span className="text-neutral-500 text-xs shrink-0 tabular-nums">
                    {new Date(h.at).toLocaleString()}
                  </span>
                  <span className="font-semibold truncate">
                    {h.workerId ? nameById[h.workerId] || "—" : "—"}
                  </span>
                  <span className="text-neutral-400 truncate">
                    {mt(lang, `hist_${h.action}`)}
                  </span>
                  {otherEdit && (
                    <span className="ml-auto text-[11px] text-amber-300 shrink-0">
                      ⚠ {mt(lang, "histOtherEdit")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Review & submit — checks, gaps, and the approval gate */}
      <Card stage="review" title={`✅ ${mt(lang, "reviewTitle")}`}>
        <div className="text-xs text-neutral-500 mb-2">{mt(lang, "neverCorrects")}</div>
        <div className="space-y-1.5 mb-4">
          {checks.map((c, i) => (
            <CheckRow key={`${c.key}${i}`} c={c} lang={lang} />
          ))}
        </div>

        {carriedSummary.length > 0 && (
          <div className="mb-4 rounded-lg border border-sky-900 bg-sky-950/30 p-3">
            <div className="text-xs font-bold text-sky-200">
              ↩ {mt(lang, "carriedReviewTitle")} ({carriedSummary.length})
            </div>
            <div className="mt-1 text-sm text-neutral-300">{carriedSummary.join(" · ")}</div>
            <div className="mt-1 text-xs text-neutral-400">{mt(lang, "carriedReviewNote")}</div>
          </div>
        )}

        {/* Two lists, never merged: what stops the shop, and what the file
            still owes. Both jump to the stage that answers them. */}
        {orderedGaps.length > 0 && (
          <GapList
            title={`${mt(lang, "blockersTitle")} (${orderedGaps.length})`}
            tone="amber"
            items={orderedGaps}
            label={gapLabel}
            onJump={(g) => jumpToGap(gapStage(g.key), g.flight)}
          />
        )}
        {orderedDocGaps.length > 0 && (
          <GapList
            title={`${mt(lang, "followUpsTitle")} (${orderedDocGaps.length})`}
            tone="sky"
            items={orderedDocGaps}
            label={gapLabel}
            onJump={(g) => jumpToGap(gapStage(g.key), g.flight)}
          />
        )}

        {status === "in_progress" && (
          <>
            {redChecks.length > 0 && (
              <div className="text-sm text-red-300 mb-2">⛔ {mt(lang, "redBlock")}</div>
            )}
            {ready.complete && (
              <div className="text-sm text-green-300 mb-2">✓ {mt(lang, "allClear")}</div>
            )}
            {ready.docsOpen && (
              <div className="text-sm text-sky-300 mb-2">
                ✓ {mt(lang, "readyForShop")} — {mt(lang, "docsOpenNote")}
              </div>
            )}
            <button
              onClick={submitSheet}
              disabled={!canSubmit || pendingLocal || saveState === "dirty" || saveState === "saving"}
              className="w-full bg-amber-500 text-black font-bold rounded-xl py-4 text-lg disabled:opacity-40"
            >
              {mt(lang, "submitReview")}
            </button>
          </>
        )}

        {status === "submitted" && (
          <div>
            <div className="text-sm font-bold text-amber-300 mb-1">
              {mt(lang, "submittedBadge")}
            </div>
            {sheet.submitted_by && nameById[sheet.submitted_by] && (
              <div className="text-xs text-neutral-400 mb-3">
                {mt(lang, "submittedByLbl")}: {nameById[sheet.submitted_by]}
              </div>
            )}
            {isAdmin && (
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <button
                  onClick={() => approveSheet()}
                  className="flex-1 bg-green-600 text-white font-bold rounded-xl py-4"
                >
                  ✓ {mt(lang, "approve")}
                </button>
                <button
                  onClick={sendBackSheet}
                  className="flex-1 border border-neutral-600 bg-neutral-800 text-neutral-200 font-bold rounded-xl py-4"
                >
                  ↩ {mt(lang, "sendBack")}
                </button>
              </div>
            )}
          </div>
        )}

        {status === "approved" && (
          <div>
            <div className="text-sm font-bold text-green-300 mb-1">
              ✓ {mt(lang, "approvedBadge")} · {mt(lang, "revLabel")} {rev}
            </div>
            {sheet.approved_by && nameById[sheet.approved_by] && (
              <div className="text-xs text-neutral-400 mb-2">
                {mt(lang, "approvedByLbl")}: {nameById[sheet.approved_by]}
                {sheet.approved_at ? ` · ${new Date(sheet.approved_at).toLocaleString()}` : ""}
              </div>
            )}
            <a
              href={`/shop/job/${job.id}/measure/${sheet.id}/rev/${rev}`}
              className="inline-block text-xs font-bold border border-green-700 bg-green-950/40 text-green-300 rounded-full px-3 py-2 mb-2"
            >
              🔒 {mt(lang, "viewLockedRev")} — {mt(lang, "revLabel")} {rev} ›
            </a>
            <div className="text-xs text-amber-300/80">⚠ {mt(lang, "editWarning")}</div>
          </div>
        )}
      </Card>
    </>
  );
}
