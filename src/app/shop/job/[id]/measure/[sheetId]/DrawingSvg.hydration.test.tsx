import { act } from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { newMeasureData } from '@/lib/shop/measure';
import DrawingSvg from './DrawingSvg';

it.each(['en','pt','es'])('hydrates a filled stair with wall references in %s', async lang => {
 const data = newMeasureData('straight', 3);
 data.datums.orientation = 'left_wall';
 const flight = data.segments[0];
 if(flight.kind !== 'flight') throw Error();
 flight.width='48';flight.steps.forEach(s=>Object.assign(s,{rise:'7',run:'11',nosing:'1'}));
 const element=<DrawingSvg data={data} lang={lang} view="side" light/>;
 const host=document.createElement('div');host.innerHTML=renderToString(element);document.body.append(host);
 const before=[...host.querySelectorAll('[data-wall-segment] title')].map(n=>n.textContent);
 expect(before.length).toBe(3);expect(before.every(s=>s && s.includes(' · '))).toBe(true);
 const errors=vi.fn();let root:ReturnType<typeof hydrateRoot>;
 await act(async()=>{root=hydrateRoot(host,element,{onRecoverableError:errors});});
 expect(errors).not.toHaveBeenCalled();
 expect([...host.querySelectorAll('[data-wall-segment] title')].map(n=>n.textContent)).toEqual(before);
 await act(async()=>root.unmount());host.remove();
});
