import {makeChart,fixedKeyChart,DIFFICULTIES,KEYS,LANES} from './chart.js?v=24b2beed2b7f';
import {SONGS,getSong} from './songs.js?v=24b2beed2b7f';
import {RhythmEngine} from './engine.js?v=24b2beed2b7f';
import {RhythmAudio,hitTimeline} from './audio.js?v=24b2beed2b7f';
import {StageRenderer} from './stage-v2.js?v=24b2beed2b7f';
import {TutorialSession,LESSONS} from './tutorial.js?v=24b2beed2b7f';
import {HIT_COLORS} from './hit-effects.js?v=24b2beed2b7f';
import {readSettings,saveSettings,readBest,saveBest} from './storage.js?v=24b2beed2b7f';
const $=id=>document.getElementById(id),keys=[...document.querySelectorAll('[data-lane]')],difficulties=Object.keys(DIFFICULTIES);
export const game={screen:'home',settings:readSettings(),engine:null,audio:new RhythmAudio(),renderer:new StageRenderer($('stage')),demo:false,ready:false,busy:false,tutorial:null,sceneMuted:false};
const flares=keys.map(b=>{const el=document.createElement('i');el.className='hit-flare';el.setAttribute('aria-hidden','true');b.append(el);return el;});
const pointers=new Map();let loadVersion=0,lastComboPulse=-100;
const song=()=>getSong(game.settings.song),time=()=>game.audio.clock()-game.settings.offset/1000,scoreText=n=>String(n).padStart(7,'0');
const formatTime=t=>Math.floor(t/60).toString().padStart(2,'0')+':'+Math.floor(t%60).toString().padStart(2,'0');
function show(screen){game.screen=screen;document.body.dataset.screen=screen;for(const name of ['home','play','result'])$(name).hidden=name!==screen;window.scrollTo(0,0);}
async function interfaceMusic(){try{await game.audio.ready({music:false});if(['home','result'].includes(game.screen)&&!game.busy&&!game.sceneMuted&&!document.hidden){await game.audio.scene(game.screen);$('menu-audio').setAttribute('aria-pressed','true');}}catch{$('menu-audio').setAttribute('aria-pressed','false');}}
function refreshChoice(){
  const s=song(),difficulty=game.settings.difficulty,best=readBest(difficulty,undefined,s.id);
  for(const b of document.querySelectorAll('[data-chapter]'))b.setAttribute('aria-pressed',String(Number(b.dataset.chapter)===s.chapter));
  for(const b of document.querySelectorAll('[data-song]'))b.hidden=getSong(b.dataset.song).chapter!==s.chapter;
  document.body.dataset.chapter=s.chapter;
  for(const b of document.querySelectorAll('[data-difficulty]')){b.setAttribute('aria-pressed',String(b.dataset.difficulty===difficulty));b.querySelector('b').textContent=String(s.levels[difficulties.indexOf(b.dataset.difficulty)]).padStart(2,'0');}
  $('best-score').textContent=best?scoreText(best.score):'— — — — — — —';$('note-count').textContent=makeChart(difficulty,s.id).length+' 音符';saveSettings(game.settings);
}
function choose(difficulty){if(game.busy)return;game.settings.difficulty=difficulty;refreshChoice();}
function syncSettings(){const s=game.settings;for(const name of ['music','hit']){$(name).value=Math.round(s[name]*100);$(name+'-value').textContent=Math.round(s[name]*100)+'%';}$('offset').value=s.offset;$('offset-value').textContent=(s.offset>0?'+':'')+s.offset+' ms';$('speed').value=s.speed*100;$('speed-value').textContent=s.speed.toFixed(2)+'×';game.audio.setVolumes(s.music*(game.tutorial?.32:1),s.hit);}
async function preload(){const version=++loadVersion,s=song();game.ready=false;document.body.dataset.ready='false';$('start').disabled=true;$('demo').disabled=true;$('tutorial-open').disabled=true;
  try{const done=await game.audio.preload(p=>{if(version===loadVersion)$('start-label').textContent='载入 '+Math.round(p*100)+'%';},s.file);if(!done||version!==loadVersion)return;game.ready=true;$('start-label').textContent='开始演奏';$('status').textContent='';$('start').disabled=false;$('demo').disabled=false;$('tutorial-open').disabled=false;document.body.dataset.ready='true';
  }catch(e){if(version!==loadVersion)return;$('start-label').textContent='重新载入';$('status').textContent=e.message;game.ready=false;$('start').disabled=false;}
}
function chooseSong(id){if(game.busy)return;game.settings.song=id;const s=song(),index=SONGS.indexOf(s);document.body.style.setProperty('--blue',s.accent);$('song-cover').dataset.theme=s.theme;$('song-cover').style.setProperty('--cover-color',s.background);$('song-cover').style.setProperty('--cover-accent',s.accent);$('song-cover').setAttribute('aria-label',s.title+'几何唱片封面');$('cover-number').textContent=String(index+1).padStart(2,'0')+' — ORIGINAL';$('cover-title').replaceChildren(...s.cover.flatMap((text,i)=>{const el=document.createElement('span');el.className='cover-word';el.textContent=text;return i?[document.createElement('br'),el]:[el];}),Object.assign(document.createElement('span'),{className:'cover-chinese',textContent:s.title}));$('cover-caption').textContent=s.bpm+' BPM / '+formatTime(s.duration);$('song-name').textContent=s.title;$('song-subtitle').textContent=s.subtitle;$('song-credit').textContent=s.style;$('key-hint').textContent='4K · D F / J K';for(const b of document.querySelectorAll('[data-song]'))b.setAttribute('aria-pressed',String(b.dataset.song===id));refreshChoice();preload();}
function clearKeys(){pointers.clear();for(const b of keys)b.classList.remove('down');game.engine?.cancelInputs();}
function flush(events=game.engine.drain()){
  for(const e of events){
    game.renderer.event(e);
    if(e.quality==='miss')continue;
    if(!game.demo)game.audio.snap((e.kind==='head'?.90:e.type==='hold'?.60:1)/Math.sqrt(e.chord||1),e.type,e.type==='hold'&&e.kind!=='head');
    const b=keys[e.lane];b.style.setProperty('--hit-color',e.quality==='good'?'#ffb45e':HIT_COLORS[e.type]);
    const flare=flares[e.lane];flare.getAnimations().forEach(a=>a.cancel());
    flare.animate([{opacity:game.renderer.reduced?.3:1,transform:'scaleY(1)'},{opacity:0,transform:game.renderer.reduced?'scaleY(1)':'scaleY(.45)'}],{duration:game.renderer.reduced?100:310,easing:'cubic-bezier(.16,1,.3,1)'});
    if(e.kind==='judge'&&e.combo>=2&&(e.time-lastComboPulse>.12||e.combo%25===0)&&!game.renderer.reduced){
      lastComboPulse=e.time;const big=e.combo%25===0;
      const number=$('combo').firstElementChild;
      number.getAnimations().forEach(a=>a.cancel());
      number.animate([{transform:big?'scale(1.24)':'scale(1.09)',filter:'brightness(1.6)'},{transform:'scale(1)',filter:'brightness(1)'}],{duration:big?340:180,easing:'cubic-bezier(.16,1,.3,1)'});
    }
  }
}
async function start(demo=false,training=false){
  if(game.busy)return;if(!game.ready){await preload();return;}game.busy=true;$('start').disabled=true;$('status').textContent='准备播放…';
  try{await game.audio.ready();$('pause-menu').close();clearKeys();game.demo=demo;game.tutorial=training?new TutorialSession(song().beat):null;game.engine=game.tutorial?.engine||new RhythmEngine(fixedKeyChart(makeChart(game.settings.difficulty,song().id),song().slots),{demo,lanes:LANES});game.renderer.reset();lastComboPulse=-100;$('combo').firstElementChild.getAnimations().forEach(a=>a.cancel());syncSettings();
    game.demoHits=demo?hitTimeline(game.engine.notes):[];game.demoHitCursor=0;
    const d=DIFFICULTIES[game.settings.difficulty];$('playing-title').textContent=training?'入门练习':song().title;$('play-difficulty').textContent=training?'边按边学':d.name+' / '+song().levels[difficulties.indexOf(game.settings.difficulty)];$('demo-tag').hidden=!demo;$('tutorial-panel').hidden=!training;show('play');game.renderer.resize();game.audio.play(0,.2,{loop:training});$('status').textContent='';updateHUD();
  }catch(e){show('home');$('status').textContent='无法播放：'+e.message;}finally{game.busy=false;$('start').disabled=false;}
}
function pause(reason='暂停'){if(game.screen!=='play')return;game.audio.pause();clearKeys();game.screen='paused';$('pause-title').textContent=reason;$('pause-menu').showModal();}
async function resume(){if(game.screen!=='paused')return;try{await game.audio.ready();$('pause-menu').close();if(game.demo){const next=game.demoHits.findIndex(e=>e.time>game.audio.position);game.demoHitCursor=next<0?game.demoHits.length:next;}game.audio.play(game.audio.position,.15,{loop:!!game.tutorial});game.screen='play';}catch(e){$('pause-title').textContent=e.message;}}
function home(){game.audio.stop();clearKeys();game.tutorial=null;syncSettings();$('pause-menu').close();show('home');refreshChoice();if(game.audio.context&&!game.sceneMuted)interfaceMusic();}
function result(){
  game.audio.stop();clearKeys();const r=game.engine.result(),d=DIFFICULTIES[game.settings.difficulty],training=!!game.tutorial,isBest=!training&&!game.demo&&saveBest(game.settings.difficulty,r,undefined,song().id);if(training){game.settings.tutorialDone=true;saveSettings(game.settings);}
  $('result-mode').textContent=training?'入门练习':song().slots+'K / '+d.name;$('result-caption').textContent=training?'七步练习完成':song().title+' / '+song().subtitle+ (game.demo?' / 演示':'');$('rank').textContent=training?'✓':r.rank;$('result-score').textContent=training?'7 / 7':scoreText(r.score);$('new-best').textContent=training?'可以试试完整曲目了':game.demo?'演示不计成绩':isBest?'NEW BEST':'本次成绩';$('result-stats').hidden=training;$('result-detail').hidden=training;$('again-label').textContent=training?'开始演奏':'再来一次';for(const n of ['perfect','good','miss'])$('stat-'+n).textContent=r[n];$('stat-accuracy').textContent=r.accuracy.toFixed(2)+'%';$('stat-combo').textContent=r.maxCombo;show('result');if(!game.sceneMuted)interfaceMusic();
}
function updateHUD(){
  const e=game.engine,s=song();
  $('score').textContent=game.tutorial?`${game.tutorial.step+1} / ${LESSONS.length}`:scoreText(e.score);$('accuracy').textContent=game.tutorial?'入门练习':e.accuracy.toFixed(2)+'%';$('combo').hidden=!!game.tutorial||e.combo<2;$('combo').firstElementChild.textContent=e.combo;$('combo').classList.toggle('hot',e.combo>=50);$('progress').style.width=(game.tutorial?(game.tutorial.step+(e.perfect+e.good)/Math.max(1,e.notes.length))/LESSONS.length*100:Math.max(0,Math.min(100,game.audio.clock()/s.duration*100)))+'%';
  if(game.tutorial){const tr=game.tutorial;$('lesson-title').textContent=String(tr.step+1).padStart(2,'0')+' / '+LESSONS.length+'  '+tr.lesson.title;$('lesson-hint').textContent=tr.lesson.hint;$('lesson-progress').textContent=e.perfect+e.good+' / '+e.notes.length;$('lesson-retry').textContent=tr.switchAt!==null?(tr.passed?'✓':'再试一次'):'';}
}
function frame(){
  if(game.screen==='play'&&game.engine){const t=time();if(game.demo){const horizon=game.audio.context.currentTime+.12;while(game.demoHitCursor<game.demoHits.length){const e=game.demoHits[game.demoHitCursor],at=game.audio.anchor+e.time;if(at>horizon)break;game.audio.snap(e.strength,e.type,e.tail,at);game.demoHitCursor++;}}if(game.tutorial){const tick=game.tutorial.update(t);flush(tick.events);game.engine=game.tutorial.engine;if(tick.changed){clearKeys();}if(tick.done){result();requestAnimationFrame(frame);return;}}
    else{game.engine.update(t);flush();}game.renderer.draw(game.engine,t,game.settings.speed,{songId:song().id,difficulty:game.settings.difficulty,tutorial:game.tutorial});updateHUD();if(!game.tutorial&&game.audio.clock()>=game.audio.buffers.music.duration-.035)result();
  }requestAnimationFrame(frame);
}
for(const b of keys){const lane=Number(b.dataset.lane);
  b.addEventListener('pointerdown',e=>{e.preventDefault();if(game.screen!=='play'||game.demo||b.classList.contains('inactive')&&!b.classList.contains('incoming'))return;b.setPointerCapture(e.pointerId);const id='pointer-'+e.pointerId;pointers.set(e.pointerId,{lane});b.classList.add('down');game.engine.press(lane,id,time());flush();});
  const release=e=>{e.preventDefault();const p=pointers.get(e.pointerId);if(!p)return;pointers.delete(e.pointerId);game.engine.release('pointer-'+e.pointerId,time());flush();if(![...pointers.values()].some(v=>v.lane===lane))b.classList.remove('down');};b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);
}
window.addEventListener('keydown',e=>{if(e.code==='Escape'&&game.screen==='play'){e.preventDefault();pause();return;}const lane=KEYS.indexOf(e.code);if(lane<0||game.screen!=='play'||game.demo)return;e.preventDefault();if(e.repeat||keys[lane].classList.contains('inactive')&&!keys[lane].classList.contains('incoming'))return;keys[lane].classList.add('down');game.engine.press(lane,'key-'+e.code,time(),{keyboard:true});flush();});
window.addEventListener('keyup',e=>{const lane=KEYS.indexOf(e.code);if(lane<0||game.screen!=='play')return;e.preventDefault();game.engine.release('key-'+e.code,time());keys[lane].classList.remove('down');flush();});
window.addEventListener('resize',()=>{if(['play','paused'].includes(game.screen))game.renderer.resize();});document.addEventListener('visibilitychange',()=>{if(document.hidden){pause('已暂停');game.audio.stopScene();}else if(['home','result'].includes(game.screen)&&game.audio.context&&!game.sceneMuted)interfaceMusic();});window.addEventListener('blur',()=>pause('已暂停'));
for(const b of document.querySelectorAll('[data-difficulty]'))b.addEventListener('click',()=>choose(b.dataset.difficulty));for(const b of document.querySelectorAll('[data-song]'))b.addEventListener('click',()=>chooseSong(b.dataset.song));
for(const b of document.querySelectorAll('[data-chapter]'))b.addEventListener('click',()=>chooseSong(SONGS.find(s=>s.chapter===Number(b.dataset.chapter)).id));
$('fullscreen').addEventListener('click',async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();try{await screen.orientation?.lock('landscape');}catch{}}catch{$('status').textContent='当前浏览器不支持全屏';}});
$('start').addEventListener('click',()=>start());$('demo').addEventListener('click',()=>start(true));$('tutorial-open').addEventListener('click',()=>start(false,true));$('pause').addEventListener('click',()=>pause());$('resume').addEventListener('click',resume);$('restart').addEventListener('click',()=>{start(game.demo,!!game.tutorial);});$('quit').addEventListener('click',home);$('again').addEventListener('click',()=>{start();});$('back').addEventListener('click',home);
$('pause-menu').addEventListener('cancel',e=>{e.preventDefault();resume();});$('settings-open').addEventListener('click',()=>{$('settings').showModal();});$('guide-open').addEventListener('click',()=>{$('guide').showModal();});
for(const name of ['music','hit','offset','speed'])$(name).addEventListener('input',()=>{game.settings[name]=Number($(name).value)/(name==='offset'?1:100);syncSettings();saveSettings(game.settings);});$('audition').addEventListener('click',async()=>{try{if(!game.ready)return;await game.audio.ready();game.audio.snap();}catch(e){$('status').textContent=e.message;}});
for(const b of document.querySelectorAll('[data-drum]'))b.addEventListener('click',async()=>{try{await game.audio.ready();game.audio.snap(1,b.dataset.drum);}catch{}});
$('menu-audio').addEventListener('click',()=>{if(game.audio.sceneSource){game.sceneMuted=true;game.audio.stopScene();$('menu-audio').setAttribute('aria-pressed','false');}else{game.sceneMuted=false;interfaceMusic();}});
const unlock=e=>{if(e.target.closest?.('#menu-audio'))return;if(['home','result'].includes(game.screen))interfaceMusic();};
document.addEventListener('pointerdown',unlock,{once:true});document.addEventListener('keydown',unlock,{once:true});
game.audio.preloadScenes().catch(()=>{});document.body.dataset.screen='home';syncSettings();chooseSong(game.settings.song);requestAnimationFrame(frame);
