import test from 'node:test';
import assert from 'node:assert/strict';
import {makeChart,BEAT,DURATION,lineMotion,laneX,lineY,KEYS} from '../src/chart.js';
import {RhythmEngine} from '../src/engine.js';
import {RhythmAudio} from '../src/audio.js';
import {readSettings,saveSettings,readBest,saveBest} from '../src/storage.js';
const note=(lane=0,time=1,type='tap',end=time)=>({id:0,lane,time,type,end});
test('two authored charts are fixed, use four keys and contain tap, hold and drag only',()=>{
  for(const mode of ['light','flow']){const a=makeChart(mode);assert.deepEqual(a,makeChart(mode));assert.ok(a.length>100);assert.equal(Math.round(a[0].time*44100),Math.round(8*BEAT*44100));assert.deepEqual([...new Set(a.map(n=>n.lane))].sort(),[0,1,2,3]);assert.deepEqual([...new Set(a.map(n=>n.type))].sort(),['drag','hold','tap']);for(const n of a){assert.ok(n.end>=n.time&&n.end<DURATION);}}
  assert.ok(makeChart('flow').length>makeChart('light').length);assert.deepEqual(KEYS,['KeyD','KeyF','KeyJ','KeyK']);
});
test('holds never overlap another note in the same lane',()=>{for(const mode of ['light','flow']){const a=makeChart(mode);for(const n of a.filter(n=>n.type==='hold'))assert.equal(a.some(m=>m.id!==n.id&&m.lane===n.lane&&m.time>=n.time&&m.time<n.end),false);}});
test('judgment line only bobs vertically; all four lane X positions stay constant',()=>{
  for(const w of [320,390,900]){const positions=[0,1,2,3].map(l=>laneX(l,w));for(let t=0;t<75;t+=.25)assert.deepEqual([0,1,2,3].map(l=>laneX(l,w)),positions);assert.notEqual(lineY(0,0,w,600),lineY(30,0,w,600));assert.equal(lineY(30,0,w,600),lineY(30,3,w,600));}assert.equal(lineMotion(18).tilt,0);assert.equal(lineMotion(18).angle,0);
});
test('tap is tied to a fixed key; wrong keys do not judge it',()=>{const e=new RhythmEngine([note(2)]);e.press(0,'a',1);assert.equal(e.perfect,0);e.press(2,'b',1);assert.equal(e.perfect,1);assert.equal(e.score,1e6);e.update(3);assert.equal(e.perfect,1);});
test('perfect/good/miss windows and accuracy',()=>{const e=new RhythmEngine([note(0,1),{...note(1,2),id:1},{...note(2,3),id:2}]);e.press(0,'a',1.02);e.press(1,'b',2.1);e.update(3.2);assert.equal(e.perfect,1);assert.equal(e.good,1);assert.equal(e.miss,1);assert.equal(e.combo,0);assert.equal(e.maxCombo,2);assert.equal(e.score,550000);assert.ok(Math.abs(e.accuracy-55)<.0001);});
test('holding a key does not auto-hit taps and repeat input cannot double-judge',()=>{const e=new RhythmEngine([note(0),{...note(0,2),id:1}]);e.press(0,'a',1);e.press(0,'a',2);e.update(2.2);assert.equal(e.perfect,1);assert.equal(e.miss,1);});
test('hold requires sustained input; early release misses',()=>{const e=new RhythmEngine([note(0,1,'hold',2)]);e.press(0,'a',1);assert.equal(e.notes[0].state,'holding');e.release('a',1.2);e.update(1.4);assert.equal(e.miss,1);});
test('hold finishes once and has a small release tolerance',()=>{const e=new RhythmEngine([note(0,1,'hold',2)]);e.press(0,'a',1.03);e.release('a',1.93);e.update(3);assert.equal(e.perfect,1);assert.equal(e.miss,0);assert.equal(e.finished,true);});
test('a lost hold can transfer to another finger on the same key within grace',()=>{const e=new RhythmEngine([note(0,1,'hold',2)]);e.press(0,'a',1);e.release('a',1.3);e.press(0,'b',1.4);e.update(1.41);assert.equal(e.notes[0].owner,'b');e.update(2);assert.equal(e.perfect,1);});
test('drag can be caught by an already-held fixed key, not early',()=>{const e=new RhythmEngine([note(1,1,'drag')]);e.press(1,'a',.8);e.update(.99);assert.equal(e.perfect,0);e.update(1.01);assert.equal(e.perfect,1);});
test('a dense drag chain can be caught by holding two fixed keys, with no flick gesture or repeated presses',()=>{
  const chart=Array.from({length:20},(_,id)=>({...note(id%2,1+id*.10,'drag'),id})),e=new RhythmEngine(chart);
  e.press(0,'left',.8);e.press(1,'right',.8);for(let t=.8;t<3.2;t+=.01)e.update(t);
  assert.equal(e.perfect,20);assert.equal(e.miss,0);assert.equal(e.score,1e6);assert.equal(e.inputs.size,2);
});
test('authored charts can reach all-perfect through actual input methods',()=>{
  for(const mode of ['light','flow']){const chart=makeChart(mode),e=new RhythmEngine(chart);const actions=[];for(const n of chart){actions.push({t:n.time,kind:'press',n});actions.push({t:n.type==='hold'?n.end:n.time+.001,kind:'release',n});}
    actions.sort((a,b)=>a.t-b.t||(a.kind==='release'?-1:1));for(const a of actions){const id='test-'+a.n.id;if(a.kind==='press')e.press(a.n.lane,id,a.t,{keyboard:true});else e.release(id,a.t);e.update(a.t);}e.update(DURATION);assert.equal(e.score,1e6);assert.equal(e.rank,'AP');assert.equal(e.miss,0);assert.equal(e.maxCombo,chart.length);
  }
});
test('demo resolves every note once, including long notes',()=>{const e=new RhythmEngine(makeChart('flow'),{demo:true});for(let t=0;t<DURATION;t+=.013)e.update(t);assert.equal(e.score,1e6);assert.equal(e.finished,true);});
test('music clock is based on audible output, not frame count; resume never rewinds',()=>{
  const a=new RhythmAudio();a.context={currentTime:10,outputLatency:.05};a.running=true;a.anchor=5;a.position=0;assert.equal(a.clock(),4.949999999999999);a.position=5;assert.equal(a.clock(),5);a.running=false;assert.equal(a.clock(),5);
});
test('namespaced settings and best scores preserve other games and survive unavailable storage',()=>{
  const map=new Map([['sushi-game','untouched']]),s={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};saveSettings({music:.6,hit:.9,offset:15,speed:1.2,difficulty:'flow'},s);assert.equal(readSettings(s).offset,15);saveBest('light',{score:800000},s);saveBest('light',{score:100},s);assert.equal(readBest('light',s).score,800000);assert.equal(map.get('sushi-game'),'untouched');const blocked={getItem:()=>{throw Error();},setItem:()=>{throw Error();}};assert.equal(readSettings(blocked).music,.65);assert.equal(readBest('light',blocked),null);
});
