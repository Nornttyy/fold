const song=(s)=>Object.freeze({...s,beat:60/s.bpm,duration:s.beats*60/s.bpm+2.4,file:'assets/'+s.id+'.wav'});
export const SONGS=Object.freeze([
  song({id:'blue-hour',chapter:1,title:'蓝时',subtitle:'BLUE HOUR',cover:['BLUE','HOUR'],bpm:132,beats:160,slots:4,levels:[1,4,8,12],accent:'#91cfff',background:'#152348',theme:'fold',style:'Melodic House',modes:[[0,4]]}),
  song({id:'night-flight',chapter:1,title:'夜航',subtitle:'NIGHT FLIGHT',cover:['NIGHT','FLIGHT'],bpm:118,beats:128,slots:4,levels:[2,5,9,13],accent:'#e6aabf',background:'#30243c',theme:'orbit',style:'Dream Garage',modes:[[0,4]]}),
  song({id:'prism',chapter:2,title:'棱镜',subtitle:'PRISM',cover:['PRISM'],bpm:150,beats:176,slots:4,levels:[3,7,12,15],accent:'#88e7cf',background:'#153c3b',theme:'prism',style:'Digital Breakbeat',modes:[[0,4]]}),
  song({id:'trajectories',chapter:2,title:'轨迹',subtitle:'TRAJECTORIES',cover:['TRAJEC','TORIES'],bpm:144,beats:160,slots:4,levels:[4,8,13,16],accent:'#d2b4ff',background:'#29224a',theme:'rail',style:'Progressive Electro',modes:[[0,4]]}),
  song({id:'fold-space',chapter:3,title:'折叠空间',subtitle:'FOLD SPACE',cover:['FOLD','SPACE'],bpm:140,beats:176,slots:4,levels:[5,10,14,17],accent:'#ffc49c',background:'#352a32',theme:'portal',style:'Future Bass',modes:[[0,4]]}),
]);
export const CHAPTERS=Object.freeze([{id:1,title:'初醒',subtitle:'AWAKEN'},{id:2,title:'折光',subtitle:'REFRACT'},{id:3,title:'越界',subtitle:'BEYOND'}]);
export function getSong(id='blue-hour'){return SONGS.find(s=>s.id===id)||SONGS[0];}
export const KEY_CODES=Object.freeze({4:Object.freeze(['KeyD','KeyF','KeyJ','KeyK'])});
export const keyLabels=slots=>KEY_CODES[slots].map(s=>s.slice(3));
export function keyMode(){return {count:4,active:[0,1,2,3],next:null};}
export function nextModeBeat(song){return song.beats;}
