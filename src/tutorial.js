import {RhythmEngine} from './engine.js?v=1b0c683651cd';
import {cleanChart,LANES} from './chart.js?v=1b0c683651cd';
import {keyMode} from './songs.js?v=1b0c683651cd';
export const LESSONS=Object.freeze([
  {title:'点击',hint:'碰到白线时，按音符上的字母键',keys:4,sequence:[[0,0],[2,1],[4,2],[6,3]]},
  {title:'长按',hint:'按住蓝色长条，直到尾巴走完',keys:4,sequence:[[0,1,'hold',2],[4,2,'hold',2]]},
  {title:'接住',hint:'提前按住，接住黄色音符',keys:4,sequence:[[0,0,'drag'],[2,2,'drag'],[4,3,'drag']]},
  {title:'连锁接住',hint:'按住 F 和 J，接住整串黄色音符',keys:4,sequence:[[0,1,'drag'],[.5,2,'drag'],[1,1,'drag'],[1.5,2,'drag'],[2,1,'drag'],[2.5,2,'drag'],[3,1,'drag'],[3.5,2,'drag']]},
  {title:'多押',hint:'青色粗描边：这些键要一起按',keys:4,sequence:[[0,0],[0,3],[3,1],[3,2],[6,0],[6,2]]},
  {title:'上下颠簸',hint:'白线只会上下移动；音符对应的键不变',keys:4,sequence:[[0,0],[2,1],[4,2],[6,3]]},
  {title:'合奏',hint:'D F / J K：连续打击，再一起接住多押',keys:4,sequence:[[0,0],[0,3],[2,1],[2,2],[4,0,'hold',1],[4,3,'hold',1],[6,1,'drag'],[6,2,'drag']]},
]);
export class TutorialSession{
  constructor(beat){this.beat=beat;this.step=0;this.done=false;this.retries=0;this.switchAt=null;this.make(0);}
  get lesson(){return LESSONS[this.step];}
  make(time){this.startTime=Math.ceil((time+2*this.beat)/this.beat)*this.beat;this.engine=new RhythmEngine(cleanChart(this.lesson.sequence.map(([d,lane,type='tap',length=0])=>({time:this.startTime+d*this.beat,end:this.startTime+(d+length)*this.beat,lane,type}))),{lanes:LANES});this.switchAt=null;}
  mode(){return keyMode();}
  update(time){this.engine.update(time);const events=this.engine.drain();let changed=false;
    if(this.engine.finished&&this.switchAt===null){this.passed=this.engine.miss===0;this.switchAt=time+.85;}
    if(this.switchAt!==null&&time>=this.switchAt){if(this.passed){if(this.step===LESSONS.length-1){this.done=true;return{events,changed,done:true};}this.step++;}else this.retries++;this.make(time);changed=true;}
    return{events,changed,done:false};
  }
  geometry(time){if(this.step!==5)return{training:true};const p=Math.max(0,Math.min(1,(time-this.startTime)/(6*this.beat)));return{pose:{y:.68-Math.sin(p*Math.PI*2)*.06}};}
}
