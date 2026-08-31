"use client";

// The camera sheet for one required photo slot: take it, mark it up, and hand
// the stored path back. Replacing a slot's photo replaces the old entry rather
// than adding a second one for the same slot.

import PhotoMarkup from "../PhotoMarkup";
import type { AnnotationStroke, MeasureData } from "@/lib/shop/measure";

export default function PhotoCapture({
  lang,
  jobId,
  sheetName,
  slot,
  set,
  onClose,
}: {
  lang: string;
  jobId: string;
  sheetName: string;
  slot: { slot: string; label: string } | null;
  set: (fn: (d: MeasureData) => void) => void;
  onClose: () => void;
}) {
  if (!slot) return null;
  return (
    <PhotoMarkup
      jobId={jobId}
      sheetName={sheetName}
      lang={lang}
      slot={slot.slot}
      slotLabel={slot.label}
      onSaved={(path: string, strokes: AnnotationStroke[]) => {
        set((d) => {
          d.photos = [
            ...d.photos.filter((p) => p.slot !== slot.slot),
            { slot: slot.slot, path, takenAt: new Date().toISOString() },
          ];
          if (strokes.length > 0) d.annotations[path] = strokes;
        });
        onClose();
      }}
      onClose={onClose}
    />
  );
}
