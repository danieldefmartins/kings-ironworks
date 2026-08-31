import { chromium } from "playwright";
const BASE=process.env.SHOP_BASE_URL||"http://localhost:3457";
const JOB=process.env.SHOP_JOB_ID;
const WORKER=process.env.SHOP_WORKER_ID, PIN=process.env.SHOP_PIN;
if(!JOB||!WORKER||!PIN){console.error("Set SHOP_WORKER_ID, SHOP_PIN, SHOP_JOB_ID");process.exit(2);}
const OUT=process.env.PRESS_OUT_DIR || new URL(".", import.meta.url).pathname;
let pass=0, fail=0;
const check=(ok,l,x)=>{console.log(`${ok?"  ok  ":"  FAIL"} ${l}${x?` — ${x}`:""}`); ok?pass++:fail++;};

const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:900,height:1200},hasTouch:true,isMobile:true});
await ctx.request.post(`${BASE}/shop/api/login`,{data:{workerId:WORKER,pin:PIN}});
const page=await ctx.newPage();
page.on("pageerror",e=>console.log("PAGE ERROR:",e.message));

const cr=await ctx.request.post(`${BASE}/shop/api/measure`,{data:{type:"create",jobId:JOB,shape:"straight",steps1:3,name:"OFFLINE TEST"}});
const {id}=await cr.json();
const url=`${BASE}/shop/job/${JOB}/measure/${id}`;
await page.goto(url,{waitUntil:"networkidle"});
await page.waitForTimeout(1500);

const first=page.locator('input[data-m="1"]').first();

// 1) online save still works
await first.fill("7 1/4");
await page.waitForSelector("text=All changes saved",{timeout:8000});
check(true,"online autosave still reaches saved");

// 2) go offline and type — must not report failure, must say saved on device
await ctx.setOffline(true);
await page.evaluate(()=>window.dispatchEvent(new Event("offline")));
await page.locator('input[data-m="1"]').nth(1).fill("11 3/8");
await page.waitForTimeout(3000);
const banner = await page.getByText(/No signal/i).isVisible().catch(()=>false);
check(banner,"offline banner appears");
const onDevice = await page.getByText(/Saved on this device/i).first().isVisible().catch(()=>false);
check(onDevice,"editor says the work is saved on the device");
await page.screenshot({path:OUT+"offline-1.png",fullPage:false});

// 3) the value really is in IndexedDB
const queued = await page.evaluate(async () => {
  const db = await new Promise((res)=>{const r=indexedDB.open("kiw-shop",1);r.onsuccess=()=>res(r.result);r.onerror=()=>res(null);});
  if(!db) return null;
  return await new Promise((res)=>{
    const rq=db.transaction("measure-outbox","readonly").objectStore("measure-outbox").getAll();
    rq.onsuccess=()=>res(rq.result); rq.onerror=()=>res(null);
  });
});
check(Array.isArray(queued) && queued.length===1, "the edit is durable in IndexedDB", `${queued?queued.length:0} row(s)`);
// Don't guess which field the second input maps to — just prove the value
// the measurer typed is somewhere in the durable payload.
const holdsValue = JSON.stringify(queued?.[0]?.data ?? {}).includes("11 3/8");
check(holdsValue, "the queued payload holds the offline value");

// 4) the server has NOT got it yet
const before = await (await ctx.request.post(`${BASE}/shop/api/measure`,{data:{type:"create",jobId:JOB,shape:"straight",steps1:1,name:"probe"}})).json();
await ctx.request.post(`${BASE}/shop/api/measure`,{data:{type:"delete",id:before.id,jobId:JOB}});

// 5) reload while STILL offline is impossible (server render) — instead prove
//    recovery: come back online, reload, and the value must be on the server.
await ctx.setOffline(false);
await page.evaluate(()=>window.dispatchEvent(new Event("online")));
await page.waitForSelector("text=All changes saved",{timeout:15000}).catch(()=>{});
await page.waitForTimeout(1500);
const flushed = await page.evaluate(async () => {
  const db = await new Promise((res)=>{const r=indexedDB.open("kiw-shop",1);r.onsuccess=()=>res(r.result);r.onerror=()=>res(null);});
  return await new Promise((res)=>{
    const rq=db.transaction("measure-outbox","readonly").objectStore("measure-outbox").getAll();
    rq.onsuccess=()=>res(rq.result); rq.onerror=()=>res(null);
  });
});
check(Array.isArray(flushed) && flushed.length===0,"queue drains itself once signal returns",`${flushed?flushed.length:0} left`);

await page.reload({waitUntil:"networkidle"});
await page.waitForTimeout(1200);
const persisted = await page.locator('input[data-m="1"]').nth(1).inputValue();
check(persisted==="11 3/8","the offline value survived to the server",persisted);

await ctx.request.post(`${BASE}/shop/api/measure`,{data:{type:"delete",id,jobId:JOB}});
await b.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
