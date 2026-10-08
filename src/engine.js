import {WINDOWS} from './chart.js';
import {timingSummary} from './timing.js';

export class RhythmEngine {
  constructor(chart,{demo=false,lanes=4}={}) {
    this.notes=chart.map(n=>({...n,state:'pending',quality:null,owner:null,lostAt:null}));
    this.demo=demo;this.lanes=lanes;this.time=-1;this.combo=0;this.maxCombo=0;this.perfect=0;this.good=0;this.miss=0;
    this.events=[];this.errors=[];this.inputs=new Map();
  }
  get finished(){return this.perfect+this.good+this.miss===this.notes.length;}
  get score(){return Math.round(1e6*(this.perfect+this.good*.65)/Math.max(1,this.notes.length));}
  get accuracy(){const n=this.perfect+this.good+this.miss;return n?(this.perfect+this.good*.65)/n*100:100;}
  get rank(){return this.miss===0&&this.good===0?'AP':this.miss===0?'FC':this.score>=950000?'S':this.score>=850000?'A':this.score>=700000?'B':'C';}
  finish(note,quality,time,error=null) {
    if(['perfect','good','miss'].includes(note.state))return;
    note.state=quality;this[quality]++;
    this.combo=quality==='miss'?0:this.combo+1;this.maxCombo=Math.max(this.maxCombo,this.combo);
    if(error!==null&&quality!=='miss'&&note.type!=='drag'&&!this.demo)this.errors.push(error*1000);
    this.events.push({kind:'judge',quality,lane:note.lane,time,type:note.type,chord:note.chord||1,combo:this.combo,error:note.type==='drag'||quality==='miss'?null:error});
  }
  candidate(lane,time,types) {
    return this.notes.filter(n=>n.lane===lane&&n.state==='pending'&&types.includes(n.type)&&Math.abs(time-n.time)<=WINDOWS.good)
      .sort((a,b)=>Math.abs(a.time-time)-Math.abs(b.time-time))[0];
  }
  head(note,time,owner) {
    const error=time-note.time,quality=Math.abs(error)<=WINDOWS.perfect?'perfect':'good';
    if(note.type==='hold') {
      note.state='holding';note.quality=quality;note.owner=owner;note.error=error;
      this.events.push({kind:'head',quality,lane:note.lane,time,type:'hold',chord:note.chord||1,combo:this.combo,error});
    }else this.finish(note,quality,time,error);
  }
  press(lane,id,time,{keyboard=false}={}) {
    if(this.demo||!Number.isInteger(lane)||lane<0||lane>=this.lanes)return;
    // An input owns one immutable lane until release. Repeated keydown is ignored.
    if(this.inputs.has(id))return;
    this.inputs.set(id,{lane,keyboard});
    // Find the closest note of every type first: pressing a drag must not
    // accidentally consume a neighbouring tap in a dense AT phrase.
    const n=this.candidate(lane,time,['tap','hold','drag']);
    if(n&&(n.type!=='drag'||time>=n.time))this.head(n,time,id);
    this.drag(lane,id,time);
  }
  drag(lane,id,time) {
    const n=this.candidate(lane,time,['drag']);
    // Drag resolves at/after its exact beat, not at the early edge of the window.
    if(n&&time>=n.time)this.head(n,time,id);
  }
  release(id,time) {
    this.inputs.delete(id);
    for(const n of this.notes)if(n.state==='holding'&&n.owner===id) {
      if(time>=n.end-WINDOWS.release)this.finish(n,n.quality,time,n.error);
      else n.lostAt=time;
    }
  }
  cancelInputs(){this.inputs.clear();for(const n of this.notes)if(n.state==='holding')n.lostAt=this.time;}
  update(time) {
    this.time=time;
    if(this.demo) {
      for(const n of this.notes)if(n.state==='pending'&&time>=n.time)this.head(n,n.time,'demo');
      for(const n of this.notes)if(n.state==='holding'&&time>=n.end)this.finish(n,n.quality,n.end,0);
      return;
    }
    for(const [id,p]of this.inputs)this.drag(p.lane,id,time);
    for(const n of this.notes) {
      if(n.state==='pending'&&time>n.time+WINDOWS.miss)this.finish(n,'miss',time);
      if(n.state!=='holding')continue;
      if(!this.inputs.has(n.owner)) {
        // A brief touch loss may be recovered using another finger on the same fixed key.
        const recovery=[...this.inputs].find(([,p])=>p.lane===n.lane);
        if(recovery&&n.lostAt!==null&&time-n.lostAt<=WINDOWS.holdGrace){n.owner=recovery[0];n.lostAt=null;}
        else if(n.lostAt===null)n.lostAt=time;
      }
      if(n.lostAt!==null&&time-n.lostAt>WINDOWS.holdGrace)this.finish(n,'miss',time);
      else if(time>=n.end)this.finish(n,n.quality,time,n.error);
    }
  }
  drain(){return this.events.splice(0);}
  result(){const timingStats=timingSummary(this.errors);return {score:this.score,accuracy:this.accuracy,rank:this.rank,perfect:this.perfect,good:this.good,miss:this.miss,maxCombo:this.maxCombo,total:this.notes.length,timing:timingStats.mean,timingStats};}
}
