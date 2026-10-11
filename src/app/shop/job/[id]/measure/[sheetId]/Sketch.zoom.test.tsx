import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { newMeasureData, type MeasureShape } from '@/lib/shop/measure';
import Sketch, { sketchViews } from './Sketch';

afterEach(cleanup);
it.each<MeasureShape>(['gate','fence','balcony','fire_escape','window_well','spiral','level_run','ramp'])('magnifies every specialty view of %s without editing data', shape => {
  const data=newMeasureData(shape,4),before=JSON.stringify(data);
  for(const [view] of sketchViews(shape)) {
    const {container,rerender,unmount}=render(<Sketch data={data} shape={shape} view={view} lang="en" zoom={1}/>);
    const drawing=container.querySelector('[data-specialty-zoom]') as HTMLDivElement;
    expect(drawing).toBeTruthy();
    expect(drawing.style.width).toBe('100%');
    rerender(<Sketch data={data} shape={shape} view={view} lang="en" zoom={3}/>);
    expect(drawing.style.width).toBe('300%');
    expect(JSON.stringify(data)).toBe(before);
    unmount();
  }
});
it('shows the same platform entry step in the legacy side schematic without storing a preview',()=>{
 const data=newMeasureData('stair_platform',1);const flight=data.segments[0],platform=data.segments[1];if(flight.kind!=='flight'||platform.kind!=='platform')throw Error();flight.steps[0].rise='7';platform.entryRise='6 1/2';
 const {container,rerender}=render(<Sketch data={data} shape="stair_platform" view="side" lang="en"/>);
 expect(container.querySelector('[data-platform-entry-rise="1"] text')?.textContent).toBe('6 1/2');
 delete platform.entryRise;const before=JSON.stringify(data);rerender(<Sketch data={data} shape="stair_platform" view="side" lang="en"/>);expect(container.querySelector('[data-platform-entry-rise="1"] text')?.textContent).toBe('?');expect(JSON.stringify(data)).toBe(before);
 platform.entryRise='0';rerender(<Sketch data={data} shape="stair_platform" view="side" lang="en"/>);expect(container.querySelector('[data-platform-entry-rise]')).toBeNull();
});
