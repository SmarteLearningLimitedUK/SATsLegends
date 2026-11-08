export type NetCell=[number,number];
type Vector=[number,number,number];
type Face={u:Vector;v:Vector;n:Vector};
const neg=(v:Vector)=>v.map(n=>-n) as Vector;
const same=(a:Vector,b:Vector)=>a.every((n,i)=>n===b[i]);
const normalise=(cells:NetCell[])=>{const x=Math.min(...cells.map(c=>c[0])),y=Math.min(...cells.map(c=>c[1]));return cells.map(([a,b])=>[a-x,b-y] as NetCell).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);};
const orientations=(cells:NetCell[])=>Array.from({length:8},(_,turn)=>normalise(cells.map(([x,y])=>{if(turn>=4)x=-x;for(let i=0;i<turn%4;i++)[x,y]=[-y,x];return [x,y] as NetCell;})));
const key=(cells:NetCell[])=>orientations(cells).map(c=>JSON.stringify(c)).sort()[0];
/** A connected six-square net must fold onto six distinct, consistent cube normals. */
export function foldCubeNet(cells:NetCell[]):Vector[]|null {
 if(cells.length!==6||new Set(cells.map(c=>c.join(','))).size!==6)return null;
 const faces=new Map<number,Face>([[0,{u:[1,0,0],v:[0,1,0],n:[0,0,1]}]]),queue=[0];
 while(queue.length){const i=queue.shift()!,f=faces.get(i)!;
  for(let j=0;j<cells.length;j++){const dx=cells[j][0]-cells[i][0],dy=cells[j][1]-cells[i][1];if(Math.abs(dx)+Math.abs(dy)!==1)continue;
   const next:Face=dx===1?{u:neg(f.n),v:f.v,n:f.u}:dx===-1?{u:f.n,v:f.v,n:neg(f.u)}:dy===1?{u:f.u,v:neg(f.n),n:f.v}:{u:f.u,v:f.n,n:neg(f.v)};
   const previous=faces.get(j);if(previous){if(!same(previous.n,next.n)||!same(previous.u,next.u)||!same(previous.v,next.v))return null;}
   else{faces.set(j,next);queue.push(j);}
  }
 }
 if(faces.size!==6||new Set([...faces.values()].map(f=>f.n.join(','))).size!==6)return null;
 return cells.map((_,i)=>faces.get(i)!.n);
}
function enumerateNets():NetCell[][] {
 let shapes=new Map<string,NetCell[]>([['[[0,0]]',[[0,0]]]]);
 for(let size=2;size<=6;size++){const next=new Map<string,NetCell[]>();for(const cells of shapes.values())for(const [x,y] of cells)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
  if(cells.some(c=>c[0]===x+dx&&c[1]===y+dy))continue;const shape=normalise([...cells,[x+dx,y+dy]]);next.set(key(shape),shape);
 }shapes=next;}
 return [...shapes.values()].filter(c=>foldCubeNet(c)).sort((a,b)=>key(a).localeCompare(key(b)));
}
export const CUBE_NETS=enumerateNets();
export interface LabelledNet {cells:NetCell[];labels:number[];marked:number;opposite:number;}
export function labelledCubeNet(seed:number):LabelledNet {
 const n=Math.abs(Math.trunc(seed)),cells=orientations(CUBE_NETS[n%CUBE_NETS.length])[Math.floor(n/CUBE_NETS.length)%8],labels=[1,2,3,4,5,6];
 let state=n>>>0;for(let i=5;i>0;i--){state=(Math.imul(state,1664525)+1013904223)>>>0;const j=state%(i+1);[labels[i],labels[j]]=[labels[j],labels[i]];}
 const normals=foldCubeNet(cells)!,markedIndex=Math.floor(n/7)%6,oppositeIndex=normals.findIndex(v=>same(v,neg(normals[markedIndex])));
 return {cells,labels,marked:labels[markedIndex],opposite:labels[oppositeIndex]};
}
