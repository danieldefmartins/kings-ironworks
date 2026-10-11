import {expect,it} from 'vitest';
import {porchSiteFixture} from './measure-site.fixture';
import {supportTerminal} from './measure-support-attachment';
import {drawingPosts} from './measure-drawing';
import {stairGeometry} from './measure-geometry';
import {blenderPayload,type DrawingRequest} from './shop-drawings';
const fixture=()=>{const data=porchSiteFixture(),post=data.posts[1];post.pointType='existing_post';data.site!.objects.find(h=>h.id==='column-1')!.y='-1';post.supportAttachment={objectId:'column-1',face:'left',along:.5,angle:0,elevation:'0',connection:'Side clip; shop selects fasteners for measured substrate',gap:'1/8'};return {data,post};};
it('resolves native termination at a real structural face without fabricating a post or changing raw offsets',()=>{
 const {data,post}=fixture(),before=JSON.stringify(data),resolved=supportTerminal(data,data.site,post);expect(resolved).toMatchObject({base:{x:44,y:3,z:28},top:{x:44,y:3,z:64},provisional:false,terminal:{hostId:'column-1',normal:{x:-1,y:0,z:0},gap:.125,faceClearance:4,bottomZ:28,topZ:112,rectangular:true,verified:true}});
 const drawing=drawingPosts(data,stairGeometry(data)!).find(p=>p.post.id===post.id)!;expect(drawing.base).toEqual(resolved.base);
 const payload=blenderPayload({id:'test',source_updated_at:'now',snapshot:{name:'Synthetic support test',shape:'stair_platform',data}} as DrawingRequest),terminal=payload.posts.find(p=>p.sourcePost.id===post.id)!;expect(terminal.pointType).toBe('existing_post');expect(terminal.terminal).toEqual(resolved.terminal);expect(payload.measurements.posts.find(p=>p.id===post.id)?.fromNosing).toBe(post.fromNosing);expect(JSON.stringify(data)).toBe(before);
});
it('follows surveyed support relocation and fails closed for missing, round, tilted or incomplete supports',()=>{
 const {data,post}=fixture(),host=data.site!.objects.find(o=>o.id==='column-1')!;host.rotation=90;const moved=supportTerminal(data,data.site,post);expect(moved.base?.x).toBeCloseTo(40);expect(moved.base?.y).toBeCloseTo(-1);expect(moved.terminal?.normal.y).toBeCloseTo(-1);
 host.section='round';expect(supportTerminal(data,data.site,post).base).toBeNull();host.section='rectangular';host.riseX='1';expect(supportTerminal(data,data.site,post).base).toBeNull();host.riseX='0';post.supportAttachment!.gap='';expect(supportTerminal(data,data.site,post).base).toBeNull();post.supportAttachment!.gap='0';host.verified=false;expect(supportTerminal(data,data.site,post).provisional).toBe(true);data.site!.objects=[];expect(supportTerminal(data,data.site,post).base).toBeNull();
});
it('blocks malformed, missing and disconnected support hosts from readiness and drawing release',async()=>{
 const {drawingIssues}=await import('./measure-drawing');const {requiredGaps}=await import('./measure-checks');const {data,post}=fixture();post.fromNosing='';post.fromEdge='';
 expect(requiredGaps(data,'stair_platform').some(g=>g.detail?.includes('support connection'))).toBe(false);
 data.site!.objects=data.site!.objects.filter(h=>h.id!=='column-1');expect(requiredGaps(data,'stair_platform').some(g=>g.detail?.includes('support connection'))).toBe(true);expect(drawingIssues(data)).toContain('drawingConnectionsOpen');
 post.segIdx=99;expect(drawingIssues(data)).toContain('drawingConnectionsOpen');expect(requiredGaps(data,'stair_platform').some(g=>g.detail?.includes('support connection'))).toBe(true);
});
it('does not verify an oblique or inward-facing rail-to-support connection',()=>{
 const {data,post}=fixture();expect(supportTerminal(data,data.site,post).provisional).toBe(false);
 data.site!.objects.find(h=>h.id==='column-1')!.y='-24';expect(supportTerminal(data,data.site,post).terminal?.verified).toBe(false);
 data.site!.objects.find(h=>h.id==='column-1')!.y='-1';post.supportAttachment!.face='right';expect(supportTerminal(data,data.site,post).terminal?.verified).toBe(false);
});
