/* Local-only visual regression. PLAYWRIGHT_MODULE may point to a disposable install. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const out = process.env.COMMERCIAL_ARTIFACTS || '/workspace/revision-tools/artifacts';
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
 return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,sections,darkText,overflow,font:getComputedStyle(document.body).fontFamily,cta:getComputedStyle(main.querySelector('.btn')).color,details:main.querySelectorAll('details').length,preview:!!document.querySelector('#trident-preview-notice'),
 svgColors:[...document.querySelectorAll('svg [fill],svg [stroke]')].flatMap(e=>['fill','stroke'].filter(a=>e.getAttribute(a)?.includes('var(')).map(a=>({attr:a,color:getComputedStyle(e)[a]}))),
 markerFontSizes:[...document.querySelectorAll('.diagram-marker text')].filter(e=>e.getBoundingClientRect().width).map(e=>{const matrix=e.getScreenCTM();return parseFloat(getComputedStyle(e).fontSize)*matrix.a;}),
 legendSize:parseFloat(getComputedStyle(document.querySelector('.diagram-legend li')).fontSize),
 diagramDesktop:getComputedStyle(document.querySelector('.diagram-desktop')).display,
 diagramMobile:getComputedStyle(document.querySelector('.diagram-mobile')).display,
 footerColor:getComputedStyle(document.querySelector('.main-footer p')).color,
 content:main.innerText};
 });
 assert.ok(data.svgColors.every(c=>c.color!=='rgb(0, 0, 0)'&&c.color!=='none'),JSON.stringify(data.svgColors));
 const section=className=>data.sections.find(e=>e.class.split(' ').includes(className));
 assert.equal(section('service-hero').bg,'rgb(26, 45, 58)');
 assert.equal(section('commercial-blueprint').bg,'rgb(44, 74, 90)');
 assert.equal(section('commercial-services').bg,'rgb(44, 74, 90)');
 assert.equal(section('cta-banner').bg,'rgb(26, 45, 58)');
 assert.ok(section('service-hero').height>400);assert.ok(section('commercial-services').height>600);
 assert.ok(data.markerFontSizes.every(size=>size>=12),JSON.stringify(data.markerFontSizes));
 assert.equal(data.markerFontSizes.length,8);assert.ok(data.legendSize>=15);
 assert.equal(width<=540?data.diagramDesktop:data.diagramMobile,'none');
 assert.equal(data.footerColor,'rgb(181, 207, 216)');
 for(const phrase of ['core sampling','HVAC','Preventative maintenance','TPO / PVC','EPDM','Modified bitumen','Built-up roofing','scuppers','crickets']) assert.ok(data.content.includes(phrase),phrase);
 assert.ok(!data.content.includes('01 / INQUIRY')); assert.ok(!data.content.includes('From first inquiry'));
 delete data.content;
 assert.ok(data.darkText.every(e=>e.color==='rgb(255, 255, 255)'||e.color==='rgb(237, 244, 247)'));
 assert.equal(data.cta,'rgb(26, 45, 58)');assert.equal(data.details,5);assert.equal(data.preview,true);assert.ok(data.font.includes('Outfit'));
 assert.equal(data.scrollWidth,width);assert.deepEqual(data.overflow,[]);assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
 await page.screenshot({path:path.join(out,`commercial-${width}-full.png`),fullPage:true});
 await page.locator('.commercial-blueprint').screenshot({path:path.join(out,`commercial-${width}-blueprint.png`),style:'.main-header,#trident-preview-notice{visibility:hidden !important}'});
 await page.evaluate(()=>window.scrollTo(0,0));
 if(width===1440||width===390) await page.screenshot({path:path.join(out,`commercial-${width}-hero.png`)});
 await page.locator('details').nth(1).locator('summary').click();assert.equal(await page.locator('details').nth(1).getAttribute('open'),'');
 await page.locator('details').nth(1).locator('summary').press('Enter');assert.equal(await page.locator('details').nth(1).getAttribute('open'),null);
 results.push({...data,errors,blockedWrites:requests});await page.close();
 }
 fs.writeFileSync(path.join(out,'render-results.json'),JSON.stringify(results,null,2));console.log('PASS responsive renders + computed navy, text, overflow, FAQ, no writes: 1440, 1024, 768, 390, 320');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
