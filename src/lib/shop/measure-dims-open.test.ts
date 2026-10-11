import { describe, expect, it } from 'vitest';
import { newMeasureData, normalizeMeasureData, blankGate, blankWell, newWallBand, type MeasureData } from './measure';
import { blankOpening, newOpeningUnit, openingFabFinal } from './measure-opening';
import { blankCanopy, canopyFallCalc, newCanopyPost } from './measure-canopy';
import { dimForSlot, sceneDims } from './measure-dims';
import { gateDims, gateLeafCalc } from './measure-dims-gate';
import { openingDims } from './measure-dims-opening';
import { wellDims } from './measure-dims-well';
import { canopyDims } from './measure-dims-canopy';
import { calcCheck, calcState, calcText } from './measure-calc';
import { slotCalc } from './measure-calc-registry';
import { wellGuardCalc } from './measure-calc-open';
import { applyCopy, slotCopy } from './measure-copy';
import { measurementQueue } from './measure-next';
import { sheetReadiness } from './measure-checks';
import { measureScene } from './measure-scene';
import { dimName } from './measure-dims-i18n';
import { nxText } from './measure-next-i18n';

const sheet = (shape: Parameters<typeof newMeasureData>[0]) => normalizeMeasureData(newMeasureData(shape, 1));
const gateSheet = (patch: Partial<ReturnType<typeof blankGate>> = {}) => {
  const d = sheet('gate');
  d.gate = { ...blankGate(), operation: 'single_swing', hingeSide: 'left', swingDir: 'out', widthTop: '48 1/4', widthBottom: '48', heightHinge: '60', ...patch };
  return d;
};
const openingSheet = (n = 2) => {
  const d = sheet('opening');
  d.opening = { ...blankOpening(n), product: 'guard', mount: 'reveal' };
  return d;
};
const fillOpening = (d: MeasureData, i = 0) => Object.assign(d.opening!.units[i], { wTop: '36', wMid: '36 1/8', wBot: '36 1/4', hLeft: '48', hCenter: '48', hRight: '48 1/8', diagA: '60', diagB: '60 1/8', reveal: '4' });
const queueIds = (d: MeasureData, shape: Parameters<typeof newMeasureData>[0]) => measurementQueue(d, shape, sheetReadiness(d, shape).fabGaps).slots.map(s => s.id);

describe('gate: dimension lines and the leaf split', () => {
  it('draws every asked number, each tied to its Next-card slot', () => {
    const dims = gateDims(gateSheet());
    for (const slot of ['gate.widthTop', 'gate.widthBottom', 'gate.heightHinge', 'gate.heightLatch', 'gate.groundClearance', 'gate.gradeRise', 'gate.leafA']) {
      expect(dimForSlot(dims, slot), slot).not.toBeNull();
    }
    expect(dimForSlot(dims, 'gate.widthBottom')!.value).toBe(48);
    expect(dimForSlot(dims, 'gate.heightLatch')!.state).toBe('unknown');
  });

  it('single leaf = tighter width − hinge gap − latch gap (1/2" each by default)', () => {
    expect(gateLeafCalc(gateSheet().gate!).a).toBe(47);
    expect(gateLeafCalc(gateSheet({ hingeGap: '3/4', latchGap: '1' }).gate!).a).toBe(46.25);
  });

  it('double: equal split until leaf A is set, then leaf B takes the rest', () => {
    const g = gateSheet({ operation: 'double_swing', widthTop: '120', widthBottom: '120' }).gate!;
    expect(gateLeafCalc(g)).toEqual({ a: 59.25, b: 59.25, double: true });
    g.leafA = '70';
    expect(gateLeafCalc(g).b).toBe(48.5);
  });

  it('a slide gate has no leaf split and no swing rise line', () => {
    const d = gateSheet({ operation: 'slide' });
    expect(gateLeafCalc(d.gate!).a).toBeNull();
    const keys = gateDims(d).map(x => x.key);
    expect(keys).not.toContain('gate:leafA');
    expect(keys).not.toContain('gate:gradeRise');
  });

  it('shows the clearance left at full open as a calculated line', () => {
    const d = gateSheet({ groundClearance: '3', gradeRise: '1 1/2' });
    const sc = gateDims(d).find(x => x.key === 'gate:swingClear')!;
    expect(sc.state).toBe('calculated');
    expect(sc.calc).toBe(1.5);
  });

  it('the Next card asks the latch post and the leaf, and approves the leaf', () => {
    const d = gateSheet();
    const ids = queueIds(d, 'gate');
    expect(ids).toContain('gate.heightLatch');
    expect(ids).toContain('gate.leafA');
    expect(ids).not.toContain('gate.leafB');
    const c = slotCalc('gate.leafA', d)!;
    c.approve(d);
    expect(d.gate!.leafA).toBe('47"');
    expect(calcState(d.gate!.leafA!, d.gate!.leafASource, c.calc, 'len')).toBe('approved');
    slotCalc('gate.leafA', d)!.read(d, '46 1/2');
    expect(d.gate!.leafASource).toBe('measured');
    expect(calcCheck(47, 46.5, [0.125, 0.5])!.level).toBe('yellow');
  });

  it('a double gate asks both leaves', () => {
    const d = gateSheet({ operation: 'double_swing' });
    expect(queueIds(d, 'gate')).toEqual(expect.arrayContaining(['gate.leafA', 'gate.leafB']));
    expect(slotCalc('gate.leafA', d)!.tol).toBeNull();
  });
});

describe('opening: dimension lines, fabricate-to approve, same size for all', () => {
  it('three widths, three heights, diagonals and reveal per opening', () => {
    const d = openingSheet(1);
    fillOpening(d);
    const id = d.opening!.units[0].id, dims = openingDims(d);
    for (const k of ['wTop', 'wMid', 'wBot', 'hLeft', 'hCenter', 'hRight', 'diagA', 'diagB', 'reveal', 'fabW', 'fabH']) {
      expect(dimForSlot(dims, `op.${id}.${k}`), k).not.toBeNull();
    }
    const diag = dimForSlot(dims, `op.${id}.diagA`)!;
    expect(diag.dashed?.length).toBe(1);
    expect(diag.calc).toBeCloseTo(Math.hypot(36.125, 48), 5);
    expect(dimForSlot(dims, `op.${id}.wMid`)!.scope).toBe('overall');
    expect(dimForSlot(dims, `op.${id}.wTop`)!.parts).toEqual([`opening:${id}`]);
  });

  it('a face-mounted piece never draws the reveal', () => {
    const d = openingSheet(1);
    d.opening!.mount = 'face_out';
    fillOpening(d);
    expect(openingDims(d).some(x => x.key.endsWith(':reveal'))).toBe(false);
  });

  it('asks the fabricate-to size once it can be calculated, and approves it', () => {
    const d = openingSheet(1);
    const id = d.opening!.units[0].id;
    expect(queueIds(d, 'opening')).not.toContain(`op.${id}.fabW`);
    fillOpening(d);
    expect(queueIds(d, 'opening')).toEqual(expect.arrayContaining([`op.${id}.fabW`, `op.${id}.fabH`]));
    const c = slotCalc(`op.${id}.fabW`, d)!;
    expect(c.calc).toBe(35.5);
    c.approve(d);
    expect(d.opening!.units[0].fabW).toBe('35 1/2"');
    slotCalc(`op.${id}.fabH`, d)!.read(d, '47');
    expect(openingFabFinal(d.opening!, d.opening!.units[0])).toEqual({ width: 35.5, height: 47 });
  });

  it('copies one opening\'s size onto the empty openings, with replace-all as the option', () => {
    const d = openingSheet(3);
    fillOpening(d);
    d.opening!.units[2].wTop = '40';
    const [a, b, c] = d.opening!.units;
    const plan = slotCopy(`op.${a.id}.wTop`, d)!;
    expect(plan.labelKey).toBe('nx_copyOpenings');
    expect(plan.targets(false).length).toBe(2);
    const done = applyCopy(d, plan, false);
    expect(done.n).toBe(2);
    expect(b.hCenter).toBe('48');
    expect(c.wTop).toBe('40'); // not overwritten
    expect(c.wMid).toBe('36 1/8');
    const all = slotCopy(`op.${a.id}.wTop`, d)!;
    expect(all.targets(false).length).toBe(0);
    applyCopy(d, all, true);
    expect(c.wTop).toBe('36');
  });

  it('a single opening offers no copy', () => {
    const d = openingSheet(1);
    fillOpening(d);
    expect(slotCopy(`op.${d.opening!.units[0].id}.wTop`, d)).toBeNull();
  });
});

describe('window well: dimension lines and guard height', () => {
  const wellSheet = () => {
    const d = sheet('window_well');
    d.well = { ...blankWell(), lengthAtHouse: '60', projection: '36', depth: '48', wallThickness: '6', topToGrade: '4', deliverables: ['guard', 'gate', 'ladder'] };
    d.well.bands = [{ ...newWallBand('Trim'), setback: '0', fromTop: '0', toTop: '8' }, { ...newWallBand('Siding'), setback: '1', fromTop: '8', toTop: '40' }];
    return d;
  };

  it('draws the footprint, depth, height above grade, bands and what KIW supplies', () => {
    const d = wellSheet(), dims = wellDims(d);
    for (const slot of ['well.lengthAtHouse', 'well.projection', 'well.depth', 'well.wallThickness', 'well.topToGrade', 'well.guardHeight', 'well.postToWall', 'well.gateWidth', 'well.ladderWidth', 'well.ladderSpacing', 'well.ladderStandoff']) {
      expect(dimForSlot(dims, slot), slot).not.toBeNull();
    }
    const siding = d.well!.bands[1].id, trim = d.well!.bands[0].id;
    expect(dimForSlot(dims, `well.band.${siding}.setback`)!.value).toBe(1);
    expect(dimForSlot(dims, `well.band.${trim}.setback`)).toBeNull(); // the proud face itself
  });

  it('no guard: no guard lines, no band or height-above-grade questions', () => {
    const d = wellSheet();
    d.well!.deliverables = ['grate'];
    d.well!.topToGrade = '';
    expect(wellDims(d).some(x => x.key === 'well:guardHeight')).toBe(false);
    const ids = queueIds(d, 'window_well');
    expect(ids.some(i => i.startsWith('well.band.'))).toBe(false);
    expect(ids).not.toContain('well.topToGrade');
  });

  it('guard height is the code height less the wall above grade, approved on the card', () => {
    const d = wellSheet();
    expect(wellGuardCalc(d)).toBe(32);
    d.well!.topToGrade = '-6';
    expect(wellGuardCalc(d)).toBe(42);
    const c = slotCalc('well.guardHeight', d)!;
    c.approve(d);
    expect(d.well!.guardHeight).toBe('42"');
    expect(d.well!.guardHeightSource).toBe('calculated-approved');
  });

  it('asks the bands with the guard', () => {
    const d = wellSheet(), ids = queueIds(d, 'window_well');
    expect(ids).toContain('well.topToGrade');
    expect(ids).toContain(`well.band.${d.well!.bands[1].id}.setback`);
    expect(ids.indexOf('well.topToGrade')).toBeLessThan(ids.indexOf('well.guardHeight'));
  });
});

describe('canopy: dimension lines, fall approve, same for all posts', () => {
  const canopySheet = () => {
    const d = sheet('canopy');
    d.canopy = { ...blankCanopy(), kind: 'entry', roof: 'metal', support: 'posts', width: '96', projection: '48', mount: '96', soffitL: '110', soffitR: '110 1/4' };
    d.canopy.posts = [newCanopyPost('L'), newCanopyPost('R')];
    return d;
  };

  it('draws width, projection, trim heights, underside, fall and every post', () => {
    const d = canopySheet(), dims = canopyDims(d);
    for (const slot of ['cn.width', 'cn.projection', 'cn.soffitL', 'cn.soffitR', 'cn.mount', 'cn.fall', ...d.canopy!.posts.map(p => `cn.post.${p.id}`)]) {
      expect(dimForSlot(dims, slot), slot).not.toBeNull();
    }
    expect(dimForSlot(dims, 'cn.fall')!.state).toBe('calculated');
  });

  it('the fall to approve is the projection at 1/4" per foot, rounded up to 1/8"', () => {
    const d = canopySheet();
    expect(canopyFallCalc(d.canopy!)).toBe(1);
    d.canopy!.projection = '50';
    expect(canopyFallCalc(d.canopy!)).toBe(1.125);
    d.canopy!.roof = 'open';
    expect(canopyFallCalc(d.canopy!)).toBeNull();
  });

  it('approves the fall and copies a post height to the others', () => {
    const d = canopySheet();
    slotCalc('cn.fall', d)!.approve(d);
    expect(d.canopy!.fall).toBe('1"');
    const [p1, p2] = d.canopy!.posts;
    p1.height = '94 1/2';
    const plan = slotCopy(`cn.post.${p1.id}`, d)!;
    expect(plan.targets(false).length).toBe(1);
    applyCopy(d, plan, false);
    expect(p2.height).toBe('94 1/2');
  });
});

describe('roll-out wiring', () => {
  it('sceneDims and the 3D carry the lines for each shape', () => {
    const d = gateSheet();
    expect(sceneDims(d, 'gate').length).toBeGreaterThan(5);
    expect(measureScene(d, 'gate').lines.some(l => l.id === 'dimline:gate:widthTop')).toBe(true);
  });

  it('every new label and line name exists in EN, PT and ES', () => {
    for (const k of ['gateLeafA', 'gateLeafB', 'nx_fabW', 'nx_fabH', 'nx_copyOpenings', 'nx_copyPosts', 'nx_copiedOpenings', 'nx_copiedPost1']) {
      for (const l of ['en', 'pt', 'es']) expect(nxText(l, k), `${k}/${l}`).toBeTruthy();
    }
    expect(dimName('pt', 'gateHeightLatch')).toBe('Poste do trinco');
    expect(dimName('es', 'cnFall')).toBe('Caída');
  });

  it('a calculated length is stored in shop notation', () => {
    expect(calcText(35.5, 'len')).toBe('35 1/2"');
    expect(calcText(33.44, 'deg')).toBe('33.4');
  });
});
