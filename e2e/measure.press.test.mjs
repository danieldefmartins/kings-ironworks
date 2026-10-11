// Focus mode uses explicit tools and scene selection. Exercise the current
// touch path (including fullscreen) instead of hidden legacy Sketch targets.
import assert from 'node:assert/strict';
import { chromium } from './playwright.mjs';
const BASE=process.env.SHOP_BASE_URL,JOB=process.env.SHOP_JOB_ID;
const browser=await chromium.launch(),ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});let id;
try{
 assert.ok((await ctx.request.post(`${BASE}/shop/api/login`,{data:{workerId:process.env.SHOP_WORKER_ID,pin:process.env.SHOP_PIN}})).ok());
 const body=await (await ctx.request.post(`${BASE}/shop/api/measure`,{data:{type:'create',jobId:JOB,shape:'straight',steps1:4,name:'TOUCH QA'}})).json();id=body.id;assert.ok(id);
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${BASE}/shop/job/${JOB}/measure/${id}`,{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Full screen',exact:true}).tap();
 assert.equal(await page.locator('[data-scene-viewport]').getAttribute('data-fullscreen'),'true');
 await page.getByRole('button',{name:'Exit full screen',exact:true}).tap();
 await page.locator('[data-next-measure]').scrollIntoViewIfNeeded();
 await page.getByRole('button',{name:'Show on drawing',exact:true}).tap();
 await page.getByRole('button',{name:'Add railing post here',exact:true}).tap();
 await page.getByRole('heading',{name:'Post position',exact:true}).waitFor();
 await page.getByRole('status').filter({hasText:'All changes saved'}).waitFor();
 console.log('ok  touch fullscreen, step selection and post placement');
 await page.getByLabel('Tool',{exact:true}).selectOption('connections');
 const remove=page.getByRole('button',{name:/Remove/}).first();await remove.tap();
 await page.getByRole('status').filter({hasText:'All changes saved'}).waitFor();
 await page.reload({waitUntil:'networkidle'});
 await page.getByLabel('Tool',{exact:true}).selectOption('connections');
 assert.equal(await page.getByText(/Posts \(0\)/).count(),1);
 assert.deepEqual(errors,[]);console.log('ok  post removal persists and touch flow has no client errors');
}finally{if(id)await ctx.request.post(`${BASE}/shop/api/measure`,{data:{type:'delete',id,jobId:JOB}});await browser.close();}
