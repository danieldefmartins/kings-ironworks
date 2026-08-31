"use client";

// The photo checklist. Most of these are documentation and do not block a
// submission; the few that the shop genuinely cannot build without are marked
// as blockers by requiredGaps, not here.

import {
  requiredPhotoSlots,
  OPTIONAL_PHOTO_SLOTS,
  type MeasureData,
  type MeasureShape,
} from "@/lib/shop/measure";
import { mt } from "@/lib/shop/measure-i18n";
import {
  Card,
  SlotRow,
} from "../fields";

export default function PhotosSection({
  lang,
  data,
  shape,
  setPhotoSlot,
  directSlotPhoto,
  slotBusy,
  slotErr,
}: {
  lang: string;
  data: MeasureData;
  shape: MeasureShape;
  setPhotoSlot: (s: { slot: string; label: string } | null) => void;
  directSlotPhoto: (slot: string, label: string, file: File) => Promise<void>;
  slotBusy: string | null;
  slotErr: string | null;
}) {
  return (
    <>
      <Card stage="photos" title={`📷 ${mt(lang, "photoChecklist")}`}>
        <div className="text-xs text-neutral-500 mb-3">{mt(lang, "photosHint")}</div>
        {slotErr && (
          <div className="text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-lg p-2.5 mb-3">
            {slotErr}
          </div>
        )}
        <div className="space-y-2">
          {requiredPhotoSlots(shape).map((slot) => (
            <SlotRow key={slot} slot={slot} label={mt(lang, `slot_${slot}`)} required
              data={data} lang={lang} busy={slotBusy === slot}
              onFile={(f) => directSlotPhoto(slot, mt(lang, `slot_${slot}`), f)}
              onTake={() => setPhotoSlot({ slot, label: mt(lang, `slot_${slot}`) })} />
          ))}
          {OPTIONAL_PHOTO_SLOTS.map((slot) => (
            <SlotRow key={slot} slot={slot} label={mt(lang, `slot_${slot}`)} required={false}
              data={data} lang={lang} busy={slotBusy === slot}
              onFile={(f) => directSlotPhoto(slot, mt(lang, `slot_${slot}`), f)}
              onTake={() => setPhotoSlot({ slot, label: mt(lang, `slot_${slot}`) })} />
          ))}
        </div>
      </Card>

      {/* Change history — from the immutable audit trail. Anyone may edit
          any sheet; this makes every hand that touched it visible. */}
    </>
  );
}
