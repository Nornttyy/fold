import test from 'node:test';
import assert from 'node:assert/strict';
import {SONGS} from '../src/songs.js';
import {DIFFICULTIES,makeChart} from '../src/chart.js';
import {scrollPosition,scrollVelocity,noteDistance,SPEED_SCORES} from '../src/scroll.js';
import {upcomingGuides} from '../src/line-guide.js';
import {RhythmAudio,hitTimeline} from '../src/audio.js';

test('all songs have authored positive visual acceleration and deceleration',()=>{
  for(const s of SONGS)for(const d of Object.keys(DIFFICULTIES)){
    const values=[];for(let t=0;t<s.duration;t+=.15){const v=scrollVelocity(t,s.id,d);assert.ok(v>=.60&&v<=2);values.push(v);}
    assert.ok(Math.max(...values)-Math.min(...values)>.25);
  }
});
test('scroll integral is continuous, its derivative matches velocity and notes never jump at speed edges',()=>{
  for(const s of SONGS)for(const d of Object.keys(DIFFICULTIES)){
    for(const [b]of SPEED_SCORES[s.id]){
      const t=b*s.beat,eps=.00001,left=scrollPosition(t-eps,s.id,d),right=scrollPosition(t+eps,s.id,d);
      assert.ok(Math.abs(right-left)<eps*4.01);assert.ok(Math.abs((right-left)/(eps*2)-scrollVelocity(t,s.id,d))<.00001);
    }
    for(let t=0;t<s.duration;t+=.25)assert.ok(scrollPosition(t+.1,s.id,d)>scrollPosition(t,s.id,d));
  }
});
test('every note and hold tail still arrives at its authored timestamp despite changing visual speed',()=>{
  for(const s of SONGS)for(const d of Object.keys(DIFFICULTIES))for(const n of makeChart(d,s.id)){
    for(const end of [n.time,n.end]){
      assert.equal(noteDistance(end,end,240,s.id,d),0);
      assert.ok(noteDistance(end,end-.01,240,s.id,d)>0);assert.ok(noteDistance(end,end+.01,240,s.id,d)<0);
    }
  }
  assert.equal(noteDistance(5,4,240,'prism','expert',{constant:true}),240);
});
test('line guides choose only the next playable note per lane, progressively charge, and retain held notes',()=>{
  const notes=[{lane:0,time:1,state:'pending',type:'tap'},{lane:0,time:1.3,state:'pending',type:'drag'},{lane:1,time:0,state:'holding',type:'hold'},{lane:1,time:1,state:'pending',type:'tap'},{lane:2,time:2.5,state:'pending',type:'tap'},{lane:3,time:.9,state:'perfect',type:'tap'}];
  const original=JSON.stringify(notes),early=upcomingGuides(notes,.5,.5),late=upcomingGuides(notes,.9,.5);
  assert.deepEqual(early.map(n=>n.lane),[0,1]);assert.equal(early[0].time,1);assert.ok(late[0].charge>early[0].charge);assert.equal(early[1].charge,1);assert.equal(early[1].sustain,true);
  assert.equal(JSON.stringify(notes),original);assert.ok(upcomingGuides(notes,1.1,.5).every(n=>n.sustain||n.time>=1.1));
});
function mockAudio(){
  const sources=[],gains=[];
  const gain=()=>{const g={connected:null,disconnected:false,gain:{value:0,targets:[],cancelScheduledValues(){},setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;this.targets.push(v);}},connect(target){this.connected=target;},disconnect(){this.disconnected=true;}};gains.push(g);return g;};
  const a=new RhythmAudio();a.context={currentTime:10,state:'running',resume:async()=>{},createGain:gain,decodeAudioData:async()=>({duration:2}),createBufferSource(){const s={connected:null,started:null,stopped:null,disconnected:false,playbackRate:{value:1},connect(t){this.connected=t;},disconnect(){this.disconnected=true;},start(...v){this.started=v;},stop(...v){this.stopped=v;}};sources.push(s);return s;}};
  a.master=gain();a.music=gain();a.hits=gain();a.raw['scene-home']=new ArrayBuffer(2);a.raw['scene-result']=new ArrayBuffer(2);a.buffers.music={duration:20};
  return {a,sources,gains};
}
test('menu/result loops use a separate source, respect volume and do not alter the song clock',async()=>{
  const {a,sources}=mockAudio();a.running=true;a.anchor=5;a.position=0;const time=a.clock();
  assert.equal(await a.scene('home'),true);assert.equal(a.clock(),time);assert.equal(a.sceneSource.loop,true);assert.equal(a.sceneName,'home');
  const menu=a.sceneSource;a.setVolumes(.50,.8);assert.equal(a.sceneGain.gain.value,.50*.42);
  assert.equal(await a.scene('result'),true);assert.notEqual(a.sceneSource,menu);assert.ok(menu.stopped);assert.equal(a.sceneName,'result');assert.equal(a.clock(),time);
  a.play(2,.2);assert.equal(a.sceneSource,null);assert.equal(a.sceneName,null);assert.equal(a.source,sources.at(-1));assert.equal(a.position,2);
});
test('late scene decoding cannot start menu music over gameplay after a transition',async()=>{
  const {a,sources}=mockAudio();let resolve;a.context.decodeAudioData=()=>new Promise(r=>resolve=r);
  const pending=a.scene('home');await Promise.resolve();assert.equal(typeof resolve,'function');a.stopScene();resolve({duration:2});assert.equal(await pending,false);assert.equal(sources.length,0);assert.equal(a.sceneSource,null);
});
test('audio decode deduplicates concurrent work and rejects stale song data after changing songs',async()=>{
  const {a}=mockAudio();let resolve,calls=0;a.context.decodeAudioData=()=>{calls++;return new Promise(r=>resolve=r);};
  delete a.buffers.music;const first=new ArrayBuffer(2);a.raw.music=first;const p=a.decode('music'),q=a.decode('music');assert.equal(calls,1);
  a.raw.music=new ArrayBuffer(4);resolve({duration:99});await Promise.all([p,q]);assert.equal(a.buffers.music,undefined);assert.equal(a.decoding.size,0);
  a.context.decodeAudioData=async()=>({duration:12});await a.decode('music');assert.equal(a.buffers.music.duration,12);
});
test('demo hit timeline follows chart attacks and musical hold tails without changing the chart',()=>{
  const notes=[{time:2,end:3,type:'hold',chord:2},{time:1,end:1,type:'tap',chord:1},{time:2,end:2,type:'drag',chord:2}];
  const original=JSON.stringify(notes),events=hitTimeline(notes);
  assert.deepEqual(events.map(e=>[e.time,e.type,e.tail]),[[1,'tap',false],[2,'hold',false],[2,'drag',false],[3,'hold',true]]);
  assert.equal(events[1].strength,.9/Math.sqrt(2));assert.equal(events[3].strength,.6/Math.sqrt(2));assert.equal(JSON.stringify(notes),original);
});
test('demo percussion starts on the exact audio clock and pause cancels queued hits',()=>{
  const {a,sources,gains}=mockAudio();a.buffers.hit={duration:.085};a.buffers['hit-hold']={duration:.13};a.running=true;a.anchor=5;
  const time=a.clock(),tap=a.snap(1,'tap',false,10.1),tail=a.snap(.6,'hold',true,10.12);
  assert.deepEqual(tap.started,[10.1]);assert.deepEqual(tail.started,[10.12]);assert.equal(tail.playbackRate.value,1.3);assert.equal(tail.buffer,a.buffers['hit-hold']);assert.equal(a.scheduledHits.size,2);assert.equal(a.clock(),time);
  a.pause();assert.ok(sources.every(s=>s.stopped));assert.equal(a.scheduledHits.size,0);assert.equal(a.position,time);
  tap.onended();tail.onended();assert.ok(sources.every(s=>s.disconnected));assert.ok(gains.slice(-2).every(g=>g.disconnected));
  const immediate=a.snap(1,'tap',false,9);assert.deepEqual(immediate.started,[10]);immediate.onended();assert.equal(a.scheduledHits.size,0);
});
