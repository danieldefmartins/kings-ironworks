import { describe, expect, it } from 'vitest';
import { newMeasureData, newPresetMeasureData, normalizeMeasureData, type FlightSegment } from './measure';
import { sheetReadiness } from './measure-checks';
import { currentItem, measurementQueue, nextOpenItem } from './measure-next';
import { applyTemplate } from './measure-structural';

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

// ---- Every work type walks its own job ----------------------------------------
type Shape = Parameters<typeof sheetReadiness>[1];
const labels = (data: ReturnType<typeof newMeasureData>, shape: Shape) =>
  queueOf(data, shape).open.flatMap(i => (i.type === 'slot' ? [i.slot.labelKey] : []));

describe('walking order per work type', () => {
  it('opening: across, down, corner to corner, then the reveal — one opening at a time', () => {
    const data = normalizeMeasureData(newMeasureData('opening', 0));
    data.opening!.mount = 'reveal';
    data.opening!.units.push({ ...data.opening!.units[0], id: 'o2', label: 'Bedroom 2' });
    const q = queueOf(data, 'opening');
    const walk = q.open.flatMap(i => (i.type === 'slot' ? [`${i.slot.detail}:${i.slot.labelKey}`] : []));
    const one = ['nx_wTop', 'nx_wMid', 'nx_wBot', 'nx_hLeft', 'nx_hCenter', 'nx_hRight', 'nx_diagA', 'nx_diagB', 'nx_reveal'];
    expect(walk).toEqual([...one.map(k => `#1:${k}`), ...one.map(k => `Bedroom 2:${k}`)]);
    // The width / height / diagonal requirements are carried by the numbers; choices follow them.
    expect(q.open.some(i => i.type === 'gap' && /^op_(widths|heights|diagonals|reveal)$/.test(i.gap.key))).toBe(false);
    expect(q.open.some(i => i.type === 'gap' && i.gap.key === 'op_product')).toBe(true);
  });

  it('opening: face-mounted skips the reveal; a Juliet and a door add their own numbers last', () => {
    const data = normalizeMeasureData(newMeasureData('opening', 0));
    data.opening!.mount = 'face_out';
    data.opening!.product = 'juliet';
    expect(labels(data, 'opening')).toEqual(['nx_wTop', 'nx_wMid', 'nx_wBot', 'nx_hLeft', 'nx_hCenter', 'nx_hRight', 'nx_diagA', 'nx_diagB', 'nx_julietSill', 'nx_julietProjection']);
    data.opening!.product = 'security_door';
    expect(labels(data, 'opening').slice(-1)).toEqual(['nx_threshold']);
  });

  it('opening: a number typed on the card lands on the opening it belongs to', () => {
    const data = normalizeMeasureData(newMeasureData('opening', 0));
    queueOf(data, 'opening').slots[0].put(data, "3' 4-1/2\"");
    expect(data.opening!.units[0].wTop).toBe("3' 4-1/2\"");
    expect(queueOf(data, 'opening').done).toBe(1);
  });

  it('structural beam: span at the top and bottom, then the left bearing and wall, then the right', () => {
    const data = normalizeMeasureData(newMeasureData('structural', 0));
    applyTemplate(data.structural!, 'beam');
    expect(labels(data, 'structural')).toEqual(['nx_spanA', 'nx_spanB', 'nx_bearingL', 'nx_wallL', 'nx_bearingR', 'nx_wallR', 'nx_maxLength']);
    // A beam bearing on wood needs no wall thickness at that end.
    data.structural!.members[0].bearingL.substrate = 'wood';
    expect(labels(data, 'structural')).toEqual(['nx_spanA', 'nx_spanB', 'nx_bearingL', 'nx_bearingR', 'nx_wallR', 'nx_maxLength']);
  });

  it('structural frame: each column at every reading, then the opening, centre to centre and diagonals', () => {
    const data = normalizeMeasureData(newMeasureData('structural', 0));
    applyTemplate(data.structural!, 'frame');
    const walk = queueOf(data, 'structural').open.flatMap(i => (i.type === 'slot' ? [`${i.slot.group?.label ?? ''}:${i.slot.labelKey}`] : []));
    expect(walk).toEqual(['C1:nx_colHeight', 'C1:nx_colHeight', 'C2:nx_colHeight', 'C2:nx_colHeight', ':nx_frameOpening', ':nx_frameCc', ':nx_diagA', ':nx_diagB', ':nx_maxLength']);
  });

  it('structural: one height in still asks for the second; a deleted reading row falls back to the requirement', () => {
    const data = normalizeMeasureData(newMeasureData('structural', 0));
    applyTemplate(data.structural!, 'columns');
    const col = data.structural!.members[0];
    col.heights[0].value = '96';
    let q = queueOf(data, 'structural');
    expect(q.open[0].type === 'slot' && q.open[0].slot.reading).toBe(2);
    col.heights.splice(1, 1);
    q = queueOf(data, 'structural');
    expect(q.open.some(i => i.type === 'gap' && i.gap.key === 'struct_heights_second')).toBe(true);
  });

  it('fence and deck walk the run piece by piece before the totals that check it', () => {
    const f = labels(normalizeMeasureData(newMeasureData('fence', 2)), 'fence');
    expect(f.indexOf('fenceSegLength')).toBeGreaterThanOrEqual(0);
    expect(f.indexOf('fenceSegLength')).toBeLessThan(f.indexOf('fenceTotalRun'));
    const d = labels(normalizeMeasureData(newMeasureData('deck', 2)), 'deck');
    expect(d.indexOf('deckSideLength')).toBeGreaterThanOrEqual(0);
    expect(d.indexOf('deckSideLength')).toBeLessThan(d.indexOf('deckTotalPerimeter'));
  });

  it('gives every other work type a sensible first number', () => {
    const first: [Shape, string][] = [
      ['gate', 'gateWidthTop'], ['balcony', 'balEdgeLength'], ['window_well', 'wellLengthAtHouse'], ['fire_escape', 'fireTotalHeight'],
      ['spiral', 'floorToFloor'], ['ramp', 'segmentRise'], ['wall_rail', 'rise'], ['straight', 'rise'], ['custom', 'railHeight'],
    ];
    for (const [shape, key] of first) expect(labels(normalizeMeasureData(newMeasureData(shape, 2)), shape)[0]).toBe(key);
  });
});
