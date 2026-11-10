// Owner's rule: every question the Next card asks is marked on the sketch in
// the highlight colour, so someone who does not know the word can see what is
// being asked. A typed number resolves to a mark — its dimension line, or the
// step face / landing it sits on — on a blank sheet of every shape and all the
// way through filling it in. A new slot without a mark fails here.
import { describe, expect, it } from 'vitest';
import { MEASURE_SHAPES, newMeasureData, type MeasureData, type MeasureShape } from './measure';
import { requiredGaps } from './measure-checks';
import { measurementQueue, stepPart, type NextSlot } from './measure-next';
import { dimForSlot, sceneDims, type SceneDim } from './measure-dims';
import { measureScene } from './measure-scene';
import { gapChoices } from './measure-next-choices';
import { askSlot } from './measure-dims-asks';
import { applyKind, CANOPY_KINDS } from './measure-canopy';
import { newMember } from './measure-structural';

/** The same rule the card follows (NextMeasurement slotFocus): a step face, a dimension line, or a landing's top. */
function marked(slot: NextSlot, data: MeasureData, dims: readonly SceneDim[]): boolean {
  if (stepPart(slot)) return true;
  if (dimForSlot(dims, slot.id)) return true;
  return slot.segIdx !== undefined && slot.stepIdx === undefined && data.segments[slot.segIdx]?.kind === 'platform';
}
const queueOf = (data: MeasureData, shape: MeasureShape) => measurementQueue(data, shape, requiredGaps(data, shape));
const unmarked = (data: MeasureData, shape: MeasureShape) => {
  const dims = sceneDims(data, shape);
  return queueOf(data, shape).slots.filter((s) => !marked(s, data, dims)).map((s) => s.id);
};
const sample = (s: NextSlot) => (s.unit === 'deg' ? '90' : s.unit === 'count' ? '12' : /rise/i.test(s.id) ? '7' : /run$/i.test(s.id) ? '10' : '40');
/** Answer the card's numbers one by one, the way a measurer does; `each` sees the sheet before every answer. */
function walk(data: MeasureData, shape: MeasureShape, each: (round: number) => void) {
  for (let round = 0; round < 500; round++) {
    each(round);
    const next = queueOf(data, shape).open.find((o) => o.type === 'slot');
    if (!next || next.type !== 'slot') return;
    next.slot.put(data, sample(next.slot));
  }
  throw new Error('the queue never emptied');
}
const finite = (dims: readonly SceneDim[]) => dims.every((d) => [...d.lines.flat(), ...(d.dashed ?? []).flat(), d.anchor].every((p) => [p.x, p.y, p.z].every(Number.isFinite)));

// Sheets a blank one grows into once the first panel question is answered.
const VARIANTS: [string, MeasureShape, (d: MeasureData) => void][] = [
  ['juliet balcony', 'balcony', (d) => { d.balcony!.kind = 'juliet'; }],
  ['cored balcony', 'balcony', (d) => { d.balcony!.kind = 'balcony'; d.balcony!.mount = 'core_drill'; }],
  ['fascia balcony', 'balcony', (d) => { d.balcony!.kind = 'balcony'; d.balcony!.mount = 'fascia'; }],
  ['closed deck', 'deck', (d) => { d.deck!.closedLoop = true; }],
  ['deck with a gate', 'deck', (d) => { d.deck!.sides[1].opening = 'gate'; }],
  ['turning fence', 'fence', (d) => { d.fence!.segments[0].turnDeg = '90'; }],
  ['one-segment fence', 'fence', (d) => { d.fence!.segments.length = 1; }],
  ['cored wall cap', 'wall_cap', (d) => { d.wallCap!.mount = 'core'; }],
  ['clockwise spiral', 'spiral', (d) => { d.spiral!.direction = 'cw'; }],
  ['side-mounted wall cap', 'wall_cap', (d) => { d.wallCap!.mount = 'side_high'; }],
  ...CANOPY_KINDS.map((kind): [string, MeasureShape, (d: MeasureData) => void] => [`${kind} canopy`, 'canopy', (d) => applyKind(d.canopy!, kind)]),
  ['canopy on posts', 'canopy', (d) => { applyKind(d.canopy!, 'carport'); d.canopy!.support = 'posts'; }],
  ['canopy on tie rods', 'canopy', (d) => { applyKind(d.canopy!, 'entry'); d.canopy!.support = 'tie_rods'; d.canopy!.door.swing = 'out'; }],
  ['steel: a beam, a lintel, a column and a frame', 'structural', (d) => { d.structural!.members.push(newMember('beam', 'B1'), newMember('lintel', 'L1'), newMember('column', 'C1')); d.structural!.frame.on = true; }],
  ['double swing gate', 'gate', (d) => { d.gate!.operation = 'double_swing'; }],
  ['single swing gate, hinged right', 'gate', (d) => { d.gate!.operation = 'single_swing'; d.gate!.hingeSide = 'right'; }],
  ['slide gate', 'gate', (d) => { d.gate!.operation = 'slide'; }],
  ['well with guard, gate, ladder and grate', 'window_well', (d) => { d.well!.deliverables = ['guard', 'gate', 'ladder', 'grate']; d.well!.scopeConfirmed = true; }],
  ['juliet in an opening', 'opening', (d) => { d.opening!.product = 'juliet'; }],
  ['security door', 'opening', (d) => { d.opening!.product = 'security_door'; d.opening!.mount = 'face_out'; }],
  ['shop piece in a niche', 'shop_piece', (d) => { d.shopPiece!.niche = true; }],
];

describe('every number the card asks is marked on the sketch', () => {
  for (const shape of MEASURE_SHAPES) {
    it(`${shape}: a blank sheet`, () => {
      const data = newMeasureData(shape, 4, 4);
      expect(unmarked(data, shape)).toEqual([]);
      expect(finite(sceneDims(data, shape))).toBe(true);
    });
    it(`${shape}: while it is filled in`, () => {
      const data = newMeasureData(shape, 4, 4);
      walk(data, shape, () => {
        expect(unmarked(data, shape)).toEqual([]);
        expect(finite(sceneDims(data, shape))).toBe(true);
      });
    });
  }
  for (const [name, shape, set] of VARIANTS) {
    it(`${name}: blank and while it is filled in`, () => {
      const data = newMeasureData(shape, 4, 4);
      set(data);
      walk(data, shape, () => expect(unmarked(data, shape)).toEqual([]));
    });
  }
});

describe('a blank sheet already draws what its first questions point at', () => {
  // The placeholder is the sketch's, not only the dimension line's: a line over nothing marks nothing.
  for (const shape of ['fence', 'deck', 'balcony', 'custom'] as const) {
    it(`${shape}: a provisional stand-in is drawn, and its dimension lines sit on it`, () => {
      const data = newMeasureData(shape, 4, 4), scene = measureScene(data, shape);
      const drawn = [...scene.meshes, ...scene.lines].filter((i) => i.kind !== 'dim' && i.kind !== 'house');
      expect(drawn.length).toBeGreaterThan(0);
      expect(drawn.some((i) => i.provisional)).toBe(true);
      // Every asked number's line starts within reach of the stand-in (it is not floating somewhere else).
      const pts = drawn.flatMap((i) => ('vertices' in i ? i.vertices : i.points));
      const box = { x0: Math.min(...pts.map((p) => p.x)), x1: Math.max(...pts.map((p) => p.x)), y0: Math.min(...pts.map((p) => p.y)), y1: Math.max(...pts.map((p) => p.y)) };
      const dims = sceneDims(data, shape);
      for (const slot of queueOf(data, shape).slots) {
        const d = dimForSlot(dims, slot.id)!;
        const near = d.lines.flat().some((p) => p.x >= box.x0 - 40 && p.x <= box.x1 + 40 && p.y >= box.y0 - 40 && p.y <= box.y1 + 40);
        expect(near, slot.id).toBe(true);
      }
    });
  }
});

describe('questions that are not numbers light the place they are about', () => {
  const lit = (shape: MeasureShape, key: string, detail?: string) => {
    const data = newMeasureData(shape, 4, 4), id = gapChoices({ key, detail }, 'en', data)?.dim ?? askSlot({ key, detail }, data);
    return id ? dimForSlot(sceneDims(data, shape), id) : null;
  };
  it('a rail end, the wall side, the floors, the materials and the returns on a stair', () => {
    for (const [key, detail] of [['term_target', '#1 start'], ['term_target', '#1 end'], ['term_material', '#1 start'], ['orientation'], ['floor_change'], ['returns'], ['mat_post'], ['mat_toprail'], ['mat_picket']] as const) {
      const d = lit('straight', key, detail);
      expect(d, key).not.toBeNull();
      expect(d!.mark).toBe('place');
    }
    // The two ends are two different places.
    expect(lit('straight', 'term_target', '#1 start')!.anchor).not.toEqual(lit('straight', 'term_target', '#1 end')!.anchor);
  });
  it('gate hinge and latch, deck mount and corners, fence ends, balcony mount', () => {
    expect(lit('gate', 'gate_hinges')).not.toBeNull();
    expect(lit('gate', 'gate_latch')).not.toBeNull();
    expect(lit('gate', 'sub_gate', 'gate:latch')).not.toBeNull();
    expect(lit('deck', 'deck_mount')).not.toBeNull();
    expect(lit('deck', 'deck_corners')).not.toBeNull();
    expect(lit('deck', 'deck_surface')).not.toBeNull();
    expect(lit('fence', 'fence_start_term')).not.toBeNull();
    expect(lit('fence', 'fence_end_term')).not.toBeNull();
    expect(lit('balcony', 'bal_mount')).not.toBeNull();
    expect(lit('balcony', 'bal_returns')).not.toBeNull();
    expect(lit('wall_cap', 'wc_drop_side')).not.toBeNull();
  });
  it('questions about no place stay unmarked', () => {
    for (const key of ['max_piece', 'photo', 'gate_use', 'struct_permit']) expect(lit('straight', key), key).toBeNull();
  });
  it('a highlight is never one of the standing dimension lines', () => {
    for (const shape of MEASURE_SHAPES) for (const d of sceneDims(newMeasureData(shape, 4, 4), shape)) if (d.mark === 'place') expect(d.scope).toBe('context');
  });
});
