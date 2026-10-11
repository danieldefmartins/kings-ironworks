import { describe, expect, it } from 'vitest';
import { newMeasureData, newPresetMeasureData, normalizeMeasureData, type FlightSegment } from './measure';
import { sheetReadiness } from './measure-checks';
import { currentItem, measurementQueue, nextOpenItem } from './measure-next';

const queueOf = (data: ReturnType<typeof newMeasureData>, shape: Parameters<typeof sheetReadiness>[1]) =>
  measurementQueue(data, shape, sheetReadiness(data, shape).fabGaps);

describe('measuring queue', () => {
  it('starts a new straight stair on step 1 rise and walks rise, run, step by step', () => {
    const data = normalizeMeasureData(newMeasureData('straight', 3));
    const q = queueOf(data, 'straight');
    expect(q.done).toBe(0);
    expect(q.open.slice(0, 4).map(i => i.id)).toEqual(['s0.0.rise', 's0.0.run', 's0.1.rise', 's0.1.run']);
    const first = q.open[0];
    expect(first.type === 'slot' && first.slot.stepNumber).toBe(1);
  });

  it('counts recorded numbers and moves past a filled slot', () => {
    const data = normalizeMeasureData(newMeasureData('straight', 3));
    const before = queueOf(data, 'straight');
    const slot = before.slots.find(s => s.id === 's0.0.rise')!;
    slot.put(data, '7 1/2');
    const after = queueOf(data, 'straight');
    expect(after.done).toBe(1);
    expect(after.total).toBe(before.total);
    // The filled slot stays addressable so typing never makes the card jump.
    expect(currentItem(after, 's0.0.rise')?.id).toBe('s0.0.rise');
    expect(nextOpenItem(after, 's0.0.rise')?.id).toBe('s0.0.run');
  });

  it('skips forward and back, wrapping round the open items', () => {
    const data = normalizeMeasureData(newMeasureData('straight', 2));
    const q = queueOf(data, 'straight');
    const last = q.open[q.open.length - 1].id;
    expect(nextOpenItem(q, last)?.id).toBe(q.open[0].id);
    expect(nextOpenItem(q, q.open[0].id, -1)?.id).toBe(last);
    expect(nextOpenItem(q, null)?.id).toBe(q.open[0].id);
  });

  it('keeps non-numeric requirements as gaps after the numbers', () => {
    const data = normalizeMeasureData(newMeasureData('straight', 2));
    const q = queueOf(data, 'straight');
    const kinds = q.open.map(i => i.type);
    expect(kinds.indexOf('gap')).toBeGreaterThan(kinds.lastIndexOf('slot') - 1);
    expect(q.open.some(i => i.type === 'gap' && i.gap.key === 'orientation')).toBe(true);
    // Every open requirement is represented exactly once: as numbers or as itself.
    expect(q.open.some(i => i.type === 'gap' && i.gap.key === 'steps')).toBe(false);
  });

  it('asks the turning flights for their own rake and the landing for its sizes', () => {
    const data = normalizeMeasureData(newMeasureData('l_shape', 2));
    const q = queueOf(data, 'l_shape');
    const ids = q.slots.map(s => s.id);
    expect(ids).toContain('s0.rake');
    expect(ids).toContain('s2.rake');
    expect(ids).toEqual(expect.arrayContaining(['s1.length', 's1.depth', 's1.diag']));
    // second flight's steps continue the stair numbering
    const s2 = q.slots.find(s => s.id === 's2.0.rise')!;
    expect(s2.stepNumber).toBe(3);
    expect(s2.flight).toBe(1);
  });

  it('writes through to the multi-flight sheet a slot belongs to', () => {
    const { shape, data } = newPresetMeasureData('multi_flight', 2, 2);
    const q = queueOf(data, shape);
    const slot = q.slots.find(s => s.flight === 1 && s.gap === 'flight_width')!;
    slot.put(data, '36');
    const flights = data.segments.filter(s => s.kind === 'flight') as FlightSegment[];
    expect(flights[1].width).toBe('36');
    expect(flights[0].width).toBe('');
  });

  it('turns a gate sheet into its tape measurements', () => {
    const data = normalizeMeasureData(newMeasureData('gate', 0));
    const q = queueOf(data, 'gate');
    expect(q.open.filter(i => i.type === 'slot').map(i => i.id)).toEqual(expect.arrayContaining(['gate.widthTop', 'gate.heightHinge']));
  });
});
