'use client';
import { useSyncExternalStore } from 'react';
const subscribe = () => () => {};
/** The first browser render matches SSR. Then show the device's local time in
 * the worker's chosen language, without suppressing hydration errors. */
export default function MeasureTime({ iso, lang, dateOnly = false, today = false, compact = false }: { iso: string; lang: string; dateOnly?: boolean; today?: boolean; compact?: boolean }) {
 const local = useSyncExternalStore(subscribe, () => true, () => false);
 const date = today && local ? new Date() : new Date(iso);
 if (Number.isNaN(date.getTime())) return <span>—</span>;
 const locale = lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es-419' : 'en-US';
 const text = new Intl.DateTimeFormat(locale, { year:compact ? undefined : 'numeric', month:'short', day:'numeric', ...(dateOnly ? {} : { hour:'numeric', minute:'2-digit' }), ...(!local ? { timeZone:'UTC' } : {}) }).format(date);
 return <time dateTime={date.toISOString()}>{text}</time>;
}
