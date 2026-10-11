'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Bluetooth, LoaderCircle, X } from 'lucide-react';
import { LaserClient, lastLaser, type LaserState } from '@/lib/shop/laser/client';
import { browserBluetooth } from '@/lib/shop/laser/types';
import { formatLaserValue } from '@/lib/shop/laser/parsers';
import { fillLaserField, isLaserField } from '@/lib/shop/laser/field-input';

const subscribeBrowser = () => () => {};
const serverUnsupported = () => false;
const hasBluetooth = () => !!browserBluetooth();
const needsBluefy = () => !browserBluetooth() && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

const tr = (lang: string, en: string, pt: string, es: string) => lang === 'pt' ? pt : lang === 'es' ? es : en;

/** Only mounted inside the overflow menu; Safari never gets an inert laser button. */
export function LaserBrowserHint({ lang }: { lang: string }) {
  const show = useSyncExternalStore(subscribeBrowser, needsBluefy, serverUnsupported);
  return show ? <p className="px-1 py-2 text-sm text-neutral-400">{tr(lang, 'Bluetooth laser: use Bluefy on iOS.', 'Laser Bluetooth: use o Bluefy no iOS.', 'Láser Bluetooth: use Bluefy en iOS.')}</p> : null;
}

export default function LaserControl({ lang, units }: { lang: string; units: 'in' | 'ftin' }) {
  const supported = useSyncExternalStore(subscribeBrowser, hasBluetooth, serverUnsupported);
  const [state, setState] = useState<LaserState>({ status: 'disconnected' });
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [remembered, setRemembered] = useState<string>();
  const client = useRef<LaserClient | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const options = useRef({ lang, units });
  useEffect(() => { options.current = { lang, units }; }, [lang, units]);
  useEffect(() => {
    const bluetooth = browserBluetooth();
    if (!bluetooth) return;
    const connection = new LaserClient(bluetooth, setState, reading => {
      const { lang: language, units: sheetUnits } = options.current;
      const active = document.activeElement;
      const root = panel.current?.closest('[data-measure-ui]');
      // A focused non-distance field is intentional; don't write elsewhere.
      const target = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement
        ? active : root?.querySelector('[data-next-measure] input[data-m="1"]') || null;
      if (!target || !root?.contains(target) || !isLaserField(target)) {
        setMessage(tr(language, 'Select a distance field to receive the laser.', 'Selecione uma medida de distância para receber o laser.', 'Seleccione una medida de distancia para recibir el láser.'));
        return;
      }
      const value = formatLaserValue(reading.inches, sheetUnits);
      const label = target.getAttribute('aria-label') || target.labels?.[0]?.textContent || '';
      let applied = false;
      flushSync(() => { applied = fillLaserField(target, value); });
      if (applied) {
        setOpen(false);
        setMessage(`${value}${label ? ` · ${label}` : ''}`);
      }
    }, () => setMessage(tr(options.current.lang, 'Laser disconnected. Reconnecting…', 'Laser desconectado. Reconectando…', 'Láser desconectado. Reconectando…')));
    client.current = connection;
    let mounted = true;
    void connection.restore().then(() => { if (mounted) setRemembered(lastLaser()?.name); });
    return () => { mounted = false; connection.disconnect(); client.current = null; };
  }, []);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!panel.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  async function connect(chooseNew = false) {
    setMessage('');
    try {
      await client.current?.connect(chooseNew);
      setRemembered(lastLaser()?.name);
      setOpen(true);
    } catch (error) {
      if (error instanceof DOMException && (error.name === 'NotFoundError' || error.name === 'AbortError')) return;
      setMessage(tr(lang, 'Could not connect. Turn on the laser’s Bluetooth and try again.', 'Não foi possível conectar. Ative o Bluetooth do laser e tente novamente.', 'No se pudo conectar. Active el Bluetooth del láser e inténtelo de nuevo.'));
    }
  }
  if (!supported) return null;
  const busy = state.status === 'connecting' || state.status === 'reconnecting';
  const connected = state.status === 'connected';
  const name = state.name || remembered;
  const label = connected ? tr(lang, 'Laser connected', 'Laser conectado', 'Láser conectado') : busy ? tr(lang, 'Connecting laser', 'Conectando laser', 'Conectando láser') : tr(lang, 'Connect laser', 'Conectar laser', 'Conectar láser');
  return <div ref={panel} className="relative shrink-0" data-laser-control>
    <button type="button" aria-label={`${label}${name ? ` · ${name}` : ''}`} aria-expanded={open} aria-controls="laser-connection-panel" title={label}
      onPointerDown={event => event.preventDefault()} onClick={() => setOpen(value => !value)}
      className={`relative flex h-11 min-w-11 items-center justify-center gap-2 rounded-full px-2.5 ${connected ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 active:bg-slate-100'}`}>
      {busy ? <LoaderCircle aria-hidden className="h-5 w-5 animate-spin motion-reduce:animate-none"/> : <Bluetooth aria-hidden className="h-5 w-5"/>}
      {connected && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-600 ring-2 ring-white"/>}
      <span className="hidden max-w-36 truncate text-sm font-semibold lg:block">{connected ? name : tr(lang, 'Laser', 'Laser', 'Láser')}</span>
      {connected && state.battery !== undefined && <span className="hidden text-xs tabular-nums lg:block">{state.battery}%</span>}
    </button>
    {open && <div id="laser-connection-panel" role="region" aria-label={tr(lang, 'Laser connection', 'Conexão do laser', 'Conexión del láser')} className="fixed left-3 right-3 top-[calc(3.5rem+env(safe-area-inset-top)+0.5rem)] z-50 rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-80">
      <div className="flex items-center gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${connected ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}><Bluetooth aria-hidden className="h-6 w-6"/></span>
        <div className="min-w-0 flex-1"><p className="truncate font-semibold">{name || tr(lang, 'Laser measure', 'Medidor laser', 'Medidor láser')}</p><p className="text-sm text-slate-500">{connected ? tr(lang, 'Connected', 'Conectado', 'Conectado') : busy ? tr(lang, 'Connecting…', 'Conectando…', 'Conectando…') : tr(lang, 'Not connected', 'Desconectado', 'Desconectado')}{connected && state.battery !== undefined ? ` · ${state.battery}%` : ''}</p></div>
        <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-500" aria-label={tr(lang, 'Close laser', 'Fechar laser', 'Cerrar láser')} onClick={() => setOpen(false)}><X aria-hidden className="h-5 w-5"/></button>
      </div>
      <div className="mt-3 flex gap-2">
        {connected || busy ? <button type="button" className="min-h-11 flex-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold" onClick={() => { client.current?.disconnect(); setMessage(''); }}>{busy ? tr(lang, 'Cancel', 'Cancelar', 'Cancelar') : tr(lang, 'Disconnect', 'Desconectar', 'Desconectar')}</button>
          : <button type="button" className="min-h-11 flex-1 rounded-xl bg-indigo-600 px-3 text-sm font-semibold text-white" onClick={() => void connect()}>{tr(lang, 'Connect', 'Conectar', 'Conectar')}</button>}
        {name && !busy && <button type="button" className="min-h-11 flex-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold" onClick={() => void connect(true)}>{tr(lang, 'Change device', 'Trocar aparelho', 'Cambiar dispositivo')}</button>}
      </div>
    </div>}
    {message && createPortal(<div role="status" className="fixed inset-x-3 top-[calc(3.5rem+env(safe-area-inset-top)+0.75rem)] z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-base font-medium text-white shadow-xl"><Bluetooth aria-hidden className="h-5 w-5 shrink-0"/><span>{message}</span></div>, document.body)}
  </div>;
}
