import {describe,expect,it} from 'vitest';
import {newMeasureData,type MeasureData,type MeasureShape} from '../measure';
import {measureScene} from '../measure-scene';
import {memberCut} from '../measure-structural';
import {openingFabSize} from '../measure-opening';
import {SCENE_SHAPES,sceneShapeOf} from './index';
import {openingScene,holeOutline} from './scene-opening';
import {structuralScene,plateDims} from './scene-structural';
import {fireEscapeScene,fireHeights} from './scene-fire-escape';
import {spiralScene} from './scene-spiral';
import {wallRailScene,bracketPlan} from './scene-wall-rail';
import {customScene,drawingScale} from './scene-custom';
import {steelSection} from './steel-sections';
import {openingFixture,structuralFixture,fireFixture,spiralFixture,wallRailFixture,customFixture} from './scene-shapes-b.fixture';

type Out={meshes:{vertices:{x:number;y:number;z:number}[];faces:number[][];id:string;provisional:boolean}[];lines:{points:{x:number;y:number;z:number}[];id:string}[];pending:string[]};
const all=(o:Out)=>[...o.meshes.flatMap(m=>m.vertices),...o.lines.flatMap(l=>l.points)];
const extent=(o:Out)=>{const p=all(o);return {x:[Math.min(...p.map(q=>q.x)),Math.max(...p.map(q=>q.x))],y:[Math.min(...p.map(q=>q.y)),Math.max(...p.map(q=>q.y))],z:[Math.min(...p.map(q=>q.z)),Math.max(...p.map(q=>q.z))]};};
function wellFormed(o:Out){
 for(const m of o.meshes){expect(m.vertices.length).toBeGreaterThan(0);for(const f of m.faces){expect(f.length).toBeGreaterThanOrEqual(3);for(const i of f)expect(m.vertices[i]).toBeDefined();}for(const v of m.vertices)for(const k of ['x','y','z'] as const)expect(Number.isFinite(v[k])).toBe(true);}
 expect(new Set([...o.meshes,...o.lines].map(i=>i.id)).size).toBe(o.meshes.length+o.lines.length);
}

describe('registry',()=>{
 it('registers the six shapes and infers a shape from its data',()=>{
  for(const k of ['custom','fire_escape','opening','spiral','structural','wall_rail'] as const)expect(SCENE_SHAPES[k]).toBeDefined();
  const cases:[MeasureShape,MeasureShape|null][]=[['opening','opening'],['structural','structural'],['fire_escape','fire_escape'],['spiral','spiral'],['custom',null],['wall_rail',null]];
  for(const [shape,expected] of cases)expect(sceneShapeOf(newMeasureData(shape,3))).toBe(expected);
 });
 it('never draws a deck sheet\'s plan as a custom railing',()=>{const deck=newMeasureData('deck',3);deck.plan=customFixture().plan;expect(measureScene(deck,'deck').meshes.some(m=>m.id.startsWith('plan:rail:'))).toBe(false);expect(measureScene(customFixture(),'custom').meshes.some(m=>m.id.startsWith('plan:rail:'))).toBe(true);expect(measureScene(customFixture()).meshes.some(m=>m.id.startsWith('plan:rail:'))).toBe(false);});
 it('merges the adapter output into measureScene, bounds included, without touching the sheet',()=>{
  const data=fireFixture(),before=JSON.stringify(data),scene=measureScene(data,'fire_escape'),own=fireEscapeScene(data);
  expect(scene.meshes.length).toBe(own.meshes.length);
  // Bounds hold the steel and its dimension lines (measure-dims-fire.ts).
  const e=extent(own);expect(scene.bounds.min.z).toBeLessThanOrEqual(e.z[0]+1e-6);expect(scene.bounds.max.z).toBeGreaterThanOrEqual(e.z[1]-1e-6);expect(scene.lines.some(l=>l.dim?.key==='fire:total')).toBe(true);
  expect(JSON.stringify(data)).toBe(before);
  // A wall rail is a stair flight on paper: only the named shape adds the wall and brackets.
  const rail=wallRailFixture();expect(measureScene(rail).meshes.some(m=>m.id==='wall-rail:wall')).toBe(false);expect(measureScene(rail,'wall_rail').meshes.some(m=>m.id==='wall-rail:wall')).toBe(true);
 });
});

describe('steel sections',()=>{
 it('draws a W8x15 as an I: two flanges and a web at AISC depth and width',()=>{
  const s=steelSection('W8x15')!;expect(s.kind).toBe('rects');if(s.kind!=='rects')return;
  expect(s.rects).toHaveLength(3);expect(s.depth).toBeCloseTo(8.11);expect(s.width).toBeCloseTo(4.02);
  const [top,bottom,web]=s.rects;expect(top[3]-top[1]).toBeCloseTo(.315);expect(bottom[1]).toBeCloseTo(-8.11/2);expect(web[2]-web[0]).toBeCloseTo(.245);
 });
 it('knows HSS, angle, channel, pipe and lally, and nothing for TBD',()=>{
  expect(steelSection('HSS4x4x1/4')).toMatchObject({kind:'rects',depth:4,width:4});
  expect((steelSection('HSS4x4x1/4') as {rects:unknown[]}).rects).toHaveLength(4);
  expect((steelSection('L4x4x3/8') as {rects:unknown[]}).rects).toHaveLength(2);
  expect(steelSection('C8x11.5')).toMatchObject({kind:'rects',depth:8,width:2.26});
  expect(steelSection('Pipe 3 STD')).toMatchObject({kind:'round',r:1.75});
  expect(steelSection('3-1/2" lally')).toMatchObject({kind:'round',wall:null});
  expect(steelSection('TBD by engineer')).toBeNull();
 });
});

describe('opening',()=>{
 it('lays three openings side by side with out-of-square holes and fab-size pieces',()=>{
  const data=openingFixture(),o=openingScene(data);wellFormed(o);
  expect(o.meshes.filter(m=>m.id.startsWith('opening:wall:'))).toHaveLength(3);
  const pieces=o.meshes.filter(m=>m.id.startsWith('opening:piece:'));expect(pieces).toHaveLength(3);
  pieces.forEach((p,i)=>{const fab=openingFabSize(data.opening!,data.opening!.units[i])!;const xs=p.vertices.map(v=>v.x),zs=p.vertices.map(v=>v.z);expect(Math.max(...xs)-Math.min(...xs)).toBeCloseTo(fab.width);expect(Math.max(...zs)-Math.min(...zs)).toBeCloseTo(fab.height);expect(p.provisional).toBe(false);});
  // Left to right along one wall, no overlap.
  const walls=o.meshes.filter(m=>m.id.startsWith('opening:wall:')).map(m=>[Math.min(...m.vertices.map(v=>v.x)),Math.max(...m.vertices.map(v=>v.x))]);
  expect(walls[1][0]).toBeGreaterThanOrEqual(walls[0][1]-1e-9);expect(walls[2][0]).toBeGreaterThanOrEqual(walls[1][1]-1e-9);
  // W3 really is out of square: the right jamb is taller than the left.
  const hole=holeOutline(data.opening!.units[2]);expect(hole.points[4].z-hole.points[6].z).toBeCloseTo(1.5);expect(hole.points[2].x-hole.points[0].x).toBeCloseTo(31.75);
  // Reveal depth is the wall depth.
  const w1=o.meshes.find(m=>m.id.startsWith('opening:wall:'))!;expect(Math.max(...w1.vertices.map(v=>v.y))).toBeCloseTo(8);
  // W1's sill stands at its measured drop to grade outside.
  expect(Math.min(...pieces[0].vertices.map(v=>v.z))).toBeCloseTo(6+.25);
  expect(o.pending).toEqual([]);
  expect(o.meshes.reduce((n,m)=>n+m.vertices.length,0)).toBeGreaterThan(500);
 });
 it('is pending and amber when blank',()=>{
  const o=openingScene(newMeasureData('opening',1));
  expect(o.pending).toEqual(expect.arrayContaining(['Product','Mount','#1 · opening','#1 · fabricate to']));
  expect(o.meshes.find(m=>m.id.startsWith('opening:piece:'))!.provisional).toBe(true);
 });
});

describe('structural',()=>{
 it('builds the Lincoln moment frame: I-beam at its cut length on two W6x20 columns on a sloping slab',()=>{
  const data=structuralFixture(),s=data.structural!,o=structuralScene(data);wellFormed(o);
  const beam=o.meshes.find(m=>m.id===`struct:${s.members[0].id}`)!;
  const cut=memberCut(s.members[0],s).length!;expect(cut).toBeCloseTo(138+6.2);
  const xs=beam.vertices.map(v=>v.x);expect(Math.max(...xs)-Math.min(...xs)).toBeCloseTo(cut);
  expect(beam.vertices).toHaveLength(3*24); // three plates of an I, each a flat-shaded box
  const zs=beam.vertices.map(v=>v.z);expect(Math.max(...zs)-Math.min(...zs)).toBeCloseTo(8.11);
  // Each column at its own shortest reading: the bases differ by the slab fall.
  const shafts=s.members.slice(1).map((m,i)=>o.meshes.find(x=>x.id===`struct:${m.id}:f${i}`)!);
  const base=(m:typeof shafts[number])=>Math.min(...m.vertices.map(v=>v.z));
  expect(base(shafts[0])-base(shafts[1])).toBeCloseTo(93.25-92.5);
  const shaftLen=(m:typeof shafts[number])=>Math.max(...m.vertices.map(v=>v.z))-base(m);
  expect(shaftLen(shafts[0])).toBeCloseTo(memberCut(s.members[1],s).length!);
  expect(o.meshes.some(m=>m.id==='struct:frame:opening')).toBe(true);
  expect(o.pending).toEqual([]);
  expect(plateDims('10x10x1/2')).toEqual({a:10,b:10,t:.5});expect(plateDims('none')).toBeNull();
 });
 it('puts a beam into pocketed bearing walls and a lintel into its wall',()=>{
  const data=newMeasureData('structural',1);const s=data.structural!;
  const beam={...structuralFixture().structural!.members[0],spanA:'144',spanB:'144 1/4',bearingL:{substrate:'brick' as const,condition:'good' as const,length:'8',wall:'12'},bearingR:{substrate:'brick' as const,condition:'good' as const,length:'8',wall:'12'}};
  const lintel={...beam,id:'l1',mark:'L1',role:'lintel' as const,profile:'L4x4x3/8',spanA:'36',spanB:'36',bearingL:{...beam.bearingL,length:'4',wall:'8'},bearingR:{...beam.bearingR,length:'4',wall:'8'}};
  s.members=[beam,lintel];
  const o=structuralScene(data);wellFormed(o);
  const b=o.meshes.find(m=>m.id===`struct:${beam.id}`)!,xs=b.vertices.map(v=>v.x);
  expect(Math.min(...xs)).toBeCloseTo(-8);expect(Math.max(...xs)).toBeCloseTo(144.25+8);
  expect(o.meshes.filter(m=>m.id.startsWith('struct:wall:'))).toHaveLength(3);
  const l=o.meshes.find(m=>m.id==='struct:l1:0')!;expect(l.vertices).toHaveLength(2*24);
 });
 it('lists pending members and draws an unknown profile as a centre line',()=>{
  const empty=newMeasureData('structural',1);expect(structuralScene(empty).pending).toEqual(['Members']);
  const data=structuralFixture();data.structural!.members[0].profile='TBD by engineer';
  const o=structuralScene(data);expect(o.pending).toContain('B1 · profile');expect(o.lines.some(l=>l.id===`struct:${data.structural!.members[0].id}`)).toBe(true);
 });
});

describe('fire escape',()=>{
 it('stacks three platforms at their heights with stairs between and a ladder',()=>{
  const data=fireFixture(),o=fireEscapeScene(data);wellFormed(o);
  const decks=o.meshes.filter(m=>m.id.startsWith('fire:deck:'));expect(decks).toHaveLength(3);
  expect(decks.map(d=>Math.max(...d.vertices.map(v=>v.z)))).toEqual([33*12,23.5*12,14*12]);
  expect(o.meshes.filter(m=>m.id.startsWith('fire:stair:'))).toHaveLength(2);
  expect(o.meshes.filter(m=>m.id.startsWith('fire:opening:'))).toHaveLength(3);
  const ladder=o.meshes.find(m=>m.id==='fire:ladder')!;expect(Math.min(...ladder.vertices.map(v=>v.z))).toBeCloseTo(114);
  expect(o.pending).toEqual([]);
  // Platforms project toward the viewer: −y once the viewport mirrors y (pre-mirror.ts), so +y here.
  const e=extent(o);expect(e.y[1]).toBeGreaterThan(42);expect(e.x[1]).toBeGreaterThanOrEqual(144);
 });
 it('derives heights from floor-to-floor and pends what is blank',()=>{
  const data=fireFixture();data.fire!.levels[0].heightAboveGrade='';data.fire!.levels[1].heightAboveGrade='';
  expect(fireHeights(data.fire!.levels).map(h=>h.z)).toEqual([14*12+2*114,14*12+114,14*12]);
  const blank=fireEscapeScene(newMeasureData('fire_escape',2));expect(blank.pending).toEqual(expect.arrayContaining(['Level 3 · height','Level 3 · platform','Level 2 · stair'.replace('2','3')]));
  expect(blank.meshes.every(m=>m.provisional||m.id==='fire:wall')).toBe(true);
 });
});

describe('spiral',()=>{
 it('builds the 5\' spiral: column, 12 treads to floor-to-floor, helix rail',()=>{
  const data=spiralFixture(),o=spiralScene(data);wellFormed(o);
  const treads=o.meshes.find(m=>m.id==='spiral:treads')!;
  expect(Math.max(...treads.vertices.map(v=>v.z))).toBeCloseTo(104);
  const r=Math.max(...treads.vertices.filter(v=>v.z<100).map(v=>Math.hypot(v.x,v.y)));expect(r).toBeCloseTo(30);
  const col=o.meshes.find(m=>m.id==='spiral:column')!;expect(Math.max(...col.vertices.map(v=>Math.hypot(v.x,v.y)))).toBeCloseTo(2);
  expect(o.meshes.find(m=>m.id==='spiral:handrail')).toBeDefined();
  expect(o.pending).toEqual([]);
 });
 it('pends every blank input and stays amber',()=>{
  const o=spiralScene(newMeasureData('spiral',0));
  expect(o.pending).toEqual(['Floor to floor','Treads','Rotation','Diameter','Column','Rail height']);
  expect(o.meshes.every(m=>m.provisional)).toBe(true);
 });
});

describe('wall rail',()=>{
 it('runs the rail at height above the nosings on four brackets with extensions and returns',()=>{
  const data=wallRailFixture(),o=wallRailScene(data);wellFormed(o);
  const rail=o.meshes.find(m=>m.id==='wall-rail:rail')!;
  // First nosing at 7.5 above floor → rail centre at 7.5 + 35.
  expect(Math.min(...rail.vertices.map(v=>v.z))).toBeCloseTo(7.5+35-1.9/2,1);
  expect(bracketPlan('4 @ 32')).toEqual({count:4,spacing:32});expect(bracketPlan('48" o.c.')).toEqual({count:null,spacing:48});expect(bracketPlan('5')).toEqual({count:5,spacing:null});
  const xs=rail.vertices.map(v=>v.x);expect(Math.min(...xs)).toBeLessThan(-11);
  expect(o.pending).toEqual([]);
  expect(o.meshes.find(m=>m.id==='wall-rail:wall')!.referenceOnly).toBe(true);
 });
 it('pends height and brackets on a blank flight',()=>{
  const data=newMeasureData('wall_rail',4);expect(wallRailScene(data).pending).toEqual(['Rail height','Brackets']);
 });
});

describe('custom drawing',()=>{
 it('walks each drawn line for its measured length and climbs the flight',()=>{
  const data=customFixture(),o=customScene(data);wellFormed(o);
  const base=o.lines.find(l=>l.id.startsWith('plan:base:'))!;
  expect(base.points).toHaveLength(4);
  expect(base.points[1].x).toBeCloseTo(120);expect(base.points[2].y).toBeCloseTo(-72);expect(base.points[3].z).toBeCloseTo(21);
  expect(o.meshes.filter(m=>m.id.startsWith('post:'))).toHaveLength(2);
  const post2=o.meshes.find(m=>m.id===`post:${data.posts[1].id}`)!;expect(Math.min(...post2.vertices.map(v=>v.y))).toBeCloseTo(-72-1);
  expect(drawingScale(data.plan!.paths!)).toBeCloseTo(1.2);
  expect(o.pending).toEqual([]);
 });
 it('pends a sheet with nothing drawn',()=>{
  expect(customScene(newMeasureData('custom',1)).pending).toEqual(['Plan drawing']);
  const d:MeasureData=customFixture();d.plan!.paths![0].segs[1].len='';d.rail.height='';
  const o=customScene(d);expect(o.pending).toEqual(expect.arrayContaining(['Rail height','Porch · line 2']));
 });
});
