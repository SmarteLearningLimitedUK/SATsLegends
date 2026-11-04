/** Illustration anchors only: world angles, velocity and collisions remain in the original game. */
export function angleArenaLayout(width:number,height:number){return {
 cannonX:width*.215,cannonY:height*.70,cannonSize:height*.23,
 cannonPodiumWidth:width*.27,cannonPodiumHeight:height*.12,
 enemySize:height*.235,enemyPodiumHeight:height*.38,
 targetDistance:width*.585,targetRise:height*.34,arcHeight:height*.12,missSpread:height*.25,
};}
export function drawAngleProp(ctx:CanvasRenderingContext2D,image:HTMLImageElement|null,x:number,y:number,width:number,height:number,align:'top'|'bottom'='top'){
 if(!image?.naturalWidth)return;
 const scale=Math.min(width/image.naturalWidth,height/image.naturalHeight),w=image.naturalWidth*scale,h=image.naturalHeight*scale;
 ctx.drawImage(image,x+(width-w)/2,align==='top'?y:y+height-h,w,h);
}

export type AngleMaterial='beam'|'post'|'ice'|'stone';
export type AngleMaterials=Partial<Record<AngleMaterial,HTMLImageElement>>;
const clamp01=(n:number)=>Math.max(0,Math.min(1,n));
const COLLAPSE_MS=680;

/** A visual consequence of the existing hit event, never a second collision model. */
export function angleImpactFrame(age:number|null,reduced:boolean,width:number,height:number){
 const progress=age===null?0:reduced?1:clamp01(age/COLLAPSE_MS);
 const fall=clamp01((progress-.08)/.92);
 // The rotating actor extends beyond its upright box on 4:3 iPads.
 const drift=Math.min(width*.012,width*.185-height*.28);
 return {progress,dx:drift*fall,dy:height*(.295*fall*fall-.024*Math.sin(Math.PI*fall)),rotation:78*fall};
}

/** Independent, aspect-preserving materials: no composite tower remains underneath. */
export function drawAngleTower(ctx:CanvasRenderingContext2D,materials:AngleMaterials,width:number,height:number,age:number|null,reduced:boolean){
 const ground=height*.675;
 const pieces:{material:AngleMaterial;x:number;y:number;w:number;h:number}[]=[];
 const add=(material:AngleMaterial,x:number,y:number,length:number,vertical=false)=>{
  const im=materials[material];if(!im?.naturalWidth)return;
  const w=vertical?length*im.naturalWidth/im.naturalHeight:length,h=vertical?length:length*im.naturalHeight/im.naturalWidth;
  pieces.push({material,x,y,w,h});
 };
 const block=(material:AngleMaterial,x:number,bottom:number,w:number)=>{
  const im=materials[material];if(!im?.naturalWidth)return;
  add(material,width*x,bottom-w*im.naturalHeight/im.naturalWidth/2,w);
 };
 // Foundation, ice infill, upright timber and two load-bearing snow beams.
 for(const x of [.59,.65,.71,.92])block('stone',x,ground,width*.056);
 for(const x of [.775,.84])block('ice',x,ground,width*.053);
 block('ice',.775,ground-width*.053,width*.050);
 block('stone',.65,ground-width*.035,width*.050);
 for(const x of [.69,.9])add('post',width*x,height*.600,height*.15,true);
 for(const x of [.715,.885])add('post',width*x,height*.444,height*.168,true);
 add('beam',width*.79,height*.535,width*.30);
 add('beam',width*.80,height*.360+width*.20*.08,width*.20);
 add('beam',width*.625,height*.601,width*.14);
 block('ice',.84,height*.525,width*.048);
 block('stone',.735,height*.525,width*.044);
 block('ice',.91,ground,width*.042);
 // A smaller left stack balances the tall lookout without a second scene plate.
 block('stone',.59,ground-width*.035,width*.046);
 add('post',width*.595,height*.622,height*.095,true);
 let moved=0,settled=0;
 const progress=age===null?0:reduced?1:clamp01(age/COLLAPSE_MS);
 pieces.forEach((piece,index)=>{
  const t=age===null?0:reduced?1:clamp01((age-index%4*18)/(COLLAPSE_MS-index%4*18));
  const turn=(index%2?1:-1)*(piece.material==='post'?1.2+index%3*.12:piece.material==='beam'?.10+index%3*.08:.18+index%4*.16);
  const radius=(Math.abs(Math.sin(turn))*piece.w+Math.abs(Math.cos(turn))*piece.h)/2;
  const landing=ground-radius-(index%3)*height*.008;
  const drop=landing-piece.y;
  const travel=width*((index%2?1:-1)*(.014+(index%4)*.008));
  const x=piece.x+travel*(1-(1-t)*(1-t));
  const y=piece.y+drop*t*t-height*.025*Math.sin(Math.PI*t);
  const rotation=turn*t;
  if(t>0)moved++;if(t>=1)settled++;
  ctx.save();ctx.translate(x,y);ctx.rotate(rotation);
  ctx.drawImage(materials[piece.material]!, -piece.w/2,-piece.h/2,piece.w,piece.h);
  ctx.restore();
 });
 // Tiny ice splinters are an effect, not covers over unsuitable artwork.
 if(age!==null&&!reduced&&age<570){
  const t=clamp01(age/570);ctx.save();ctx.globalAlpha=1-t;
  for(let i=0;i<12;i++){
   const direction=(i-5.5)*.29,reach=height*(.025+t*.23);
   const x=width*.80+Math.sin(direction)*reach,y=height*.36-Math.cos(direction)*reach+height*.32*t*t;
   ctx.save();ctx.translate(x,y);ctx.rotate(direction+t*4);
   ctx.fillStyle=i%3===0?'#fff8de':'#b5f7ff';ctx.beginPath();ctx.moveTo(0,-height*.009);ctx.lineTo(height*.006,height*.004);ctx.lineTo(-height*.004,height*.007);ctx.closePath();ctx.fill();ctx.restore();
  }ctx.restore();
 }
 return {pieces:pieces.length,moved,settled,progress:Number(progress.toFixed(3))};
}

export function drawAngleShot(ctx:CanvasRenderingContext2D,radius:number,pulse=0){
 ctx.save();const glow=ctx.createRadialGradient(0,0,0,0,0,radius*2);
 glow.addColorStop(0,'#ffffff');glow.addColorStop(.3,'#dcffff');glow.addColorStop(.6,'#32ceff');glow.addColorStop(1,'#25baff00');
 ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,radius*(1.8+pulse*.15),0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#efffff';ctx.beginPath();ctx.arc(0,0,radius*.48,0,Math.PI*2);ctx.fill();ctx.restore();
}
