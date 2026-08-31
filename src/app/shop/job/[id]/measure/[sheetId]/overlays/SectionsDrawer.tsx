"use client";

// A phone cannot show eight stages at once. This is the full list, opened
// from the one line that replaces the strip there.

import { mt } from "@/lib/shop/measure-i18n";
import { EDITOR_STAGES, type EditorStage } from "../fields";

export default function SectionsDrawer({
  lang,
  activeStage,
  stageMissing,
  stageDocs,
  onPick,
  onClose,
}: {
  lang: string;
  activeStage: EditorStage;
  stageMissing: Record<EditorStage, number>;
  stageDocs: Record<EditorStage, number>;
  onPick: (st: EditorStage) => void;
  onClose: () => void;
}) {
  return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 sm:items-center"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-label={mt(lang, "allSections")}
          className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-900 p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-3 text-lg font-bold">{mt(lang, "allSections")}</div>
          <div className="space-y-2">
            {EDITOR_STAGES.map((st, i) => {
              const missing = stageMissing[st.id];
              const docs = stageDocs[st.id];
              const note =
                st.id === "review"
                  ? missing
                    ? { text: mt(lang, "chipNotReady"), tone: "text-amber-400" }
                    : { text: mt(lang, "chipReady"), tone: "text-green-400" }
                  : missing
                    ? { text: `${missing} ${mt(lang, "stageMissing")}`, tone: "text-amber-400" }
                    : docs
                      ? { text: `${docs} ${mt(lang, "stageToAdd")}`, tone: "text-sky-400" }
                      : { text: mt(lang, "stageDone"), tone: "text-green-400" };
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => onPick(st.id)}
                  className={`flex min-h-[56px] w-full items-center gap-3 rounded-xl border px-4 text-left ${
                    activeStage === st.id
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-neutral-700 bg-neutral-800"
                  }`}
                >
                  <span className="w-5 shrink-0 text-sm font-bold text-neutral-500">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-bold text-neutral-100">
                    {mt(lang, st.labelKey)}
                  </span>
                  <span className={`shrink-0 text-xs font-bold ${note.tone}`}>{note.text}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-3 min-h-[48px] w-full rounded-xl border border-neutral-700 font-bold text-neutral-300"
          >
            {mt(lang, "closeLabel")}
          </button>
        </div>
      </div>
  );
}
