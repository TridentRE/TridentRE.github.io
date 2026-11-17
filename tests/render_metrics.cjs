/* Offline browser integration: every request is served/mocked; never writes to a backend. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const out = process.env.METRICS_ARTIFACTS;
(async()=>{
 const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
 const results=[];
 try {
  for(const width of [390,1440]) {
   const context=await browser.newContext({viewport:{width,height:900}});
   const page=await context.newPage();const errors=[],events=[],submissions=[],thirdParty=[];let succeed=false;
   page.on('pageerror',e=>errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   await context.route('**/*',async route=>{
    const req=route.request();const url=new URL(req.url());
    const cors={'access-control-allow-origin':'https://www.tridentroofingandexteriors.ca'};
    if(url.pathname==='/api/website/event') {
     events.push(JSON.parse(req.postData()));return route.fulfill({status:200,headers:cors,json:{ok:true}});
    }
    if(url.pathname==='/api/website/submit') {
     if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{...cors,'access-control-allow-methods':'POST','access-control-allow-headers':'content-type'}});
     submissions.push(JSON.parse(req.postData()));return route.fulfill({status:200,headers:cors,json:succeed?{ok:true}:{ok:false,error:'Synthetic failure; retry'}});
    }
    if(/googletagmanager|clarity\.ms/.test(url.hostname))thirdParty.push(req.url());
    if(url.hostname==='www.tridentroofingandexteriors.ca') {
     const target=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
     assert.ok(target.startsWith(root+path.sep));
     if(fs.existsSync(target))return route.fulfill({path:target});
     throw Error('Missing local asset '+url.pathname);
    }
    return route.fulfill({status:200,body:'',contentType:req.resourceType()==='stylesheet'?'text/css':'text/plain'});
   });
   await page.goto('https://www.tridentroofingandexteriors.ca/services/roofing.html?utm_source=google&utm_medium=cpc&utm_campaign=metrics-test&gclid=not-a-real-id');
   await page.waitForLoadState('networkidle');
   const initial=await page.evaluate(()=>JSON.parse(localStorage.getItem('trident.attribution.v1')));
   assert.equal(initial.firstTouch.landingPage,'/services/roofing.html');assert.equal(initial.firstTouch.utm_source,'google');
   const callResponse=page.waitForResponse(r=>r.url().endsWith('/api/website/event'));
   await page.locator('a[href^="tel:"]').first().evaluate(a=>a.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true})));
   await callResponse;
   assert.equal(events.at(-1).type,'call_tap');assert.equal(events.at(-1).gclid,true);assert.equal(events.at(-1).page,'/services/roofing.html');
   await page.goto('https://www.tridentroofingandexteriors.ca/contact.html');await page.waitForLoadState('networkidle');
   const startResponse=page.waitForResponse(r=>r.url().endsWith('/api/website/event'));
   await page.locator('[name="name"]').fill('Synthetic test');await startResponse;
   await page.locator('[name="phone"]').fill('2025550149');
   const failed=page.waitForResponse(r=>r.url().endsWith('/api/website/submit')&&r.request().method()==='POST');
   await page.locator('#consultation-form button[type="submit"]').click();await failed;
   await page.locator('#form-status').filter({hasText:'Synthetic failure'}).waitFor();
   assert.equal(events.filter(e=>e.type==='form_submit').length,0);
   succeed=true;const success=page.waitForResponse(r=>r.url().endsWith('/api/website/event')&&r.request().postDataJSON().type==='form_submit');
   await page.locator('#consultation-form button[type="submit"]').click();await success;
   await page.locator('#form-status').filter({hasText:'has been received'}).waitFor();
   assert.equal(submissions.length,2);assert.equal(submissions[0].submission_id,submissions[1].submission_id);
   assert.equal(submissions[1].attribution.landingPage,'/services/roofing.html');assert.equal(submissions[1].attribution.formPage,'/contact.html');
   assert.equal(submissions[1].attribution.gclid,'not-a-real-id');assert.equal(events.filter(e=>e.type==='form_start').length,1);
   assert.equal(thirdParty.length,0);assert.deepEqual(errors,[]);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);
   if(out){fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,`contact-${width}.png`),fullPage:true});}
   results.push({width,events,attribution:submissions[1].attribution,consoleErrors:errors,thirdPartyRequests:thirdParty.length,overflow});
   await context.close();
  }
  if(out)fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(results,null,2)+'\n');
  console.log(JSON.stringify({ok:true,network:'All requests intercepted; no external writes',results},null,2));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
