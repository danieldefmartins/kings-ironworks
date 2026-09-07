"use client";
import { useId, useState } from 'react';
import type { MeasureData } from '@/lib/shop/measure';
import { mt } from '@/lib/shop/measure-i18n';
import DrawingDetails from './DrawingDetails';

/** Detailed schedules belong to an intentional review, not measurement entry. */
export default function DrawingReport({ data, lang, sheetId }: { data: MeasureData; lang: string; sheetId: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <div className="mt-3 border-t border-neutral-700 pt-3">
    <button type="button" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(v=>!v)} className="min-h-12 w-full rounded-xl border border-neutral-600 px-4 text-left text-sm font-semibold">{mt(lang,open?'hideDrawingReport':'showDrawingReport')} <span aria-hidden="true">{open?'▴':'▾'}</span></button>
    {open && <div id={id}><p className="mt-3 text-sm text-neutral-400">{mt(lang,'drawingReportHint')}</p><DrawingDetails data={data} lang={lang} sheetId={sheetId}/></div>}
  </div>;
}
