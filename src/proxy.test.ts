// @vitest-environment node
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";
const run=(path:string,headers:Record<string,string>={})=>proxy(new NextRequest(`https://kingsironworks.com${path}`,{headers}));
describe('regional homepage',()=>{
 it('routes a Florida visitor to the Florida homepage with campaign parameters intact',()=>{const res=run('/?utm_source=google&gclid=test',{'cf-ipcountry':'US','cf-region-code':'FL'});expect(res.status).toBe(307);expect(res.headers.get('location')).toBe('https://kingsironworks.com/florida?utm_source=google&gclid=test');expect(res.headers.get('cache-control')).toBe('private, no-store');});
 it('accepts the full Florida region name',()=>expect(run('/',{'cf-ipcountry':'US','cf-region':'Florida'}).status).toBe(307));
 it.each([{}, {'cf-ipcountry':'US','cf-region-code':'MA'},{'cf-ipcountry':'BR','cf-region-code':'FL'}])('keeps the main homepage for unknown or non-Florida locations',headers=>{expect(run('/',headers).headers.get('location')).toBeNull();});
 it('remembers a real Florida page visit for later Home and logo clicks',()=>{expect(run('/florida').cookies.get('kiw-site-region')?.value).toBe('florida');expect(run('/',{cookie:'kiw-site-region=florida'}).headers.get('location')).toBe('https://kingsironworks.com/florida');});
 it('does not change the region when Next prefetches Florida',()=>expect(run('/florida',{'next-router-prefetch':'1'}).headers.get('set-cookie')).toBeNull());
 it('allows an explicit main-site preference even within Florida',()=>{const res=run('/?region=all',{'cf-ipcountry':'US','cf-region-code':'FL',cookie:'kiw-site-region=florida'});expect(res.headers.get('location')).toBeNull();expect(res.cookies.get('kiw-site-region')?.value).toBe('all');expect(run('/',{'cf-ipcountry':'US','cf-region-code':'FL',cookie:'kiw-site-region=all'}).headers.get('location')).toBeNull();});
 it('allows a Florida choice without geolocation and never redirects the Florida page to itself',()=>{expect(run('/?region=florida').headers.get('location')).toBe('https://kingsironworks.com/florida');expect(run('/florida',{'cf-ipcountry':'US','cf-region-code':'FL'}).headers.get('location')).toBeNull();});
});
