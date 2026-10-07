export function hitTimeline(notes){return notes.flatMap(n=>n.type==='hold'?[{time:n.time,type:n.type,tail:false,strength:.9/Math.sqrt(n.chord||1)},{time:n.end,type:n.type,tail:true,strength:.6/Math.sqrt(n.chord||1)}]:[{time:n.time,type:n.type,tail:false,strength:1/Math.sqrt(n.chord||1)}]).sort((a,b)=>a.time-b.time);}
const ASSET_VERSION='0.5.0';
export const assetUrl=path=>path+(path.includes('?')?'&':'?')+'v='+ASSET_VERSION;
export class RhythmAudio {
  constructor(){this.context=null;this.raw={};this.buffers={};this.decoding=new Map();this.scheduledHits=new Set();this.source=null;this.anchor=0;this.position=0;this.running=false;this.musicVolume=.65;this.hitVolume=.8;this.sceneVersion=0;this.sceneName=null;this.sceneSource=null;this.sceneGain=null;this.sceneLoadPromise=null;}
  async preloadScenes(){
    if(this.raw['scene-home']&&this.raw['scene-result'])return true;
    if(!this.sceneLoadPromise)this.sceneLoadPromise=Promise.all(['home','result'].map(async name=>{const r=await fetch(assetUrl('assets/'+(name==='home'?'menu-theme':'result-theme')+'.wav'));if(!r.ok)throw new Error('界面音乐加载失败');this.raw['scene-'+name]=await r.arrayBuffer();})).then(()=>true).catch(e=>{this.sceneLoadPromise=null;throw e;});
    return this.sceneLoadPromise;
  }
  async decode(key){
    const raw=this.raw[key];if(!raw||this.buffers[key])return;
    const existing=this.decoding.get(key);if(existing?.raw===raw)return existing.promise;
    const pending={raw,promise:null};pending.promise=this.context.decodeAudioData(raw.slice(0)).then(buffer=>{if(this.raw[key]===raw)this.buffers[key]=buffer;}).finally(()=>{if(this.decoding.get(key)===pending)this.decoding.delete(key);});this.decoding.set(key,pending);return pending.promise;
  }
  async preload(progress=()=>{},file='assets/blue-hour.wav') {
    this.loadController?.abort();const controller=new AbortController();this.loadController=controller;
    if(this.file===file&&this.raw.music){progress(1);return true;}
    const jobs=[['music',file]];if(!this.raw.hit)jobs.push(['hit','assets/snap.wav']);for(const type of ['hold','drag'])if(!this.raw['hit-'+type])jobs.push(['hit-'+type,'assets/hit-'+type+'.wav']);let n=0;
    const fresh={};
    try{await Promise.all(jobs.map(async([key,path])=>{const r=await fetch(assetUrl(path),{signal:controller.signal});if(!r.ok)throw new Error('音频加载失败');fresh[key]=await r.arrayBuffer();if(!controller.signal.aborted)progress(++n/jobs.length);}));
      if(controller.signal.aborted)return false;
      const hits=Object.fromEntries(Object.entries(this.raw).filter(([key])=>key!=='music'));this.raw={...hits,...fresh};delete this.buffers.music;this.file=file;return true;
    }catch(e){if(e.name==='AbortError')return false;throw e;}
  }
  async ready({music=true}={}) {
    if(!this.context) {
      const Context=window.AudioContext||window.webkitAudioContext;
      if(!Context)throw new Error('这个浏览器不支持音频播放');
      this.context=new Context({latencyHint:'interactive'});
      this.master=this.context.createGain();this.master.gain.value=.85;
      this.limiter=this.context.createDynamicsCompressor();this.limiter.threshold.value=-3;this.limiter.knee.value=2;this.limiter.ratio.value=16;this.limiter.attack.value=.001;this.limiter.release.value=.06;this.master.connect(this.limiter);this.limiter.connect(this.context.destination);
      this.music=this.context.createGain();this.music.connect(this.master);
      this.hits=this.context.createGain();this.hits.connect(this.master);this.setVolumes(this.musicVolume,this.hitVolume);
    }
    await this.context.resume();
    // Real user gesture creates/resumes audio; fetching the files itself is silent.
    await Promise.all(Object.keys(this.raw).filter(key=>music||key.startsWith('scene-')).map(key=>this.decode(key)));
  }
  setVolumes(music,hit){this.musicVolume=music;this.hitVolume=hit;if(this.context){this.music.gain.setTargetAtTime(music,this.context.currentTime,.01);this.hits.gain.setTargetAtTime(hit,this.context.currentTime,.005);if(this.sceneGain)this.sceneGain.gain.setTargetAtTime(music*(this.sceneName==='result'?.55:.42),this.context.currentTime,.05);}}
  stopScene(fade=.16){
    this.sceneVersion++;this.sceneName=null;const source=this.sceneSource,gain=this.sceneGain;this.sceneSource=null;this.sceneGain=null;
    if(!source)return;
    const now=this.context.currentTime;gain.gain.cancelScheduledValues(now);gain.gain.setValueAtTime(gain.gain.value,now);gain.gain.linearRampToValueAtTime(0,now+fade);source.onended=()=>{source.disconnect();gain.disconnect();};try{source.stop(now+fade+.02);}catch{}
  }
  async scene(name){
    if(this.sceneName===name&&this.sceneSource)return true;
    this.stopScene();const version=this.sceneVersion;this.sceneName=name;
    await this.preloadScenes();if(!this.context||this.context.state!=='running'||version!==this.sceneVersion)return false;
    await this.decode('scene-'+name);if(version!==this.sceneVersion||!this.buffers['scene-'+name])return false;
    const c=this.context,source=c.createBufferSource(),gain=c.createGain(),now=c.currentTime;source.buffer=this.buffers['scene-'+name];source.loop=true;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(this.musicVolume*(name==='result'?.55:.42),now+.30);source.connect(gain);gain.connect(this.master);source.start(now);this.sceneSource=source;this.sceneGain=gain;return true;
  }
  audibleContextTime() {
    const c=this.context;if(!c)return 0;
    if(c.getOutputTimestamp) {
      const stamp=c.getOutputTimestamp();
      if(stamp.contextTime>0&&performance.now()-stamp.performanceTime<250)return stamp.contextTime+(performance.now()-stamp.performanceTime)/1000;
    }
    return c.currentTime-(c.outputLatency||c.baseLatency||0);
  }
  clock(){return this.running?Math.max(this.position,this.audibleContextTime()-this.anchor):this.position;}
  play(position=0,lead=.15,{loop=false}={}) {
    this.stopScene(.10);this.stop();this.position=position;const c=this.context;
    const source=c.createBufferSource();source.buffer=this.buffers.music;source.loop=loop;source.connect(this.music);
    const start=c.currentTime+lead;this.anchor=start-position;source.start(start,Math.max(0,loop?position%source.buffer.duration:position));this.source=source;this.running=true;
  }
  pause(){const t=this.clock();this.stop();this.position=Math.max(0,t);return this.position;}
  stop(){if(this.source){try{this.source.stop();}catch{}this.source.disconnect();this.source=null;}for(const s of this.scheduledHits){try{s.stop();}catch{}}this.scheduledHits.clear();this.running=false;}
  snap(strength=1,type='tap',tail=false,when=null){if(!this.context||!this.buffers.hit||this.context.state!=='running')return;const c=this.context,s=c.createBufferSource(),g=c.createGain();s.buffer=this.buffers['hit-'+type]||this.buffers.hit;s.playbackRate.value=tail?1.3:1;g.gain.value=strength;s.connect(g);g.connect(this.hits);this.scheduledHits.add(s);s.onended=()=>{this.scheduledHits.delete(s);s.disconnect();g.disconnect();};s.start(when===null?c.currentTime:Math.max(c.currentTime,when));return s;}
}
