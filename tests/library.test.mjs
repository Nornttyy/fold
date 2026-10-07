import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SONGS,CHAPTERS,keyMode,KEY_CODES} from '../src/songs.js';
import {makeChart,fixedKeyChart,DIFFICULTIES,lineGeometry,lineMotion,KEYS,LANES} from '../src/chart.js';
import {RhythmEngine} from '../src/engine.js';
import {TutorialSession,LESSONS} from '../src/tutorial.js';
import {readBest,saveBest} from '../src/storage.js';
import {drawNote,noteHeightFor} from '../src/note-art.js';
const modes=Object.keys(DIFFICULTIES);
function playChart(e){const actions=[];for(const n of e.notes){actions.push({t:n.time,kind:'press',n});actions.push({t:n.type==='hold'?n.end:n.time+.001,kind:'release',n});}actions.sort((a,b)=>a.t-b.t||(a.kind==='release'?-1:1));for(const a of actions){const id='test-'+a.n.id;if(a.kind==='press')e.press(a.n.lane,id,a.t,{keyboard:true});else e.release(id,a.t);e.update(a.t);}e.update((e.notes.at(-1)?.end||0)+3);}
test('exactly three nonempty chapters; five songs; EZ/HD/IN/AT; level range 1–17',()=>{assert.equal(CHAPTERS.length,3);assert.equal(SONGS.length,5);for(const c of CHAPTERS)assert.ok(SONGS.some(s=>s.chapter===c.id));assert.deepEqual(Object.values(DIFFICULTIES).map(d=>d.name),['EZ','HD','IN','AT']);assert.equal(Math.min(...SONGS.flatMap(s=>s.levels)),1);assert.equal(Math.max(...SONGS.flatMap(s=>s.levels)),17);for(const s of SONGS){for(let i=1;i<4;i++)assert.ok(s.levels[i]>s.levels[i-1]);}});
test('all 20 charts are deterministic, valid, non-overlapping, active-key only',()=>{
  for(const s of SONGS)for(const d of modes){const chart=makeChart(d,s.id);assert.deepEqual(chart,makeChart(d,s.id));assert.ok(chart.length>=30);for(const n of chart){assert.ok(n.time<=n.end&&n.end<s.duration);assert.ok(keyMode(s,n.time).active.includes(n.lane),`${s.id} ${d} active lane`);assert.equal(chart.some(m=>m.id!==n.id&&m.lane===n.lane&&Math.abs(m.time-n.time)<.001),false);if(n.type==='hold')assert.equal(chart.some(m=>m.id!==n.id&&m.lane===n.lane&&m.time>n.time&&m.time<n.end-.001),false);}}
});
test('all 20 physical-key charts can reach AP through input/release methods, not demo',()=>{for(const s of SONGS)for(const d of modes){const chart=fixedKeyChart(makeChart(d,s.id),s.slots),e=new RhythmEngine(chart,{lanes:LANES});playChart(e);assert.equal(e.score,1e6,`${s.id} ${d}`);assert.equal(e.rank,'AP');assert.equal(e.maxCombo,chart.length);}});
test('multi-press marks actual same-time groups only; two, three and four presses exist',()=>{const sizes=new Set();for(const s of SONGS)for(const d of modes){const chart=makeChart(d,s.id);for(const n of chart){const count=chart.filter(m=>Math.abs(m.time-n.time)<.001).length;assert.equal(n.chord,count);assert.ok(count<=LANES);sizes.add(count);}}for(const n of [2,3,4])assert.ok(sizes.has(n),'contains '+n+'-press');});
test('all songs are fixed 4K, use DFJK and enable every lane for the whole song',()=>{assert.equal(LANES,4);assert.deepEqual(KEYS,['KeyD','KeyF','KeyJ','KeyK']);assert.deepEqual(Object.keys(KEY_CODES),['4']);assert.deepEqual(KEY_CODES[4],KEYS);for(const s of SONGS){assert.equal(s.slots,4);assert.deepEqual(s.modes,[[0,4]]);for(let t=0;t<s.duration;t+=.5){assert.deepEqual(keyMode(s,t).active,[0,1,2,3]);assert.equal(keyMode(s,t).next,null);}for(const d of modes)assert.equal(new Set(makeChart(d,s.id).map(n=>n.lane)).size,4);}});
test('four-key conversion preserves all 20 chart timestamps without centring or shifts',()=>{for(const s of SONGS)for(const d of modes){const chart=makeChart(d,s.id);assert.deepEqual(fixedKeyChart(chart),chart);}});
test('all songs and difficulties bob vertically without tilt, rotation or lane drift',()=>{for(const s of SONGS)for(const d of modes){const ys=[];for(let t=0;t<s.duration;t+=.10){const m=lineMotion(t,s.id,d),g=lineGeometry(t,1000,500,{songId:s.id,difficulty:d,slots:LANES});assert.equal(m.angle,0);assert.equal(m.tilt,0);assert.equal(g.angle,0);assert.equal(g.sin,0);ys.push(g.cy);for(let lane=0;lane<LANES;lane++){const p=g.point(lane),n=g.point(lane,80);assert.equal(p.x,40+(lane+.5)*230);assert.equal(p.y,g.cy);assert.equal(n.x,p.x);assert.ok(n.y<p.y);}}assert.ok(Math.max(...ys)-Math.min(...ys)>10);}});
test('vertical judgment points stay inside portrait-letterbox/mobile-landscape/desktop playfields',()=>{for(const [w,h]of [[319,127],[844,313],[1280,643]])for(const s of SONGS)for(let t=0;t<s.duration;t+=.20){const g=lineGeometry(t,w,h,{songId:s.id,difficulty:'expert',slots:LANES});for(let l=0;l<LANES;l++){const p=g.point(l);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));assert.ok(p.x>=0&&p.x<=w);assert.ok(p.y>=0&&p.y<=h,`${w} ${h} ${s.id} ${t}: ${p.y}`);}}});
test('tutorial requires success, retries misses, and teaches bobbing and a four-key ensemble',()=>{
  const t=new TutorialSession(60/132);t.update(10);t.update(11);assert.equal(t.step,0);assert.equal(t.retries,1);
  for(let i=0;i<LESSONS.length;i++){
    const e=t.engine;
    for(const n of e.notes){assert.ok(t.mode(n.time).active.includes(n.lane));const g=lineGeometry(n.time,1000,500,{slots:LANES,...t.geometry(n.time)});assert.equal(g.angle,0);}
    if(i===6){assert.equal(t.mode(t.startTime).count,4);assert.equal(t.lesson.title,'合奏');assert.ok(e.notes.some(n=>n.chord>1));}
    playChart(e);const end=e.notes.reduce((a,n)=>Math.max(a,n.end),0);t.update(end+3);const r=t.update(end+4);
    if(i<LESSONS.length-1)assert.equal(t.step,i+1);else assert.equal(r.done,true);
  }
  assert.equal(t.done,true);assert.ok(LESSONS.some(s=>s.title==='多押'));assert.ok(LESSONS.some(s=>s.title==='上下颠簸'));assert.ok(LESSONS.every(s=>s.keys===4));
});
test('best records remain isolated by song and difficulty without erasing other records',()=>{const map=new Map([['foreign','keep']]),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};saveBest('expert',{score:888888},storage,'prism');saveBest('expert',{score:666666},storage,'fold-space');assert.equal(readBest('expert',storage,'prism').score,888888);assert.equal(readBest('expert',storage,'fold-space').score,666666);assert.equal(readBest('light',storage,'prism'),null);assert.equal(map.get('foreign'),'keep');});
test('only gameplay multi-note heads receive thick glowing cyan outlines',()=>{function fixture(){const strokes=[],c={strokeStyle:'',lineWidth:1,shadowBlur:0,shadowColor:'',save(){},restore(){},scale(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},clip(){},fillRect(){},fillText(){},rotate(){},stroke(){strokes.push({color:this.strokeStyle,width:this.lineWidth,blur:this.shadowBlur});}};return{c,strokes};}const a=fixture();drawNote(a.c,{type:'tap',chord:3});assert.ok(a.strokes.some(s=>s.color==='#7ffff0'&&s.width>=3&&s.blur>=15));const b=fixture();drawNote(b.c,{type:'tap',chord:1});assert.equal(b.strokes.some(s=>s.color==='#7ffff0'),false);const d=fixture();drawNote(d.c,{type:'tap',chord:6,decoration:true});assert.equal(d.strokes.some(s=>s.color==='#7ffff0'),false);});
test('note heads are 3–4px light bars, while multi outlines remain uniform',()=>{
  assert.equal(noteHeightFor(390),3);assert.equal(noteHeightFor(1024),4);
  for(const type of ['tap','hold','drag']){
    const fills=[],outlines=[];let points=[];
    const c={save(){},restore(){},beginPath(){points=[];},moveTo(x,y){points.push([x,y]);},lineTo(x,y){points.push([x,y]);},closePath(){},fill(){fills.push([...points]);},clip(){},fillRect(){},fillText(){},rotate(){},stroke(){if(this.strokeStyle==='#7ffff0')outlines.push({points:[...points],width:this.lineWidth});},scale(){assert.fail('do not scale the outline stroke');}};
    drawNote(c,{type,width:75,height:noteHeightFor(1024),chord:2,label:'F'});
    const body=fills[0],height=Math.max(...body.map(p=>p[1]))-Math.min(...body.map(p=>p[1]));
    assert.ok(height<=6);assert.equal(outlines.length,1);assert.equal(outlines[0].width,3);
    const outerHeight=Math.max(...outlines[0].points.map(p=>p[1]))-Math.min(...outlines[0].points.map(p=>p[1]));assert.ok(outerHeight<=12);
  }
});
test('new songs are distinct full-length original WAV files with correct timing',async()=>{const fingerprints=new Set();for(const s of SONGS){const b=await readFile(new URL('../'+s.file,import.meta.url));assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.readUInt32LE(24),44100);assert.equal(b.readUInt16LE(22),2);assert.ok(Math.abs(b.readUInt32LE(40)/(44100*4)-s.duration)<.001);fingerprints.add(b.subarray(44+44100*4*9,44+44100*4*9+256).toString('hex'));}assert.equal(fingerprints.size,5);});
test('tom and hi-hat accents have different dry drum files',async()=>{const data=[],durations={hold:.130,drag:.060};for(const type of ['hold','drag']){const b=await readFile(new URL('../assets/hit-'+type+'.wav',import.meta.url));assert.equal(b.toString('ascii',0,4),'RIFF');const duration=b.readUInt32LE(40)/(44100*2);assert.ok(Math.abs(duration-durations[type])<1/44100);data.push(b.subarray(44).toString('hex'));}assert.equal(new Set(data).size,2);});
