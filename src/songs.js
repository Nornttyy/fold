const song=(s)=>Object.freeze({...s,beat:60/s.bpm,duration:s.beats*60/s.bpm+2.4,file:'assets/'+s.id+'.wav'});
export const SONGS=Object.freeze([
  song({id:'blue-hour',chapter:1,title:'蓝时',subtitle:'BLUE HOUR',cover:['BLUE','HOUR'],bpm:132,beats:160,slots:4,levels:[1,4,8,12],accent:'#91cfff',background:'#152348',theme:'fold',style:'Melodic House',modes:[[0,4]]}),
  song({id:'night-flight',chapter:1,title:'夜航',subtitle:'NIGHT FLIGHT',cover:['NIGHT','FLIGHT'],bpm:118,beats:128,slots:4,levels:[2,5,9,13],accent:'#e6aabf',background:'#30243c',theme:'orbit',style:'Dream Garage',modes:[[0,4]]}),
  song({id:'prism',chapter:2,title:'棱镜',subtitle:'PRISM',cover:['PRISM'],bpm:150,beats:176,slots:4,levels:[3,7,12,15],accent:'#88e7cf',background:'#153c3b',theme:'prism',style:'Digital Breakbeat',modes:[[0,4]]}),
  song({id:'trajectories',chapter:2,title:'轨迹',subtitle:'TRAJECTORIES',cover:['TRAJEC','TORIES'],bpm:144,beats:160,slots:4,levels:[4,8,13,16],accent:'#d2b4ff',background:'#29224a',theme:'rail',style:'Progressive Electro',modes:[[0,4]]}),
  song({id:'fold-space',chapter:3,title:'折叠空间',subtitle:'FOLD SPACE',cover:['FOLD','SPACE'],bpm:140,beats:176,slots:4,levels:[5,10,14,17],accent:'#ffc49c',background:'#352a32',theme:'portal',style:'Future Bass',modes:[[0,4]]}),
  song({id:'critical',chapter:3,title:'临界',subtitle:'CRITICAL',cover:['CRITI','CAL'],bpm:168,beats:192,slots:4,levels:[6,11,15,17],accent:'#fd8faf',background:'#381d38',theme:'pulse',style:'Hard Rave / Bass',modes:[[0,4]]}),
  song({id:'glimmer',chapter:1,title:'微光',subtitle:'GLIMMER',cover:['GLIM','MER'],bpm:126,beats:144,slots:4,levels:[1,4,7,11],accent:'#a1ecd4',background:'#163835',theme:'orbit',style:'Liquid House',modes:[[0,4]]}),
  song({id:'daybreak',chapter:1,title:'晨频',subtitle:'DAYBREAK',cover:['DAY','BREAK'],bpm:138,beats:160,slots:4,levels:[2,6,10,13],accent:'#ffd49c',background:'#34273f',theme:'rail',style:'UK Bass / Garage',modes:[[0,4]]}),
  song({id:'arc',chapter:2,title:'电弧',subtitle:'ARC',cover:['ARC'],bpm:156,beats:176,slots:4,levels:[4,8,12,16],accent:'#a7b7ff',background:'#242746',theme:'pulse',style:'Syncopated Electro',modes:[[0,4]]}),
  song({id:'zero',chapter:2,title:'零点',subtitle:'ZERO POINT',cover:['ZERO','POINT'],bpm:160,beats:192,slots:4,levels:[5,9,14,17],accent:'#8cf0e4',background:'#153b41',theme:'prism',style:'Drum & Bass',modes:[[0,4]]}),
  song({id:'overclock',chapter:3,title:'超频',subtitle:'OVERCLOCK',cover:['OVER','CLOCK'],bpm:176,beats:208,slots:4,levels:[6,10,14,17],accent:'#ffc67e',background:'#372237',theme:'rail',style:'Hard Dance',modes:[[0,4]]}),
  song({id:'collapse',chapter:3,title:'坍缩',subtitle:'COLLAPSE',cover:['COL','LAPSE'],bpm:184,beats:224,slots:4,levels:[7,11,15,17],accent:'#e1a0ff',background:'#2f1d48',theme:'portal',style:'Rave / Breakcore',modes:[[0,4]]}),
]);
export const CHAPTERS=Object.freeze([{id:1,title:'初醒',subtitle:'AWAKEN'},{id:2,title:'折光',subtitle:'REFRACT'},{id:3,title:'越界',subtitle:'BEYOND'}]);
export function getSong(id='blue-hour'){return SONGS.find(s=>s.id===id)||SONGS[0];}
export const KEY_CODES=Object.freeze({4:Object.freeze(['KeyD','KeyF','KeyJ','KeyK'])});
export const keyLabels=slots=>KEY_CODES[slots].map(s=>s.slice(3));
export function keyMode(){return {count:4,active:[0,1,2,3],next:null};}
export function nextModeBeat(song){return song.beats;}
