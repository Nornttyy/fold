import {getSong} from './songs.js?v=1b0c683651cd';
import {CHART_REVISION} from './chart.js?v=1b0c683651cd';
const PREFIX='fold-rhythm-v1';
export const defaults={music:.65,hit:.8,offset:0,speed:1,difficulty:'light',song:'blue-hour',tutorialDone:false};
const clamp=(n,a,b)=>Number.isFinite(Number(n))?Math.max(a,Math.min(b,Number(n))):a;
export function readSettings(storage=globalThis.localStorage){try{const s=JSON.parse(storage.getItem(PREFIX+'-settings')||'{}');return{music:clamp(s.music??defaults.music,0,1),hit:clamp(s.hit??defaults.hit,0,1),offset:clamp(s.offset??0,-200,200),speed:clamp(s.speed??1,.7,1.5),difficulty:['easy','light','flow','expert'].includes(s.difficulty)?s.difficulty:'light',song:getSong(s.song).id,tutorialDone:s.tutorialDone===true};}catch{return{...defaults};}}
export function saveSettings(value,storage=globalThis.localStorage){try{storage.setItem(PREFIX+'-settings',JSON.stringify(value));}catch{}}
const bestKey=(difficulty,song)=>PREFIX+'-best-'+(song==='blue-hour'?'':song+'-')+difficulty+'-'+CHART_REVISION;
export function readBest(difficulty,storage=globalThis.localStorage,song='blue-hour'){try{return JSON.parse(storage.getItem(bestKey(difficulty,song))||'null');}catch{return null;}}
export function saveBest(difficulty,result,storage=globalThis.localStorage,song='blue-hour'){const best=readBest(difficulty,storage,song);if(!best||best.score<result.score){try{storage.setItem(bestKey(difficulty,song),JSON.stringify(result));}catch{}return true;}return false;}
