import {getSong} from './songs.js?v=1b0c683651cd';

// Authored visual speed changes. Integrating velocity keeps note positions continuous,
// even across a speed change; note timestamps and judgment windows are untouched.
export const SPEED_SCORES={
  'blue-hour':[[0,1],[28,1],[36,1.35],[60,1.35],[68,.72],[76,.72],[84,1.65],[120,1.65],[132,1.05],[160,1.05]],
  'night-flight':[[0,1],[20,1],[28,1.30],[48,1.30],[56,.75],[64,.75],[72,1.55],[104,1.55],[116,1.05],[128,1.05]],
  prism:[[0,1.05],[20,1.05],[28,1.5],[60,1.5],[68,.65],[76,.65],[84,1.85],[120,1.85],[128,1.0],[140,1.7],[160,1.7],[176,1.1]],
  trajectories:[[0,1.05],[24,1.05],[32,1.4],[56,1.4],[64,.70],[72,.70],[80,1.75],[112,1.75],[120,1],[136,1.6],[160,1.1]],
  'fold-space':[[0,1],[20,1],[28,1.45],[48,1.45],[56,.62],[64,.62],[72,1.8],[100,1.8],[108,.75],[116,.75],[124,1.95],[156,1.95],[168,1.15],[176,1.15]],
  critical:[[0,1],[8,1],[16,1.20],[36,1.20],[40,.72],[48,.72],[60,1.60],[64,1.85],[100,1.85],[104,.70],[112,.70],[124,1.60],[128,1.95],[172,1.95],[180,1.05],[192,1.05]],
  glimmer:[[0,1],[20,1],[28,1.2],[32,.72],[40,.72],[48,1.4],[68,1.4],[72,.70],[80,.70],[96,1.55],[124,1.55],[132,1.05],[144,1.05]],
  daybreak:[[0,1],[20,1],[32,1.35],[40,.72],[48,.72],[56,1.6],[84,1.6],[88,.70],[96,.70],[112,1.72],[140,1.72],[152,1],[160,1]],
  arc:[[0,1.05],[24,1.05],[32,1.4],[40,.72],[48,.72],[56,1.75],[92,1.75],[96,.66],[104,.66],[120,1.85],[156,1.85],[168,1.05],[176,1.05]],
  zero:[[0,1],[24,1],[32,1.35],[40,.70],[48,.70],[64,1.75],[100,1.75],[104,.68],[112,.68],[128,1.95],[172,1.95],[184,1],[192,1]],
  overclock:[[0,1.05],[28,1.05],[40,1.4],[48,.72],[56,.72],[72,1.85],[108,1.85],[112,.66],[120,.66],[136,1.95],[188,1.95],[200,1.05],[208,1.05]],
  collapse:[[0,1],[32,1],[40,1.35],[48,.70],[56,.70],[72,1.9],[116,1.9],[120,.65],[128,.65],[136,1.95],[204,1.95],[216,1.1],[224,1.1]],
};
const amount=difficulty=>difficulty==='easy'?.35:difficulty==='light'?.65:1;
const value=(v,d)=>1+(v-1)*amount(d);
export function scrollVelocity(time,songId='blue-hour',difficulty='light'){
  const s=getSong(songId),frames=SPEED_SCORES[s.id],b=time/s.beat;
  if(b<=frames[0][0])return value(frames[0][1],difficulty);
  for(let i=1;i<frames.length;i++)if(b<frames[i][0]){
    const a=frames[i-1],z=frames[i],u=(b-a[0])/(z[0]-a[0]),ease=u*u*(3-2*u);
    return value(a[1]+(z[1]-a[1])*ease,difficulty);
  }
  return value(frames.at(-1)[1],difficulty);
}
export function scrollPosition(time,songId='blue-hour',difficulty='light'){
  const s=getSong(songId),frames=SPEED_SCORES[s.id];
  if(time<=0)return time*value(frames[0][1],difficulty);
  let total=0;
  for(let i=1;i<frames.length;i++){
    const a=frames[i-1],z=frames[i],start=a[0]*s.beat,len=(z[0]-a[0])*s.beat;
    const u=Math.max(0,Math.min(1,(time-start)/len)),from=value(a[1],difficulty),to=value(z[1],difficulty);
    total+=len*(from*u+(to-from)*(u**3-.5*u**4));
    if(u<1)return total;
  }
  return total+Math.max(0,time-frames.at(-1)[0]*s.beat)*value(frames.at(-1)[1],difficulty);
}
export function noteDistance(noteTime,time,approach,songId,difficulty,{constant=false}={}){
  return approach*(constant?noteTime-time:scrollPosition(noteTime,songId,difficulty)-scrollPosition(time,songId,difficulty));
}
