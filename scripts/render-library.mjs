import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {SONGS} from '../src/songs.js';
import {musicScore,SAMPLE_RATE} from '../src/music-score.js';
const root=fileURLToPath(new URL('../',import.meta.url)),rate=SAMPLE_RATE,tau=Math.PI*2;
// The same event score generates the WAV and gameplay note timestamps.
let manifest={version:1,sampleRate:SAMPLE_RATE,songs:[]};
try{manifest=JSON.parse(await readFile(root+'assets/sync-manifest.json','utf8'));}catch{}
const freq=m=>440*2**((m-69)/12);
function wave(L,R){const n=L.length,b=Buffer.alloc(44+n*4);b.write('RIFF');b.writeUInt32LE(36+n*4,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(2,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*4,28);b.writeUInt16LE(4,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*4,40);for(let i=0;i<n;i++){b.writeInt16LE(Math.round(L[i]*32767),44+i*4);b.writeInt16LE(Math.round(R[i]*32767),46+i*4);}return b;}
await mkdir(root+'assets',{recursive:true});
const requested=process.argv.slice(2);
for(const song of SONGS.filter(s=>!requested.length||requested.includes(s.id))){
  const {score,events}=musicScore(song.id),n=Math.ceil(song.duration*rate),L=new Float32Array(n),R=new Float32Array(n),W=new Float32Array(n),beat=song.beat;let state=0x7d034+song.bpm;
  const noise=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/2147483648-1;};
  function mix(t,d,f,v=.2,pan=0,wet=0){const start=Math.round(t*rate),len=Math.ceil(d*rate),gl=Math.sqrt((1-pan)/2),gr=Math.sqrt((1+pan)/2);for(let i=0;i<len&&start+i<n;i++){const sample=f(i/rate)*v;L[start+i]+=sample*gl;R[start+i]+=sample*gr;W[start+i]+=sample*wet;}}
  function kick(t,v=1,drive=.35){let phase=0;mix(t,.30,s=>{phase+=tau*(47+130*Math.exp(-s*47))/rate;const skin=Math.sin(phase),punch=Math.tanh(skin*(1.2+drive*1.8))*.70+skin*.25;return punch*Math.exp(-s*18)+Math.sin(phase*3)*drive*.14*Math.exp(-s*38)+noise()*.12*Math.exp(-s*320);},.64*v);}
  function snare(t,v=1){let previous=0,hp=0;mix(t,.14,s=>{const a=noise();hp=.70*(hp+a-previous);previous=a;return hp*Math.exp(-s*38)+Math.sin(tau*195*s)*.24*Math.exp(-s*55)+Math.sin(tau*2100*s)*.12*Math.exp(-s*230);},.46*v,0,.08);}
  function hat(t,v=1,open=false){let last=0;mix(t,open?.12:.04,s=>{const a=noise(),h=a-last;last=a;return h*Math.exp(-s/(open?.033:.009));},.11*v,.3);}
  function bass(t,m,d=.28,v=1,texture='round'){const f=freq(m);let low=0;mix(t,d,s=>{const envelope=Math.min(1,s/.003)*Math.min(1,Math.max(0,(d-s)/.025));let tone=Math.sin(tau*f*s)+.30*Math.sin(tau*2*f*s)+.15*Math.sin(tau*3*f*s);if(texture==='reese'){let edge=0;for(let h=1;h<=7;h++)edge+=(Math.sin(tau*f*.993*s*h)+Math.sin(tau*f*1.007*s*h+.35))/(h*3);const cutoff=160+1700*Math.exp(-s*23),alpha=1-Math.exp(-tau*cutoff/rate);low+=alpha*(edge-low);tone=tone*.57+low*.80;}return Math.tanh(tone*(texture==='reese'?1.9:1.2))*envelope;},.39*v);}
  function chord(t,notes,d,v=1){for(let j=0;j<notes.length;j++){const f=freq(notes[j]);mix(t,d+.30,s=>{const envelope=Math.min(1,s/.10)*Math.min(1,Math.max(0,(d+.30-s)/.35)),side=.35+.65*(1-Math.exp(-((t+s)%beat)/.055));const base=(Math.sin(tau*f*.997*s)+Math.sin(tau*f*1.003*s+.4))*.5+.14*Math.sin(tau*f*2*s);const gate=score.kind==='future'?.68+.32*Math.sin(tau*s/beat*2):1;return base*envelope*side*gate;},(score.kind==='glass'?.13:.12)*v,j%2?.5:-.5,.25);}}
  function melodic(t,m,index,v=1){const f=freq(m),d=score.kind==='glass'?1.6:.9;mix(t,d,s=>{const envelope=(1-Math.exp(-s*350))*Math.exp(-s/(score.tone?.decay??(score.kind==='glass'?.28:.17)));const modulation=score.tone?.mod??(score.kind==='digital'?3.5:score.kind==='glass'?1.2:2.2);return(Math.sin(tau*f*s+modulation*Math.sin(tau*f*(score.tone?.ratio??2)*s)*Math.exp(-s*10))+.10*Math.sin(tau*f*3.005*s))*envelope;},.23*v,Math.sin(index*1.3)*(score.tone?.pan??.55),.42);}
  function lead(t,m,d,v=1,texture='tight'){const f=freq(m);mix(t,d+.08,s=>{let tone=0;const voices=texture==='wide'?3:1;for(let j=-Math.floor(voices/2);j<=Math.floor(voices/2);j++)for(let h=1;h<=7;h++)tone+=Math.sin(tau*f*(1+j*.009)*s*h+.18*j)/(h*voices);const env=Math.min(1,s/.004)*Math.min(1,Math.max(0,(d+.08-s)/.08)),duck=.25+.75*(1-Math.exp(-((t+s)%beat)/.045));return Math.tanh(tone*1.35)*env*duck;},.28*v,0,.22);}
  function stab(t,m,v=1){const f=freq(m);mix(t,.20,s=>{const env=Math.min(1,s/.0015)*Math.exp(-s/.043),fm=Math.sin(tau*f*s+5.5*Math.exp(-s*18)*Math.sin(tau*f*2.013*s)),metal=Math.sin(tau*f*3.97*s)*.17+Math.sin(tau*f*6.13*s)*.09;return Math.tanh((fm+metal)*1.6)*env;},.23*v,-.22,.10);}
  function crash(t,v=1){let previous=0;mix(t,.60,s=>{const a=noise(),hp=a-previous;previous=a;return(hp*.6+Math.sin(tau*5317*s)*.16+Math.sin(tau*7721*s)*.12)*Math.exp(-s/.11);},.20*v,.38,.08);}
  function growl(t,m,d,v=1,variant=0){
    const f=freq(m),formant=[620,920,1350][variant];let low=0;
    mix(t,d+.035,s=>{
      const env=Math.min(1,s/.003)*Math.min(1,Math.max(0,(d+.035-s)/.035));
      const sweep=Math.exp(-s*8),mod=3+8*sweep,phase=tau*f*s;
      const voice=Math.sin(phase+mod*Math.sin(phase*2.01))*.65+Math.sin(tau*formant*s+Math.sin(phase)*3)*.35;
      low+=(1-Math.exp(-tau*(220+2400*sweep)/rate))*(voice-low);
      return Math.tanh(low*2.8)*env*(.62+.38*Math.sin(tau*s/beat*4)**2);
    },.32*v,variant===1?.16:-.12,.08);
  }
  function rise(t,d){let last=0;mix(t,d,s=>{const a=noise(),hp=a-last;last=a;const k=s/d;return hp*k*k*(.45+.55*Math.sin(tau*s/beat*2)**2);},.13,0,.1);}
  for(const e of events){
    if(e.instrument==='kick')kick(e.time,e.gain,e.drive);
    if(e.instrument==='snare')snare(e.time,e.gain);
    if(e.instrument==='hat')hat(e.time,e.gain,e.open);
    if(e.instrument==='bass')bass(e.time,e.note,e.duration,e.gain,e.texture);
    if(e.instrument==='chord')chord(e.time,e.notes,e.duration,e.gain);
    if(e.instrument==='melody')melodic(e.time,e.note,e.index,e.gain);
    if(e.instrument==='lead')lead(e.time,e.note,e.duration,e.gain,e.texture);
    if(e.instrument==='stab')stab(e.time,e.note,e.gain);
    if(e.instrument==='crash')crash(e.time,e.gain);
    if(e.instrument==='rise')rise(e.time,e.duration);
    if(e.instrument==='growl')growl(e.time,e.note,e.duration,e.gain,e.variant);
  }
  for(const [mult,gain] of [[.75,.24],[1.5,.13],[2.25,.06]]){const delay=Math.round(beat*mult*rate);let filtered=0;for(let i=delay;i<n;i++){filtered+=.30*(W[i-delay]-filtered);L[i]+=filtered*gain;R[i]+=filtered*gain*.83;}}
  let lastL=0,lastR=0,hpL=0,hpR=0,peak=0,power=0;
  for(let i=0;i<n;i++){hpL=.997*(hpL+L[i]-lastL);hpR=.997*(hpR+R[i]-lastR);lastL=L[i];lastR=R[i];const fade=Math.min(1,i/(rate*.015),Math.max(0,(n-i)/(rate*2.5)));L[i]=Math.tanh(hpL*1.4)*fade;R[i]=Math.tanh(hpR*1.4)*fade;peak=Math.max(peak,Math.abs(L[i]),Math.abs(R[i]));}
  const gain=.87/peak;for(let i=0;i<n;i++){L[i]*=gain;R[i]*=gain;power+=(L[i]**2+R[i]**2)/2;}
  const bytes=wave(L,R);await writeFile(root+song.file,bytes);
  manifest.songs=manifest.songs.filter(s=>s.id!==song.id);
  manifest.songs.push({id:song.id,file:song.file,scoreHash:createHash('sha256').update(JSON.stringify(events)).digest('hex'),sha256:createHash('sha256').update(bytes).digest('hex'),events:events.map(({id,instrument,sample,beat,gain})=>({id,instrument,sample,beat,gain}))});console.log(`${song.title}: ${song.bpm} BPM, ${song.duration.toFixed(2)}s, ${score.kind}, RMS ${Math.sqrt(power/n).toFixed(3)}, ${song.file}`);
}

manifest.songs.sort((a,b)=>SONGS.findIndex(s=>s.id===a.id)-SONGS.findIndex(s=>s.id===b.id));
await writeFile(root+'assets/sync-manifest.json',JSON.stringify(manifest));

// Separate loopable menu and result cues, not the gameplay song clock.
for(const scene of ['menu','result']){
  const bpm=scene==='menu'?124:140,beat=60/bpm,bars=8,n=Math.round(bars*4*beat*rate),L=new Float32Array(n),R=new Float32Array(n);let state=0x8dc72;
  const roots=scene==='menu'?[42,38,45,40]:[48,43,45,41],melody=scene==='menu'?[66,69,73,78,73,69,71,73]:[72,76,79,84,83,79,76,74];
  const noise=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/2147483648-1;};
  function add(t,d,fn,v,pan=0){const start=Math.round(t*rate),len=Math.ceil(d*rate);for(let j=0;j<len;j++){const i=(start+j)%n,sample=fn(j/rate)*v;L[i]+=sample*Math.sqrt((1-pan)/2);R[i]+=sample*Math.sqrt((1+pan)/2);}}
  for(let b=0;b<bars*4;b++){
    const root=roots[Math.floor(b/8)%4],t=b*beat;
    let phase=0;add(t,.22,s=>{phase+=tau*(52+100*Math.exp(-s*55))/rate;return Math.sin(phase)*Math.exp(-s*25);},scene==='menu'?.38:.48);
    if(b%2)add(t,.085,s=>noise()*Math.exp(-s*65)+Math.sin(tau*205*s)*.18*Math.exp(-s*80),.23);
    add(t+beat*.5,.045,s=>noise()*Math.exp(-s*160),.065,.4);
    add(t+beat*.5,beat*.35,s=>Math.sin(tau*freq(root-12)*s)*Math.min(1,s/.006)*Math.max(0,1-s/(beat*.35)),.28);
    if(b%4===0)for(const interval of [0,3,7,12])add(t,beat*4,s=>{const e=Math.min(1,s/.10)*Math.min(1,(beat*4-s)/.15);return(Math.sin(tau*freq(root+interval)*s)+.10*Math.sin(tau*freq(root+interval)*2*s))*e;},.055,interval%2?.45:-.45);
    for(let k=0;k<2;k++){const m=melody[(b*2+k)%melody.length]+(scene==='result'&&b>=16?12:0),f=freq(m);add(t+k*beat*.5,beat*.8,s=>(Math.sin(tau*f*s+1.3*Math.sin(tau*f*2*s)*Math.exp(-s*20))+.12*Math.sin(tau*f*3*s))*Math.min(1,s/.004)*Math.exp(-s/.12),.19,k?.35:-.35);}
  }
  let peak=0;for(let i=0;i<n;i++){L[i]=Math.tanh(L[i]*1.25);R[i]=Math.tanh(R[i]*1.25);peak=Math.max(peak,Math.abs(L[i]),Math.abs(R[i]));}
  for(let i=0;i<n;i++){L[i]*=.78/peak;R[i]*=.78/peak;}
  const file='assets/'+(scene==='menu'?'menu-theme':'result-theme')+'.wav';await writeFile(root+file,wave(L,R));console.log(scene+' cue: '+(n/rate).toFixed(2)+'s loop, '+file);
}
