import { act } from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import MeasureTime from './MeasureTime';
it.each(['en','pt','es'])('hydrates dates in %s when the browser uses a different time zone', async lang=>{
 const iso='2026-01-01T00:30:00Z';
 const element=<MeasureTime iso={iso} lang={lang}/>;
 const host=document.createElement('div');host.innerHTML=renderToString(element);document.body.append(host);
 const original=Intl.DateTimeFormat;
 vi.spyOn(Intl,'DateTimeFormat').mockImplementation(function(locale,options){return new original(locale,{timeZone:'America/Los_Angeles',...options});} as typeof Intl.DateTimeFormat);
 const errors=vi.fn();let root:ReturnType<typeof hydrateRoot>;
 await act(async()=>{root=hydrateRoot(host,element,{onRecoverableError:errors});});
 expect(errors).not.toHaveBeenCalled();expect(host.querySelector('time')?.dateTime).toBe(iso.replace('Z','.000Z'));
 expect(host.textContent).toContain('2025');
 await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();
});
