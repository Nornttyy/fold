export const NOTE_COLORS={tap:'#a4eaff',hold:'#63c5ff',drag:'#ffe277'};
export const noteHeightFor=width=>width<600?7:9;
// Readable heads fill most of a phone lane; desktop heads no longer cap at 75 px.
export const noteWidthFor=(width,slots=4)=>Math.min(154,width*.92/slots*.72);
export const holdBodyWidth=noteWidth=>Math.max(13,noteWidth*.38);
export function drawHoldBody(c,head,tail,noteWidth,viewportHeight,{holding=false}={}){
  const width=holdBodyWidth(noteWidth),half=width/2,top=Math.max(0,tail.y),bottom=Math.min(viewportHeight,head.y);
  if(bottom<=top)return;
  c.save();
  const fill=c.createLinearGradient(head.x-half,0,head.x+half,0);
  fill.addColorStop(0,holding?'#3c9fe8cc':'#278addaa');fill.addColorStop(.5,holding?'#9ce6ffdd':'#59bcffe0');fill.addColorStop(1,holding?'#3c9fe8cc':'#278addaa');
  c.fillStyle=fill;c.fillRect(head.x-half,top,width,bottom-top);
  c.strokeStyle=holding?'#cbf5ff':'#90d9ff';c.lineWidth=1.5;c.shadowColor='#3baeff';c.shadowBlur=holding?12:4;
  c.beginPath();c.moveTo(head.x-half,top);c.lineTo(head.x-half,bottom);c.moveTo(head.x+half,top);c.lineTo(head.x+half,bottom);c.stroke();
  c.shadowBlur=0;c.fillStyle=holding?'#e8fbff':'#b4eaff';c.fillRect(head.x-1,top,2,bottom-top);
  // Sparse crossbars make the hold body recognizable even under a bright hit effect.
  c.globalAlpha=.35;
  for(let y=bottom-18;y>top;y-=26)c.fillRect(head.x-half+3,y,width-6,1);
  c.restore();
}
function path(c,type,w,h){
  c.beginPath();
  if(type==='tap'){const d=Math.min(8,w*.13);c.moveTo(-w/2+d,-h/2);c.lineTo(w/2-d,-h/2);c.lineTo(w/2,0);c.lineTo(w/2-d,h/2);c.lineTo(-w/2+d,h/2);c.lineTo(-w/2,0);}
  if(type==='hold'){const d=Math.min(5,w*.1,h*.4);c.moveTo(-w/2,-h/2);c.lineTo(w/2-d,-h/2);c.lineTo(w/2,h/2-d);c.lineTo(w/2,h/2);c.lineTo(-w/2+d,h/2);c.lineTo(-w/2,-h/2+d);}
  if(type==='drag'){c.moveTo(0,-h*.7);c.lineTo(w*.38,-h/2);c.lineTo(w/2,0);c.lineTo(w*.38,h/2);c.lineTo(0,h*.7);c.lineTo(-w*.38,h/2);c.lineTo(-w/2,0);c.lineTo(-w*.38,-h/2);}
  c.closePath();
}
export function drawNote(c,{type='tap',width=60,height=9,chord=1,label='',labelRotation=0,decoration=false,holding=false,pulse=0}){
  const color=NOTE_COLORS[type]||NOTE_COLORS.tap;c.save();
  if(decoration){path(c,type,width,height);c.strokeStyle=color;c.lineWidth=1;c.stroke();c.restore();return;}
  if(chord>1){c.save();path(c,type,width+8,height+4);c.strokeStyle='#7ffff0';c.lineWidth=3.0;c.lineJoin='round';c.shadowColor='#5fffe6';c.shadowBlur=15;c.stroke();c.restore();}
  path(c,type,width,height);c.fillStyle=color;c.shadowColor=color+'bb';c.shadowBlur=5;c.fill();c.shadowBlur=0;
  c.save();path(c,type,width,height);c.clip();c.fillStyle='#ffffff55';c.fillRect(-width/2,-height*.6,width,height*.27);c.strokeStyle='#10263d55';c.lineWidth=1.5;c.beginPath();
  if(type==='tap'){c.moveTo(-width*.38,0);c.lineTo(-width*.25,0);c.moveTo(width*.25,0);c.lineTo(width*.38,0);}
  if(type==='hold'){c.moveTo(-width*.35,-height*.1);c.lineTo(-width*.24,height*.22);c.moveTo(width*.24,-height*.22);c.lineTo(width*.35,height*.1);}
  if(type==='drag'){c.moveTo(-width*.35,0);c.lineTo(-width*.22,-height*.20);c.moveTo(width*.22,height*.20);c.lineTo(width*.35,0);}
  c.stroke();c.restore();
  if(label){c.save();c.rotate(labelRotation);c.fillStyle='#dceeff';c.textAlign='center';c.textBaseline='middle';c.font='600 9px system-ui';c.fillText(label,0,-height/2-8);c.restore();}
  if(holding){c.strokeStyle=`rgba(207,245,255,${.5+pulse*.4})`;c.lineWidth=2;path(c,type,width,height);c.stroke();}
  c.restore();
}
