import test from 'node:test';
import assert from 'node:assert/strict';
import {makeHitEffect,hitEnvelope,drawHitEffect,drawHitLighting,MAX_HIT_EFFECTS} from '../src/hit-effects.js';
import {StageRenderer} from '../src/stage-v2.js';
import {RhythmEngine} from '../src/engine.js';
import {lineGeometry} from '../src/chart.js';

const event=(type='tap',extra={})=>({kind:'judge',type,lane:1,time:4,quality:'perfect',chord:1,combo:1,...extra});
function context(){
  const calls=[],stack=[],values={globalAlpha:1,globalCompositeOperation:'source-over',shadowBlur:0,lineWidth:1};
  const c={calls,stack};
  for(const key of ['globalAlpha','globalCompositeOperation','shadowBlur','lineWidth','fillStyle','strokeStyle','shadowColor','font','textAlign','textBaseline','lineJoin']){
    Object.defineProperty(c,key,{get:()=>values[key],set:v=>{if(key==='globalAlpha')assert.ok(Number.isFinite(v)&&v>=0&&v<=1);values[key]=v;}});
  }
  c.save=()=>stack.push({...values});c.restore=()=>{assert.ok(stack.length,'balanced restore');Object.assign(values,stack.pop());};
  for(const name of ['setTransform','translate','rotate','beginPath','moveTo','lineTo','closePath','fill','stroke','clip','fillRect','strokeRect','ellipse','fillText','setLineDash']){
    c[name]=(...args)=>{for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a),name+' geometry');calls.push({name,args});};
  }
  for(const name of ['createRadialGradient','createLinearGradient'])c[name]=(...args)=>{assert.ok(args.every(Number.isFinite));return{addColorStop(offset){assert.ok(offset>=0&&offset<=1);}};};
  return c;
}

test('hit profiles are deterministic, bounded and distinct for the three active note types',()=>{
  const profiles=['tap','hold','drag'].map(type=>makeHitEffect(event(type,{chord:4})));
  for(const e of profiles){assert.deepEqual(e,makeHitEffect(event(e.type,{chord:4})));assert.ok(e.sparks.length<=32);assert.ok(e.sparks.every(s=>Number.isFinite(s.vx)&&Number.isFinite(s.vy)));}
  assert.equal(new Set(profiles.map(e=>e.life)).size,3);
  assert.equal(new Set(profiles.map(e=>e.color)).size,3);
});
test('hit envelopes decay and misses never contribute success bloom',()=>{
  const e=makeHitEffect(event()),good=makeHitEffect(event('tap',{quality:'good'})),miss=makeHitEffect(event('tap',{quality:'miss'}));
  assert.equal(hitEnvelope(e,3.9),0);assert.equal(hitEnvelope(e,4),1);
  assert.ok(hitEnvelope(e,4.1)>hitEnvelope(e,4.2));assert.equal(hitEnvelope(e,5),0);
  assert.equal(hitEnvelope(good,4),.65);assert.equal(hitEnvelope(miss,4),0);assert.equal(miss.sparks.length,0);
});
test('reduced motion creates a short static light with no particles or background bloom',()=>{
  const e=makeHitEffect(event('drag',{chord:4}),{reduced:true}),c=context(),g=lineGeometry(4,1280,600);
  assert.equal(e.life,.15);assert.equal(e.sparks.length,0);drawHitEffect(c,e,g,4.05,{reduced:true});
  assert.equal(c.calls.filter(v=>v.name==='ellipse').length,0);assert.equal(c.calls.filter(v=>v.name==='fillRect').length,1);
  const before=c.calls.length;drawHitLighting(c,[e],g,4.05,1280,600,{reduced:true});assert.equal(c.calls.length,before);assert.equal(c.stack.length,0);
});
test('tap, hold and drag draw different impact silhouettes; chords add one cyan ring',()=>{
  const g=lineGeometry(4,1280,600),counts=[];
  for(const type of ['tap','hold','drag']){const c=context();drawHitEffect(c,makeHitEffect(event(type)),g,4.05);counts.push(c.calls.filter(v=>v.name==='ellipse').length);assert.equal(c.stack.length,0);assert.equal(c.globalAlpha,1);assert.equal(c.globalCompositeOperation,'source-over');}
  assert.deepEqual(counts,[2,3,0]);
  const c=context();drawHitEffect(c,makeHitEffect(event('tap',{chord:4})),g,4.05);assert.equal(c.calls.filter(v=>v.name==='ellipse').length,3);
});
test('lighting draws only the strongest effect in each lane and restores canvas state',()=>{
  const c=context(),g=lineGeometry(4,1280,600),e=makeHitEffect(event());
  drawHitLighting(c,[e,{...e,time:3.95},makeHitEffect(event('tap',{lane:2,quality:'miss'}))],g,4.05,1280,600);
  assert.equal(c.calls.filter(v=>v.name==='fillRect').length,3);assert.equal(c.stack.length,0);assert.equal(c.globalAlpha,1);assert.equal(c.shadowBlur,0);
});
test('renderer caps effects, uses judged combo milestones and resets replay feedback',()=>{
  const c=context(),r=new StageRenderer({getContext:()=>c,getBoundingClientRect:()=>({width:1280,height:600})});
  for(let i=0;i<100;i++)r.event(event('tap',{time:i*.02,combo:i+1}));
  assert.equal(r.effects.length,MAX_HIT_EFFECTS);assert.equal(r.judges.length,32);assert.equal(r.milestone.combo,100);
  r.event(event('hold',{kind:'head',combo:125}));assert.equal(r.milestone.combo,100);
  r.reset();assert.equal(r.effects.length,0);assert.equal(r.judges.length,0);assert.equal(r.milestone,null);assert.equal(r.lastHit,-100);
});
test('dense feedback rendering is finite at mobile and desktop sizes and does not mutate judgments',()=>{
  for(const [width,height]of [[319,127],[844,313],[1280,643]]){
    const c=context(),r=new StageRenderer({getContext:()=>c,getBoundingClientRect:()=>({width,height})});
    const notes=['tap','hold','drag','tap'].map((type,lane)=>({id:lane,type,lane,time:4.1,end:type==='hold'?5:4.1,chord:4}));
    const e=new RhythmEngine(notes);e.combo=50;
    ['tap','hold','drag','tap'].forEach((type,lane)=>r.event(event(type,{lane,chord:4,combo:50})));
    r.event(event('tap',{lane:1,time:4.03,chord:1,combo:51}));
    const before=JSON.stringify(e.result());r.draw(e,4.07,1,{songId:'prism',difficulty:'expert'});
    assert.equal(JSON.stringify(e.result()),before);assert.equal(c.stack.length,0);assert.ok(c.calls.some(v=>v.name==='ellipse'));
    assert.equal(c.calls.filter(v=>v.name==='fillText'&&v.args[0]==='PERFECT').length,4,'one judgment label per lane, even in dense phrases');
  }
});
test('feedback events report real combo, with hold heads not counting twice',()=>{
  const e=new RhythmEngine([{id:0,type:'tap',lane:0,time:1,end:1},{id:1,type:'hold',lane:1,time:2,end:3},{id:2,type:'tap',lane:0,time:4,end:4}]);
  e.press(0,'tap',1,{keyboard:true});assert.equal(e.drain()[0].combo,1);e.release('tap',1.01);
  e.press(1,'hold',2,{keyboard:true});const head=e.drain()[0];assert.equal(head.kind,'head');assert.equal(head.combo,1);
  e.update(3);assert.equal(e.drain()[0].combo,2);e.update(5);assert.equal(e.drain()[0].combo,0);
});
