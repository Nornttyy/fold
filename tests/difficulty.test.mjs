import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SONGS} from '../src/songs.js';
import {makeChart,chartPolicy,DIFFICULTIES} from '../src/chart.js';
import {musicScore,SAMPLE_RATE} from '../src/music-score.js';
import {LESSONS} from '../src/tutorial.js';
const modes=Object.keys(DIFFICULTIES);

test('actual song rating controls chord limits, including occupied long-note fingers',()=>{
  const seen=new Set();
  for(const s of SONGS)for(const d of modes){const {level,maxChord}=chartPolicy(d,s.id),chart=makeChart(d,s.id);
    assert.equal(maxChord,level<=3?1:level<14?2:level<16?3:4);
    for(const n of chart){const simultaneous=chart.filter(m=>Math.abs(m.time-n.time)<.001||m.type==='hold'&&m.time<n.time-.001&&m.end>n.time+.001);
      assert.ok(new Set(simultaneous.map(m=>m.lane)).size<=maxChord,`${s.id} ${d} level ${level} at ${n.beat}`);
      if(level<14)assert.ok(n.chord<=2);seen.add(n.chord);
    }
  }
  for(const size of [1,2,3,4])assert.ok(seen.has(size));
});
test('four tiers of each song have meaningful density separation rather than renamed copies',()=>{
  for(const s of SONGS){const charts=modes.map(d=>makeChart(d,s.id));
    for(let i=1;i<charts.length;i++)assert.ok(charts[i].length/charts[i-1].length>=1.15,`${s.id} ${modes[i-1]} -> ${modes[i]}`);
    for(const chart of charts){assert.ok(chart.filter(n=>n.type==='drag').length/chart.length>=.25);assert.ok(chart.some(n=>n.type==='tap'));assert.ok(chart.some(n=>n.type==='hold'));}
  }
});
test('no flick notes, input gestures, help entries or decorative arrows remain in the playable game',async()=>{
  for(const s of SONGS)for(const d of modes)for(const n of makeChart(d,s.id))assert.ok(['tap','hold','drag'].includes(n.type));
  assert.ok(LESSONS.some(l=>l.title==='连锁接住'));for(const l of LESSONS)for(const sequence of l.sequence)assert.notEqual(sequence[2],'flick');
  for(const file of ['index.html','src/web.js','src/decorations.js','src/audio.js','src/note-art.js','src/hit-effects.js'])assert.equal((await readFile(new URL('../'+file,import.meta.url),'utf8')).includes('flick'),false,file);
});
test('every song has two separate peaks, quiet breaths and an audible ramp into each peak',()=>{
  for(const s of SONGS){const score=musicScore(s.id),peaks=score.segments.filter(x=>x.section==='drop');assert.equal(peaks.length,2);
    for(const peak of peaks){const i=score.segments.indexOf(peak);assert.equal(score.segments[i-1].section,'build');assert.equal(score.segments[i-2].section,'bridge');
      assert.ok(score.events.some(e=>e.instrument==='rise'&&e.beat===score.segments[i-1].start));
      assert.ok(score.events.some(e=>e.instrument==='stab'&&e.beat===peak.start));
    }
    assert.ok(score.events.filter(e=>e.section==='bridge').every(e=>!['kick','snare','bass','lead','stab'].includes(e.instrument)));
  }
});
test('rendered climax is substantially stronger than the breather, without full-time clipping',async()=>{
  for(const s of SONGS){const wav=await readFile(new URL('../'+s.file,import.meta.url)),score=musicScore(s.id);
    const rms=segment=>{let sum=0,count=0;const from=Math.round((segment.start*s.beat+.20)*SAMPLE_RATE),to=Math.round((segment.end*s.beat-.20)*SAMPLE_RATE);for(let i=from;i<to;i+=8){const left=wav.readInt16LE(44+i*4)/32767,right=wav.readInt16LE(46+i*4)/32767;sum+=(left*left+right*right)/2;count++;}return Math.sqrt(sum/count);};
    const peak=rms(score.segments.filter(x=>x.section==='drop').at(-1)),breath=rms(score.segments.filter(x=>x.section==='bridge').at(-1));
    assert.ok(peak/breath>1.7,`${s.id}: peak ${peak} / breath ${breath}`);
    let max=0;for(let i=44;i<wav.length;i+=32)max=Math.max(max,Math.abs(wav.readInt16LE(i)/32767));assert.ok(max<=.88);
  }
});
