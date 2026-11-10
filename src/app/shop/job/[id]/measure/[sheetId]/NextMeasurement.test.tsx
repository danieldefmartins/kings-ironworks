import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { newMeasureData, normalizeMeasureData, type MeasureData, type MeasureShape } from '@/lib/shop/measure';
import { sheetReadiness, type Gap } from '@/lib/shop/measure-checks';
import NextMeasurement from './NextMeasurement';
import type { SceneFocus } from '@/lib/shop/measure-scene';

afterEach(cleanup);
function Harness({ shape, steps = 2, init, onDone, lang = 'en', onFocus }: { shape: MeasureShape; steps?: number; init?: (d: MeasureData) => void; onDone?: () => void; lang?: string; onFocus?: (f: SceneFocus | null) => void }) {
  const [data, setData] = useState<MeasureData>(() => { const d = normalizeMeasureData(newMeasureData(shape, steps)); init?.(d); return d; });
  const gaps = sheetReadiness(data, shape).fabGaps;
  return <>
    <NextMeasurement data={data} shape={shape} gaps={gaps} lang={lang} unitPlaceholder={'0"'} gapLabel={g => g.key} onOpenGap={() => {}} onDone={onDone} onFocus={onFocus}
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
    expect(box().getAttribute('aria-label')).toBe('Next: Step 1 · Tread depth');
    fireEvent.keyDown(box(), { key: 'Enter' });
    expect(box().getAttribute('aria-label')).toBe('Next: Step 2 · Rise');
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(box().getAttribute('aria-label')).toBe('Next: Step 1 · Tread depth');
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
    // The card flows straight into the one-tap questions, then reaches the milestone.
    for (let guard = 0; guard < 20 && document.querySelector('[data-nx-choice]'); guard++) fireEvent.click(document.querySelector('[data-nx-choice]')!);
    expect(screen.getByText('All measurements in')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Review/ }));
    expect(reviewed).toBe(1);
    // The remaining choices are one tap away, and Back returns to the numbers.
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('button', { name: 'Open' })).toBeTruthy();
  });

  it('lights the riser, then the tread, of the step it is asking about, and follows Next / Previous', () => {
    const seen: (SceneFocus | null)[] = [];
    render(<Harness shape="straight" steps={3} onFocus={f => seen.push(f)} />);
    expect(seen.at(-1)).toEqual({ segmentIndex: 0, stepIndex: 0, part: 'rise', label: 'Step 1 · Rise' });
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(seen.at(-1)).toMatchObject({ segmentIndex: 0, stepIndex: 0, part: 'run' });
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(seen.at(-1)).toEqual({ segmentIndex: 0, stepIndex: 1, part: 'rise', label: 'Step 2 · Rise' });
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(seen.at(-1)).toMatchObject({ segmentIndex: 0, stepIndex: 0, part: 'run' });
    // Typing does not re-send the same focus.
    const n = seen.length;
    fireEvent.change(box(), { target: { value: '11' } });
    expect(seen.length).toBe(n);
  });

  it('copies a rise to the empty steps, says how many, skips them, and Undo takes it back', () => {
    render(<Harness shape="straight" steps={4} init={d => { (d.segments[0] as { steps: { rise: string }[] }).steps[2].rise = '8'; }} />);
    // Nothing typed yet: nothing to copy.
    expect((document.querySelector('[data-nx-copy]') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(box(), { target: { value: '7 1/2' } });
    const copyBtn = document.querySelector('[data-nx-copy]') as HTMLButtonElement;
    expect(copyBtn.textContent).toContain('Same for all steps');
    expect(copyBtn.textContent).toContain('2');
    fireEvent.click(copyBtn);
    const rises = () => (saved().segments[0] as { steps: { rise: string }[] }).steps.map(s => s.rise);
    expect(rises()).toEqual(['7 1/2', '7 1/2', '8', '7 1/2']);
    expect(screen.getByText('Copied to 2 steps')).toBeTruthy();
    // The queue skips the filled rises: tread, then tread, never a rise again.
    fireEvent.click(screen.getByRole('button', { name: /^Next/ }));
    expect(box().getAttribute('aria-label')).toBe('Next: Step 1 · Tread depth');
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(box().getAttribute('aria-label')).toBe('Next: Step 2 · Tread depth');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(rises()).toEqual(['7 1/2', '', '8', '']);
  });

  it('offers to replace on every step only from the options sheet', () => {
    render(<Harness shape="straight" steps={3} init={d => { (d.segments[0] as { steps: { run: string; rise: string }[] }).steps.forEach((s, i) => { s.rise = '7'; s.run = i === 2 ? '12' : ''; }); }} />);
    expect(box().getAttribute('aria-label')).toBe('Next: Step 1 · Tread depth');
    fireEvent.change(box(), { target: { value: '11' } });
    fireEvent.click(screen.getByRole('button', { name: 'More copy options' }));
    fireEvent.click(screen.getByRole('button', { name: /Replace all/ }));
    expect((saved().segments[0] as { steps: { run: string }[] }).steps.map(s => s.run)).toEqual(['11', '11', '11']);
  });

  describe('a required photo', () => {
    // A balcony with nothing typed: its slab-edge photo is the one the shop cannot build without.
    function PhotoCard({ lang = 'en', onShootGap }: { lang?: string; onShootGap?: (g: Gap) => void }) {
      const [data, setData] = useState<MeasureData>(() => normalizeMeasureData(newMeasureData('balcony', 0)));
      const gaps = sheetReadiness(data, 'balcony').fabGaps.filter(g => g.key === 'photo');
      return <>
        <NextMeasurement data={data} shape="balcony" gaps={gaps} lang={lang} unitPlaceholder={'0"'} gapLabel={g => `Required photo missing: ${g.detail}`} onOpenGap={() => {}} onShootGap={onShootGap}
          set={fn => setData(old => { const next = structuredClone(old); fn(next); return next; })} />
        <button type="button" onClick={() => setData(old => ({ ...old, photos: [...old.photos, { slot: 'bal_slab_edge', path: 'p.jpg', takenAt: '2026-01-01T00:00:00.000Z' }] }))}>save photo</button>
      </>;
    }
    // Skip past the numbers to the photo, the way the chevron does.
    const toPhoto = (skip: string) => { for (let guard = 0; guard < 80 && screen.queryByRole('textbox'); guard++) fireEvent.click(screen.getByRole('button', { name: skip })); };

    it('is taken from the card: named as the thing to photograph, one Take photo button, handed its slot', () => {
      const shot: Gap[] = [];
      render(<PhotoCard onShootGap={g => shot.push(g)} />);
      toPhoto('Skip');
      expect(screen.getByText('The slab edge, close up')).toBeTruthy();
      expect(screen.queryByText(/Required photo missing/)).toBeNull();
      expect(screen.queryByRole('button', { name: 'Open' })).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Take photo' }));
      expect(shot).toHaveLength(1);
      expect(shot[0]).toMatchObject({ key: 'photo', detail: 'bal_slab_edge' });
      // The saved photo closes the requirement and the card leaves it by itself.
      fireEvent.click(screen.getByRole('button', { name: 'save photo' }));
      expect(screen.queryByRole('button', { name: 'Take photo' })).toBeNull();
      expect(screen.queryByText('The slab edge, close up')).toBeNull();
    });

    it('says it in Portuguese and Spanish', () => {
      render(<PhotoCard lang="pt" onShootGap={() => {}} />);
      toPhoto('Pular');
      expect(screen.getByRole('button', { name: 'Tirar foto' })).toBeTruthy();
      cleanup();
      render(<PhotoCard lang="es" onShootGap={() => {}} />);
      toPhoto('Saltar');
      expect(screen.getByRole('button', { name: 'Tomar foto' })).toBeTruthy();
    });

    it('is asked before the milestone once the numbers are in; without a camera the milestone comes first', () => {
      const photo: Gap = { key: 'photo', detail: 'gate_opening', tier: 'fab' };
      function Gate({ onShootGap }: { onShootGap?: (g: Gap) => void }) {
        const [data, setData] = useState<MeasureData>(() => normalizeMeasureData(newMeasureData('gate', 0)));
        return <NextMeasurement data={data} shape="gate" gaps={[...sheetReadiness(data, 'gate').fabGaps, photo]} lang="en" unitPlaceholder={'0"'} gapLabel={g => g.key} onOpenGap={() => {}} onShootGap={onShootGap}
          set={fn => setData(old => { const next = structuredClone(old); fn(next); return next; })} />;
      }
      const typeAll = () => { for (let guard = 0; guard < 40 && screen.queryByRole('textbox', { name: /^Next:/ }); guard++) { fireEvent.change(box(), { target: { value: '36' } }); fireEvent.click(screen.getByRole('button', { name: 'Next' })); }
        for (let guard = 0; guard < 20 && document.querySelector('[data-nx-choice]'); guard++) fireEvent.click(document.querySelector('[data-nx-choice]')!); };
      render(<Gate onShootGap={() => {}} />);
      typeAll();
      expect(screen.getByRole('button', { name: 'Take photo' })).toBeTruthy();
      expect(screen.queryByText('All measurements in')).toBeNull();
      cleanup();
      render(<Gate />);
      typeAll();
      expect(screen.getByText('All measurements in')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Take photo' })).toBeNull();
    });

    it('without a camera handler stays an Open item', () => {
      render(<PhotoCard />);
      toPhoto('Skip');
      expect(screen.getByRole('button', { name: 'Open' })).toBeTruthy();
      expect(screen.getByText('Required photo missing: bal_slab_edge')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Take photo' })).toBeNull();
    });
  });

  it('speaks the trade in Spanish and Portuguese on a stair', () => {
    render(<Harness shape="straight" lang="es" />);
    expect(screen.getByRole('textbox').getAttribute('aria-label')).toBe('Siguiente: Escalón 1 · Contrahuella');
    fireEvent.click(screen.getByRole('button', { name: 'Saltar' }));
    expect(screen.getByRole('textbox').getAttribute('aria-label')).toBe('Siguiente: Escalón 1 · Huella');
    cleanup();
    render(<Harness shape="straight" lang="pt" />);
    expect(screen.getByRole('textbox').getAttribute('aria-label')).toBe('Próxima: Degrau 1 · Espelho');
  });
});
