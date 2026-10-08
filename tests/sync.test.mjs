import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {SONGS} from '../src/songs.js';
import {makeChart,DIFFICULTIES} from '../src/chart.js';
import {musicScore,SAMPLE_RATE} from '../src/music-score.js';
import {readBest,saveBest,readSettings} from '../src/storage.js';

test('every note in all 48 charts is exactly on a rendered instrument attack, never arbitrary filler',()=>{
  let count=0;
  for(const s of SONGS){const events=new Map(musicScore(s.id).events.map(e=>[e.id,e]));
    for(const d of Object.keys(DIFFICULTIES))for(const n of makeChart(d,s.id)){
      const e=events.get(n.musicEvent);assert.ok(e,'traceable musical event');assert.ok(!['chord','rise'].includes(e.instrument));
      assert.equal(n.time,e.sample/SAMPLE_RATE);assert.equal(Math.round(n.time*SAMPLE_RATE),e.sample);count++;
      if(n.type==='hold'){const tail=events.get(n.musicEndEvent);assert.equal(tail.instrument,'melody');assert.equal(n.end,tail.sample/SAMPLE_RATE);assert.ok(n.end>n.time);}
    }
  }
  assert.ok(count>4000);
});
test('rendered WAV checksums and sample onset manifest match the shared score for all twelve songs',async()=>{
  const m=JSON.parse(await readFile(new URL('../assets/sync-manifest.json',import.meta.url),'utf8'));assert.equal(m.sampleRate,SAMPLE_RATE);assert.equal(m.songs.length,SONGS.length);
  for(const s of SONGS){const rendered=m.songs.find(x=>x.id===s.id),wav=await readFile(new URL('../'+s.file,import.meta.url));
    assert.equal(createHash('sha256').update(wav).digest('hex'),rendered.sha256,'WAV is the audited render, not a stale asset');
    assert.equal(rendered.scoreHash,createHash('sha256').update(JSON.stringify(musicScore(s.id).events)).digest('hex'),'instrument pitches, envelopes and gain data match the current render');
    assert.deepEqual(rendered.events,musicScore(s.id).events.map(({id,instrument,sample,beat,gain})=>({id,instrument,sample,beat,gain})));
  }
});
test('night-flight AT follows the actual swung cymbals rather than forcing straight quarter-beat filler',()=>{
  const score=musicScore('night-flight'),events=new Map(score.events.map(e=>[e.id,e]));
  const swung=makeChart('expert','night-flight').filter(n=>events.get(n.musicEvent).instrument==='hat'&&Math.abs(n.beat*4-Math.round(n.beat*4))>.05);
  assert.ok(swung.length>30);for(const n of swung)assert.equal(n.time,events.get(n.musicEvent).time);
});
test('multi-presses follow audible layered downbeats; bridges do not retain the AT filler stream',()=>{
  for(const s of SONGS){const score=musicScore(s.id),chart=makeChart('expert',s.id);
    for(const n of chart.filter(n=>n.chord>1)){assert.equal(n.section,'drop');assert.equal((n.beat-score.sections.drop)%8,0);assert.ok(score.events.filter(e=>e.sample===Math.round(n.time*SAMPLE_RATE)&&!['chord','rise'].includes(e.instrument)).length>=3);}
    const bridge=chart.filter(n=>n.section==='bridge');assert.ok(bridge.length>0);assert.ok(bridge.length<chart.filter(n=>n.beat>=score.sections.drop&&n.beat<score.sections.drop+16).length);
  }
});
test('recharted songs use separate best records while old records and player settings remain intact',()=>{
  const old=JSON.stringify({score:1000000}),settings=JSON.stringify({offset:15,hit:.7});
  const map=new Map([['fold-rhythm-v1-best-expert',old],['fold-rhythm-v1-settings',settings]]),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
  assert.equal(readBest('expert',storage),null);assert.equal(readSettings(storage).offset,15);
  saveBest('expert',{score:900000},storage);assert.equal(readBest('expert',storage).score,900000);assert.equal(map.get('fold-rhythm-v1-best-expert'),old);assert.equal(map.get('fold-rhythm-v1-settings'),settings);
});
