import { describe, expect, it } from 'vitest';
import { blankWell, newMeasureData, normalizeMeasureData, type MeasureData } from './measure';
import { alongStart, wellGateSwing, wellGuardLayout, wellLadderLayout } from './measure-well-layout';
import { requiredGaps } from './measure-checks';
import { measurementQueue, nextOpenItem } from './measure-next';
import { gapChoices } from './measure-next-choices';
import { dimForSlot } from './measure-dims';
import { wellDims } from './measure-dims-well';
import { windowWellScene } from './scene-shapes/scene-window-well';

const sheet = () => normalizeMeasureData(newMeasureData('window_well', 1));
const gapKeys = (d: MeasureData) => requiredGaps(d, 'window_well').map((g) => g.key);
const queue = (d: MeasureData) => measurementQueue(d, 'window_well', requiredGaps(d, 'window_well').filter((g) => (g.tier || 'fab') === 'fab'));
const base = { length: 96, projection: 44, wall: 8, postWidth: 2, gapToWall: 3 };

describe('window well layout', () => {
  it('places something at the start, centre, end or a measured offset of its run', () => {
    expect(alongStart(60, 30, 'start', null)).toBe(0);
    expect(alongStart(60, 30, 'center', null)).toBe(15);
    expect(alongStart(60, 30, '', null)).toBe(15);
    expect(alongStart(60, 30, 'end', null)).toBe(30);
    expect(alongStart(60, 30, 'offset', 8)).toBe(8);
    expect(alongStart(60, 30, 'offset', 99)).toBe(30); // never past the end
    expect(alongStart(60, 16, 'start', null, 4)).toBe(4);
  });

  it('draws a U: a front run and a return down each side, end posts off the wall', () => {
    const l = wellGuardLayout(base);
    expect(l.gate).toBeNull();
    expect(l.bays).toHaveLength(3);
    expect(l.posts).toHaveLength(4);
    // End post centres: half a wall in from each side, gap + half a post off the house.
    expect(l.runs[0].a).toEqual({ x: 4, y: -4 });
    expect(l.runs[2].a).toEqual({ x: 92, y: -4 });
    expect(l.runs[1].a.y).toBe(-40);
  });

  it('keeps the old picture when nothing says where the gate is: centred in the front', () => {
    const l = wellGuardLayout({ ...base, gate: { run: '', at: '', offset: null, width: 30 } });
    expect(l.gate!.run).toBe('front');
    expect(l.gate!.a.x).toBeCloseTo(4 + (88 - 30) / 2);
    expect(l.bays).toHaveLength(4);
    expect(l.posts).toHaveLength(6);
  });

  it('puts the gate at one end of a side run, sharing the corner post', () => {
    const l = wellGuardLayout({ ...base, gate: { run: 'right', at: 'end', offset: null, width: 30 } });
    const g = l.gate!;
    expect(g.run).toBe('right');
    expect(g.b).toEqual({ x: 92, y: -40 }); // the front-right corner post is its gate post
    expect(g.a).toEqual({ x: 92, y: -10 });
    expect(l.posts).toHaveLength(5); // one extra post, not two
    expect(l.bays).toHaveLength(3); // left, front, and what is left of the right run
  });

  it('never draws a gate wider than its run', () => {
    const g = wellGuardLayout({ ...base, gate: { run: 'left', at: 'center', offset: null, width: 80 } }).gate!;
    expect(g.clamped).toBe(true);
    expect(g.width).toBe(36);
  });

  it('hinges and swings as seen from outside, facing the gate', () => {
    const front = wellGuardLayout({ ...base, gate: { run: 'front', at: 'center', offset: null, width: 30 } }).gate!;
    const fl = wellGateSwing(front, 'left', 'out');
    expect(fl.hinge).toEqual(front.a); // left of the front run is its low-x end
    expect(Math.sin(fl.to)).toBeCloseTo(-1); // opens away from the house (−y)
    expect(Math.sin(wellGateSwing(front, 'left', 'in').to)).toBeCloseTo(1);
    expect(wellGateSwing(front, 'right', 'out').hinge).toEqual(front.b);
    // On the left run the house is on the viewer's left; on the right run it is on the right.
    const left = wellGuardLayout({ ...base, gate: { run: 'left', at: 'center', offset: null, width: 20 } }).gate!;
    expect(wellGateSwing(left, 'left', 'out').hinge).toEqual(left.a);
    expect(Math.cos(wellGateSwing(left, 'left', 'out').to)).toBeCloseTo(-1); // out is −x
    const right = wellGuardLayout({ ...base, gate: { run: 'right', at: 'center', offset: null, width: 20 } }).gate!;
    expect(wellGateSwing(right, 'right', 'out').hinge).toEqual(right.a);
    expect(Math.cos(wellGateSwing(right, 'right', 'out').to)).toBeCloseTo(1);
    // A quarter turn, never the long way round.
    for (const s of [fl, wellGateSwing(right, 'left', 'in')]) expect(Math.abs(s.to - s.from)).toBeCloseTo(Math.PI / 2);
  });

  it('stands the ladder on any wall, off-centre', () => {
    const inside = { x0: 8, x1: 88, y0: -36, y1: 0 };
    const far = wellLadderLayout({ inside, wall: '', at: '', offset: null, width: 16, standoff: 6 });
    expect(far.wall).toBe('far');
    expect((far.railA.x + far.railB.x) / 2).toBe(48);
    expect(far.railA.y).toBe(-30); // 6" off the far wall, into the well
    const left = wellLadderLayout({ inside, wall: 'left', at: 'end', offset: null, width: 16, standoff: 6 });
    expect(left.railA.x).toBe(14);
    expect(left.wallB.y).toBe(-32); // 4" off the far corner until its offset is read
    const house = wellLadderLayout({ inside, wall: 'house', at: 'offset', offset: 10, width: 16, standoff: 6 });
    expect(house.wallA).toEqual({ x: 18, y: 0 });
    expect(house.railA.y).toBe(-6);
    expect(wellLadderLayout({ inside, wall: 'right', at: 'start', offset: null, width: 16, standoff: 6 }).railA.x).toBe(82);
  });
});

describe('window well scene', () => {
  it('opens a new sheet on a picture: well, house and a preview guard', () => {
    const d = sheet(), s = windowWellScene(d);
    expect(d.well!.deliverables).toEqual(['guard']);
    for (const id of ['well:liner', 'house:well', 'well:guard', 'well:posts']) expect(s.meshes.some((m) => m.id === id)).toBe(true);
    // Nothing is measured yet: every piece of it is a preview, and the sheet still says what is missing.
    for (const id of ['well:liner', 'well:guard', 'well:posts']) expect(s.meshes.find((m) => m.id === id)!.provisional).toBe(true);
    expect(s.pending).toContain('Well · length at house');
  });

  it('draws the gate, the ladder and a clip at each return where the sheet says', () => {
    const d = sheet(), w = d.well!;
    Object.assign(w, { lengthAtHouse: '96', projection: '44', wallThickness: '8', depth: '54', topToGrade: '6', guardHeight: '36', postToWall: '3', deliverables: ['guard', 'gate', 'ladder'], gateWidth: '30', gateRun: 'right', gateAt: 'end', gateHinge: 'left', gateSwing: 'out', ladderWall: 'left', ladderAt: 'end', ladderWidth: '16', ladderSpacing: '12', ladderStandoff: '6', returnLeft: 'clip', returnRight: 'post' });
    d.materials.post = '2x2'; d.materials.topRail = '2x2';
    const s = windowWellScene(d), mesh = (id: string) => s.meshes.find((m) => m.id === id);
    const xs = (id: string) => mesh(id)!.vertices.map((v) => v.x);
    // Gate on the right run, ladder against the left wall.
    expect(Math.min(...xs('well:gate'))).toBeGreaterThan(80);
    expect(Math.max(...xs('well:ladder'))).toBeLessThan(20);
    expect(mesh('well:gate')!.provisional).toBe(false);
    expect(mesh('well:guard')!.provisional).toBe(false);
    // The swing is a closed wedge from the hinge post.
    const swing = s.lines.find((l) => l.id === 'well:gate-swing')!;
    expect(swing.points[0]).toEqual(swing.points[swing.points.length - 1]);
    // Only the clipped return reaches the house face.
    const clip = mesh('well:return-clip:left')!;
    expect(Math.max(...clip.vertices.map((v) => v.y))).toBeCloseTo(0);
    expect(mesh('well:return-clip:right')).toBeUndefined();
    // The walls between the opening view and the ladder go see-through.
    expect(mesh('well:liner-near')!.kind).toBe('wall-preview');
    expect(s.pending).toEqual([]);
  });

  it('follows the gate and the ladder with their dimension lines', () => {
    const d = sheet(), w = d.well!;
    Object.assign(w, { lengthAtHouse: '96', projection: '44', wallThickness: '8', deliverables: ['guard', 'gate', 'ladder'], gateRun: 'right', gateAt: 'end', ladderWall: 'left' });
    const dims = wellDims(d), gate = dimForSlot(dims, 'well.gateWidth')!, ladder = dimForSlot(dims, 'well.ladderWidth')!;
    expect(gate.anchor.x).toBeGreaterThan(80);
    expect(ladder.anchor.x).toBeLessThan(20);
    // The one-tap questions light the same lines; each return has its own.
    expect(dimForSlot(dims, 'well.gateRun')).toBe(gate);
    expect(dimForSlot(dims, 'well.ladderWall')).toBe(ladder);
    expect(dimForSlot(dims, 'well.returnLeft')!.anchor.x).toBeLessThan(dimForSlot(dims, 'well.returnRight')!.anchor.x);
  });
});

describe('window well questions', () => {
  it('asks what we are making first, then where things go, then the numbers', () => {
    const d = sheet(), q = queue(d);
    expect(q.open[0]).toMatchObject({ type: 'gap', lead: true, gap: { key: 'well_scope' } });
    // Ticking a gate and a ladder brings their questions up before any number.
    const scope = gapChoices({ key: 'well_scope' }, 'en', d)!;
    expect(scope.multi!.selected).toEqual(['guard']);
    scope.put(d, 'gate'); scope.put(d, 'ladder'); scope.multi!.done(d);
    expect(d.well!.deliverables).toEqual(['guard', 'gate', 'ladder']);
    const order = queue(d).open.map((i) => (i.type === 'gap' ? i.gap.key : i.slot.id));
    expect(order.slice(0, 8)).toEqual(['well_gate_run', 'well_gate_at', 'well_gate_hinge', 'well_gate_swing', 'well_ladder_wall', 'well_ladder_at', 'well_return_left', 'well_return_right']);
    expect(order[8]).toBe('well.lengthAtHouse');
    for (const id of ['well.projection', 'well.wallThickness', 'well.depth', 'well.topToGrade', 'well.guardHeight', 'well.postToWall', 'well.gateWidth', 'well.ladderWidth', 'well.ladderSpacing', 'well.ladderStandoff']) expect(order).toContain(id);
  });

  it('walks on from a one-tap question to the next one, then to the first number', () => {
    const d = sheet(); d.well!.scopeConfirmed = true;
    const q = queue(d), ids = q.open.map((i) => i.id);
    expect(nextOpenItem(q, ids[0])!.id).toBe(ids[1]);
    expect(nextOpenItem(q, ids[1])!.id).toBe('well.lengthAtHouse');
  });

  it('answers each layout question in one tap', () => {
    const d = sheet(); d.well!.deliverables = ['guard', 'gate', 'ladder']; d.well!.scopeConfirmed = true;
    const tap = (key: string, value: string) => { const c = gapChoices({ key }, 'en', d)!; expect(c.options.map((o) => o.value)).toContain(value); c.put(d, value); };
    tap('well_gate_run', 'right'); tap('well_gate_at', 'end'); tap('well_gate_hinge', 'left'); tap('well_gate_swing', 'out');
    tap('well_ladder_wall', 'left'); tap('well_ladder_at', 'end'); tap('well_return_left', 'clip'); tap('well_return_right', 'clip');
    expect(d.well).toMatchObject({ gateRun: 'right', gateAt: 'end', gateHinge: 'left', gateSwing: 'out', ladderWall: 'left', ladderAt: 'end', returnLeft: 'clip', returnRight: 'clip' });
    expect(queue(d).open.every((i) => i.type === 'slot' || !i.lead)).toBe(true);
    // The ends of a side run are named by what is there, in every language.
    expect(gapChoices({ key: 'well_gate_at' }, 'en', d)!.options.map((o) => o.label)).toEqual(['At the house', 'Center', 'At the front corner']);
    expect(gapChoices({ key: 'well_gate_hinge' }, 'pt', d)!.options.map((o) => o.label)).toEqual(['Lado da frente', 'Lado da casa']);
    d.well!.gateRun = 'front';
    expect(gapChoices({ key: 'well_gate_at' }, 'es', d)!.options.map((o) => o.label)).toEqual(['Extremo izquierdo', 'Centro', 'Extremo derecho']);
  });

  it('asks only what the piece being made needs', () => {
    const d = sheet(); d.well!.scopeConfirmed = true;
    const guardOnly = gapKeys(d);
    for (const k of ['well_construction', 'well_wall_ref', 'well_wall_bands', 'well_depth', 'span_missing', 'max_piece', 'returns', 'rail_height']) expect(guardOnly).not.toContain(k);
    for (const k of ['well_length', 'well_projection', 'well_thickness', 'well_guard_height', 'well_post_to_wall', 'well_return_left', 'well_return_right']) expect(guardOnly).toContain(k);
    d.well!.deliverables = ['ladder'];
    const ladderOnly = gapKeys(d);
    for (const k of ['well_depth', 'well_ladder_wall', 'well_ladder_at', 'well_ladder_width', 'well_ladder_spacing', 'well_ladder_standoff']) expect(ladderOnly).toContain(k);
    for (const k of ['well_thickness', 'well_ladder_rungs', 'well_guard_height', 'mat_post']) expect(ladderOnly).not.toContain(k);
    // A measured position asks for its number.
    d.well!.ladderAt = 'offset';
    expect(gapKeys(d)).toContain('well_ladder_offset');
  });

  it('loads a sheet saved before these questions existed, unchanged', () => {
    const old = sheet(), w = old.well as unknown as Record<string, unknown>;
    Object.assign(w, { deliverables: ['guard', 'gate'], gateSwing: 'out', gateHinge: 'left' });
    for (const k of ['scopeConfirmed', 'gateRun', 'gateAt', 'gateOffset', 'returnLeft', 'returnRight', 'ladderWall', 'ladderAt', 'ladderOffset']) delete w[k];
    const d = normalizeMeasureData(JSON.parse(JSON.stringify(old)));
    expect(d.well).toMatchObject({ scopeConfirmed: true, gateRun: '', gateAt: '', returnLeft: '', ladderWall: '', deliverables: ['guard', 'gate'] });
    expect(gapKeys(d)).not.toContain('well_scope');
    // Drawn where it always was: the gate centred in the front run, no clips.
    const s = windowWellScene(d);
    expect(s.meshes.some((m) => m.id.startsWith('well:return-clip'))).toBe(false);
    // A sheet with nothing ticked is asked.
    const empty = sheet(); empty.well = { ...blankWell(), deliverables: [] };
    delete (empty.well as unknown as Record<string, unknown>).scopeConfirmed;
    expect(gapKeys(normalizeMeasureData(JSON.parse(JSON.stringify(empty))))).toContain('well_scope');
  });
});
