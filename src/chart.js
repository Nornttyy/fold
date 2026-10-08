import {getSong} from './songs.js?v=f47ef371a3b2';
import {musicScore} from './music-score.js?v=f47ef371a3b2';
import {musicalStage} from './musical-stage.js?v=f47ef371a3b2';
export const BPM=132;
export const BEAT=60/BPM;
export const DURATION=160*BEAT+2.4;
export const SONG=Object.freeze({title:'蓝时',subtitle:'BLUE HOUR',bpm:BPM,duration:DURATION,credit:'原创电子试作',file:'assets/blue-hour.wav'});
export const LANES=4;
export const CHART_REVISION='tier-drag-3';
export const KEYS=['KeyD','KeyF','KeyJ','KeyK'];
export const WINDOWS=Object.freeze({perfect:.065,good:.135,miss:.16,release:.10,holdGrace:.16});
export const DIFFICULTIES=Object.freeze({easy:{name:'EZ',label:'EASY',level:1},light:{name:'HD',label:'HARD',level:4},flow:{name:'IN',label:'INSANE',level:8},expert:{name:'AT',label:'ANOTHER',level:12}});
// Lane phrases are authored; rhythmic timestamps come only from audible score events.
const LANE_PHRASES={
  'blue-hour':[[0,1,2,3,2,1,0,2],[3,2,1,0,1,2,3,1]],
  'night-flight':[[0,2,1,3,2,0,3,1],[3,1,0,2,1,3,0,2]],
  prism:[[0,1,3,2,0,3,2,1],[3,2,0,1,3,2,0,1]],
  trajectories:[[0,1,2,3,2,1,0,2],[3,2,1,0,1,2,3,0]],
  'fold-space':[[0,1,2,3,2,1,0,3],[3,0,1,2,0,1,3,2]],
  critical:[[0,3,1,2,0,2,3,1],[3,0,2,1,3,1,0,2]],
  glimmer:[[0,1,2,1,3,2,1,0],[3,2,1,2,0,1,2,3]],
  daybreak:[[0,2,1,2,3,1,0,3],[3,1,2,1,0,2,3,0]],
  arc:[[0,3,0,2,1,3,2,1],[3,0,3,1,2,0,1,2]],
  zero:[[0,1,3,1,2,3,0,2],[3,2,0,2,1,0,3,1]],
  overclock:[[0,2,3,1,0,3,2,1],[3,1,0,2,3,0,1,2]],
  collapse:[[0,3,1,0,2,3,1,2],[3,0,2,3,1,0,2,1]],
};
export function cleanChart(notes){
  const result=[];
  for(const n of notes.sort((a,b)=>a.time-b.time||a.lane-b.lane)){
    if(result.some(p=>p.lane===n.lane&&(Math.abs(p.time-n.time)<.001||p.type==='hold'&&p.end>n.time+.001)))continue;
    result.push(n);
  }
  const counts=new Map();for(const n of result){const group=Math.round(n.time*1000);counts.set(group,(counts.get(group)||0)+1);}
  return result.map((n,id)=>({...n,id,chord:counts.get(Math.round(n.time*1000))}));
}
export function fixedKeyChart(chart){return chart.map(n=>({...n}));}
export function chartPolicy(difficulty='light',songId='blue-hour'){
  const s=getSong(songId),level=s.levels[Object.keys(DIFFICULTIES).indexOf(difficulty)]??s.levels[1];
  return {level,maxChord:level<=3?1:level<14?2:level<16?3:4};
}
export function chartSources(songId='blue-hour'){
  const s=getSong(songId),score=musicScore(s.id),groups=new Map();
  for(const e of score.events){
    if(['chord','rise'].includes(e.instrument)||e.beat<8||e.beat>=s.beats-8)continue;
    if(!groups.has(e.sample))groups.set(e.sample,{sample:e.sample,time:e.time,beat:e.beat,bar:e.bar,section:e.section,events:[]});
    groups.get(e.sample).events.push(e);
  }
  return [...groups.values()].sort((a,b)=>a.sample-b.sample);
}
// Drag is a deliberately placed phrase, not a default type for offbeat notes.
export function dragPhrases(difficulty='light',songId='blue-hour'){
  const {level}=chartPolicy(difficulty,songId),segments=musicScore(songId).segments,width=level<=5?4:level<14?6:8;
  const peaks=segments.filter(s=>s.section==='drop');
  const phrases=peaks.map((s,i)=>({start:s.start+(i?12:8),end:Math.min(s.end,s.start+(i?12:8)+width),lanes:level<=3?[i?3:0]:i?[2,3]:[0,1]}));
  if(level>=14){const build=segments.find(s=>s.section==='build');if(build)phrases.unshift({start:build.end-4,end:build.end,lanes:[1,2]});}
  return phrases;
}
export function makeChart(difficulty='light',songId='blue-hour'){
  const s=getSong(songId),score=musicScore(s.id),notes=[],groups=chartSources(s.id),phrases=dragPhrases(difficulty,s.id),{level,maxChord}=chartPolicy(difficulty,s.id);
  const priority={crash:0,snare:1,kick:2,stab:3,growl:3.5,melody:4,lead:5,bass:6,hat:7};let index=0;
  for(const g of groups){
    const has=instrument=>g.events.find(e=>e.instrument===instrument),whole=Math.abs(g.beat-Math.round(g.beat))<.0001,half=Math.abs(g.beat*2-Math.round(g.beat*2))<.0001;
    const local=g.beat-g.bar*4,drop=g.section==='drop',build=g.section==='build',melody=has('melody'),hat=has('hat');
    const burst=phrases.find(p=>g.beat>=p.start&&g.beat<p.end);
    if(level<=8&&burst){if(!(level<=3?whole:half))continue;}
    else {
      if(level<=2&&!(whole&&Math.round(g.beat)%2===0))continue;
      if(level>=3&&level<=5&&(!whole||level===3&&Math.abs(local-1)<.001))continue;
      if(level>=6&&level<=8&&!whole&&!(drop&&half&&melody&&(level>=7||g.bar%2)))continue;
    }
    if(level>=9&&level<=11&&!half&&!(drop&&has('kick'))&&!(drop&&hat?.gain>=.7&&g.bar%4===3&&local>=2))continue;
    if(level>=12&&level<=13&&!half&&!(build&&has('snare'))&&!(drop&&has('kick'))&&!(drop&&hat?.gain>=.7&&(g.bar%2===1||level===13&&local>=3)&&local>=2))continue;
    if(level===14&&!half&&!(build&&has('snare'))&&!(drop&&has('kick'))&&!(drop&&g.bar%2===1&&local>=1))continue;
    // CRITICAL IN alternates dense and open bars; AT keeps the full cymbal stream.
    if(['critical','collapse'].includes(s.id)&&level===15&&drop&&!half&&!has('growl')&&g.bar%2===0)continue;
    if(level<16&&Math.abs(g.beat*4-Math.round(g.beat*4))>.0001&&!hat&&!has('kick'))continue;
    if(g.events.every(e=>e.instrument==='hat'&&e.gain<.65))continue;
    const held=notes.filter(n=>n.type==='hold'&&n.time<g.time-.001&&n.end>g.time+.001).map(n=>n.lane),budget=maxChord-held.length;
    if(budget<=0)continue;
    const ordered=[...g.events].sort((a,b)=>priority[a.instrument]-priority[b.instrument]);
    let source=ordered[0],type='tap',end=g.time,endSource=null;
    if(burst){type='drag';if(melody)source=melody;}
    else if(melody&&g.bar>=4&&g.bar%4===0&&Math.abs(local)<.0001){
      const target=g.beat+(['bridge','outro'].includes(g.section)||level<=3?2:1);
      endSource=score.events.find(e=>e.instrument==='melody'&&Math.abs(e.beat-target)<.0001);
      if(endSource){type='hold';source=melody;end=endSource.time;}
    }
    const phrase=LANE_PHRASES[s.id][Math.floor(g.bar/2)%2];
    let lane=burst?burst.lanes[Math.floor((g.beat-burst.start)/(level<=5?2:1))%burst.lanes.length]:phrase[index%phrase.length];index++;
    if(held.includes(lane))lane=Array.from({length:LANES},(_,k)=>(lane+k+1)%LANES).find(l=>!held.includes(l));
    const add=(lane,event=source,noteType=type,noteEnd=end)=>notes.push({lane,time:g.time,end:noteEnd,type:noteType,beat:g.beat,section:g.section,musicEvent:event.id,musicEndEvent:noteType==='hold'?endSource.id:null});
    add(lane);
    // Multi-presses mark layered downbeats in the actual drop, not arbitrary filler.
    const segment=score.segments.find(s=>g.beat>=s.start&&g.beat<s.end),chordSpacing=level<=8?16:8;
    if(maxChord>1&&drop&&Math.abs((g.beat-segment.start)%chordSpacing)<.0001){
      const available=[lane,...Array.from({length:LANES},(_,k)=>(lane+k+1)%LANES)].filter((l,i,a)=>!held.includes(l)&&a.indexOf(l)===i);
      const count=Math.min(budget,available.length,has('crash')?maxChord:Math.min(maxChord,level>=14?3:2));
      for(let k=1;k<count;k++)add(available[k],ordered[Math.min(k,ordered.length-1)],'tap',g.time);
    }
  }
  return cleanChart(notes);
}

export function lineMotion(time,songId='blue-hour',difficulty='light') {
  const song=getSong(songId),beat=Math.max(0,time/song.beat),scene=musicalStage(time,songId);
  // A gentle four-beat vertical bob, never tilt, rotate or reverse approach.
  const bob=Math.sin(beat*Math.PI/2)*(.005+scene.energy*.007),amount=difficulty==='easy'?.4:1;
  return {y:.72+(scene.line-.72+bob)*amount,tilt:0,angle:0};
}
// Lane X never depends on lineMotion. Only Y at the note's fixed lane changes.
export function laneX(lane,width,slots=4){return width*((lane+.5)/slots);}
export function lineY(time,lane,width,height){const m=lineMotion(time);return height*m.y+(laneX(lane,width)-width/2)*m.tilt;}
export function lineGeometry(time,width,height,{songId='blue-hour',difficulty='light',slots=4,training=false,pose=null}={}){
  const m=pose||(training?{y:.70}:lineMotion(time,songId,difficulty)),angle=0;
  const top=Math.min(140,height*.27),bottom=30;
  const length=width*.92;
  const cy=Math.max(top,Math.min(height-bottom,height*m.y));
  const cx=width/2,cos=1,sin=0;
  return {cx,cy,length,angle,cos,sin,slots,point(lane,distance=0){const u=((lane+.5)/slots-.5)*length;return {x:cx+cos*u+sin*distance,y:cy+sin*u-cos*distance};}};
}
