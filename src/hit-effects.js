export const MAX_HIT_EFFECTS=48;
export const HIT_COLORS={tap:'#51e5ff',hold:'#59bfff',drag:'#ffe16e'};
const lifetimes={tap:.44,hold:.65,drag:.40};
const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
export function makeHitEffect(event,{reduced=false}={}){
  const miss=event.quality==='miss',seed=event.time*71+event.lane*19;
  const count=miss||reduced?0:(event.type==='hold'?18:16)+Math.min(4,event.chord||1)*3;
  return{...event,color:miss?'#eb7192':event.quality==='good'?'#ffb45e':HIT_COLORS[event.type],
    life:reduced?.15:miss?.32:lifetimes[event.type]||.44,
    strength:miss?0:event.quality==='good'?.65:1,
    sparks:Array.from({length:count},(_,i)=>{
      const angle=hash(seed+i)*Math.PI*2;
      const velocity=120+hash(seed+i+31)*235;
      return{vx:Math.cos(angle)*velocity,vy:Math.sin(angle)*velocity,size:.8+hash(seed+i+63)*1.5};
    }),
  };
}
export function hitEnvelope(effect,time){const age=time-effect.time;if(age<0||age>=effect.life)return 0;return (1-age/effect.life)**2*effect.strength;}
export function drawHitEffect(c,e,g,time,{reduced=false}={}){
  const age=time-e.time;if(age<0||age>=e.life)return;
  const k=age/e.life,fade=(1-k)**2,p=g.point(e.lane),size=Math.min(1.15,g.length/650);
  c.save();c.translate(p.x,p.y);c.globalAlpha=fade;
  if(e.quality==='miss'){
    c.strokeStyle=e.color;c.lineWidth=1.6;c.beginPath();c.moveTo(-8,-7);c.lineTo(8,7);c.moveTo(8,-7);c.lineTo(-8,7);c.stroke();c.restore();return;
  }
  c.globalCompositeOperation='lighter';c.strokeStyle=e.color;c.fillStyle=e.color;c.lineWidth=2;c.shadowColor=e.color;c.shadowBlur=reduced?0:26;
  if(reduced){c.fillRect(-25,-1,50,2);c.restore();return;}
  const r=(10+Math.sqrt(k)*76)*size;
  if(e.type==='hold'){
    for(let i=0;i<3;i++){c.beginPath();c.ellipse(0,0,r+i*11,r*.42+i*4,0,0,Math.PI*2);c.stroke();}
    const beam=24+age*95;c.fillRect(-2,-beam,4,beam*2);
    c.beginPath();c.moveTo(-22,-beam*.6);c.lineTo(-22,beam*.6);c.moveTo(22,-beam*.6);c.lineTo(22,beam*.6);c.stroke();
  }else if(e.type==='drag'){
    for(const direction of [-1,1]){
      const x=direction*(18+Math.sqrt(k)*90)*size;
      c.beginPath();c.moveTo(x-direction*25,-12);c.lineTo(x,0);c.lineTo(x-direction*25,12);c.stroke();
      c.beginPath();c.moveTo(direction*8,0);c.lineTo(x-direction*8,0);c.stroke();
    }
  }else{
    c.beginPath();c.ellipse(0,0,r,r*.48,0,0,Math.PI*2);c.stroke();
    c.lineWidth=1;c.strokeStyle='#cf8fff';c.beginPath();c.ellipse(0,0,r*1.20,r*.58,0,0,Math.PI*2);c.stroke();c.strokeStyle=e.color;
    c.beginPath();c.moveTo(-r*1.25,0);c.lineTo(r*1.25,0);c.moveTo(0,-r*.75);c.lineTo(0,r*.75);c.stroke();
  }
  if((e.chord||1)>1){
    c.strokeStyle='#70fff1';c.shadowColor='#70fff1';c.lineWidth=2.3;
    c.beginPath();c.ellipse(0,0,r*1.45,r*.65,0,0,Math.PI*2);c.stroke();
  }
  c.shadowBlur=0;
  if(age<.20){
    c.lineWidth=2;c.strokeStyle=e.color;
    for(let i=0;i<8;i++){const a=i*Math.PI/4,inner=(7+age*140)*size,outer=inner+(1-age/.20)*22*size;c.beginPath();c.moveTo(Math.cos(a)*inner,Math.sin(a)*inner*.60);c.lineTo(Math.cos(a)*outer,Math.sin(a)*outer*.60);c.stroke();}
  }
  for(let i=0;i<e.sparks.length;i++){
    const s=e.sparks[i],d=age*(1-k*.4),x=s.vx*d*size,y=(s.vy*d+35*age*age)*size;
    c.strokeStyle=i%3===0?'#fff4ff':i%3===1?e.color:'#ca83ff';c.lineWidth=s.size;c.beginPath();c.moveTo(x-s.vx*.028,y-s.vy*.028);c.lineTo(x,y);c.stroke();
  }
  // A brief white-hot core, not an opaque full-screen flash.
  c.globalAlpha=Math.max(0,1-age/.12)*e.strength;c.fillStyle='#efffff';c.shadowColor=e.color;c.shadowBlur=38;
  c.fillRect(-42,-1.5,84,3);c.fillRect(-1.5,-15,3,30);c.restore();
}
export function drawHitLighting(c,effects,g,time,width,height,{reduced=false}={}){
  if(reduced)return;
  c.save();c.globalCompositeOperation='lighter';
  const lanes=Array.from({length:g.slots},()=>null);
  for(const e of effects){const intensity=hitEnvelope(e,time);if(intensity>0&&(!lanes[e.lane]||intensity>lanes[e.lane].intensity))lanes[e.lane]={effect:e,intensity};}
  let energy=0;
  for(let l=0;l<lanes.length;l++){
    const hit=lanes[l];if(!hit)continue;const {effect:e,intensity}=hit,p=g.point(l),half=Math.min(90,width/g.slots*.38);
    energy+=intensity;
    const glow=c.createRadialGradient(p.x,p.y,2,p.x,p.y,145);glow.addColorStop(0,e.color);glow.addColorStop(.4,e.color+'77');glow.addColorStop(1,e.color+'00');
    c.globalAlpha=intensity*.44;c.fillStyle=glow;c.fillRect(p.x-145,p.y-145,290,290);
    const shaft=c.createLinearGradient(0,Math.max(0,p.y-180),0,height);shaft.addColorStop(0,e.color+'00');shaft.addColorStop(.62,e.color);shaft.addColorStop(1,e.color+'00');
    c.globalAlpha=intensity*.24;c.fillStyle=shaft;c.fillRect(p.x-half,0,half*2,height);
    c.globalAlpha=intensity;c.fillStyle=e.color;c.shadowColor=e.color;c.shadowBlur=32;c.fillRect(p.x-48,p.y-1,96,2);c.shadowBlur=0;
  }
  // Light stays at the frame edge; the central note field never whites out.
  c.globalAlpha=Math.min(.38,energy*.10);c.strokeStyle='#63ebff';c.shadowColor='#43ddff';c.shadowBlur=38;c.lineWidth=3;c.strokeRect(1,1,width-2,height-2);
  c.globalAlpha=Math.min(.25,energy*.07);c.strokeStyle='#e469ff';c.shadowColor='#e469ff';c.lineWidth=1;c.strokeRect(6,6,width-12,height-12);
  c.restore();
}
