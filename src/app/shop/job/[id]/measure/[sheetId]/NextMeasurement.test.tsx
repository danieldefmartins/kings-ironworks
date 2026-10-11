import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { newMeasureData, normalizeMeasureData, type MeasureData, type MeasureShape } from '@/lib/shop/measure';
import { sheetReadiness } from '@/lib/shop/measure-checks';
import NextMeasurement from './NextMeasurement';

afterEach(cleanup);
function Harness({ shape, steps = 2, init, onDone, lang = 'en' }: { shape: MeasureShape; steps?: number; init?: (d: MeasureData) => void; onDone?: () => void; lang?: string }) {
  const [data, setData] = useState<MeasureData>(() => { const d = normalizeMeasureData(newMeasureData(shape, steps)); init?.(d); return d; });
  const gaps = sheetReadiness(data, shape).fabGaps;
  return <>
    <NextMeasurement data={data} shape={shape} gaps={gaps} lang={lang} unitPlaceholder={'0"'} gapLabel={g => g.key} onOpenGap={() => {}} onDone={onDone}
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

  it('walks an opening in trade words and reads every way of writing a number back', () => {
    render(<Harness shape="opening" steps={0} init={d => { d.opening!.mount = 'face_out'; }} />);
    expect(box().getAttribute('aria-label')).toBe('Next: Top width');
    // Nothing typed: the forward button skips.
    expect(screen.getByRole('button', { name: 'Skip' })).toBeTruthy();
    fireEvent.change(box(), { target: { value: `3' 4-1/2"` } });
    expect(screen.getByText(`40 1/2" · 3' 4 1/2"`)).toBeTruthy();
    fireEvent.change(box(), { target: { value: '40.5' } });
    expect(screen.getByText(`40 1/2" · 3' 4 1/2"`)).toBeTruthy();
    fireEvent.change(box(), { target: { value: '40 1/2' } });
    expect(screen.getByText(`40 1/2" · 3' 4 1/2"`)).toBeTruthy();
    expect(saved().opening!.units[0].wTop).toBe('40 1/2');
    // Garbage is flagged and never offered as "Next".
    fireEvent.change(box(), { target: { value: '40 1/' } });
    expect(screen.getByText('Not a measurement')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    fireEvent.change(box(), { target: { value: '40 1/2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(box().getAttribute('aria-label')).toBe('Next: Middle width');
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(box().getAttribute('aria-label')).toBe('Next: Bottom width');
  });

  it('labels in Portuguese and Spanish', () => {
    render(<Harness shape="opening" steps={0} lang="pt" />);
    expect(screen.getByRole('textbox').getAttribute('aria-label')).toBe('Próxima: Largura em cima');
    cleanup();
    render(<Harness shape="opening" steps={0} lang="es" />);
    expect(screen.getByRole('textbox').getAttribute('aria-label')).toBe('Siguiente: Ancho arriba');
  });

  it('after the last number: all measurements in, Review jumps on', () => {
    let reviewed = 0;
    render(<Harness shape="gate" steps={0} onDone={() => { reviewed += 1; }} init={d => {
      Object.assign(d.gate!, { widthTop: '48', widthBottom: '48', heightHinge: '60' });
    }} />);
    // Walk whatever numbers are still open, typing each.
    for (let guard = 0; guard < 20 && screen.queryByRole('textbox', { name: /^Next:/ }); guard++) {
      fireEvent.change(box(), { target: { value: '36' } });
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    }
    expect(screen.getByText('All measurements in')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Review/ }));
    expect(reviewed).toBe(1);
    // The remaining choices are one tap away, and Back returns to the numbers.
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('button', { name: 'Open' })).toBeTruthy();
  });
});
