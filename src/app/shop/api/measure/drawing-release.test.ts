// @vitest-environment node
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
import {newMeasureData,newPost,type FlightSegment,blankJoint,blankLandingTransition} from '@/lib/shop/measure';
const mocks=vi.hoisted(()=>({worker:vi.fn(),select:vi.fn(),rpc:vi.fn(),audit:vi.fn(),checks:vi.fn(),blockers:vi.fn(),update:vi.fn()}));
vi.mock('@/lib/shop/session',()=>({getSessionWorker:mocks.worker,touchSession:vi.fn()}));
vi.mock('@/lib/shop/db',()=>({sbSelect:mocks.select,sbUpdate:mocks.update,sbRpc:mocks.rpc,audit:mocks.audit,ORG_ID:'org',getOrgSettings:async()=>({rules:{allowSelfApproval:false},tolerances:{}})}));
vi.mock('@/lib/shop/measure-checks',async(importOriginal)=>({...await importOriginal<object>(),runChecks:mocks.checks,submitBlockers:mocks.blockers}));
import {POST} from './route';
const id='a0000000-0000-4000-8000-000000000001',stamp='2026-09-07T12:00:00.000Z';
let data:ReturnType<typeof newMeasureData>;
const request=(extra:Record<string,unknown>={})=>POST(new NextRequest('http://localhost/shop/api/measure',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'approve',id,releaseDrawing:true,ackDrawing:true,expectedUpdatedAt:stamp,...extra})}));
beforeEach(()=>{
  vi.clearAllMocks();mocks.worker.mockResolvedValue({id:'reviewer',is_admin:true});mocks.checks.mockReturnValue([]);mocks.blockers.mockReturnValue({gaps:[],redChecks:[]});mocks.rpc.mockResolvedValue(2);
  data=newMeasureData('straight',1);const flight=data.segments[0] as FlightSegment;flight.width='36';Object.assign(flight.steps[0],{rise:'7',run:'11'});
  data.rail.height='36';data.datums.postRef='centerline';data.materials.post='2 sq';data.materials.topRail='cap';
  data.posts=[Object.assign(newPost(0,0),{side:'left',fromNosing:'2',fromEdge:'3',mount:'Core-drill',anchor:'Concrete'})];
  mocks.select.mockImplementation(async()=>[{id,status:'submitted',shape:'straight',data,updated_at:stamp}]);
});
describe('fabrication release endpoint',()=>{
  it('requires an admin',async()=>{mocks.worker.mockResolvedValue({id:'worker',is_admin:false});expect((await request()).status).toBe(403);expect(mocks.rpc).not.toHaveBeenCalled();});
  it('requires explicit drawing review',async()=>{expect((await request({ackDrawing:false})).status).toBe(409);expect(mocks.rpc).not.toHaveBeenCalled();});
  it('rejects an outdated review',async()=>{expect((await request({expectedUpdatedAt:'old'})).status).toBe(409);expect(mocks.rpc).not.toHaveBeenCalled();});
  it('blocks missing dimensions and field-check failures',async()=>{data.posts[0].fromEdge='';expect((await request()).status).toBe(422);data.posts[0].fromEdge='3';mocks.blockers.mockReturnValue({gaps:['missing'],redChecks:[]});expect((await request()).status).toBe(422);expect(mocks.rpc).not.toHaveBeenCalled();});
  it('passes the reviewed version to the atomic release transaction',async()=>{expect((await request()).status).toBe(200);expect(mocks.rpc).toHaveBeenCalledWith('kiw_shop_release_measure_drawing',expect.objectContaining({p_expected_updated_at:stamp,p_org_id:'org',p_allow_self:false}));});
  it('reports concurrent changes rejected inside the transaction',async()=>{mocks.rpc.mockRejectedValueOnce(Error('DRAWING_CHANGED'));expect((await request()).status).toBe(409);});
  it('preserves field-only approval without claiming drawing release',async()=>{data.posts=[];expect((await request({releaseDrawing:false,ackDrawing:false})).status).toBe(200);expect(mocks.rpc).toHaveBeenCalledWith('kiw_shop_approve_measure_sheet',expect.not.objectContaining({p_expected_updated_at:stamp}));});
});

describe('measurement persistence',()=>{
  it('keeps joint details, landing transitions, side setbacks and flight wall references on save',async()=>{
    data.joints=[{...blankJoint(0),method:'weld',gap:'1/8',offsetV:'8',offsetH:'3 1/2',angleChange:'90',carriedBy:'upper'}];
    data.rail.sideSetback='3 1/2';(data.segments[0] as FlightSegment).wallSide='left';
    data.landingTransitions=[{...blankLandingTransition(1,0,2,'left'),kind:'drop',heightDifference:'17',horizontalSpan:'8',higherEnd:'upper',verticalAt:'lower'}];
    data.segments.push({kind:'platform',length:'48',depth:'84',diag:'',slope:'0',slopeDir:'',turn:'u',uDirection:'left',entryOffset:'8',exitOffset:'4'});
    (data.segments[0] as FlightSegment).steps[0].wallSide="none";
    data.posts[0].firstStepToPostEdge="25 1/2";
    data.posts[0].distanceFromFirst="22";
    data.posts[0].embedment="4";
    Object.assign(data.fab,{topRailConstruction:'continuous_per_flight',railHeightDatum:'finished_top_at_post',topRailStartExtension:'1',topRailEndExtension:'8',topRailEndCut:'plumb',postTopGap:'1/16',bottomRailConstruction:'between_posts',bottomRailEndGap:'1/16',picketEndGap:'1/32',picketSpacingDatum:'max_clear_horizontal'});
    Object.assign(data.landingTransitions[0],{weldLocation:'field',weldType:'fillet',weldSize:'1/8',jointPreparation:'Test preparation'});
    data.drawingReleaseVersion=1;
    mocks.update.mockResolvedValue([{updated_at:stamp}]);
    const response=await POST(new NextRequest('http://localhost/shop/api/measure',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'update',id,data,baseUpdatedAt:stamp})}));
    expect(response.status).toBe(200);
    const saved=mocks.update.mock.calls[0][2].data;
    expect(saved.joints).toEqual(data.joints);expect(saved.landingTransitions).toEqual(data.landingTransitions);expect(saved.rail.sideSetback).toBe('3 1/2');expect(saved.segments[0].wallSide).toBe('left');
    expect(saved.fab).toEqual(data.fab);
    expect(saved.segments[1].uDirection).toBe('left');
    expect(saved.segments[1].entryOffset).toBe("8");
    expect(saved.segments[0].steps[0].wallSide).toBe("none");
    expect(saved.posts[0].firstStepToPostEdge).toBe("25 1/2");
    expect(saved.posts[0].embedment).toBe("4");
    expect(saved.posts[0].distanceFromFirst).toBe("22");
    expect(saved.drawingReleaseVersion).toBeUndefined();
  });
});


describe('Submit to Shop Drawings',()=>{
  const submit=(extra:Record<string,unknown>={})=>request({type:'submit_drawing',...extra});
  it('queues the saved snapshot with an atomic concurrency check',async()=>{
    expect((await submit()).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('kiw_shop_queue_drawing',expect.objectContaining({p_sheet_id:id,p_org_id:'org',p_expected_updated_at:stamp}));
  });
  it('queues special project records for a detailing package',async()=>{
    data=newMeasureData('gate',1);
    mocks.select.mockImplementation(async()=>[{id,status:'submitted',shape:'gate',data,updated_at:stamp}]);
    expect((await submit()).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('kiw_shop_queue_drawing',expect.objectContaining({p_sheet_id:id}));
  });
  it('requires the saved version and rejects field blockers',async()=>{
    expect((await submit({expectedUpdatedAt:'stale'})).status).toBe(409);
    mocks.blockers.mockReturnValue({gaps:['missing'],docGaps:[],redChecks:[]});
    expect((await submit()).status).toBe(422);expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('reports a source edit that raced the database row lock',async()=>{
    mocks.rpc.mockRejectedValueOnce(Error('DRAWING_CHANGED'));
    expect((await submit()).status).toBe(409);
  });
});
