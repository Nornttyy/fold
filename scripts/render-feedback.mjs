import {mkdir,writeFile} from 'node:fs/promises';
const rate=44100,tau=Math.PI*2,root=new URL('../assets/',import.meta.url);await mkdir(root,{recursive:true});
function wave(data){const b=Buffer.alloc(44+data.length*2);b.write('RIFF');b.writeUInt32LE(36+data.length*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(data.length*2,40);for(let i=0;i<data.length;i++)b.writeInt16LE(Math.round(data[i]*32767),44+i*2);return b;}
export const DRUM_PROFILES={tap:{duration:.085,name:'rim snare'},hold:{duration:.130,name:'high tom'},drag:{duration:.060,name:'closed hi-hat'}};
// Original drum synthesis: drum-skin partials, snare wire noise, inharmonic metal.
// No downloaded samples, long reverb, oscillator beeps or bass-only hit sounds.
for(const [type,profile]of Object.entries(DRUM_PROFILES)){
  const n=Math.ceil(profile.duration*rate),data=new Float32Array(n);let state=0x59bf07,last=0,hp=0,phase=0,mean=0;
  for(let i=0;i<n;i++){
    const t=i/rate;state^=state<<13;state^=state>>>17;state^=state<<5;const noise=(state>>>0)/2147483648-1;hp=.67*(hp+noise-last);last=noise;
    const attack=Math.min(1,t/.00035),metal=[3129,4517,6123,7729,9535].reduce((sum,f)=>sum+Math.sin(tau*f*t),0)/5;
    let s=0;
    if(type==='tap')s=hp*.95*Math.exp(-t/.018)+Math.sin(tau*185*t)*.21*Math.exp(-t/.016)+Math.sin(tau*330*t)*.09*Math.exp(-t/.010)+Math.sin(tau*1850*t)*.25*Math.exp(-t/.0024);
    if(type==='hold'){phase+=tau*(240+180*Math.exp(-t*65))/rate;s=(Math.sin(phase)*.68+Math.sin(phase*1.59)*.18)*Math.exp(-t/.026)+hp*.30*Math.exp(-t/.004)+metal*.15*Math.exp(-t/.005);}
    if(type==='drag')s=(hp*.75+metal*.55)*Math.exp(-t/.009);
    const fade=Math.min(1,(n-i)/(rate*.009));data[i]=Math.tanh(s*1.6)*attack*fade;mean+=data[i];
  }
  mean/=n;let peak=0;for(let i=0;i<n;i++){data[i]-=mean*Math.min(1,i/(rate*.002),(n-i)/(rate*.004));peak=Math.max(peak,Math.abs(data[i]));}
  for(let i=0;i<n;i++)data[i]*=(type==='drag'?.82:.90)/peak;
  await writeFile(new URL(type==='tap'?'snap.wav':'hit-'+type+'.wav',root),wave(data));console.log(type,profile.name,profile.duration+'s');
}
