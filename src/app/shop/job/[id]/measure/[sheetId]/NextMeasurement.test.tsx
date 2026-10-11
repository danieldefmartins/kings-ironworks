import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { newMeasureData, normalizeMeasureData, type MeasureData, type MeasureShape } from '@/lib/shop/measure';
import { sheetReadiness } from '@/lib/shop/measure-checks';
import NextMeasurement from './NextMeasurement';

afterEach(cleanup);
function Harness({ shape, steps = 2 }: { shape: MeasureShape; steps?: number }) {
  const [data, setData] = useState<MeasureData>(() => normalizeMeasureData(newMeasureData(shape, steps)));
  const gaps = sheetReadiness(data, shape).fabGaps;
  return <>
    <NextMeasurement data={data} shape={shape} gaps={gaps} lang="en" unitPlaceholder={'0"'} gapLabel={g => g.key} onOpenGap={() => {}}
      set={fn => setData(old => { const next = structuredClone(old); fn(next); return next; })} />
    <output data-testid="data">{JSON.stringify(data)}</output>
  </>;
}
const box = () => screen.getByRole('textbox', { name: /^Next:/ }) as HTMLInputElement;
const saved = () => JSON.parse(screen.getByTestId('data').textContent!) as MeasureData;

describe('next measurement card', () => {
  it('stays on the field being typed into, then Next walks rise → run → next step', () => {
    render(<Harness shape="straight" />);
    expect(box().getAttribute('aria-label')).toBe('Next: Step 1 · Rise');
    fireEvent.change(box(), { target: { value: '7' } });
    fireEvent.change(box(), { target: { value: '7 1/2' } });
    expect(box().getAttribute('aria-label')).toBe('Next: Step 1 · Rise');
    expect(box().value).toBe('7 1/2');
    expect((saved().segments[0] as { steps: { rise: string }[] }).steps[0].rise).toBe('7 1/2');
    expect(screen.getByText('1 of', { exact: false }).textContent).toMatch(/^1 of \d+$/);
    fireEvent.click(screen.getByRole('button', { name: /^Next/ }));
    expect(box().getAttribute('aria-label')).toBe('Next: Step 1 · Run');
    fireEvent.keyDown(box(), { key: 'Enter' });
    expect(box().getAttribute('aria-label')).toBe('Next: Step 2 · Rise');
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(box().getAttribute('aria-label')).toBe('Next: Step 1 · Run');
  });
  it('walks a gate through its tape measurements', () => {
    render(<Harness shape="gate" steps={0} />);
    expect(box().getAttribute('aria-label')).toBe('Next: Opening width at the top');
    fireEvent.change(box(), { target: { value: '48' } });
    expect(saved().gate!.widthTop).toBe('48');
    fireEvent.click(screen.getByRole('button', { name: /^Next/ }));
    expect(box().getAttribute('aria-label')).toBe('Next: Opening width at the bottom');
  });
});
