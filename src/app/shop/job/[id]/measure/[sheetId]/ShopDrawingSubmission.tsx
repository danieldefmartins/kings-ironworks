"use client";
import { useCallback, useEffect, useState } from 'react';
type Row = { id: string; status: string; requested_at: string; hasFile: boolean; format?: 'sketchup'|'blender'; error: string | null };
export default function ShopDrawingSubmission({ sheetId, lang, disabled, submit }: { sheetId: string; lang: string; disabled: boolean; submit: () => Promise<unknown> }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const label = (en: string, pt: string, es: string) => lang === 'pt' ? pt : lang === 'es' ? es : en;
  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/shop/api/shop-drawings?sheet=${sheetId}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load drawings');
      setRows(data.requests); setConnected(data.connected); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Connection failed'); }
  }, [sheetId]);
  // refresh sets state only after the asynchronous network response.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void refresh(); const timer = setInterval(refresh, 15000); return () => clearInterval(timer); }, [refresh]);
  const statuses: Record<string, string> = {
    queued: label('Queued for Blender', 'Na fila do Blender', 'En cola para Blender'),
    generating: label('Blender is generating', 'Blender está gerando', 'Blender está generando'),
    ready: label('Draft ready for shop review', 'Rascunho pronto para revisão', 'Borrador listo para revisión'),
    failed: label('Generation failed', 'Falha na geração', 'Falló la generación'),
    approved: label('Approved', 'Aprovado', 'Aprobado'),
  };
  return <div className="space-y-3">
    <p className="text-sm text-neutral-300">{label('Send a saved measurement snapshot to Blender. The generated model needs shop review before fabrication.', 'Envie as medidas salvas ao Blender. O modelo gerado precisa de revisão antes da fabricação.', 'Envíe las medidas guardadas a Blender. El modelo generado requiere revisión antes de fabricar.')}</p>
    <p className={`text-xs ${connected ? 'text-green-300' : 'text-amber-300'}`}>{connected ? label('Mac mini worker connected', 'Mac mini conectado', 'Mac mini conectado') : label('Waiting for the Mac mini worker', 'Aguardando o Mac mini', 'Esperando al Mac mini')}</p>
    <button disabled={disabled || busy} className="min-h-14 w-full rounded-xl bg-amber-500 px-4 font-bold text-black disabled:opacity-40" onClick={async () => {
      setBusy(true); setError('');
      try { const result = await submit(); if (!result) throw new Error('Save your measurements before submitting.'); await refresh(); }
      catch (e) { setError(e instanceof Error ? e.message : 'Submission failed'); }
      finally { setBusy(false); }
    }}>{busy ? '…' : label('Submit to Shop Drawings', 'Enviar para desenhos de fabricação', 'Enviar a planos de taller')}</button>
    {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
    {rows.map(r => <div key={r.id} className="rounded-xl border border-neutral-700 p-3 text-sm"><p>{statuses[r.status] || r.status} · {new Date(r.requested_at).toLocaleString()}</p>{r.error && <p className="text-amber-300">{r.error}</p>}{r.hasFile && <a className="mt-2 inline-block underline text-sky-300" href={`/shop/api/shop-drawings?sheet=${sheetId}&download=${r.id}`}>{r.format==='sketchup'?label('Download earlier SketchUp draft (.skp)','Baixar rascunho anterior (.skp)','Descargar borrador anterior (.skp)'):label('Download Blender draft (.zip: .blend + PDF)', 'Baixar rascunho Blender (.zip: .blend + PDF)', 'Descargar borrador Blender (.zip: .blend + PDF)')}</a>}</div>)}
  </div>;
}
