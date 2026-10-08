export function buildDragLinks(notes,beat){
  const previous=new Map(),links=[];
  for(const n of [...notes].sort((a,b)=>a.time-b.time||a.lane-b.lane)){
    const p=previous.get(n.lane);
    if(n.type==='drag'&&p?.type==='drag'&&n.time-p.time<=beat*1.05&&n.time>p.time)links.push({from:p,to:n,lane:n.lane});
    previous.set(n.lane,n);
  }
  return links;
}

// These thin rails are guides only. They do not add notes, hits or sliding gestures.
export function drawDragLinks(c,links,g,time,distance,height,{reduced=false,held=new Set()}={}){
  c.save();c.globalCompositeOperation='lighter';c.strokeStyle='#ffe277';c.shadowColor='#ffc340';
  for(const link of links){
    const {from,to,lane}=link;
    if(to.state!=='pending'||from.state==='miss')continue;
    const caught=['perfect','good'].includes(from.state),d=caught?0:distance(from);
    const p=g.point(lane,d),q=g.point(lane,distance(to));
    if(q.y>height+20||p.y<0||p.y-q.y<9)continue;
    const active=held.has(lane),top=Math.max(0,q.y+5),bottom=Math.min(height,p.y-5);
    if(top>=bottom)continue;
    c.globalAlpha=active?.55:.24;c.lineWidth=active?1.7:1;c.shadowBlur=reduced?0:active?13:4;
    c.setLineDash(active?[]:[3,7]);c.beginPath();c.moveTo(p.x,top);c.lineTo(p.x,bottom);c.stroke();c.setLineDash([]);
    if(active&&!reduced){
      const y=top+(bottom-top)*((time*1.6)%1);
      c.globalAlpha=.8;c.fillStyle='#fff2bc';c.fillRect(p.x-1,y-3,2,6);
    }
  }
  c.restore();
}
