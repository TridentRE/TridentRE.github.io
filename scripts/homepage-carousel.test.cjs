const test = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/homepage-carousel.js'),'utf8');
function setup({touch=false,reduced=false}={}){
 function element(){
  const events={};
  return {textContent:'',hidden:true,attrs:{},events,
   addEventListener:(n,f)=>events[n]=f,
   setAttribute(n,v){this.attrs[n]=v;},
   classList:{toggle(){}},
   fire(n,event={}){events[n]?.(event);}
  };
 }
 const hero=element(),document=element(), slides=Array.from({length:7},element), frames=Array.from({length:7},element);
 const elements=Object.fromEntries(['.home-controls','.home-rotation','.home-status','.home-slides','.home-prev','.home-next'].map(x=>[x,element()]));
 hero.querySelector=s=>elements[s];hero.querySelectorAll=s=>s==='.home-slide'?slides:frames;
 document.getElementById=()=>hero;document.hidden=false;
 const motion=element(),fine=element();motion.matches=reduced;fine.matches=!touch;
 let interval=null,starts=0,observer;
 frames.forEach((f,i)=>{f.dataset=i?{src:`frame-${i+1}.webp`}:{};});
 const winEvents={};
 const window={matchMedia:q=>q.includes('reduced-motion')?motion:fine,
  addEventListener:(n,f)=>winEvents[n]=f,
  setInterval(fn,ms){interval={fn,ms};starts++;return starts;},
  clearInterval(){interval=null;}
 };
 class IntersectionObserver {constructor(fn,options){observer=fn;assert.equal(options.threshold,0);} observe(){}}
 window.IntersectionObserver=IntersectionObserver;
 vm.runInNewContext(source,{window,document,IntersectionObserver});
 return {hero,document,elements,motion,fine,slides,frames,winEvents,
  timer:()=>interval,starts:()=>starts,
  tick(){interval?.fn();},
  visible(v){observer([{isIntersecting:v}]);}
 };
}
test('autoplay dwells five seconds and stable visibility does not reset it',()=>{
 const s=setup();assert.equal(s.timer().ms,5000);assert.equal(s.starts(),1);
 s.visible(true);s.document.fire('visibilitychange');assert.equal(s.starts(),1);
 s.tick();assert.equal(s.elements['.home-status'].textContent,'2 / 7');
 assert.equal(s.slides.filter(e=>e.attrs['aria-hidden']==='false').length,1);
 assert.equal(s.frames.filter(e=>e.attrs['aria-hidden']==='false').length,1);
 s.visible(false);assert.equal(s.timer(),null);s.visible(true);assert.equal(s.timer().ms,5000);
 s.document.hidden=true;s.document.fire('visibilitychange');assert.equal(s.timer(),null);
 s.document.hidden=false;s.document.fire('visibilitychange');assert.equal(s.timer().ms,5000);
});
test('fine mouse hover pauses and resumes; touch compatibility events cannot stick',()=>{
 const s=setup();s.hero.fire('pointerenter',{pointerType:'mouse'});assert.equal(s.timer(),null);
 s.hero.fire('pointerleave');assert.equal(s.timer().ms,5000);
 s.hero.fire('pointerenter',{pointerType:'touch'});assert.equal(s.timer().ms,5000);
 const mobile=setup({touch:true});mobile.hero.fire('pointerenter',{pointerType:'mouse'});assert.equal(mobile.timer().ms,5000);
});
test('focus and pause button pause, manual controls remain usable',()=>{
 const s=setup();s.hero.fire('focusin');assert.equal(s.timer(),null);
 s.elements['.home-next'].fire('click');assert.equal(s.elements['.home-status'].textContent,'2 / 7');
 s.elements['.home-rotation'].fire('click');assert.equal(s.timer().ms,5000);
 s.elements['.home-rotation'].fire('click');assert.equal(s.timer(),null);
});
test('reduced motion defaults to manual navigation',()=>{
 const s=setup({reduced:true});assert.equal(s.timer(),null);
 s.elements['.home-next'].fire('click');assert.equal(s.elements['.home-status'].textContent,'2 / 7');
});

test('frames after the first load lazily: current and next on show, all after page load',()=>{
 const c=setup();
 assert.equal(c.frames[0].src,undefined);
 assert.equal(c.frames[1].src,'frame-2.webp');
 assert.equal(c.frames[2].src,undefined);
 c.tick();
 assert.equal(c.frames[2].src,'frame-3.webp');
 assert.equal(typeof c.winEvents.load,'function');
});
