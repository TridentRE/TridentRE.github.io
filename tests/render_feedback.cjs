/* PLAYWRIGHT_MODULE=/path/to/playwright FEEDBACK_ARTIFACTS=/path/to/output node tests/render_feedback.cjs */
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname,'..');
const out = process.env.FEEDBACK_ARTIFACTS || fs.mkdtempSync(path.join(require('node:os').tmpdir(),'trident-feedback-'));
fs.mkdirSync(out, {recursive:true});
const before = process.argv.includes('--before');
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
(async()=>{
 const browser = await chromium.launch({args:['--no-sandbox']});
 const results = [];
 try {
  for(const width of [390,1440]) {
   const page = await browser.newPage({viewport:{width,height:width===390?844:900},hasTouch:width===390,isMobile:width===390});
   const errors = [], writes = [];
   page.on('pageerror', e=>errors.push(e.message));
   await page.route('**/*',route=>{
    const req = route.request(), u = new URL(req.url());
    if(!['GET','HEAD'].includes(req.method())){writes.push(req.url());return route.abort();}
    if(u.hostname==='tridentre.github.io'){
     let file = path.join(root,u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname);
     return fs.existsSync(file) ? route.fulfill({status:200,contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)}) : route.fulfill({status:404,body:'Not found'});
    }
    return route.continue();
   });
   await page.goto('https://tridentre.github.io/',{waitUntil:'networkidle'});
   await page.mouse.move(width-2,2);
   if(width===390) await page.touchscreen.tap(width-8,150);
   const hero = page.locator('.home-status');
   // Real elapsed time, no fake clock: two consecutive visible transitions.
   const changes = [];
   for(let i=0;i<2;i++){
    const current = await hero.innerText(), start = Date.now();
    await page.waitForFunction(value=>document.querySelector('.home-status').textContent!==value,current,{timeout:11000});
    changes.push({from:current,to:await hero.innerText(),elapsedMs:Date.now()-start});
   }
   if(!before) assert.ok(changes[1].elapsedMs>=4500&&changes[1].elapsedMs<=5600,JSON.stringify(changes));
   await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.home-slide.active')).opacity)>.99);
   await page.screenshot({path:`${out}/${before?'before':'after'}-homepage-${width}-hero.png`});
   if(!before){
    // All service pages and the existing portfolio, with ordinary scroll reveal.
    for(const [name,url,selector] of [
     ['homepage','/','body'],['portfolio','/#projects','#projects'],
     ['siding','/services/siding.html','body'],['commercial','/services/commercial.html','body'],
     ['certifications','/certifications.html','body']
    ]){
     await page.goto('https://tridentre.github.io'+url,{waitUntil:'networkidle'});
     await page.evaluate(()=>document.fonts.ready);
     const height = await page.evaluate(()=>document.documentElement.scrollHeight);
     for(let y=0;y<height;y+=600){
      await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);
      await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
     }
     await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));
     if(name==='portfolio')await page.locator(selector).scrollIntoViewIfNeeded();
     else await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width,name+' overflows');
     assert.equal(await page.locator('meta[name=robots]').getAttribute('content'),'noindex,nofollow');
     const broken = await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src));
     assert.deepEqual(broken,[],name+' broken images');
     if(name==='portfolio')await page.locator(selector).screenshot({path:`${out}/after-${name}-${width}.png`});
     else await page.screenshot({path:`${out}/after-${name}-${width}.png`,fullPage:true});
     if(name==='homepage'){
      await page.locator('.homepage-trust-strip').scrollIntoViewIfNeeded();
      await page.locator('.homepage-trust-strip').screenshot({path:`${out}/after-certifications-strip-${width}.png`});
      await page.locator('.service-modal-trigger[data-service="siding"]').click();
      assert.match(await page.locator('#service-modal #modal-body').innerText(),/cedar shake and wood siding/i);
      await page.locator('#modal-close').click();
     }
     if(name==='commercial'){
      await page.locator('.planning-note').scrollIntoViewIfNeeded();
      await page.locator('.planning-note').screenshot({path:`${out}/after-commercial-difference-${width}.png`});
     }
     if(name==='siding'){
      await page.locator('.siding-options').scrollIntoViewIfNeeded();
      await page.locator('.siding-options').screenshot({path:`${out}/after-siding-options-${width}.png`});
     }
    }
    // Timer suspension and accessibility states using a deterministic clock.
    await page.goto('https://tridentre.github.io/',{waitUntil:'networkidle'});
    await page.mouse.move(width-2,2);
    await page.clock.install();
    await page.clock.runFor(5100);
    const getStatus=()=>hero.innerText();
    const s=await getStatus();
    if(width===1440){
     await page.mouse.move(width-20,400);
     await page.clock.runFor(11000);assert.equal(await getStatus(),s,'hover pause');
     await page.mouse.move(width-2,2);
     await page.clock.runFor(5100);assert.notEqual(await getStatus(),s,'hover resume');
    }
    await page.locator('.home-next').focus();
    assert.equal(await page.locator('.home-rotation').innerText(),'Play slideshow');
    const focus=await getStatus();await page.clock.runFor(11000);assert.equal(await getStatus(),focus,'focus pause');
    await page.locator('.home-next').press('Enter');assert.notEqual(await getStatus(),focus,'manual navigation');
    await page.locator('.home-rotation').click();
    await page.mouse.move(width-2,2);
    await page.clock.runFor(5100);
    await page.locator('.home-rotation').click();
    const paused=await getStatus();await page.clock.runFor(11000);assert.equal(await getStatus(),paused,'button pause');
    await page.emulateMedia({reducedMotion:'reduce'});await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.locator('.home-rotation').innerText(),'Play slideshow');
    await page.clock.runFor(11000);assert.equal(await getStatus(),'1 / 7');
    await page.locator('.home-next').click();assert.equal(await getStatus(),'2 / 7');
    assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
   }
   results.push({width,changes,errors,writes});
   await page.close();
  }
  fs.writeFileSync(`${out}/${before?'before':'after'}-browser-results.json`,JSON.stringify(results,null,2));
  console.log(JSON.stringify(results));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
