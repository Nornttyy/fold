import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
const path=name=>new URL('../assets/'+name,import.meta.url);
test('real original music file is complete 44.1kHz stereo PCM, not a placeholder',async()=>{const b=await readFile(path('blue-hour.wav'));assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.readUInt32LE(24),44100);assert.equal(b.readUInt16LE(22),2);const duration=b.readUInt32LE(40)/(44100*4);assert.ok(duration>75&&duration<76);assert.ok((await stat(path('blue-hour.wav'))).size>12e6);let power=0,peak=0;for(let i=44;i<b.length;i+=32){const v=b.readInt16LE(i)/32767;power+=v*v;peak=Math.max(peak,Math.abs(v));}assert.ok(peak<.90&&peak>.8);assert.ok(power/((b.length-44)/32)>.015);});
test('hit is an 85ms dry rim/snare with a bright attack, body and no reverb tail',async()=>{
  const b=await readFile(path('snap.wav')),rate=b.readUInt32LE(24),n=b.readUInt32LE(40)/2,data=Array.from({length:n},(_,i)=>b.readInt16LE(44+i*2)/32767);assert.ok(Math.abs(n/rate-.085)<1/rate);assert.equal(b.readUInt16LE(22),1);assert.ok(Math.max(...data.map(Math.abs))>.85);assert.ok(Math.abs(data.reduce((a,v)=>a+v,0)/n)<.008);
  let low=0,high=0;for(let bin=1;bin<=256;bin++){const f=bin*rate/512;let re=0,im=0;for(let i=0;i<n;i++){const a=2*Math.PI*f*i/rate;re+=data[i]*Math.cos(a);im+=data[i]*Math.sin(a);}const energy=re*re+im*im;if(f<400)low+=energy;else if(f>1600)high+=energy;}assert.ok(low>0&&high>0);assert.ok(high/(low+high)>.55,'snare-wire high end stays prominent');let tail=0;for(let i=Math.floor(n*.8);i<n;i++)tail+=data[i]**2;assert.ok(tail/(n*.2)<.0005,'no long reverb tail');
});
test('menu and result cues are distinct complete stereo loops with safe peaks',async()=>{
  const fingerprints=[];
  for(const name of ['menu-theme.wav','result-theme.wav']){const b=await readFile(path(name));assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.readUInt16LE(22),2);assert.equal(b.readUInt32LE(24),44100);const n=b.readUInt32LE(40)/4;assert.ok(n/44100>=13&&n/44100<=16);let peak=0,power=0;for(let i=0;i<n;i++){const x=b.readInt16LE(44+i*4)/32767;peak=Math.max(peak,Math.abs(x));power+=x*x;}assert.ok(peak<=.79&&peak>.6);assert.ok(power/n>.01);const first=b.readInt16LE(44)/32767,last=b.readInt16LE(44+(n-1)*4)/32767;assert.ok(Math.abs(first-last)<.08,'no large loop seam');fingerprints.push(b.subarray(44,1044).toString('hex'));}
  assert.notEqual(fingerprints[0],fingerprints[1]);
});
