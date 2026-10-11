import { describe, expect, it } from 'vitest';
import { newMeasureData, normalizeMeasureData, type MeasureData, type MeasureShape } from './measure';
import { sheetReadiness } from './measure-checks';
import { dimForSlot, sceneDims } from './measure-dims';
import { measurementQueue, slotCopyTargets, copySlotValue } from './measure-next';
import { calcCheck, calcState, calcText, LEN_TOL } from './measure-calc';
import { slotCalc } from './measure-calc-registry';
import { slotCopy, applyCopy } from './measure-copy';
import { structuralSlotCalc } from './measure-dims-structural';
import { fireStackCalc, fireStairAngleCalc } from './measure-dims-fire';
import { spiralRiserCalc, spiralTreadAngleCalc } from './measure-dims-spiral';
import { spBuildSize } from './measure-dims-shop-piece';
import { bracketText, sheetBracketCount, suggestBrackets } from './measure-post-suggest-wall-rail';
import { bracketPositions } from './scene-shapes/scene-wall-rail';
import { measureScene } from './measure-scene';
import { newShopPiece } from './measure-shop-piece';
import { newMember } from './measure-structural';
import { fireFixture, spiralFixture, structuralFixture, wallRailFixture } from './scene-shapes/scene-shapes-b.fixture';

const queueOf = (data: MeasureData, shape: MeasureShape) => measurementQueue(data, shape, sheetReadiness(data, shape).fabGaps);
const slot = (data: MeasureData, shape: MeasureShape, id: string) => queueOf(data, shape).slots.find(s => s.id === id)!;

function nicheFixture(): MeasureData {
  const d = normalizeMeasureData(newMeasureData('shop_piece', 1)), s = d.shopPiece!;
  s.niche = true; s.clearance = '1/4"';
  const p = (label: string) => newShopPiece({ label, type: 'wine_rack', wBack: '36 1/8', wFront: '36', wTop: '36 1/4', wBottom: '36', hLeft: '84', hRight: '84 1/8', hBack: '84', dTop: '14', dBottom: '14 1/8', diagA: '91 3/8', diagB: '91 1/2' });
  s.pieces = [p('A'), { ...p('B'), wFront: '', wBack: '' }, newShopPiece({ label: 'C', type: 'bar_frame' })];
  return d;
}

describe('structural dimension lines', () => {
  it('a moment frame draws c/c, opening, both column heights and both diagonals, each lit by its Next slot', () => {
    const d = structuralFixture(), dims = sceneDims(d, 'structural');
    const keys = dims.map(x => x.key);
    expect(keys).toEqual(expect.arrayContaining(['st:frame:cc', 'st:frame:opening', 'st:frame:diagA', 'st:frame:diagB']));
    expect(dims.find(x => x.key === 'st:frame:cc')).toMatchObject({ value: 138, state: 'measured', scope: 'overall' });
    const [, c1, c2] = d.structural!.members;
    expect(dimForSlot(dims, 'st.frame.cc')?.key).toBe('st:frame:cc');
    expect(dimForSlot(dims, `st.${c1.id}.h.${c1.heights[1].id}`)?.key).toBe(`st:h:${c1.id}:0`);
    expect(dimForSlot(dims, `st.${c2.id}.h.${c2.heights[0].id}`)?.key).toBe(`st:h:${c2.id}:1`);
    // Every line has geometry to draw and a place for its value.
    for (const x of dims) expect(x.lines.length + (x.dashed?.length ?? 0)).toBeGreaterThan(0);
  });
  it('a beam draws its span twice, both bearings and walls, and the cut', () => {
    const d = normalizeMeasureData(newMeasureData('structural', 0)), s = d.structural!;
    const b = newMember('beam', 'B1', 'W8x15');
    Object.assign(b, { spanA: '120', spanB: '120 1/4' });
    b.bearingL.length = '4'; b.bearingR.length = '4';
    s.members = [b];
    const dims = sceneDims(d, 'structural');
    for (const id of ['spanA', 'spanB', 'bearingL.length', 'bearingR.length', 'bearingL.wall', 'bearingR.wall', 'cut']) expect(dimForSlot(dims, `st.${b.id}.${id}`)).not.toBeNull();
    expect(dims.find(x => x.key === `st:cut:${b.id}`)).toMatchObject({ calc: 128.25, state: 'calculated' });
  });
  it('approves the cut length with its weight, and diagonal B against A', () => {
    const d = structuralFixture(), [beam] = d.structural!.members;
    const r = structuralSlotCalc(`st.${beam.id}.cut`, d)!;
    expect(r.calc).toBeCloseTo(138 + 6.2, 1);
    expect(r.note).toMatch(/lb/);
    expect(structuralSlotCalc('st.frame.diagB', d)?.calc).toBeNull();
    d.structural!.frame.diagA = '172 1/2';
    expect(structuralSlotCalc('st.frame.diagB', d)?.calc).toBe(172.5);
  });
  it('asks the cut once it can be worked out, and copies a column height to every column', () => {
    const d = structuralFixture(), [beam, c1, c2] = d.structural!.members;
    const q = queueOf(d, 'structural');
    expect(q.slots.some(s => s.id === `st.${beam.id}.cut`)).toBe(true);
    c1.heights[1].value = ''; c2.heights.forEach(r => { r.value = ''; });
    const from = slot(d, 'structural', `st.${c1.id}.h.${c1.heights[0].id}`);
    const slots = queueOf(d, 'structural').slots;
    expect(slotCopyTargets(slots, d, from).length).toBe(3);
    expect(copySlotValue(slots, d, from)).toBe(3);
    expect(c2.heights.map(r => r.value)).toEqual(['92 1/2', '92 1/2']);
  });
});

describe('fire escape dimension lines', () => {
  it('chains floor to floor up the side, and lights each level\'s platform, stair and the ladder', () => {
    const d = fireFixture(), dims = sceneDims(d, 'fire_escape');
    expect(dims.filter(x => x.kind === 'fireFtf')).toHaveLength(2);
    for (const id of ['fire.totalHeight', 'fire.l0.floorToFloor', 'fire.l1.platLength', 'fire.l0.platWidth', 'fire.l0.stairRise', 'fire.l0.stairRun', 'fire.l1.stairAngle', 'fire.ladder.length', 'fire.ladder.rungSpacing'])
      expect(dimForSlot(dims, id), id).not.toBeNull();
    // The lowest level drops a ladder: no stair lines there.
    expect(dimForSlot(dims, 'fire.l2.stairRise')).toBeNull();
    expect(dims.find(x => x.key === 'fire:total')?.calc).toBeCloseTo(fireStackCalc(d)!);
  });
  it('offers each stair angle to approve, only on levels with a stair', () => {
    const d = fireFixture(), q = queueOf(d, 'fire_escape');
    expect(q.slots.filter(s => s.id.endsWith('.stairAngle')).map(s => s.id)).toEqual(['fire.l0.stairAngle', 'fire.l1.stairAngle']);
    const s = q.slots.find(x => x.id === 'fire.l0.stairAngle')!, c = slotCalc(s.id, d)!;
    expect(c.calc).toBeCloseTo(fireStairAngleCalc(d.fire!.levels[0])!);
    c.approve(d);
    expect(d.fire!.levels[0].stairAngle).toBe(calcText(c.calc!, 'deg'));
    expect(d.calcSources?.['fire.l0.stairAngle']).toBe('calculated-approved');
    expect(calcState(d.fire!.levels[0].stairAngle, d.calcSources?.['fire.l0.stairAngle'], c.calc, 'deg')).toBe('approved');
    c.read(d, '50');
    expect(d.calcSources?.['fire.l0.stairAngle']).toBe('measured');
  });
  it('copies a level\'s number to the other floors, never a height above grade, never a stair onto the ladder level', () => {
    const d = fireFixture();
    d.fire!.levels.forEach((l, i) => { if (i) { l.guardHeight = ''; l.stairRise = ''; } });
    const q = queueOf(d, 'fire_escape');
    const guard = q.slots.find(s => s.id === 'fire.l0.guardHeight')!;
    expect(guard.copyNoun).toBe('levels');
    expect(slotCopyTargets(q.slots, d, guard).map(s => s.id)).toEqual(['fire.l1.guardHeight', 'fire.l2.guardHeight']);
    const rise = q.slots.find(s => s.id === 'fire.l0.stairRise')!;
    expect(slotCopyTargets(q.slots, d, rise).map(s => s.id)).toEqual(['fire.l1.stairRise']);
    expect(q.slots.find(s => s.id === 'fire.l0.heightAboveGrade')?.copyKey).toBeUndefined();
  });
});

describe('spiral dimension lines', () => {
  it('draws floor to floor and diameter always, riser, tread angle and rotation when asked', () => {
    const d = spiralFixture();
    d.spiral!.treads = '12';
    const dims = sceneDims(d, 'spiral');
    for (const id of ['spiral.f2f', 'spiral.dia', 'spiral.riser', 'spiral.treadAngle', 'spiral.rotation']) expect(dimForSlot(dims, id), id).not.toBeNull();
    expect(dims.find(x => x.key === 'spiral:riser')?.calc).toBeCloseTo(104 / 12);
    expect(dims.find(x => x.key === 'spiral:f2f')?.scope).toBe('overall');
  });
  it('asks treads and rotation, then offers riser = f2f ÷ treads and tread angle = rotation ÷ treads', () => {
    const d = spiralFixture();
    d.spiral!.treads = '';
    let ids = queueOf(d, 'spiral').slots.map(s => s.id);
    expect(ids).toEqual(expect.arrayContaining(['spiral.f2f', 'spiral.treads', 'spiral.dia', 'spiral.rotation']));
    expect(ids).not.toContain('spiral.riser');
    d.spiral!.treads = '13';
    ids = queueOf(d, 'spiral').slots.map(s => s.id);
    expect(ids.indexOf('spiral.riser')).toBe(ids.indexOf('spiral.treads') + 1);
    expect(spiralRiserCalc(d)).toBeCloseTo(8);
    expect(spiralTreadAngleCalc(d)).toBeCloseTo(360 / 13);
    const c = slotCalc('spiral.riser', d)!;
    expect(c.note).toBe('104" ÷ 13');
    c.approve(d);
    expect(d.spiral!.riser).toBe('8"');
  });
});

describe('wall rail brackets', () => {
  it('suggests a bracket near each end and evenly between, none over 48"', () => {
    const l = suggestBrackets(150);
    expect(l.posts[0].at).toBe(6);
    expect(l.posts[l.posts.length - 1].at).toBe(144);
    expect(l.count).toBe(4);
    expect(l.spanEach).toBeCloseTo(46);
    expect(bracketText(l)).toBe('4 @ 46"');
    expect(suggestBrackets(150, 6).spanEach).toBeCloseTo(138 / 5);
    expect(suggestBrackets(150, 1).count).toBe(2);
  });
  it('the 3D hangs the sheet\'s plan, or the suggestion while the field is blank', () => {
    const d = wallRailFixture();
    expect(sheetBracketCount(d)).toBe(4);
    expect(bracketPositions(d, 150)).toHaveLength(4);
    d.rail.brackets = '';
    expect(bracketPositions(d, 150)).toEqual(suggestBrackets(150).posts.map(p => p.at));
  });
  it('draws the stair\'s lines plus bracket spacing and extensions', () => {
    const d = wallRailFixture(), dims = sceneDims(d, 'wall_rail');
    expect(dims.some(x => x.key === 'f2f')).toBe(true);
    expect(dims.find(x => x.key === 'wr:bracket')?.value).toBe(32);
    expect(dims.filter(x => x.kind === 'extension')).toHaveLength(2);
    expect(measureScene(d, 'wall_rail').lines.some(l => l.dim?.key === 'wr:bracket')).toBe(true);
  });
});

describe('shop piece dimension lines', () => {
  it('draws every niche reading and the build size; approve fabricate-to = tightest less clearance', () => {
    const d = nicheFixture(), [a] = d.shopPiece!.pieces, dims = sceneDims(d, 'shop_piece');
    for (const k of ['wBack', 'wFront', 'wTop', 'wBottom', 'hLeft', 'hRight', 'hBack', 'dTop', 'dBottom', 'diagA', 'diagB', 'fabW', 'fabH', 'fabD'])
      expect(dimForSlot(dims, `sp.${a.id}.${k}`), k).not.toBeNull();
    const c = slotCalc(`sp.${a.id}.fabW`, d)!;
    expect(c.calc).toBe(35.5);
    expect(c.note).toBe('36" − 2 × 1/4"');
    c.approve(d);
    expect(a.fabW).toBe('35 1/2"');
    a.fabW = '35 1/4';
    expect(spBuildSize(d.shopPiece!, a).width).toBe(35.25);
  });
  it('copies a reading to the other pieces of the same type only', () => {
    const d = nicheFixture(), [a, b] = d.shopPiece!.pieces, q = queueOf(d, 'shop_piece');
    const from = q.slots.find(s => s.id === `sp.${a.id}.wFront`)!;
    expect(from.copyNoun).toBe('pieces');
    expect(slotCopyTargets(q.slots, d, from).map(s => s.id)).toEqual([`sp.${b.id}.wFront`]);
  });
});

describe('approve / modify on the shared registry', () => {
  it('holds a length to the shared bands and stores the shop notation', () => {
    expect(calcCheck(100, 100.125, LEN_TOL, 'len')?.level).toBe('green');
    expect(calcCheck(100, 100.25, LEN_TOL, 'len')?.level).toBe('yellow');
    expect(calcCheck(100, 101, LEN_TOL, 'len')?.level).toBe('red');
    expect(calcText(8.0625, 'len')).toBe('8 1/16"');
    expect(calcState('8"', 'calculated-approved', 8.2, 'len')).toBe('measured');
  });
  it('offers Same for all floors through the copy registry, with Undo-able writes', () => {
    const d = fireFixture();
    d.fire!.levels.forEach((l, i) => { if (i) l.guardHeight = ''; });
    const plan = slotCopy('fire.l0.guardHeight', d)!;
    expect(plan.labelKey).toBe('nx_copyAll_levels');
    const r = applyCopy(d, plan, false);
    expect(r.n).toBe(2);
    expect(d.fire!.levels.map(l => l.guardHeight)).toEqual(['42', '42', '42']);
    expect(slotCopy('fire.l0.heightAboveGrade', d)).toBeNull();
  });
});
