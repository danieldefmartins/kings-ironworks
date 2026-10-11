// Conditional surfaces added on main: populated survey, shot markup, laser,
// layer names and shop-piece material presets in all three worker languages.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from './playwright.mjs';
const BASE=process.env.SHOP_BASE_URL, JOB=process.env.SHOP_JOB_ID, OUT=process.env.MEASURE_AUDIT_DIR;
if(OUT)mkdirSync(OUT,{recursive:true});
const browser=await chromium.launch(),ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,locale:'pt-BR',timezoneId:'America/Los_Angeles'});
const created=[],findings=[],screens=[];
let page;
async function api(data){const r=await ctx.request.post(`${BASE}/shop/api/measure`,{data:{jobId:JOB,...data}});assert.ok(r.ok(),`measure ${data.type}: ${r.status()}`);return r.json();}
async function capture(lang,theme,view){
 if(theme==='dark'){
  const dialogs=await page.locator('[data-measure-ui][role="dialog"]').evaluateAll(ns=>ns.map(n=>getComputedStyle(n).backgroundColor));
  assert.ok(dialogs.every(c=>c!=='rgb(255, 255, 255)'),`Dark dialog has a white surface: ${view}`);
 }
 const result=await page.evaluate(()=>{
  const roots=[...document.querySelectorAll('[data-measure-ui], [role="dialog"]')];
  const visible=n=>{if(!n.checkVisibility({visibilityProperty:true}))return false;return !n.closest('[hidden]');};
  const buttons=[...new Set(roots.flatMap(r=>[...r.querySelectorAll('button')]))].filter(visible);
  const name=n=>n.getAttribute('aria-label')||n.innerText;
  return {text:roots.map(r=>r.innerText).join('\n'),small:buttons.filter(n=>{const r=n.getBoundingClientRect();return r.width<43.9||r.height<43.9;}).map(n=>({name:name(n),w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height})),unnamed:buttons.filter(n=>!/[\p{L}\p{N}]/u.test(name(n))).map(n=>n.outerHTML.slice(0,200)),overflow:document.documentElement.scrollWidth>innerWidth};
 });
 screens.push({lang,theme,view,...result});
 if(result.small.length||result.unnamed.length||result.overflow)findings.push({lang,theme,view,...result});
 if(OUT)await page.screenshot({path:join(OUT,`${lang}-${theme}-expanded-${view}.png`),fullPage:false,animations:'disabled'});
}
try{
 assert.ok((await ctx.request.post(`${BASE}/shop/api/login`,{data:{workerId:process.env.SHOP_WORKER_ID,pin:process.env.SHOP_PIN}})).ok());
 const gate=await api({type:'create',shape:'gate',steps1:3,name:'QA expanded survey'});created.push(gate.id);
 const d=gate.sheet.data;
 d.gate.widthTop='48.125';d.gate.widthBottom='48';d.gate.heightHinge='60';d.gate.heightLatch='60';
 d.survey={jobType:'restore',conditions:[{id:'qa1',location:'Front landing',defect:'broken_weld',severity:'unsafe',sectionLoss:'',action:'weld_repair',quantity:'2',length:'6.25',photoSlot:'survey_qa1'}],access:{route:'house',doorWidth:'32',stairWidth:'36',turningRoom:'',maxLength:'72',maxWeight:'150',lift:false,crane:false,scaffold:true,parking:'',permit:'no',power:'240',generator:false,pieces:[{id:'piece1',label:'G1',length:'84',weight:'120'}]},verify:[{id:'v1',label:'Clear opening',source:'',original:'48',value:'48.125',who:'Alex',when:'2026-10-11T13:45:00.000Z',tolerance:'widthVar'}]};
 await api({type:'update',id:gate.id,data:d,baseUpdatedAt:gate.sheet.updated_at});
 const piece=await api({type:'create',shape:'shop_piece',steps1:1,name:'QA expanded pieces'});created.push(piece.id);
 page=await ctx.newPage();page.on('pageerror',e=>findings.push({error:e.message,url:page.url()}));
 for(const lang of ['en','pt','es']){
  assert.ok((await ctx.request.post(`${BASE}/shop/api/action`,{data:{type:'lang_set',lang}})).ok());
  const t=(en,pt,es)=>lang==='pt'?pt:lang==='es'?es:en;
  for(const theme of ['light','dark']){
   await page.goto(`${BASE}/shop/job/${JOB}/measure/${gate.id}`,{waitUntil:'networkidle'});
   await page.evaluate(theme=>{localStorage.setItem('kiw-shop-appearance',theme);window.dispatchEvent(new Event('kiw-appearance-change'));},theme);
   await page.getByRole('button',{name:t(/^Shop package/,/^Pacote da oficina/,/^Paquete del taller/)}).click();
   const survey=page.locator('[data-survey]');
   await survey.getByText('Front landing',{exact:true}).click();
   await capture(lang,theme,'condition');
   await page.getByRole('dialog').getByRole('button',{name:t('Done','OK','Listo'),exact:true}).click();
   await survey.locator('details').evaluateAll(ns=>ns.forEach(n=>n.open=true));
   await survey.getByText(t('Install access & delivery','Acesso e entrega','Acceso y entrega'),{exact:true}).evaluate(n=>window.scrollTo(0,n.getBoundingClientRect().top+scrollY-70));
   await capture(lang,theme,'access');
   await survey.locator('[data-verify-row]').click();
   await capture(lang,theme,'verification');
   await page.getByRole('dialog').getByRole('button',{name:t('Done','OK','Listo'),exact:true}).click();
   await page.getByRole('button',{name:t('Drawing','Desenho','Dibujo'),exact:true}).click();
   await page.getByLabel(t('Tool','Ferramenta','Herramienta'),{exact:true}).selectOption('photos');
   await page.getByRole('button',{name:new RegExp(t('Take next shot','Tirar a próxima foto','Tomar la siguiente foto'))}).click();
   const camera=page.getByTestId('shot-camera');await camera.waitFor();
   await capture(lang,theme,'shot-camera');
   // A generated in-browser fixture avoids using a customer's photo or uploading data.
   const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=640;c.height=400;const g=c.getContext('2d');g.fillStyle='#e2e8f0';g.fillRect(0,0,640,400);g.fillStyle='#475569';g.fillRect(70,80,500,240);return c.toDataURL('image/png').split(',')[1];});
   await camera.locator('input[type=file]').last().setInputFiles({name:'QA-fixture.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
   await page.getByRole('dialog').getByRole('radiogroup').waitFor();
   await capture(lang,theme,'markup');
   await page.getByRole('dialog').getByRole('button',{name:t('Cancel','Cancelar','Cancelar'),exact:true}).click();
   await page.getByTestId('shot-camera').getByRole('button',{name:t('Close','Fechar','Cerrar'),exact:true}).click();
   const laser=page.locator('[data-laser-control] > button');
   if(await laser.count()){await laser.click();await capture(lang,theme,'laser');await page.getByRole('button',{name:t('Close laser','Fechar laser','Cerrar láser'),exact:true}).click();}
   await page.goto(`${BASE}/shop/job/${JOB}/measure/${piece.id}`,{waitUntil:'networkidle'});
   await page.locator('#sp-materials').evaluate(n=>window.scrollTo(0,n.getBoundingClientRect().top+scrollY-70));
   const presetText=await page.locator('#sp-materials').innerText();
   if(lang!=='en')assert.ok(!/sq tube|round bar|sq bar|angle|plate/.test(presetText),presetText);
   await capture(lang,theme,'piece-materials');
   console.log(`ok  expanded ${lang} ${theme}: survey, timestamp hydration, camera, markup, laser, presets`);
  }
 }
}finally{
 await ctx.request.post(`${BASE}/shop/api/action`,{data:{type:'lang_set',lang:'en'}});
 for(const id of created)await api({type:'delete',id});
 if(OUT)writeFileSync(join(OUT,'audit-expanded.json'),JSON.stringify({screens,findings},null,2));
 await browser.close();
}
assert.deepEqual(findings,[]);console.log(`ok  ${screens.length} conditional screens audited`);
