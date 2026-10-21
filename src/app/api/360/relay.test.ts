// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './[...path]/route';
const context=(suffix:string)=>({params:Promise.resolve({path:['public','website',...suffix.split('/')]})});
function configured(){vi.stubEnv('KIW_360_FORM_SLUG','approved-form');vi.stubEnv('KIW_360_WORKSPACE_ID','approved-workspace');vi.stubEnv('KIW_360_FIELD_MAP',JSON.stringify({firstName:'name',phone:'phone',projectType:'service',message:'details',photos:'photos'}));}
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('Florida public form relay boundaries',()=>{
 it('fails closed when the business form is unconfigured',async()=>{vi.stubEnv('KIW_360_FORM_SLUG','');expect((await GET(new NextRequest('http://localhost/api/360/public/website/forms/anything'),context('forms/anything'))).status).toBe(503);});
 it('only reads the configured published form',async()=>{configured();const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);expect((await GET(new NextRequest('http://localhost/api/360/public/website/forms/other'),context('forms/other'))).status).toBe(404);expect(fetcher).not.toHaveBeenCalled();});
 it('rejects foreign origins and oversized bodies before forwarding',async()=>{configured();const foreign=new NextRequest('http://localhost/api/360/public/website/direct-submit',{method:'POST',headers:{origin:'https://unrelated.example'},body:'{}'});expect((await POST(foreign,context('direct-submit'))).status).toBe(403);const large=new NextRequest('http://localhost/api/360/public/website/direct-submit',{method:'POST',headers:{'content-length':'16000000'},body:'{}'});expect((await POST(large,context('direct-submit'))).status).toBe(413);});
 it('rejects tokens from another workspace',async()=>{configured();const token=Buffer.from(JSON.stringify({ws:'other-workspace',kind:'form'})).toString('base64url')+'.signature';const request=new NextRequest('http://localhost/api/360/public/website/direct-submit',{method:'POST',body:JSON.stringify({token})});expect((await POST(request,context('direct-submit'))).status).toBe(400);});
});
