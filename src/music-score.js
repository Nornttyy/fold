import {getSong} from './songs.js';
import {EXPANSION_SCORES,EXPANSION_ARRANGEMENTS} from './expansion-score.js';
export const SAMPLE_RATE=44100;
export const SCORES={
  ...EXPANSION_SCORES,
  'blue-hour':{roots:[30,26,33,28],chords:[[54,61,66,69],[50,57,62,66],[57,61,64,69],[52,59,64,68]],melody:[[78,73,76,73,81,78,76,73],[78,74,76,74,81,78,76,74],[81,76,80,76,85,81,80,76],[80,76,78,76,83,80,78,76]],kind:'anthem'},
  'night-flight':{roots:[33,29,36,31],chords:[[57,60,64,67],[53,57,60,64],[60,64,67,71],[55,59,62,67]],melody:[[81,79,76,72,74,76,79,76],[77,76,72,69,72,76,77,76],[84,83,79,76,79,83,84,79],[79,78,74,71,74,78,79,74]],kind:'glass'},
  prism:{roots:[28,31,24,26],chords:[[52,55,59,62],[55,59,62,66],[48,52,55,59],[50,54,57,62]],melody:[[76,79,83,86,83,79,78,74],[79,83,86,90,86,83,81,78],[72,76,79,83,79,76,74,71],[74,78,81,86,81,78,76,73]],kind:'digital'},
  trajectories:{roots:[35,31,38,33],chords:[[59,62,66,69],[55,59,62,66],[62,66,69,73],[57,61,64,69]],melody:[[83,78,81,86,83,81,78,76],[79,74,78,83,79,78,74,71],[86,81,85,90,86,85,81,78],[81,76,80,85,81,80,76,73]],kind:'lead'},
  'fold-space':{roots:[32,28,35,30],chords:[[56,59,63,66],[52,56,59,63],[59,63,66,70],[54,58,61,66]],melody:[[80,83,78,75,78,83,87,83],[76,80,75,71,75,80,83,80],[83,87,81,78,81,87,90,87],[78,82,76,73,76,82,85,82]],kind:'future'},
  critical:{roots:[29,25,32,27],chords:[[53,56,60,65],[49,53,56,60],[56,60,63,67],[51,55,58,63]],melody:[[77,84,80,77,75,80,84,87],[73,80,77,73,72,77,80,84],[80,87,84,80,79,84,87,91],[75,82,79,75,74,79,82,86]],kind:'rave'},
};
// Bar boundaries are intentionally different per song: two peaks with a real breath between them.
export const ARRANGEMENTS=Object.freeze({
  ...EXPANSION_ARRANGEMENTS,
  'blue-hour':[[0,'intro'],[2,'verse'],[10,'bridge'],[12,'build'],[14,'drop'],[22,'bridge'],[24,'build'],[26,'drop'],[36,'outro']],
  'night-flight':[[0,'intro'],[2,'verse'],[8,'bridge'],[10,'build'],[12,'drop'],[18,'bridge'],[20,'build'],[22,'drop'],[28,'outro']],
  prism:[[0,'intro'],[2,'verse'],[10,'bridge'],[12,'build'],[14,'drop'],[24,'bridge'],[26,'build'],[28,'drop'],[40,'outro']],
  trajectories:[[0,'intro'],[2,'verse'],[8,'bridge'],[10,'build'],[12,'drop'],[22,'bridge'],[24,'build'],[26,'drop'],[36,'outro']],
  'fold-space':[[0,'intro'],[2,'verse'],[10,'bridge'],[12,'build'],[14,'drop'],[22,'bridge'],[26,'build'],[28,'drop'],[40,'outro']],
  critical:[[0,'intro'],[2,'verse'],[10,'bridge'],[12,'build'],[16,'drop'],[26,'bridge'],[28,'build'],[32,'drop'],[44,'outro']],
});
const cache=new Map();
export function musicScore(songId='blue-hour'){
  const song=getSong(songId);if(cache.has(song.id))return cache.get(song.id);
  const score=SCORES[song.id],beat=song.beat,bars=song.beats/4,events=[];
  let peak=0;const segments=ARRANGEMENTS[song.id].map(([start,section],i,a)=>({start:start*4,end:(a[i+1]?.[0]??bars)*4,section,peak:section==='drop'?++peak:peak}));
  function add(instrument,b,options={}){
    const sample=Math.round(b*beat*SAMPLE_RATE);
    const duplicate=events.find(e=>e.instrument===instrument&&e.sample===sample);
    if(duplicate){duplicate.gain=Math.min(1.25,duplicate.gain+(options.gain??1));return;}
    events.push({id:song.id+':'+events.length,instrument,beat:b,sample,time:sample/SAMPLE_RATE,gain:1,...options});
  }
  for(let bar=0;bar<bars;bar++){
    const b=bar*4,c=Math.floor(bar/2)%4,segment=segments.find(s=>b>=s.start&&b<s.end),{section,peak}=segment;
    const drop=section==='drop',bridge=section==='bridge',build=section==='build',intro=section==='intro',tail=section==='outro',final=drop&&peak===2;
    const progress=(b-segment.start)/(segment.end-segment.start),addBar=(instrument,k,options={})=>add(instrument,b+k,{bar,section,peak,...options});
    addBar('chord',0,{notes:score.chords[c],duration:4*beat,gain:bridge?.50:intro?.62:build?.60:drop?.86:.70});
    if(drop||section==='verse'){
      const kicks=score.kicks||(score.kind==='glass'?[0,1.75,2.5]:score.kind==='digital'?[0,1.5,2.75,3.5]:score.kind==='future'?[0,1.75,3]:[0,1,2,3]);
      for(const k of kicks)addBar('kick',k,{gain:final?1.1:drop?.92:.62,drive:final?1:.35});
      for(const k of [1,3])addBar('snare',k,{gain:drop?.98:.55});
      for(let k=0;k<(drop?16:8);k++)addBar('hat',k*(drop?.25:.5)+(k%2?(score.swing??(score.kind==='glass'?.05:0)):0),{gain:(k%2?1:.5)*(drop?1:.72),open:drop&&k===15});
      for(const k of score.bassSteps||(score.kind==='future'?[.5,2,3.25]:[.5,1.5,2.5,3.5]))addBar('bass',k,{note:score.roots[c]+(k>3?12:0),duration:beat*(drop?.40:.58),gain:drop?1:.55,texture:drop?'reese':'round'});
      if(drop)for(const k of [0,1.5,2.5])addBar('bass',k,{note:score.roots[c],duration:beat*.22,gain:final?.9:.7,texture:'reese'});
      if(final&&bar%4===(Math.floor(segment.start/4)+3)%4)for(const k of [3.25,3.75])addBar('kick',k,{gain:.65,drive:1});
    }else if(build){
      for(const k of [0,2])addBar('kick',k,{gain:.38+progress*.34});
      const last=b+4===segment.end,step=last?.25:.5;
      for(let k=0;k<4;k+=step)addBar('snare',k,{gain:.18+progress*.24+k*.035,roll:true});
      if(last&&peak===1)for(let k=3;k<4;k+=.125)addBar('snare',k,{gain:.28+(k-3)*.25,roll:true});
      if(b===segment.start)addBar('rise',0,{duration:(segment.end-segment.start-.25)*beat,gain:.7});
    }else if(intro){addBar('kick',0,{gain:.55});addBar('hat',2,{gain:.6});}
    const phrase=score.melody[c],spacing=drop?.5:1;
    for(let k=0;k<4/spacing;k++)addBar('melody',k*spacing,{note:phrase[(k+bar%2*4)%8]+(final&&bar%4>=2?12:0),index:k,gain:bridge?.38:intro?.55:build?.58:tail?.44:drop?.92:.70});
    if(drop){
      for(let k=0;k<4;k++)addBar('lead',k,{note:phrase[(k*2+bar%2*4)%8]-12,duration:beat*.62,gain:score.kind==='glass'?.63:final?1.05:.82,texture:final?'wide':'tight'});
      if((b-segment.start)%16===0)addBar('crash',0,{gain:final?1:.80});
      for(const k of [0,2.5])addBar('stab',k,{note:score.roots[c]+24,gain:final?.80:.54});
      // A low, gated call answers the melodic lead, only in this song's peaks.
      if(score.kind==='rave'||score.growls)for(const [j,k]of (score.growls||[1.25,3.25]).entries())addBar('growl',k,{note:score.roots[c]-12,duration:beat*(final?.62:.42),gain:final?.78:.65,variant:(bar+j)%3});
      if(b+4===segment.end)for(let k=3;k<4;k+=.25)addBar('snare',k,{gain:.25+(k-3)*.4,roll:true});
    }
  }
  events.sort((a,b)=>a.sample-b.sample||a.id.localeCompare(b.id));
  const result=Object.freeze({songId:song.id,score,segments:Object.freeze(segments.map(Object.freeze)),sections:Object.fromEntries(['bridge','drop','outro'].map(name=>[name,segments.find(s=>s.section===name).start])),events:Object.freeze(events.map(Object.freeze))});cache.set(song.id,result);return result;
}
