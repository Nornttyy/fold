import {lineGeometry,LANES} from './chart.js?v=1b0c683651cd';
import {getSong,keyLabels} from './songs.js?v=1b0c683651cd';
import {drawNote,drawHoldBody,noteHeightFor,noteWidthFor} from './note-art.js?v=1b0c683651cd';
import {drawDecorations} from './decorations.js?v=1b0c683651cd';
import {MAX_HIT_EFFECTS,makeHitEffect,hitEnvelope,drawHitEffect,drawHitLighting} from './hit-effects.js?v=1b0c683651cd';
import {scrollPosition} from './scroll.js?v=1b0c683651cd';
import {drawLineGuides} from './line-guide.js?v=1b0c683651cd';
import {buildDragLinks,drawDragLinks} from './drag-trails.js?v=1b0c683651cd';
import {musicalStage} from './musical-stage.js?v=1b0c683651cd';

export class StageRenderer{
  constructor(canvas){
    this.canvas=canvas;this.c=canvas.getContext('2d',{alpha:false});
    this.reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
    this.reset();this.resize();
  }
  reset(){this.effects=[];this.flash=Array(LANES).fill(-100);this.judges=[];this.lastHit=-100;this.milestone=null;this.scrollEngine=null;this.scrollTimes=null;this.dragLinks=[];}
  resize(){const r=this.canvas.getBoundingClientRect();this.width=r.width;this.height=r.height;const d=Math.min(2.5,globalThis.devicePixelRatio||1);this.canvas.width=Math.round(r.width*d);this.canvas.height=Math.round(r.height*d);this.c.setTransform(d,0,0,d,0,0);}
  event(e){
    const effect=makeHitEffect(e,{reduced:this.reduced});
    this.effects.push(effect);if(this.effects.length>MAX_HIT_EFFECTS)this.effects.shift();
    this.judges.push({...e,color:effect.color});if(this.judges.length>32)this.judges.shift();
    if(e.quality!=='miss'){
      this.flash[e.lane]=e.time;this.lastHit=e.time;
      if(e.kind==='judge'&&e.combo>0&&e.combo%25===0)this.milestone={time:e.time,combo:e.combo};
    }
  }
  sustain(c,n,g,time,width){
    const p=g.point(n.lane);c.save();c.globalCompositeOperation='lighter';c.strokeStyle='#9fe2ff';c.shadowColor='#59bfff';c.shadowBlur=14;c.lineWidth=1.3;
    const power=this.reduced?.55:.65+Math.sin(time*10)*.15;c.globalAlpha=power;
    c.beginPath();c.ellipse(p.x,p.y,25,8,0,0,Math.PI*2);c.stroke();
    if(!this.reduced)for(let i=0;i<5;i++){
      const distance=((time*90+i*19)%95),side=i%2?-1:1,x=p.x+side*width*.12;
      c.fillStyle='#caf2ff';c.globalAlpha=(1-distance/95)*.8;c.fillRect(x,p.y-distance,2,5);
    }
    c.restore();
  }
  draw(engine,time,speed=1,{songId='blue-hour',difficulty='light',tutorial=null}={}){
    const c=this.c,w=this.width,h=this.height;if(!w||!h)return;
    const song=getSong(songId),beat=time/song.beat,g=lineGeometry(time,w,h,{songId,difficulty,slots:LANES,...(tutorial?.geometry(time)||{})});
    const pulse=this.reduced?.5:(Math.cos(beat*Math.PI*2)+1)/2;
    this.effects=this.effects.filter(e=>time-e.time<e.life&&time>=e.time);
    const energy=Math.min(1,this.effects.reduce((sum,e)=>sum+hitEnvelope(e,time)*.24,0));
    c.fillStyle='#080f1d';c.fillRect(0,0,w,h);
    const bg=c.createRadialGradient(w*.5,h*.56,10,w*.5,h*.56,Math.max(w,h)*.68);bg.addColorStop(0,song.background+'aa');bg.addColorStop(1,'#080f1d00');c.fillStyle=bg;c.fillRect(0,0,w,h);
    const scene=musicalStage(time,songId),held=new Set([...engine.inputs.values()].map(p=>p.lane));
    if(!tutorial)drawDecorations(c,g,time,song,{reduced:this.reduced,energy,combo:engine.combo,scene});
    for(let lane=0;lane<LANES;lane++){
      if(!held.has(lane))continue;
      const beam=c.createLinearGradient(0,h,0,h*.50);beam.addColorStop(0,'#8dceff30');beam.addColorStop(1,'#8dceff00');c.fillStyle=beam;c.fillRect(lane*w/LANES,h*.50,w/LANES,h*.50);
    }
    drawHitLighting(c,this.effects,g,time,w,h,{reduced:this.reduced});
    c.save();c.translate(g.cx,g.cy);c.globalCompositeOperation='lighter';
    c.strokeStyle=engine.combo>=50?'#43ffcf':'#46dfff';c.shadowColor=c.strokeStyle;c.shadowBlur=24+energy*27;
    c.lineWidth=1.2+energy*1.3;c.beginPath();c.moveTo(-g.length/2,0);c.lineTo(g.length/2,0);c.stroke();
    c.strokeStyle='#edfaff';c.shadowBlur=0;c.lineWidth=1;c.stroke();
    c.strokeStyle=song.accent;c.lineWidth=1;c.beginPath();c.moveTo(-g.length/2,-5);c.lineTo(-g.length/2-5,0);c.lineTo(-g.length/2,5);c.moveTo(g.length/2,-5);c.lineTo(g.length/2+5,0);c.lineTo(g.length/2,5);c.stroke();c.restore();
    drawLineGuides(c,engine.notes,g,time,song.beat,{reduced:this.reduced});
    const labels=keyLabels(LANES),noteWidth=noteWidthFor(w,LANES),noteHeight=noteHeightFor(w),approach=Math.min(h*.46,440)*speed;
    if(this.scrollEngine!==engine||this.scrollSong!==songId||this.scrollDifficulty!==difficulty||this.scrollTutorial!==!!tutorial){
      this.scrollEngine=engine;this.scrollSong=songId;this.scrollDifficulty=difficulty;this.scrollTutorial=!!tutorial;
      this.scrollTimes=new Map(engine.notes.map(n=>[n,{head:scrollPosition(n.time,songId,difficulty),tail:scrollPosition(n.end,songId,difficulty)}]));
      this.dragLinks=buildDragLinks(engine.notes,song.beat);
    }
    const scrollNow=tutorial?time:scrollPosition(time,songId,difficulty);
    drawDragLinks(c,this.dragLinks,g,time,n=>approach*((tutorial?n.time:this.scrollTimes.get(n).head)-scrollNow),h,{reduced:this.reduced,held});
    for(let lane=0;lane<LANES;lane++){const p=g.point(lane);c.fillStyle='#c9ebff44';c.font='9px system-ui';c.textAlign='center';c.fillText(labels[lane],p.x,p.y-15);}
    for(const n of engine.notes){
      if(!['pending','holding'].includes(n.state))continue;
      const position=tutorial?{head:n.time,tail:n.end}:this.scrollTimes.get(n);
      const distance=n.state==='holding'?0:approach*(position.head-scrollNow),p=g.point(n.lane,distance);
      if(n.type==='hold'){
        const tail=g.point(n.lane,approach*(position.tail-scrollNow));
        if(Math.max(p.y,tail.y)<-80||Math.min(p.y,tail.y)>h+80)continue;
        drawHoldBody(c,p,tail,noteWidth,h,{holding:n.state==='holding'});
        c.save();c.translate(tail.x,tail.y);drawNote(c,{type:'hold',width:noteWidth*.80,height:Math.max(5,noteHeight*.65)});c.restore();
        if(n.state==='holding')this.sustain(c,n,g,time,noteWidth);
      }
      if(p.y<-55||p.y>h+55)continue;
      c.save();c.translate(p.x,p.y);drawNote(c,{type:n.type,width:noteWidth,height:noteHeight,chord:n.chord||1,label:labels[n.lane],holding:n.state==='holding',pulse});c.restore();
    }
    for(const e of this.effects)drawHitEffect(c,e,g,time,{reduced:this.reduced});
    if(this.milestone&&!this.reduced){
      const age=time-this.milestone.time;
      if(age>=0&&age<.7){
        const k=age/.7;c.save();c.globalCompositeOperation='lighter';c.globalAlpha=(1-k)**2*.8;c.strokeStyle='#7ffff0';c.shadowColor='#7ffff0';c.shadowBlur=30;c.lineWidth=2;
        c.beginPath();c.ellipse(w*.5,h*.24,35+k*w*.42,12+k*h*.19,0,0,Math.PI*2);c.stroke();c.restore();
      }
    }
    this.judges=this.judges.filter(e=>time-e.time<.42&&time>=e.time);
    const latestJudges=new Map();
    for(const e of this.judges)if(!latestJudges.has(e.lane)||e.time>=latestJudges.get(e.lane).time)latestJudges.set(e.lane,e);
    for(const e of latestJudges.values()){
      const age=time-e.time,p=g.point(e.lane);c.save();c.globalAlpha=Math.min(1,(.42-age)*5);c.fillStyle=e.color;c.shadowColor=e.color;c.shadowBlur=e.quality==='miss'?0:8;
      c.font=`600 ${w<600?8:11}px system-ui`;c.textAlign='center';c.fillText(e.quality.toUpperCase(),p.x,p.y-32-age*17);
      if(e.quality==='good'&&Number.isFinite(e.error)){c.font=`500 ${w<600?6:8}px system-ui`;c.globalAlpha*=.8;c.fillText(e.error<0?'EARLY':'LATE',p.x,p.y-19-age*17);}
      c.restore();
    }
  }
}
