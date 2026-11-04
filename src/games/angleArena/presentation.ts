/** Small, continuous accents; the mathematical diagram and flight lane stay clear. */
export function drawArenaAtmosphere(ctx:CanvasRenderingContext2D,width:number,height:number,time:number){
 ctx.save();
 // Slow ice-light glints cross the courtyard, rather than covering it with fog.
 for(let i=0;i<8;i++){
  const x=width*(.08+i*.12),y=height*(.75+(i%3)*.065);
  const pulse=.5+.5*Math.sin(time*.001+i*1.7);
  ctx.strokeStyle=`rgba(160,237,255,${.12+pulse*.28})`;
  ctx.lineWidth=1.5;ctx.beginPath();
  ctx.moveTo(x-7-pulse*6,y);ctx.lineTo(x+7+pulse*6,y);
  ctx.moveTo(x,y-3);ctx.lineTo(x,y+3);ctx.stroke();
 }
 // Sparse drifting frost stays behind all actors and interaction surfaces.
 for(let i=0;i<28;i++){
  const x=((i*173.7+time*(.009+(i%4)*.003))%(width+40))-20;
  const y=((i*97.3+time*(.006+(i%3)*.002))%(height+30))-15;
  ctx.fillStyle=`rgba(231,251,255,${.25+(i%4)*.12})`;
  ctx.beginPath();ctx.arc(x,y,.8+(i%3)*.45,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
}

/** An expanding crystal spell burst; deterministic geometry avoids flickering. */
export function drawArenaBurst(ctx:CanvasRenderingContext2D,x:number,y:number,size:number,progress:number){
 ctx.save();ctx.translate(x,y);
 const radius=size*(.3+progress*.85),alpha=Math.max(.1,1-progress);
 const glow=ctx.createRadialGradient(0,0,0,0,0,radius);
 glow.addColorStop(0,`rgba(255,255,240,${alpha})`);
 glow.addColorStop(.35,`rgba(113,238,255,${alpha*.8})`);glow.addColorStop(1,'rgba(76,192,255,0)');
 ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle=`rgba(255,224,143,${alpha})`;ctx.lineWidth=3;
 ctx.beginPath();ctx.arc(0,0,radius*.8,0,Math.PI*2);ctx.stroke();
 for(let i=0;i<12;i++){
  const angle=i*Math.PI/6;
  ctx.beginPath();ctx.moveTo(Math.cos(angle)*radius*.7,Math.sin(angle)*radius*.7);
  ctx.lineTo(Math.cos(angle)*radius*1.15,Math.sin(angle)*radius*1.15);ctx.stroke();
 }
 ctx.restore();
}
