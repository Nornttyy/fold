import {getSong} from './songs.js';
import {musicScore} from './music-score.js';

const smooth=x=>{const k=Math.max(0,Math.min(1,x));return k*k*(3-2*k);};
const line={intro:.72,verse:.68,bridge:.73,build:.65,drop:.59,outro:.72};
const energy={intro:.15,verse:.35,bridge:.10,build:.48,drop:.86,outro:.18};
const sectionEnergy=(segment,beat)=>energy[segment.section]+(segment.section==='build'?.30*Math.max(0,Math.min(1,(beat-segment.start)/(segment.end-segment.start))):0);

// Stage changes use the same arrangement as the audible music, not a generic timer.
export function musicalStage(time,songId='blue-hour'){
  const song=getSong(songId),beat=Math.max(0,time/song.beat),segments=musicScore(songId).segments;
  const index=Math.max(0,segments.findIndex(s=>beat<s.end)),current=beat>=song.beats?segments.at(-1):segments[index];
  let y=line[current.section],power=sectionEnergy(current,beat);
  for(let i=1;i<segments.length;i++){
    const boundary=segments[i].start;
    if(beat<boundary-2||beat>boundary+2)continue;
    const a=segments[i-1],b=segments[i],k=smooth((beat-boundary+2)/4);
    y=line[a.section]+(line[b.section]-line[a.section])*k;
    const from=sectionEnergy(a,beat),to=sectionEnergy(b,beat);power=from+(to-from)*k;
    break;
  }
  return {section:current.section,peak:current.peak,energy:power,line:y,beat};
}
