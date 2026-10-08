import {drawNote} from './note-art.js?v=1b0c683651cd';
// All ornaments are background outlines: no hit time, lane, collision or engine entry.
export function drawDecorations(c,g,time,song,{reduced=false,energy=0,combo=0,scene={energy:.3}}={}){
  const beat=time/song.beat,phase=0,cycle=reduced?0:(Math.cos(beat*Math.PI*.25)+1)/2,power=scene.energy;
  c.save();c.globalCompositeOperation='lighter';c.lineWidth=1;c.setLineDash([24,18]);
  for(let lane=0;lane<g.slots;lane++){
    const p=g.point(lane);c.strokeStyle=lane%2?'#df67ff':'#45dcff';c.shadowColor=c.strokeStyle;c.shadowBlur=reduced?0:18;c.globalAlpha=.035+power*.10+energy*.15;
    c.beginPath();c.moveTo(p.x,38);c.lineTo(p.x,p.y-28);c.stroke();
  }
  c.setLineDash([]);c.restore();
  c.save();c.translate(g.cx,g.cy);c.rotate(g.angle*.15+phase);c.globalCompositeOperation='lighter';c.globalAlpha=.06+power*.20+Math.min(.04,combo/1000)+energy*.20;c.strokeStyle=song.accent;c.shadowColor=song.accent;c.shadowBlur=reduced?0:20;c.lineWidth=1;
  const radius=Math.min(g.length*.38,160);
  if(song.theme==='prism'){
    for(let k=0;k<3;k++){c.save();c.rotate(k*Math.PI/3+phase);c.beginPath();c.moveTo(0,-radius);c.lineTo(radius*.86,radius*.5);c.lineTo(-radius*.86,radius*.5);c.closePath();c.stroke();c.restore();}
  }else if(song.theme==='rail'){
    for(let k=-2;k<=2;k++){c.beginPath();c.moveTo(-radius*1.5,k*26);c.lineTo(radius*1.5,k*26);c.stroke();}
    c.strokeRect(-radius,-radius*.55,radius*2,radius*1.1);
  }else if(song.theme==='pulse'){
    const size=radius*(reduced?1:1+cycle*power*.12);
    for(let k=0;k<3;k++){
      const r=size*(.65+k*.25);c.beginPath();c.moveTo(-r,0);c.lineTo(-r*.3,-r*.65);c.lineTo(r*.3,-r*.65);c.lineTo(r,0);c.lineTo(r*.3,r*.65);c.lineTo(-r*.3,r*.65);c.closePath();c.stroke();
    }
  }else if(song.theme==='portal'){
    for(let k=0;k<3;k++){c.save();c.rotate(phase+k*.2);const r=radius*(.7+k*.3);c.strokeRect(-r,-r*.65,r*2,r*1.3);c.restore();}
  }else{
    for(let k=0;k<2;k++){c.beginPath();c.ellipse(0,0,radius*(1+k*.35),radius*(.68+k*.16),0,.20,Math.PI*1.85);c.stroke();}
  }
  for(let k=0;k<10;k++){const a=k*Math.PI/5+phase,r=radius*(1.10+Math.sin(k*2)*.20);c.save();c.translate(Math.cos(a)*r,Math.sin(a)*r*.8);c.rotate(a);drawNote(c,{type:['tap','hold','drag'][k%3],width:18,height:5,decoration:true});c.restore();}
  c.restore();
  // Offset echo lines decorate the composition; never use the bright judge-line stroke.
  c.save();c.translate(g.cx,g.cy);c.rotate(g.angle);c.strokeStyle=song.accent;c.lineWidth=1;c.globalAlpha=.08+cycle*.025;c.setLineDash([8,16]);
  for(const offset of [-65,-120]){c.beginPath();c.moveTo(-g.length*.42,offset);c.lineTo(g.length*.42,offset);c.stroke();}c.setLineDash([]);c.restore();
}
