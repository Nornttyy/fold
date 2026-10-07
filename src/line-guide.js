import {HIT_COLORS} from './hit-effects.js?v=24b2beed2b7f';

export function upcomingGuides(notes,time,beat){
  const lanes=new Map(),lead=beat*1.5;
  for(const n of notes){
    if(n.state==='holding'){lanes.set(n.lane,{...n,charge:1,sustain:true});continue;}
    const delta=n.time-time;
    if(n.state!=='pending'||delta<0||delta>lead||lanes.get(n.lane)?.sustain)continue;
    if(!lanes.has(n.lane)||n.time<lanes.get(n.lane).time)lanes.set(n.lane,{...n,charge:1-delta/lead,sustain:false});
  }
  return [...lanes.values()];
}
export function drawLineGuides(c,notes,g,time,beat,{reduced=false}={}){
  const guides=upcomingGuides(notes,time,beat),span=Math.min(88,g.length/g.slots*.72);
  c.save();c.globalCompositeOperation='lighter';
  for(let lane=0;lane<g.slots;lane++){
    const p=g.point(lane);c.globalAlpha=.35;c.strokeStyle='#90dfff';c.lineWidth=1;
    c.beginPath();c.moveTo(p.x,p.y-3);c.lineTo(p.x,p.y+3);c.stroke();
  }
  for(const n of guides){
    const p=g.point(n.lane),q=n.charge,color=n.chord>1?'#4ffff0':HIT_COLORS[n.type];
    const half=span*.5+(reduced?0:(1-q)*20),lift=reduced?7:7+(1-q)*13;
    c.globalAlpha=.22+q*.65;c.shadowColor=color;c.shadowBlur=reduced?0:10+q*12;c.strokeStyle=color;c.lineWidth=1.4;
    c.beginPath();c.moveTo(p.x-half,p.y-4);c.lineTo(p.x-half,p.y+5);c.lineTo(p.x-half+7,p.y+5);c.moveTo(p.x+half,p.y-4);c.lineTo(p.x+half,p.y+5);c.lineTo(p.x+half-7,p.y+5);c.stroke();
    // A converging cue marks the next active lane, not another hittable note.
    c.beginPath();c.moveTo(p.x-4,p.y+lift+4);c.lineTo(p.x,p.y+lift);c.lineTo(p.x+4,p.y+lift+4);c.stroke();
    c.globalAlpha=q*.8;c.fillStyle=color;c.fillRect(p.x-span*q*.5,p.y+3,span*q,1);
  }
  c.restore();
}
