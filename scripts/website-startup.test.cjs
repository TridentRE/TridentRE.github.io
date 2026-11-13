const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
test('a page without service-modal markup still initializes its phone menu',()=>{
 let ready;let click;let toggled=false;
 const hamburger={addEventListener(event,fn){if(event==='click')click=fn;},classList:{toggle(){}}};
 const nav={classList:{toggle(){toggled=true;},remove(){}}};
 const context={document:{addEventListener(event,fn){if(event==='DOMContentLoaded')ready=fn;},getElementById(id){return id==='hamburger'?hamburger:null;},querySelector(selector){return selector==='.desktop-nav'?nav:null;},querySelectorAll(){return [];}},window:{innerWidth:390},IntersectionObserver:class{observe(){}},console};
 vm.runInNewContext(source,context);assert.doesNotThrow(()=>ready());assert.equal(typeof click,'function');click();assert.equal(toggled,true);
});
test('present service modal still registers its close and backdrop listeners',()=>{
 const events=[];const nodes={};for(const id of ['service-modal','modal-body','modal-close'])nodes[id]={addEventListener(event,fn){events.push([id,event]);},classList:{remove(){}}};
 const context={document:{addEventListener(){},getElementById(id){return nodes[id]||null;},querySelectorAll(){return [];},body:{style:{}}},console};
 vm.runInNewContext(source,context);assert.doesNotThrow(()=>context.initServiceModals());
 assert.deepEqual(events,[['modal-close','click'],['service-modal','click']]);
});
