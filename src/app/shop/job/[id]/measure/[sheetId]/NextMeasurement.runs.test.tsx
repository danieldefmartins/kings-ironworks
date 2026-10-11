import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { newMeasureData, normalizeMeasureData, type MeasureData, type MeasureShape } from '@/lib/shop/measure';
import { sheetReadiness } from '@/lib/shop/measure-checks';
import NextMeasurement from './NextMeasurement';

afterEach(cleanup);
/** With an undo history, as the editor has. */
function Harness({ shape, steps = 1, init, lang = 'en' }: { shape: MeasureShape; steps?: number; init?: (d: MeasureData) => void; lang?: string }) {
  const [hist, setHist] = useState<MeasureData[]>(() => { const d = normalizeMeasureData(newMeasureData(shape, steps)); init?.(d); return [d]; });
  const data = hist[hist.length - 1];
  const gaps = sheetReadiness(data, shape).fabGaps;
  return <>
    <NextMeasurement data={data} shape={shape} gaps={gaps} lang={lang} unitPlaceholder={'0"'} gapLabel={g => g.key} onOpenGap={() => {}}
      onUndo={() => setHist(h => (h.length > 1 ? h.slice(0, -1) : h))}
      set={fn => setHist(h => { const next = structuredClone(h[h.length - 1]); fn(next); return [...h, next]; })} />
    <output data-testid="data">{JSON.stringify(data)}</output>
  </>;
}
const saved = () => JSON.parse(screen.getByTestId('data').textContent!) as MeasureData;

describe('next card on railed runs', () => {
  it('copies a deck side height to the other sides, with Undo', () => {
    render(<Harness shape="deck" steps={3} init={d => { d.deck!.sides[0].length = '192'; }} />);
    const box = screen.getByRole('textbox', { name: /^Next:/ }) as HTMLInputElement;
    expect(box.getAttribute('aria-label')).toMatch(/1 · .*height/i);
    fireEvent.change(box, { target: { value: '36' } });
    fireEvent.click(screen.getByRole('button', { name: /Same for all sides/ }));
    expect(saved().deck!.sides.map(s => s.heightAboveGrade)).toEqual(['36', '36', '36']);
    expect(screen.getByText(/Copied to 2 sides/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(saved().deck!.sides.map(s => s.heightAboveGrade)).toEqual(['36', '', '']);
  });

  it('offers a square deck corner to approve', () => {
    render(<Harness shape="deck" steps={3} init={d => {
      d.deck!.sides.forEach((s, i) => { s.length = i === 1 ? '144' : '192'; s.heightAboveGrade = '36'; });
    }} />);
    expect(screen.getByText('90.0°')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Approve/ }));
    expect(saved().deck!.sides[0].turnDeg).toBe('90');
    expect(saved().calcSources?.['deck.side0.turnDeg']).toBe('calculated-approved');
  });

  it('holds a ramp slope to 1:12 beside the calculated angle', () => {
    render(<Harness shape="ramp" init={d => { const r = d.segments[0]; if (r.kind === 'ramp') Object.assign(r, { rise: '12', runH: '120', length: '120 5/8' }); }} />);
    expect(screen.getByText(/1:10 · steeper than 1:12/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Approve/ }));
    expect(saved().calcSources?.['s0.rampAngle']).toBe('calculated-approved');
  });

  it('says it in Portuguese', () => {
    render(<Harness shape="deck" steps={3} lang="pt" init={d => { d.deck!.sides[0].length = '192'; }} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '30' } });
    expect(screen.getAllByText(/Igual para todos os lados/).length).toBeGreaterThan(0);
  });
});
