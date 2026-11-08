import {answersMatch} from '../../systems/content/satsAdventure';
export type ShapeSecretKind='shared-forward'|'shared-reverse'|'joined-boundary'|'joined-reverse'|'difference'|'scaled-side'|'rectangle-link';
export interface ShapeSecretQuestion {id:string;tier:number;kind:ShapeSecretKind;inner:number;outer:number;scale:number;sideCenti:number;heightCenti:number;givenCenti:number;answerCenti:number;prompt:string;relationship:string;hint:string;explanation:string;references:string[];}
export interface Point {x:number;y:number;}
export const shapeName=(sides:number)=>['','','','triangle','square','pentagon','hexagon','heptagon','octagon'][sides]??`${sides}-sided polygon`;
export const shapeDescription=(sides:number)=>sides===3?'Equilateral triangle':sides===4?'Square':`Regular ${shapeName(sides)}`;
export const cm=(centi:number)=>Number((centi/100).toFixed(2)).toString();
/** All polygons start with the same horizontal edge; exterior turns enforce regularity. */
export function regularShape(sides:number,side=1,below=false):Point[]{
 if(!Number.isInteger(sides)||sides<3||sides>8||side<=0)throw Error('Invalid regular polygon.');
 const points:Point[]=[{x:-.5,y:0}];
 for(let i=0;i<sides-1;i++){const angle=(below?1:-1)*i*2*Math.PI/sides,p=points.at(-1)!;points.push({x:p.x+side*Math.cos(angle),y:p.y+side*Math.sin(angle)});}
 return points;
}
export function secretGeometry(q:ShapeSecretQuestion){
 if(q.kind==='rectangle-link')return {a:regularShape(3),b:[{x:-.5,y:0},{x:q.scale-.5,y:0},{x:q.scale-.5,y:q.heightCenti/q.sideCenti},{x:-.5,y:q.heightCenti/q.sideCenti}],shared:[{x:-.5,y:0},{x:.5,y:0}] as [Point,Point],parts:q.scale,rectangle:true};
 if(q.kind==='joined-boundary'||q.kind==='joined-reverse'){
  const rotate=(p:Point)=>({x:-p.y,y:p.x});
  return {a:regularShape(q.inner).map(rotate),b:regularShape(q.outer,1,true).map(rotate),shared:[rotate({x:-.5,y:0}),rotate({x:.5,y:0})] as [Point,Point],parts:1,rectangle:false};
 }
 return {a:regularShape(q.inner,1/q.scale),b:regularShape(q.outer),shared:[{x:-.5,y:0},{x:-.5+1/q.scale,y:0}] as [Point,Point],parts:q.scale,rectangle:false};
}
export function buildShapeSecrets(tier:number,seed:number):ShapeSecretQuestion[]{
 if(!Number.isFinite(tier)||!Number.isFinite(seed))throw Error('A finite geometry tier and seed are required.');
 const band=Math.max(1,Math.min(5,Math.trunc(tier)));let random=seed>>>0;
 const int=(min:number,max:number)=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return min+Math.floor(random/4294967296*(max-min+1));};
 const patterns:ShapeSecretKind[][]=[
  Array(8).fill('shared-forward'),
  ['shared-forward','shared-reverse','shared-forward','shared-reverse','shared-forward','shared-reverse','shared-forward','shared-reverse'],
  ['joined-boundary','difference','shared-reverse','joined-boundary','difference','joined-boundary','shared-reverse','difference'],
  ['joined-reverse','rectangle-link','difference','joined-reverse','rectangle-link','joined-reverse','rectangle-link','difference'],
  ['scaled-side','rectangle-link','joined-reverse','scaled-side','rectangle-link','scaled-side','joined-reverse','rectangle-link'],
 ];
 const kinds=[...patterns[band-1]];for(let i=kinds.length-1;i>0;i--){const j=int(0,i);[kinds[i],kinds[j]]=[kinds[j],kinds[i]];}
 const seen=new Set<string>();
 return kinds.map((kind,index)=>{
  let sideCenti:number,inner:number,outer:number,scale:number,heightCenti:number,key:string;
  do{inner=kind==='rectangle-link'||kind==='scaled-side'?3:int(3,band===1?4:5);outer=kind==='rectangle-link'?4:int(Math.max(5,inner+1),band===1?6:8);scale=kind==='scaled-side'||kind==='rectangle-link'?int(2,band===5?4:3):1;sideCenti=band===1?int(2,12)*100:band===2?int(3,30)*50:band===3?int(5,60)*25:band===4?int(12,200)*10:int(8,120)*25;heightCenti=kind==='rectangle-link'?sideCenti*int(1,2):int(4,40)*(band>=4?25:100);key=[kind,inner,outer,scale,sideCenti,kind==='rectangle-link'?heightCenti:0].join(':');}while(seen.has(key));seen.add(key);
  const a=inner*sideCenti,b=outer*sideCenti,joined=(inner+outer-2)*sideCenti;
  let givenCenti=a,answerCenti=b,prompt=`${shapeDescription(inner)} perimeter: ${cm(a)} cm. Find the ${shapeName(outer)}'s perimeter.`,relationship='Both shapes share the gold side.',hint=`Divide the known perimeter by ${inner} to find one side, then use the other shape's side count.`,explanation=`One side is ${cm(a)} ÷ ${inner} = ${cm(sideCenti)} cm. ${outer} × ${cm(sideCenti)} = ${cm(b)} cm.`;
  if(kind==='shared-reverse'){givenCenti=b;answerCenti=a;prompt=`${shapeDescription(outer)} perimeter: ${cm(b)} cm. Find the ${shapeName(inner)}'s perimeter.`;hint=`Find one side of the ${shapeName(outer)}, then use ${inner} sides.`;explanation=`${cm(b)} ÷ ${outer} = ${cm(sideCenti)} cm per side. ${inner} × ${cm(sideCenti)} = ${cm(a)} cm.`;}
  if(kind==='joined-boundary'){answerCenti=joined;prompt=`${shapeDescription(inner)} perimeter: ${cm(a)} cm. Find the joined shapes' outside perimeter.`;relationship='Joined along the gold side.';hint='Find one side. Count the outside edges; the shared side is inside.';explanation=`One side is ${cm(sideCenti)} cm. ${inner} + ${outer} − 2 = ${inner+outer-2} outside edges. Perimeter: ${cm(joined)} cm.`;}
  if(kind==='joined-reverse'){givenCenti=joined;answerCenti=b;prompt=`Outside perimeter: ${cm(joined)} cm. Find the ${shapeName(outer)}'s own perimeter.`;relationship='Joined along the gold side.';hint=`Count ${inner} + ${outer} − 2 outside sides to find the length of one side.`;explanation=`${cm(joined)} ÷ ${inner+outer-2} = ${cm(sideCenti)} cm per side. ${outer} sides give ${cm(b)} cm.`;}
  if(kind==='difference'){answerCenti=b-a;prompt=`${shapeDescription(inner)} perimeter: ${cm(a)} cm. How much longer is the ${shapeName(outer)}'s perimeter?`;hint='Find the shared side, then compare the two side counts.';explanation=`The difference is (${outer} − ${inner}) × ${cm(sideCenti)} = ${cm(b-a)} cm.`;}
  if(kind==='scaled-side'){answerCenti=outer*scale*sideCenti;prompt=`Triangle perimeter: ${cm(a)} cm. Find the ${shapeName(outer)}'s perimeter.`;relationship=`Each outer side = ${scale} triangle sides.`;hint='Find one triangle side, scale it up, then use the outer polygon’s side count.';explanation=`Triangle side: ${cm(sideCenti)} cm. Outer side: ${scale} × ${cm(sideCenti)} = ${cm(scale*sideCenti)} cm. Perimeter: ${cm(answerCenti)} cm.`;}
  if(kind==='rectangle-link'){answerCenti=2*(scale*sideCenti+heightCenti);prompt=`Triangle perimeter: ${cm(a)} cm. Find the rectangle's perimeter.`;relationship=`Rectangle width = ${scale} triangle sides.`;hint='Find the triangle side, then the rectangle width. Add width and height and double.';explanation=`Triangle side: ${cm(sideCenti)} cm. Rectangle width: ${cm(scale*sideCenti)} cm. 2 × (${cm(scale*sideCenti)} + ${cm(heightCenti)}) = ${cm(answerCenti)} cm.`;}
  return {id:`shape-secret-${band}-${seed}-${index}`,tier:band,kind,inner,outer,scale,sideCenti,heightCenti,givenCenti,answerCenti,prompt,relationship,hint,explanation,references:['3M7','5G2b','5M9b',...(kind==='rectangle-link'?['5G2a']:[])]};
 });
}
export interface ShapeSecretState {index:number;phase:'playing'|'correct'|'error'|'complete'|'failed';score:number;mistakes:number;attempts:number;feedback:string;helped:boolean;}
export const initialShapeSecretState=():ShapeSecretState=>({index:0,phase:'playing',score:0,mistakes:0,attempts:0,feedback:'',helped:false});
export function submitShapeSecret(s:ShapeSecretState,q:ShapeSecretQuestion,value:string,relaxed:boolean,lives:number):ShapeSecretState {
 if(s.phase!=='playing')return s;
 const correct=answersMatch(value,cm(q.answerCenti));
 return {...s,phase:correct?'correct':!relaxed&&lives<=1?'failed':'error',score:s.score+(correct?40+q.tier*10:0),mistakes:s.mistakes+(correct?0:1),attempts:s.attempts+1,helped:s.helped||!correct,feedback:correct?'Seal restored. Brainpower reclaimed!':q.hint};
}
export function advanceShapeSecret(s:ShapeSecretState,total=8):ShapeSecretState {
 if(s.phase==='error')return {...s,phase:'playing'};
 if(s.phase!=='correct')return s;
 return s.index+1>=total?{...s,phase:'complete',feedback:'The glacier seals are restored!'}:{...s,index:s.index+1,phase:'playing',feedback:'',helped:false};
}
export const shapeSecretStars=(mistakes:number)=>mistakes<=1?3:mistakes<=3?2:1;
