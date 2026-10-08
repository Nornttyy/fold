import test from 'node:test';
import assert from 'node:assert/strict';
import {SONGS,getSong} from '../src/songs.js';
import {musicScore} from '../src/music-score.js';
import {musicalStage} from '../src/musical-stage.js';
import {NOTE_COLORS,noteWidthFor,noteHeightFor,holdBodyWidth,drawHoldBody} from '../src/note-art.js';
import {HIT_COLORS} from '../src/hit-effects.js';
import {EXPANSION_SCORES} from '../src/expansion-score.js';
import {buildDragLinks,drawDragLinks} from '../src/drag-trails.js';
import {makeChart,DIFFICULTIES,lineGeometry,chartPolicy,dragPhrases} from '../src/chart.js';
import {RhythmEngine} from '../src/engine.js';
import {timingSummary} from '../src/timing.js';

test('larger note heads scale to each lane without overlapping cyan borders',()=>{
  assert.equal(noteWidthFor(1280),154);assert.ok(noteWidthFor(844)>130);
  for(const width of [319,390,680,844,1280,1920]){
    const n=noteWidthFor(width),spacing=width*.92/4;
    assert.ok(n+11<spacing);assert.ok(n>=Math.min(52,width*.16));assert.ok(n<=154);
    assert.equal(noteHeightFor(width),width<600?7:9);
  }
});

test('hold is blue, drag is yellow, and impacts retain the corresponding type colors',()=>{
  assert.equal(NOTE_COLORS.hold,'#63c5ff');assert.equal(HIT_COLORS.hold,'#59bfff');
  assert.equal(NOTE_COLORS.drag,'#ffe277');assert.equal(HIT_COLORS.drag,'#ffe16e');
});

test('wide hold bodies stay visible before pressing and draw only inside the playfield',()=>{
  for(const noteWidth of [52,100,154])for(const holding of [false,true]){
    const fills=[],stops=[],stack=[],c={globalAlpha:1,shadowBlur:0,save(){stack.push({globalAlpha:this.globalAlpha,shadowBlur:this.shadowBlur});},restore(){Object.assign(this,stack.pop());},createLinearGradient(){return{addColorStop(k,color){stops.push(color);}};},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillRect(x,y,w,h){assert.ok([x,y,w,h].every(Number.isFinite));assert.ok(y>=0&&y+h<=300);fills.push({x,y,w,h});}};
    drawHoldBody(c,{x:120,y:270},{x:120,y:-250},noteWidth,300,{holding});
    assert.equal(fills[0].w,holdBodyWidth(noteWidth));assert.ok(fills[0].w>=noteWidth*.38);assert.ok(stops.every(s=>parseInt(s.slice(-2),16)>=170));
    assert.equal(c.globalAlpha,1);assert.equal(c.shadowBlur,0);assert.equal(stack.length,0);
  }
});

test('expanded tracks have different drum signatures, sound envelopes and arrangement boundaries',()=>{
  const scores=Object.values(EXPANSION_SCORES);assert.equal(scores.length,6);
  assert.equal(new Set(scores.map(s=>JSON.stringify([s.kicks,s.bassSteps,s.swing||0]))).size,6);
  assert.equal(new Set(scores.map(s=>JSON.stringify(s.tone))).size,6);
  for(const id of Object.keys(EXPANSION_SCORES))assert.ok(musicScore(id).events.some(e=>e.instrument==='melody'));
});

test('stage rises at the actual peak and settles in the breather in every song',()=>{
  for(const s of SONGS){
    const score=musicScore(s.id),drop=score.segments.find(x=>x.section==='drop'),bridge=score.segments.find(x=>x.section==='bridge');
    const peak=musicalStage((drop.start+4)*s.beat,s.id),breath=musicalStage((bridge.start+4)*s.beat,s.id);
    assert.equal(peak.section,'drop');assert.equal(breath.section,'bridge');
    assert.ok(peak.line<breath.line);assert.ok(peak.energy>breath.energy*3);
  }
});

test('musical stage transitions remain continuous through every arrangement boundary',()=>{
  for(const s of SONGS){
    for(const segment of musicScore(s.id).segments){
      for(const offset of [-2,0,2]){
        const t=(segment.start+offset)*s.beat,eps=.00001,a=musicalStage(t-eps,s.id),b=musicalStage(t+eps,s.id);
        assert.ok(Math.abs(a.line-b.line)<.00001);assert.ok(Math.abs(a.energy-b.energy)<.0001);
      }
    }
    for(let t=-2;t<s.duration+2;t+=.1){const stage=musicalStage(t,s.id);assert.ok(stage.energy>=0&&stage.energy<=1);assert.ok(stage.line>=.58&&stage.line<=.74);}
  }
});

test('CRITICAL has a distinct audible bass call and traceable playable onsets',()=>{
  const song=getSong('critical');assert.equal(song.bpm,168);assert.deepEqual(song.levels,[6,11,15,17]);
  const score=musicScore(song.id),calls=score.events.filter(e=>e.instrument==='growl');
  assert.ok(calls.length>=40);assert.ok(calls.every(e=>e.section==='drop'));
  assert.ok(new Set(calls.map(e=>e.variant)).size===3);
  assert.ok(makeChart('expert',song.id).some(n=>calls.some(e=>e.id===n.musicEvent)));
});

test('drag rails link only neighbouring same-lane drags, not intervening taps or long gaps',()=>{
  const notes=[
    {id:0,lane:0,type:'drag',time:1},{id:1,lane:1,type:'drag',time:1.1},
    {id:2,lane:0,type:'drag',time:1.2},{id:3,lane:0,type:'tap',time:1.3},
    {id:4,lane:0,type:'drag',time:1.4},{id:5,lane:0,type:'drag',time:2.5},
  ];
  const before=JSON.stringify(notes),links=buildDragLinks(notes,.5);
  assert.deepEqual(links.map(l=>[l.from.id,l.to.id]),[[0,2]]);
  assert.equal(links[0].from,notes[0]);assert.equal(JSON.stringify(notes),before);
});

test('concentrated Drag phrases have linked rails, with simpler chains at beginner ratings',()=>{
  for(const s of SONGS)for(const d of Object.keys(DIFFICULTIES)){
    const e=new RhythmEngine(makeChart(d,s.id)),before=JSON.stringify(e.notes),links=buildDragLinks(e.notes,s.beat);
    assert.ok(links.length>=4,`${s.id} ${d} has chains`);
    for(const l of links){assert.equal(l.from.lane,l.to.lane);assert.equal(l.from.type,'drag');assert.equal(l.to.type,'drag');}
    assert.equal(JSON.stringify(e.notes),before);
  }
});
test('Drag occurs only in two or three separated authored bursts, never throughout the song',()=>{
  for(const s of SONGS)for(const d of Object.keys(DIFFICULTIES)){
    const {level}=chartPolicy(d,s.id),phrases=dragPhrases(d,s.id),chart=makeChart(d,s.id),drags=chart.filter(n=>n.type==='drag');
    assert.equal(phrases.length,level<14?2:3);
    assert.ok(phrases.reduce((total,p)=>total+p.end-p.start,0)/s.beats<.17);
    for(let i=1;i<phrases.length;i++)assert.ok(phrases[i].start-phrases[i-1].end>=8,'clear phrase breaks');
    for(const n of drags)assert.ok(phrases.some(p=>n.beat>=p.start&&n.beat<p.end),'no scattered Drag outside a burst');
    for(const p of phrases){
      const burst=drags.filter(n=>n.beat>=p.start&&n.beat<p.end),inside=chart.filter(n=>n.beat>=p.start&&n.beat<p.end);
      assert.ok(burst.length>=(level<=3?4:level<=5?8:level<14?12:8),`${s.id} ${d}: a burst contains many notes`);
      assert.ok(burst.length/inside.length>.85);assert.ok(burst.some((n,i)=>i>0&&n.time-burst[i-1].time<=s.beat+1e-4));
      if(level<=3)assert.equal(new Set(burst.map(n=>n.lane)).size,1);
    }
    assert.ok(drags.length/chart.length<.25,'large clusters do not imply high whole-song frequency');
  }
});

test('drag rail rendering bounds geometry, restores context, and clears missed chains',()=>{
  for(const [width,height]of [[319,127],[844,313],[1280,643]]){
    const g=lineGeometry(1,width,height),notes=[{lane:1,time:1.1,type:'drag',state:'pending'},{lane:1,time:1.4,type:'drag',state:'pending'}],links=buildDragLinks(notes,.5),calls=[];
    const c={save(){},restore(){},beginPath(){},setLineDash(){},moveTo(...p){assert.ok(p.every(Number.isFinite));},lineTo(...p){assert.ok(p.every(Number.isFinite));},stroke(){calls.push('rail');},fillRect(...p){assert.ok(p.every(Number.isFinite));calls.push('spark');}};
    const before=JSON.stringify(notes);drawDragLinks(c,links,g,1,n=>(n.time-1)*80,height,{held:new Set([1])});
    assert.equal(JSON.stringify(notes),before);assert.ok(calls.includes('rail'));assert.ok(calls.includes('spark'));
    notes[0].state='miss';const count=calls.length;drawDragLinks(c,links,g,1,n=>(n.time-1)*80,height);assert.equal(calls.length,count);
    notes[0].state='pending';calls.length=0;drawDragLinks(c,links,g,1,n=>(n.time-1)*80,height,{reduced:true,held:new Set([1])});assert.equal(calls.includes('spark'),false);
  }
});

test('timing summary counts early, centered and late hits, with a robust median and bounded bins',()=>{
  const values=[-130,-35,-5,0,8,25,130,NaN],before=[...values],r=timingSummary(values);
  assert.equal(r.total,7);assert.equal(r.early,2);assert.equal(r.center,3);assert.equal(r.late,2);assert.equal(r.median,0);
  assert.equal(r.histogram.reduce((a,b)=>a+b,0),7);assert.deepEqual(values,before);
  assert.deepEqual(timingSummary().histogram,Array(11).fill(0));
  assert.equal(timingSummary([1000,-1000]).histogram[0],1);assert.equal(timingSummary([1000,-1000]).histogram[10],1);
});

test('timing feedback measures only actual tap/hold input, not automatic drag, misses or demo',()=>{
  const chart=[{lane:0,time:1,end:1,type:'tap'},{lane:1,time:2,end:3,type:'hold'},{lane:2,time:4,end:4,type:'drag'},{lane:3,time:5,end:5,type:'tap'}],e=new RhythmEngine(chart);
  e.press(0,'tap',.91);assert.ok(e.drain()[0].error<0);e.release('tap',1);
  e.press(1,'hold',2.08);assert.ok(e.drain()[0].error>0);e.update(3);
  e.press(2,'drag',3.8);e.update(4.02);assert.equal(e.drain().at(-1).error,null);e.update(6);
  const r=e.result().timingStats;assert.equal(r.total,2);assert.equal(r.early,1);assert.equal(r.late,1);
  const demo=new RhythmEngine(chart,{demo:true});demo.update(6);assert.equal(demo.result().timingStats.total,0);
});
