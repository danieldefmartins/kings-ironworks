// What this job needs RIGHT NOW.
//
// The screen used to show four database tables — photos, materials, QC, specs
// — in fixed order, whatever stage the job was at. A worker at Shop Drawings
// does not need the QC list; a worker at QC does not need the material kit.
// So the top of the screen answers one question instead: at THIS stage, what
// is outstanding, and what is the tap that clears it?
//
// Nothing here blocks anything. A stage can always be advanced with items
// open — the shop knows things this app does not. These are prompts, not gates.

import type { Job, CutItem, Material, QcCheck, Photo } from "./shared";

export type NextAction =
  | { kind: "open"; row: "photos" | "materials" | "qc" | "specs" }
  | { kind: "measure" }
  | { kind: "none" };

export interface NextItem {
  key: string;            // i18n key: now_<key>
  text: string;           // English fallback
  done: boolean;
  action: NextAction;
  actionKey?: string;     // i18n key for the button: nowdo_<key>
  actionText?: string;
}

export interface NextUp {
  stage: string;
  items: NextItem[];
}

export function nextUp(
  job: Job,
  cut: CutItem[],
  materials: Material[],
  qc: QcCheck[],
  photos: Photo[],
): NextUp {
  const stage = job.current_stage || "Awarded";
  const items: NextItem[] = [];

  const specsSet = !!(job.finish_type && job.color);
  const hasMaterials = cut.length + materials.length > 0;
  const pulled = materials.filter((m) => m.pulled).length;
  const cutDone = cut.filter((c) => c.status !== "pending").length;
  const welded = cut.filter((c) => c.status === "welded").length;
  const qcDone = qc.filter((q) => q.passed !== null).length;
  const qcFailed = qc.filter((q) => q.passed === false).length;

  const push = (
    key: string, text: string, done: boolean,
    action: NextAction = { kind: "none" }, actionText?: string,
  ) => items.push({ key, text, done, action, actionKey: `nowdo_${key}`, actionText });

  switch (stage) {
    case "Awarded":
      // Before anything is ordered: know what it is made of and how it is finished.
      push("specs", specsSet ? `${job.finish_type} · ${job.color}` : "Finish and color not set",
        specsSet, { kind: "open", row: "specs" }, "Set specs");
      push("materials", hasMaterials ? `${cut.length + materials.length} lines listed` : "No materials listed yet",
        hasMaterials, { kind: "open", row: "materials" }, "Add materials");
      break;

    case "Shop Drawings":
      push("measure", "Field measurements", false, { kind: "measure" }, "Open field measure");
      push("materials", hasMaterials ? `${cut.length + materials.length} lines listed` : "No materials listed yet",
        hasMaterials, { kind: "open", row: "materials" }, "Add materials");
      break;

    case "Material":
      push("pull", materials.length
          ? `${pulled} of ${materials.length} pulled`
          : hasMaterials ? "Nothing to pull yet" : "No materials listed yet",
        materials.length > 0 && pulled === materials.length,
        { kind: "open", row: "materials" }, "Pull materials");
      break;

    case "Cut":
      push("cut", cut.length ? `${cutDone} of ${cut.length} cut` : "No cut list",
        cut.length > 0 && cutDone === cut.length,
        { kind: "open", row: "materials" }, "Mark cut");
      break;

    case "Fit/Weld":
      push("weld", cut.length ? `${welded} of ${cut.length} welded` : "No cut list",
        cut.length > 0 && welded === cut.length,
        { kind: "open", row: "materials" }, "Mark welded");
      push("photo_weld", "Photo of the fit-up", photos.length > 0,
        { kind: "open", row: "photos" }, "Add photo");
      break;

    case "Finish":
      push("finish", specsSet ? `${job.finish_type} · ${job.color}` : "Finish and color not set",
        specsSet, { kind: "open", row: "specs" }, "Set specs");
      push("photo_finish", "Photo of the finished steel", photos.length > 0,
        { kind: "open", row: "photos" }, "Add photo");
      break;

    case "QC":
      push("qc", qc.length
          ? qcFailed > 0 ? `${qcFailed} failed — needs rework` : `${qcDone} of ${qc.length} signed off`
          : "No QC checklist",
        qc.length > 0 && qcDone === qc.length && qcFailed === 0,
        { kind: "open", row: "qc" }, "Sign off");
      break;

    case "Install":
      push("photo_install", "Installation photos", photos.length > 0,
        { kind: "open", row: "photos" }, "Add photos");
      push("qc", qc.length ? `${qcDone} of ${qc.length} signed off` : "No QC checklist",
        qc.length > 0 && qcDone === qc.length,
        { kind: "open", row: "qc" }, "Sign off");
      break;

    case "Done":
      push("done", "Complete", true);
      break;
  }

  return { stage, items };
}
