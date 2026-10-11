// All shipped shape screens, three worker languages and both appearances.
// Optional artifacts: MEASURE_AUDIT_DIR=/absolute/path (phone/tablet PNGs + JSON).
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from './playwright.mjs';
const BASE=process.env.SHOP_BASE_URL,JOB=process.env.SHOP_JOB_ID,OUT=process.env.MEASURE_AUDIT_DIR;
if(OUT)mkdirSync(OUT,{recursive:true});
const browser=await chromium.launch(),ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
const shapes=['straight','stair_platform','l_shape','u_shape','builder','level_run','ramp','wall_rail','spiral','window_well','fire_escape','gate','fence','balcony','deck','custom','opening','structural'];
const created=[],findings=[],screens=[];let page;
async function inspect(){
 const audit=await page.locator('[data-measure-ui]').evaluate(root=>{
      const visible=n=>{const r=n.getBoundingClientRect();if(!r.width||!r.height||getComputedStyle(n).visibility==='hidden')return false;for(let p=n.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS'&&!p.open&&!p.querySelector(':scope > summary')?.contains(n))return false;return true;};
      const buttons=[...root.querySelectorAll('button')].filter(visible);
      return {text:root.innerText,small:buttons.filter(n=>{const r=n.getBoundingClientRect();return r.width<43.9||r.height<43.9;}).map(n=>({name:n.getAttribute('aria-label')||n.innerText,w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height})),unnamed:buttons.filter(n=>!n.getAttribute('aria-label')&&!/[\p{L}\p{N}]/u.test(n.innerText)).map(n=>n.outerHTML.slice(0,300))};
     });
 return audit;
}
try{
 assert.ok((await ctx.request.post(`${BASE}/shop/api/login`,{data:{workerId:process.env.SHOP_WORKER_ID,pin:process.env.SHOP_PIN}})).ok());
 for(const shape of shapes){const r=await ctx.request.post(`${BASE}/shop/api/measure`,{data:{type:'create',jobId:JOB,shape,steps1:3,steps2:2,name:`QA ${shape}`}});assert.ok(r.ok());created.push({shape,...await r.json()});}
 page=await ctx.newPage();page.on('pageerror',e=>findings.push({error:e.message,url:page.url()}));
 for(const lang of ['en','pt','es']){
  assert.ok((await ctx.request.post(`${BASE}/shop/api/action`,{data:{type:'lang_set',lang}})).ok());
  for(const {shape,id} of created){
   await page.goto(`${BASE}/shop/job/${JOB}/measure/${id}`,{waitUntil:'networkidle'});
   for(const theme of ['light','dark']){
    await page.evaluate(theme=>{localStorage.setItem('kiw-shop-appearance',theme);window.dispatchEvent(new Event('kiw-appearance-change'));},theme);
    await page.waitForFunction(theme=>document.querySelector('[data-shop-theme]')?.getAttribute('data-shop-theme')===theme,theme);
    await page.waitForTimeout(250);
    for(const viewport of [{width:390,height:844},{width:1024,height:1366}]){
     await page.setViewportSize(viewport);await page.evaluate(()=>window.scrollTo(0,0));
     if(OUT)await page.screenshot({path:join(OUT,`${lang}-${theme}-${shape}-${viewport.width}.png`),fullPage:false,animations:'disabled'});
    }
    await page.setViewportSize({width:390,height:844});
    const tool=page.getByRole('combobox',{name:lang==='pt'?'Ferramenta':lang==='es'?'Herramienta':'Tool',exact:true});
    const options=process.env.MEASURE_AUDIT_NAV_ONLY?[]:await tool.count()?await tool.locator('option').evaluateAll(ns=>ns.map(n=>n.value)):['form'];
    for(const value of options){
     if(value!=='form')await tool.selectOption(value);
     const audit=await inspect();
     screens.push({shape,lang,theme,tool:value,...audit});
     if(audit.small.length||audit.unnamed.length)findings.push({shape,lang,theme,tool:value,small:audit.small,unnamed:audit.unnamed});
     if(OUT&&theme==='dark'&&lang!=='en'){await page.locator('[data-selection-tools]').evaluate(n=>window.scrollTo(0,n.getBoundingClientRect().top+window.scrollY-70));await page.screenshot({path:join(OUT,`${lang}-${theme}-${shape}-${value}.png`),fullPage:false,animations:'disabled'});}
    }
    // These screens live outside the Tool menu.
    for(const [value,label] of [['materials',lang==='pt'?'Materiais':lang==='es'?'Materiales':'Materials'],['review',lang==='pt'?/^Pacote da oficina/:lang==='es'?/^Paquete del taller/:/^Shop package/]]){
     await page.getByRole('button',{name:label,exact:typeof label==='string'}).click();
     if(value==='materials')await page.locator('[data-selection-tools] details').evaluateAll(ns=>ns.forEach(n=>n.open=true));
     const audit=await inspect();screens.push({shape,lang,theme,tool:value,...audit});
     if(audit.small.length||audit.unnamed.length)findings.push({shape,lang,theme,tool:value,small:audit.small,unnamed:audit.unnamed});
     if(OUT){await page.locator('[data-selection-tools]').evaluate(n=>window.scrollTo(0,n.getBoundingClientRect().top+window.scrollY-70));await page.screenshot({path:join(OUT,`${lang}-${theme}-${shape}-${value}.png`),fullPage:false,animations:'disabled'});}
    }
    await page.getByRole('button',{name:lang==='pt'?'Desenho':lang==='es'?'Dibujo':'Drawing',exact:true}).click();
   }
   console.log(`ok  ${lang} ${shape}: light/dark, phone/tablet, tools, materials and review`);
  }
 }
}finally{
 await ctx.request.post(`${BASE}/shop/api/action`,{data:{type:'lang_set',lang:'en'}});
 for(const {id}of created)await ctx.request.post(`${BASE}/shop/api/measure`,{data:{type:'delete',jobId:JOB,id}});
 if(OUT)writeFileSync(join(OUT,process.env.MEASURE_AUDIT_NAV_ONLY?'audit-navigation.json':'audit.json'),JSON.stringify({screens,findings},null,2));
 await browser.close();
}
assert.deepEqual(findings,[]);console.log(`ok  ${screens.length} screens audited`);
