import assert from 'node:assert/strict';
import { chromium } from './playwright.mjs';
const BASE=process.env.SHOP_BASE_URL, JOB=process.env.SHOP_JOB_ID;
const browser=await chromium.launch(), ctx=await browser.newContext({viewport:{width:1024,height:1366},locale:'pt-BR',timezoneId:'America/Los_Angeles'});
const errors=[];let id;
try {
 assert.ok((await ctx.request.post(`${BASE}/shop/api/login`,{data:{workerId:process.env.SHOP_WORKER_ID,pin:process.env.SHOP_PIN}})).ok());
 const created=await ctx.request.post(`${BASE}/shop/api/measure`,{data:{type:'create',jobId:JOB,shape:'straight',steps1:3,name:'UI QA'}});
 const body=await created.json();id=body.id;assert.ok(id);
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 const url=`${BASE}/shop/job/${JOB}/measure/${id}`;
 await page.goto(url,{waitUntil:'networkidle'});
 await page.locator('#next-measure-input').fill('6 3/4');
 await page.getByRole('status').filter({hasText:'All changes saved'}).waitFor();
 await page.getByLabel('Tool',{exact:true}).selectOption('structure');
 await page.getByLabel('Stair width',{exact:true}).fill('48');
 await page.getByRole('status').filter({hasText:'All changes saved'}).waitFor();
 await page.reload({waitUntil:'networkidle'});
 await page.getByLabel('Tool',{exact:true}).selectOption('structure');
 assert.equal(await page.getByLabel('Stair width',{exact:true}).inputValue(),'48');
 await page.getByText('Type the list instead',{exact:false}).click();
 assert.equal(await page.getByRole('textbox',{name:'Rise',exact:true}).first().inputValue(),'6 3/4');
 console.log('ok  NextMeasurement and detailed fields autosave across reload');
 assert.ok((await ctx.request.post(`${BASE}/shop/api/measure`,{data:{type:'rename',id,jobId:JOB,name:'UI QA other device'}})).ok());
 await page.getByLabel('Stair width',{exact:true}).fill('49');
 await page.getByText(/changed on another device/).waitFor();
 await page.reload({waitUntil:'networkidle'});
 assert.equal(await page.getByLabel('Drawing name',{exact:true}).inputValue(),'UI QA other device');
 console.log('ok  stale writer shows conflict and reload restores server state');
 // Filled stair + wall references triggered React #418 in hidden print SVGs.
 const data=body.sheet.data;data.datums.orientation='left_wall';
 for(const s of data.segments)if(s.kind==='flight'){s.width='48';s.steps.forEach(st=>Object.assign(st,{rise:'7',run:'11',nosing:'1'}));}
 assert.ok((await ctx.request.post(`${BASE}/shop/api/measure`,{data:{type:'update',id,jobId:JOB,data}})).ok());
 await page.reload({waitUntil:'networkidle'});
 const wallTitles=await page.locator('[data-wall-segment] title').allTextContents();
 assert.ok(wallTitles.length>0,'filled stair wall titles are rendered');
 assert.ok(wallTitles.every(t=>t.includes('Walls')));
 assert.deepEqual(errors,[]);
 console.log('ok  filled stairs hydrate without client errors across locale/time zone');
} finally {
 if(id)await ctx.request.post(`${BASE}/shop/api/measure`,{data:{type:'delete',id,jobId:JOB}});
 await browser.close();
}
