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
