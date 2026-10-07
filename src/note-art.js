export const NOTE_COLORS={tap:'#a4d8ff',hold:'#f3d59c',drag:'#91e7d9'};
export const noteHeightFor=width=>width<600?3:4;
function path(c,type,w,h){
  c.beginPath();
  if(type==='tap'){const d=Math.min(8,w*.13);c.moveTo(-w/2+d,-h/2);c.lineTo(w/2-d,-h/2);c.lineTo(w/2,0);c.lineTo(w/2-d,h/2);c.lineTo(-w/2+d,h/2);c.lineTo(-w/2,0);}
  if(type==='hold'){const d=Math.min(5,w*.1,h*.4);c.moveTo(-w/2,-h/2);c.lineTo(w/2-d,-h/2);c.lineTo(w/2,h/2-d);c.lineTo(w/2,h/2);c.lineTo(-w/2+d,h/2);c.lineTo(-w/2,-h/2+d);}
  if(type==='drag'){c.moveTo(0,-h*.7);c.lineTo(w*.38,-h/2);c.lineTo(w/2,0);c.lineTo(w*.38,h/2);c.lineTo(0,h*.7);c.lineTo(-w*.38,h/2);c.lineTo(-w/2,0);c.lineTo(-w*.38,-h/2);}
  c.closePath();
}
export function drawNote(c,{type='tap',width=60,height=4,chord=1,label='',labelRotation=0,decoration=false,holding=false,pulse=0}){
  const color=NOTE_COLORS[type]||NOTE_COLORS.tap;c.save();
  if(decoration){path(c,type,width,height);c.strokeStyle=color;c.lineWidth=1;c.stroke();c.restore();return;}
  if(chord>1){c.save();path(c,type,width+8,height+4);c.strokeStyle='#7ffff0';c.lineWidth=3.0;c.lineJoin='round';c.shadowColor='#5fffe6';c.shadowBlur=15;c.stroke();c.restore();}
  path(c,type,width,height);c.fillStyle=color;c.shadowColor=color+'88';c.shadowBlur=2;c.fill();c.shadowBlur=0;
  c.save();path(c,type,width,height);c.clip();c.fillStyle='#ffffff55';c.fillRect(-width/2,-height*.6,width,height*.27);c.strokeStyle='#10263d55';c.lineWidth=1.5;c.beginPath();
  if(type==='tap'){c.moveTo(-width*.38,0);c.lineTo(-width*.25,0);c.moveTo(width*.25,0);c.lineTo(width*.38,0);}
  if(type==='hold'){c.moveTo(-width*.35,-height*.1);c.lineTo(-width*.24,height*.22);c.moveTo(width*.24,-height*.22);c.lineTo(width*.35,height*.1);}
  if(type==='drag'){c.moveTo(-width*.35,0);c.lineTo(-width*.22,-height*.20);c.moveTo(width*.22,height*.20);c.lineTo(width*.35,0);}
  c.stroke();c.restore();
  if(label){c.save();c.rotate(labelRotation);c.fillStyle='#dceeff';c.textAlign='center';c.textBaseline='middle';c.font='600 9px system-ui';c.fillText(label,0,-height/2-8);c.restore();}
  if(holding){c.strokeStyle=`rgba(255,247,217,${.5+pulse*.4})`;c.lineWidth=2;path(c,type,width,height);c.stroke();}
  c.restore();
}
