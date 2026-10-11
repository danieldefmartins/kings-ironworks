"use client";

// The photo checklist. Most of these are documentation and do not block a
// submission; the few that the shop genuinely cannot build without are marked
// as blockers by requiredGaps, not here.

import { useContext } from "react";
import type { MeasureData, MeasureShape } from "@/lib/shop/measure";
import { DetailStagesCtx, StageCtx } from "../fields";
import ShotList from "./ShotList";

export default function PhotosSection({
  lang,
  data,
  shape,
  setPhotoSlot,
  slotErr,
}: {
  lang: string;
  data: MeasureData;
  shape: MeasureShape;
  setPhotoSlot: (s: { slot: string; label: string } | null) => void;
  /** Kept for callers; the shot list uploads through the camera flow. */
  directSlotPhoto?: (slot: string, label: string, file: File) => Promise<void>;
  slotBusy?: string | null;
  slotErr: string | null;
}) {
  // Same stage gating as Card, but no card of its own: the Photos panel the
  // list sits in already carries the heading and the frame.
  const activeStage = useContext(StageCtx);
  const detailStages = useContext(DetailStagesCtx);
  if (detailStages ? !detailStages.includes("photos") : activeStage !== "photos") return null;
  return (
    <div className="mb-4">
      {/* Camera-first pro shot list; the OS photo sheet stays one tap away
          inside the camera (Library). */}
      <ShotList lang={lang} data={data} shape={shape} onShoot={setPhotoSlot} err={slotErr} />
    </div>
  );
}
