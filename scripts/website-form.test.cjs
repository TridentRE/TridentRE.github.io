const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(process.env.FORM_SOURCE || path.join(__dirname, '../js/website-form.js'), 'utf8');
function fixture({host='tridentre.github.io', mode, transport, valid=true}={}) {
  const calls=[]; const fields={};
  for(const name of ['name','phone','email','address','message']) fields[name]={value:{name:'Test-Name Person',phone:'202-555-0149',email:'test@example.invalid',address:'123 Test Street',message:'Synthetic test only'}[name]};
  const checks=[{value:'roofing', checked:true, dispatchEvent(){this.changed=true;}},{value:'siding',checked:false,dispatchEvent(){this.changed=true;}}];
  const button={innerHTML:'Submit request',disabled:true,textContent:'Submit request'};
  const makeElement=(tag)=>({tag,attrs:{},children:[],setAttribute(k,v){this.attrs[k]=v;},appendChild(el){this.children.push(el);if(el.name) fields[el.name]=el;},focus(){this.focused=true;}});
  const form={events:{}, elements:{namedItem(name){return fields[name];}},children:[],
    appendChild(el){this.children.push(el);},querySelector(q){if(q.startsWith('button'))return button;if(q.includes('insurance_claim'))return {checked:true};},
    querySelectorAll(q){return q.includes(':checked') ? checks.filter(c=>c.checked):checks;},
    addEventListener(event,fn){this.events[event]=fn;},reportValidity(){return valid;},reset(){for(const f of Object.values(fields))f.value='';for(const c of checks)c.checked=false;this.resetCalled=true;}};
  const win={location:{hostname:host,search:'?project=commercial'},TRIDENT_SITE:{releaseMode:mode},crypto:require('node:crypto').webcrypto};
  const context={window:win,document:{getElementById(id){return id==='consultation-form'?form:null;},createElement:makeElement},
    URLSearchParams,Uint8Array,Array,Event,AbortController,setTimeout,clearTimeout,
    fetch:async(url,opts)=>{calls.push({url,opts});return transport?transport(url,opts):{ok:true,json:async()=>({ok:true})};}};
  vm.runInNewContext(source,context);
  const submit=()=>form.events.submit({preventDefault(){}});
  const status=form.children.find(x=>x.id==='form-status');
  return {form,fields,checks,button,calls,status,submit};
}
test('preview uses isolated endpoint, no credentials, complete bounded payload and truthful result',async()=>{
  const f=fixture(); assert.equal(f.button.disabled,false); assert.equal(f.form.method,'post');
  assert.match(f.status.textContent,/made-up/); await f.submit(); assert.equal(f.calls.length,1);
  const call=f.calls[0]; assert.equal(call.url,'https://fine-cow-593.convex.site/api/website/submit');
  assert.equal(call.opts.credentials,'omit'); const data=JSON.parse(call.opts.body);
  assert.deepEqual(data.services,['roofing']);assert.equal(data.insurance_claim,'yes');assert.ok(data.submission_id.length>=16);
  assert.equal(f.fields.message.maxLength,6000);assert.equal(f.form.resetCalled,true);assert.ok(f.checks.every(x=>x.changed));
  assert.match(f.status.textContent,/No notification email was sent/);
});
test('unknown or production host without release approval stays fail-closed',async()=>{
 for(const host of ['localhost','evil.invalid','tridentre.github.io.evil.invalid','www.tridentroofingandexteriors.ca']){
  const f=fixture({host});assert.equal(f.button.disabled,true);await f.submit();assert.equal(f.calls.length,0);assert.match(f.status.textContent,/not enabled/);
 }
});
test('exact production hosts use only production endpoint after release mode enabled',async()=>{
 for(const host of ['www.tridentroofingandexteriors.ca','tridentroofingandexteriors.ca']){
  const f=fixture({host,mode:'production'});await f.submit();assert.equal(f.calls[0].url,'https://spotted-gnat-928.convex.site/api/website/submit');
  assert.match(f.status.textContent,/has been received/);assert.doesNotMatch(f.status.textContent,/email.*sent/);
 }
});
test('failed request preserves input and reuses idempotency id for retry',async()=>{
 let n=0;const f=fixture({transport:async()=>++n===1?{ok:false,json:async()=>({error:'Please try later'})}:{ok:true,json:async()=>({ok:true})}});
 await f.submit();assert.equal(f.form.resetCalled,undefined);assert.equal(f.fields.name.value,'Test-Name Person');assert.equal(f.button.disabled,false);
 assert.equal(f.status.attrs.role,'alert');await f.submit();assert.equal(f.calls.length,2);
 assert.equal(JSON.parse(f.calls[0].opts.body).submission_id,JSON.parse(f.calls[1].opts.body).submission_id);
});
test('changed content gets a new id, and malformed success is never shown as saved',async()=>{
 const f=fixture({transport:async()=>({ok:true,json:async()=>({ok:false})})});await f.submit();
 assert.equal(f.form.resetCalled,undefined);const first=JSON.parse(f.calls[0].opts.body).submission_id;
 f.fields.message.value+=' new detail';await f.submit();assert.notEqual(first,JSON.parse(f.calls[1].opts.body).submission_id);
 assert.match(f.status.textContent,/could not save/);
});
test('HTML service error retains details rather than crashing or claiming success',async()=>{
 const f=fixture({transport:async()=>({ok:false,json:async()=>{throw new Error('Not JSON');}})});await f.submit();
 assert.equal(f.form.resetCalled,undefined);assert.match(f.status.textContent,/unavailable/);assert.equal(f.button.disabled,false);
});
test('double-click while pending makes one network call',async()=>{
 let resolve;const pending=new Promise(r=>resolve=r);const f=fixture({transport:()=>pending});const first=f.submit();await f.submit();assert.equal(f.calls.length,1);
 resolve({ok:true,json:async()=>({ok:true})});await first;assert.equal(f.button.disabled,false);
});
test('invalid browser form never sends',async()=>{const f=fixture({valid:false});await f.submit();assert.equal(f.calls.length,0);});
