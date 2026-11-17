const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/website-metrics.js'), 'utf8');
const KEY = 'trident.attribution.v1';
function fixture({url='https://www.tridentroofingandexteriors.ca/services/roofing.html?utm_source=google&utm_medium=cpc&gclid=click-id', referrer='https://google.ca/search?q=private#secret', storage=new Map(), denied=false, config={}, beacon=true}={}) {
  const events={}, beacons=[], fetches=[], scripts=[];
  const localStorage={getItem(k){if(denied)throw Error('denied');return storage.get(k)||null;}, setItem(k,v){if(denied)throw Error('denied');storage.set(k,v);}};
  const window={location:new URL(url), localStorage, TRIDENT_ANALYTICS_CONFIG:config, fetch:async(...args)=>{fetches.push(args);}};
  const document={referrer,addEventListener(k,f){events[k]=f;},createElement(){return {};},head:{appendChild(node){scripts.push(node);}}};
  const navigator={sendBeacon:(...args)=>{beacons.push(args);if(beacon==='throw')throw Error('no');return beacon;}};
  const context={window,document,navigator,URL,URLSearchParams,Blob,Date};
  vm.runInNewContext(source,context);
  return {window, events, beacons, fetches, scripts, storage,context,api:window.TRIDENT_METRICS};
}
const attr=f=>JSON.parse(JSON.stringify(f.api.attribution()));
const payload=async f=>JSON.parse(await f.beacons.at(-1)[1].text());
test('first touch persists 30-day timestamp, path-only landing and host/path referrer',()=>{
  const f=fixture();const a=attr(f);
  assert.equal(a.landingPage,'/services/roofing.html');assert.equal(a.formPage,a.landingPage);
  assert.equal(a.referrer,'google.ca/search');assert.equal(a.gclid,'click-id');assert.equal(a.utm_source,'google');
  assert.ok(Math.abs(Date.now()-a.firstSeenAt)<1000);assert.ok(f.storage.has(KEY));
});
test('navigation preserves first touch; new campaign replaces last-touch UTMs and old click IDs',()=>{
  const first=fixture();const initial=attr(first);
  const direct=fixture({storage:first.storage,url:'https://www.tridentroofingandexteriors.ca/contact.html?name=private'});
  assert.equal(attr(direct).landingPage,initial.landingPage);assert.equal(attr(direct).utm_medium,'cpc');assert.equal(attr(direct).formPage,'/contact.html');
  const latest=fixture({storage:first.storage,url:'https://www.tridentroofingandexteriors.ca/contact.html?utm_source=facebook&utm_campaign=winter&fbclid=new'});
  const a=attr(latest);assert.equal(a.utm_source,'facebook');assert.equal(a.utm_campaign,'winter');assert.equal(a.gclid,undefined);assert.equal(a.utm_medium,undefined);assert.equal(a.firstSeenAt,initial.firstSeenAt);
  assert.equal(JSON.parse(first.storage.get(KEY)).firstTouch.utm_source,'google');
});
test('expired, future, malformed and unavailable storage safely start fresh',()=>{
  for(const saved of ['bad JSON', JSON.stringify({firstTouch:{firstSeenAt:Date.now()-30*86400000,landingPage:'/old'}}), JSON.stringify({firstTouch:{firstSeenAt:Date.now()+60000}})]) {
    const f=fixture({storage:new Map([[KEY,saved]])});assert.equal(attr(f).landingPage,'/services/roofing.html');
  }
  const f=fixture({denied:true});assert.equal(attr(f).utm_source,'google');assert.equal(f.scripts.length,0);
});
test('caps campaign values and click IDs; excludes arbitrary queries, hashes and credentials',()=>{
  const f=fixture({url:'https://www.tridentroofingandexteriors.ca/contact.html?utm_source='+ 'x'.repeat(200)+'&gclid='+ 'g'.repeat(100)+'&fbclid='+ 'f'.repeat(100)+'&email=private%40example.com#private',referrer:'https://user:password@example.com/path?email=secret#hash'});
  const a=attr(f);assert.equal(a.utm_source.length,120);assert.equal(a.gclid.length,64);assert.equal(a.fbclid.length,64);assert.equal(a.referrer,'example.com/path');assert.equal(a.email,undefined);
  assert.ok(!JSON.stringify(a).includes('password'));assert.ok(!JSON.stringify(a).includes('private'));
});
test('stored attribution is revalidated and non-http referrers are ignored',()=>{
  const storage=new Map([[KEY,JSON.stringify({firstTouch:{landingPage:'//evil.example/path',referrer:'example.com/path?q=secret#hash',firstSeenAt:Date.now()},lastTouch:{utm_source:'a'.repeat(300),email:'secret'}})]]);
  const f=fixture({storage,url:'https://www.tridentroofingandexteriors.ca/'});assert.equal(attr(f).landingPage,'/');assert.equal(attr(f).referrer,'example.com/path');assert.equal(attr(f).utm_source.length,120);assert.equal(attr(f).email,undefined);
  assert.equal(attr(fixture({referrer:'javascript:alert(1)'})).referrer,'');
});
test('call taps emit only the exact anonymous contract and do not block navigation',async()=>{
  const f=fixture();let prevented=false;
  f.events.click({target:{closest:()=>({getAttribute:()=> 'tel:+12266800996'})},preventDefault(){prevented=true;}});
  const body=await payload(f);assert.deepEqual(body,{type:'call_tap',page:'/services/roofing.html',landingPage:'/services/roofing.html',utm_source:'google',utm_medium:'cpc',gclid:true,fbclid:false});
  assert.equal(prevented,false);assert.equal(f.beacons[0][0],'https://spotted-gnat-928.convex.site/api/website/event');assert.match(f.beacons[0][1].type,/text\/plain/);
  assert.equal(JSON.stringify(body).includes('click-id'),false);
});
test('first real form field focus emits once; unrelated fields and honeypot are ignored',async()=>{
  const f=fixture();const focus=(name,tagName='INPUT',form=true,type='text')=>f.events.focusin({target:{name,tagName,type,closest:()=>form?{}:null}});
  focus('name','INPUT',false);focus('website');focus('hidden','INPUT',true,'hidden');focus('submit','BUTTON');assert.equal(f.beacons.length,0);
  focus('name');focus('phone');focus('message','TEXTAREA');assert.equal(f.beacons.length,1);assert.equal((await payload(f)).type,'form_start');
});
test('beacon false, missing or throwing falls back to nonblocking credential-free keepalive',async()=>{
  for(const beacon of [false,'throw']) {
    const f=fixture({beacon});f.api.track('call_tap');assert.equal(f.fetches.length,1);
    const [,opts]=f.fetches[0];assert.equal(opts.keepalive,true);assert.equal(opts.credentials,'omit');assert.equal(opts.redirect,'error');assert.equal(opts.method,'POST');
    assert.equal(JSON.parse(opts.body).type,'call_tap');
  }
  const f=fixture();f.context.navigator.sendBeacon=undefined;f.api.track('form_submit');assert.equal(f.fetches.length,1);
  f.window.fetch=()=>Promise.reject(Error('offline'));assert.doesNotThrow(()=>f.api.track('form_submit'));
  f.window.fetch=()=>{throw Error('disabled');};assert.doesNotThrow(()=>f.api.track('form_submit'));
});
test('empty or invalid analytics config loads nothing and creates no third-party queues',()=>{
  for(const config of [{},{GA4_ID:'',CLARITY_ID:''},{GA4_ID:'bad id',CLARITY_ID:'bad/id'}]) {
    const f=fixture({config});f.api.track('call_tap');assert.equal(f.scripts.length,0);assert.equal(f.window.dataLayer,undefined);assert.equal(f.window.clarity,undefined);
  }
  const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/analytics-config.js'),'utf8'),context);
  assert.equal(context.window.TRIDENT_ANALYTICS_CONFIG.GA4_ID,'');assert.equal(context.window.TRIDENT_ANALYTICS_CONFIG.CLARITY_ID,'');
});
test('configured IDs load asynchronous GA/Clarity and emit sanitized page view and conversion events',()=>{
  const f=fixture({config:{GA4_ID:'G-ABC123',CLARITY_ID:'abc123'}});
  assert.equal(f.scripts.length,2);assert.ok(f.scripts.every(s=>s.async));
  const queue=f.window.dataLayer.map(args=>Array.from(args));assert.equal(queue[1][0],'config');assert.equal(queue[1][2].send_page_view,true);assert.equal(queue[1][2].page_location,'https://www.tridentroofingandexteriors.ca/services/roofing.html');assert.equal(queue[1][2].page_referrer,'https://google.ca/search');
  f.api.track('call_tap');f.api.track('form_start');f.api.track('form_submit');
  assert.deepEqual(Array.from(f.window.dataLayer.slice(2),args=>args[1]),['click_call','generate_lead']);
});
test('unapproved/lookalike hosts initialize nothing; all approved hosts work',()=>{
  for(const host of ['localhost','evil.invalid','tridentre.github.io.evil.invalid']){const f=fixture({url:'https://'+host+'/'});assert.equal(f.api,undefined);assert.equal(f.storage.size,0);assert.equal(f.scripts.length,0);}
  for(const host of ['tridentroofingandexteriors.ca','www.tridentroofingandexteriors.ca','tridentre.github.io'])assert.ok(fixture({url:'https://'+host+'/'}).api);
});
test('duplicate initialization and unknown event types cannot duplicate listeners/counts',()=>{
  const f=fixture();const api=f.api;vm.runInNewContext(source,f.context);assert.equal(f.window.TRIDENT_METRICS,api);f.api.track('bad');assert.equal(f.beacons.length,0);
});

test('privacy-unsafe UTM/click values are dropped; unsafe paths/referrers fall back safely',()=>{
 const f=fixture({url:'https://www.tridentroofingandexteriors.ca/user@example.com?utm_source=private%40example.com&utm_campaign=hello%3Fprivate&utm_term=hello%23private&gclid=email%40example.com&utm_medium=cpc',referrer:'https://example.com/user@example.com?secret'});
 const a=attr(f);assert.equal(a.formPage,'/');assert.equal(a.landingPage,'/');assert.equal(a.referrer,'');assert.equal(a.utm_source,undefined);assert.equal(a.utm_campaign,undefined);assert.equal(a.utm_term,undefined);assert.equal(a.gclid,undefined);assert.equal(a.utm_medium,'cpc');
});
