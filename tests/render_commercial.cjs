/* Local-only visual regression. PLAYWRIGHT_MODULE may point to a disposable install. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const out = process.env.COMMERCIAL_ARTIFACTS || '/tmp/navy-revision/artifacts';
fs.mkdirSync(out, {recursive:true});
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+decodeURI(req.url.split('?')[0])); if(!p.startsWith(root+path.sep)){res.writeHead(403).end();return;} try {res.setHeader('Content-Type',mime[path.extname(p)]||'application/octet-stream');res.end(fs.readFileSync(p));}catch(e){res.writeHead(404).end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const results=[];
 try{
 for(const width of [1440,1024,768,390,320]){
 const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
 const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{const req=route.request();if(!['GET','HEAD'].includes(req.method())) {requests.push(req.url());return route.abort();} if(new URL(req.url()).hostname==='tridentre.github.io') return route.fulfill({status:200,contentType:mime[path.extname(new URL(req.url()).pathname)]||'application/octet-stream',body:fs.readFileSync(path.join(root,new URL(req.url()).pathname))}); return route.continue();});
 await page.goto('https://tridentre.github.io/services/commercial.html',{waitUntil:'networkidle'});
 await page.evaluate(()=>document.fonts.ready);
 const data=await page.evaluate(()=>{
 const main=document.querySelector('main'); const rect=e=>e.getBoundingClientRect();
 const sections=[...main.querySelectorAll('section')].map(e=>({class:e.className,bg:getComputedStyle(e).backgroundColor,height:rect(e).height}));
 const darkText=[...main.querySelectorAll('.commercial-dark h1,.commercial-dark h2,.commercial-dark h3,.commercial-dark p')].map(e=>({tag:e.tagName,color:getComputedStyle(e).color,text:e.textContent.slice(0,50)}));
 const overflow=[...main.querySelectorAll('*')].filter(e=>rect(e).right>innerWidth+1||rect(e).left < -1).map(e=>e.tagName+'.'+e.className);
 return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,sections,darkText,overflow,font:getComputedStyle(document.body).fontFamily,cta:getComputedStyle(main.querySelector('.btn')).color,details:main.querySelectorAll('details').length,preview:!!document.querySelector('#trident-preview-notice')};
 });
 assert.equal(data.sections[0].bg,'rgb(26, 45, 58)');assert.equal(data.sections[2].bg,'rgb(44, 74, 90)');assert.equal(data.sections[5].bg,'rgb(26, 45, 58)');
 assert.ok(data.sections[0].height>400);assert.ok(data.sections[2].height>600);
 assert.ok(data.darkText.every(e=>e.color==='rgb(255, 255, 255)'||e.color==='rgb(237, 244, 247)'));
 assert.equal(data.cta,'rgb(26, 45, 58)');assert.equal(data.details,5);assert.equal(data.preview,true);assert.ok(data.font.includes('Outfit'));
 assert.equal(data.scrollWidth,width);assert.deepEqual(data.overflow,[]);assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
 await page.screenshot({path:path.join(out,`commercial-${width}-full.png`),fullPage:true});
 if(width===1440||width===390) await page.screenshot({path:path.join(out,`commercial-${width}-hero.png`)});
 await page.locator('details').nth(1).locator('summary').click();assert.equal(await page.locator('details').nth(1).getAttribute('open'),'');
 results.push({...data,errors,blockedWrites:requests});await page.close();
 }
 fs.writeFileSync(path.join(out,'render-results.json'),JSON.stringify(results,null,2));console.log('PASS responsive renders + computed navy, text, overflow, FAQ, no writes: 1440, 1024, 768, 390, 320');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
