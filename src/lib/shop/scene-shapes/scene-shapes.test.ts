import {describe,expect,it} from 'vitest';
import {newMeasureData,type MeasureData} from '../measure';
import {measureScene} from '../measure-scene';
import {SCENE_SHAPES,sceneShapeOf} from '.';
import {picketCentres,section,triangulate} from './build-kit';
import {balconyFixture,deckFixture,fenceFixture,gateFixture,julietFixture,wellFixture} from './scene-shapes.fixture';

const all=(s:ReturnType<typeof measureScene>)=>[...s.meshes.flatMap(m=>m.vertices),...s.lines.flatMap(l=>l.points)];
const finite=(s:ReturnType<typeof measureScene>)=>all(s).every(p=>[p.x,p.y,p.z].every(Number.isFinite));
const faceOk=(s:ReturnType<typeof measureScene>)=>s.meshes.every(m=>m.faces.every(f=>f.length>=3&&f.every(i=>Number.isInteger(i)&&i>=0&&i<m.vertices.length)));
const ids=(s:ReturnType<typeof measureScene>,prefix:string)=>[...s.meshes,...s.lines].filter(i=>i.id.startsWith(prefix));

describe('kit',()=>{
 it('reads only unambiguous sections',()=>{expect(section('2x2')).toEqual({width:2,depth:2,round:false});expect(section('3/4 sq')).toEqual({width:.75,depth:.75,round:false});expect(section('1.66 round')?.round).toBe(true);expect(section('ornamental')).toBeNull();expect(section('2')).toBeNull();expect(section('')).toBeNull();});
 it('spaces infill so no clear gap exceeds the maximum',()=>{const xs=picketCentres(40,4,.75);const edges=[0,...xs.flatMap(x=>[x-.375,x+.375]),40];for(let i=0;i<edges.length;i+=2)expect(edges[i+1]-edges[i]).toBeLessThanOrEqual(4+1e-9);expect(picketCentres(40,0,.75)).toEqual([]);});
 it('triangulates a concave outline into n-2 triangles',()=>{const L=[[0,0],[10,0],[10,4],[4,4],[4,10],[0,10]].map(([x,y])=>({x,y,z:0}));expect(triangulate(L)).toHaveLength(4);});
});

describe('shape registry',()=>{
 it('routes each sheet to its own adapter and leaves stairs alone',()=>{
  for(const [shape,make] of [['gate',gateFixture],['fence',fenceFixture],['deck',deckFixture],['balcony',balconyFixture],['window_well',wellFixture]] as const){expect(sceneShapeOf(make())).toBe(shape);expect(SCENE_SHAPES[shape]).toBeTypeOf('function');}
  expect(sceneShapeOf(newMeasureData('straight',4))).toBeNull();
 });
});

const blanks:[string,MeasureData,string][]=[['gate',newMeasureData('gate',1),'Gate · opening width'],['fence',newMeasureData('fence',2),'Fence segment 1 · length'],['deck',newMeasureData('deck',3),'Deck side 1 · length'],['balcony',newMeasureData('balcony',1),'Balcony · edge length'],['window_well',newMeasureData('window_well',1),'Well · length at house']];
describe.each(blanks)('blank %s sheet',(_,data,first)=>{
 it('draws no steel and lists what is missing',()=>{const s=measureScene(data);expect(s.meshes.filter(m=>m.kind==='post'||m.kind==='attached')).toHaveLength(0);expect(s.pending).toContain(first);});
});

describe('gate',()=>{
 it('builds posts, two leaves, swing arcs and a grade that climbs by the measured rise',()=>{
  const data=gateFixture(),before=JSON.stringify(data),s=measureScene(data);
  expect(JSON.stringify(data)).toBe(before);expect(finite(s)).toBe(true);expect(faceOk(s)).toBe(true);
  const posts=s.meshes.filter(m=>m.id.startsWith('gate:post'));expect(posts).toHaveLength(2);expect(posts[0].vertices).toHaveLength(8);
  // Posts sit outside the clear opening (4x4 → centres at −2 and 144+2).
  expect(posts.map(p=>p.vertices.reduce((a,v)=>a+v.x,0)/8)).toEqual([-2,146]);
  const leaves=s.meshes.filter(m=>m.id.startsWith('gate:leaf'));expect(leaves).toHaveLength(2);
  for(const leaf of leaves){const zs=leaf.vertices.map(v=>v.z);expect(Math.min(...zs)).toBeCloseTo(2.5);}
  const arcs=s.lines.filter(l=>l.id.startsWith('gate:swing'));expect(arcs).toHaveLength(2);
  for(const a of arcs){expect(a.points[0].z).toBe(0);expect(a.points.at(-1)!.z).toBeCloseTo(1.5);expect(a.points.at(-1)!.y).toBeCloseTo(143.875/2);}
  expect(s.bounds.min.x).toBeLessThanOrEqual(-4);expect(s.bounds.max.z).toBeCloseTo(60.25);
  expect(s.pending).toEqual([]);
 });
 it('slides back along a track for the full leaf instead of swinging',()=>{
  const data=gateFixture();data.gate!.operation='slide';const s=measureScene(data);
  expect(s.lines.some(l=>l.id.startsWith('gate:swing'))).toBe(false);const track=s.lines.find(l=>l.id==='gate:track')!;
  expect(Math.min(...track.points.map(p=>p.x))).toBeCloseTo(-143.875);expect(Math.max(...track.points.map(p=>p.x))).toBeCloseTo(143.875);
 });
 it('draws axes, not invented steel, when no profile is written',()=>{
  const data=gateFixture();data.gate!.postSize='';data.materials.post='';data.materials.topRail='';data.materials.picket='';data.materials.bottomRail='';
  const s=measureScene(data);expect(s.meshes.filter(m=>m.kind==='post'||m.kind==='attached')).toHaveLength(0);expect(s.lines.filter(l=>l.id.startsWith('gate:leaf')).length).toBeGreaterThan(10);
 });
});

describe('fence',()=>{
 it('chains segments with turns and carries grade post to post',()=>{
  const data=fenceFixture(),s=measureScene(data);expect(finite(s)).toBe(true);expect(faceOk(s)).toBe(true);
  // A: 192 along +X, turn left 90 → B: 192 along +Y, turn right → C: 96 along +X.
  expect(s.bounds.max.x).toBeCloseTo(192+96+1,0);expect(s.bounds.max.y).toBeGreaterThan(192);
  // Grade falls 8 + 18; the lowest post foot is 26 below the start, its footing 36 more.
  expect(s.bounds.min.z).toBeCloseTo(-26-36);
  // 3 + 3 + 2 bays at 72" max spacing → 9 posts (4 + 3 + 2).
  const posts=s.meshes.filter(m=>m.id.startsWith('fence:posts:'));expect(posts.reduce((n,m)=>n+m.vertices.length/8,0)).toBe(4+3+2);
  expect(s.pending).toEqual([]);
 });
 it('steps panels level on a stepped segment and rakes them on a racked one',()=>{
  const data=fenceFixture(),s=measureScene(data),[a,b]=data.fence!.segments;
  const bottomRails=(id:string)=>s.meshes.find(m=>m.id===`fence:segment:${id}`)!;
  const racked=bottomRails(a.id).vertices,stepped=bottomRails(b.id).vertices;
  // Racked: the lowest member vertex follows the 8" fall; stepped panels never go below their uphill grade minus the fall of the run.
  expect(Math.min(...racked.map(v=>v.z))).toBeLessThan(-7);
  const zs=new Set(stepped.map(v=>Math.round(v.z*100)/100));expect(zs.size).toBeLessThan(stepped.length);
 });
 it('flags a sloped segment that does not say how the panels meet grade',()=>{const data=fenceFixture();data.fence!.segments[2].gradeChange='-6';expect(measureScene(data).pending).toContain('Fence segment C · follows grade');});
});

describe('deck',()=>{
 it('closes the outline at the house, turns the house to the back and rails the open sides',()=>{
  const data=deckFixture(),s=measureScene(data);expect(finite(s)).toBe(true);expect(faceOk(s)).toBe(true);
  const surface=s.meshes.find(m=>m.id==='deck:surface')!;expect(surface.vertices.every(v=>v.z===48)).toBe(true);expect(surface.faces).toHaveLength(2);
  const house=s.meshes.find(m=>m.id==='house:deck')!,deckY=surface.vertices.map(v=>v.y);
  expect(Math.min(...house.vertices.map(v=>v.y))).toBeGreaterThanOrEqual(Math.max(...deckY)-1e-6);
  expect(s.meshes.filter(m=>m.id.startsWith('deck:guard:'))).toHaveLength(3);
  // Grade under side 1 is 48 − 36 = 12 above the lowest grade.
  const grade=s.meshes.find(m=>m.id==='deck:grade')!;expect(new Set(grade.vertices.map(v=>v.z))).toEqual(new Set([12,0,8]));
  expect(s.lines.find(l=>l.id.startsWith('deck:opening:'))!.label).toContain('Stair opening');
  expect(s.pending).toEqual([]);
 });
 it('does not rail a side marked not railed',()=>{const data=deckFixture();data.deck!.sides[0].railed=false;expect(measureScene(data).meshes.filter(m=>m.id.startsWith('deck:guard:'))).toHaveLength(2);});
});

describe('balcony',()=>{
 it('sets guard posts in from the slab edge by the measured edge distance',()=>{
  const data=balconyFixture(),s=measureScene(data);expect(finite(s)).toBe(true);expect(faceOk(s)).toBe(true);
  const slab=s.meshes.find(m=>m.id==='balcony:slab')!;expect(Math.min(...slab.vertices.map(v=>v.y))).toBe(-60);expect(Math.min(...slab.vertices.map(v=>v.z))).toBe(-6);
  const posts=s.meshes.find(m=>m.id==='balcony:posts')!;expect(posts.vertices.length/8).toBe(4);
  expect(Math.min(...posts.vertices.map(v=>v.y))).toBeCloseTo(-56-1);expect(Math.min(...posts.vertices.map(v=>v.z))).toBe(-3);
  expect(s.bounds.max.z).toBeGreaterThanOrEqual(42);expect(s.pending).toEqual([]);
 });
 it('draws a Juliet as one rail across the door, bracketed back to the wall',()=>{
  const s=measureScene(julietFixture());expect(s.meshes.some(m=>m.id==='balcony:slab')).toBe(false);
  const posts=s.meshes.find(m=>m.id==='balcony:posts')!;expect(posts.vertices.length/8).toBe(2+4);expect(Math.min(...posts.vertices.map(v=>v.y))).toBeCloseTo(-5);
  expect(s.meshes.find(m=>m.id==='balcony:guard')!.vertices.length).toBeGreaterThan(8*10);
 });
});

describe('window well',()=>{
 it('builds liner, banded house wall, window, guard with gate and ladder',()=>{
  const data=wellFixture(),s=measureScene(data);expect(finite(s)).toBe(true);expect(faceOk(s)).toBe(true);
  expect(s.meshes.find(m=>m.id==='well:liner')!.vertices).toHaveLength(24);
  expect(Math.min(...s.meshes.find(m=>m.id==='well:floor')!.vertices.map(v=>v.z))).toBe(-44);
  expect(ids(s,'well:band:')).toHaveLength(3);
  const win=s.lines.find(l=>l.id==='well:window')!;expect(Math.min(...win.points.map(p=>p.z))).toBe(-32);expect(win.points[0].y).toBeCloseTo(3-.05);
  // End posts held off the proud face by the measured 2" gap (2x2 post → centre at −3).
  const posts=s.meshes.find(m=>m.id==='well:posts')!;expect(Math.max(...posts.vertices.map(v=>v.y))).toBeCloseTo(-2);expect(posts.vertices.length/8).toBe(6);
  expect(s.meshes.some(m=>m.id==='well:gate')).toBe(true);expect(s.lines.some(l=>l.id==='well:gate-swing')).toBe(true);
  const ladder=s.lines.filter(l=>l.id==='well:ladder');expect(ladder).toHaveLength(2+2+4);
  expect(s.pending).toEqual([]);
 });
 it('swaps the guard for a grate when that is what is supplied',()=>{const data=wellFixture();data.well!.deliverables=['grate'];data.well!.grateBearing='recessed';const s=measureScene(data);expect(s.meshes.some(m=>m.id==='well:grate')).toBe(true);expect(s.meshes.some(m=>m.id==='well:posts')).toBe(false);});
});
