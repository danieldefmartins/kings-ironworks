"use client";

// The photo checklist. Most of these are documentation and do not block a
// submission; the few that the shop genuinely cannot build without are marked
// as blockers by requiredGaps, not here.

import type { MeasureData, MeasureShape } from "@/lib/shop/measure";
import { mt } from "@/lib/shop/measure-i18n";
import { Card } from "../fields";
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
  return (
    <>
      <Card stage="photos" title={mt(lang, "shotsTitle")}>
        {/* Camera-first pro shot list; the OS photo sheet stays one tap away
            inside the camera (Library). */}
        <ShotList lang={lang} data={data} shape={shape} onShoot={setPhotoSlot} err={slotErr} />
      </Card>

      {/* Change history — from the immutable audit trail. Anyone may edit
          any sheet; this makes every hand that touched it visible. */}
    </>
  );
}
