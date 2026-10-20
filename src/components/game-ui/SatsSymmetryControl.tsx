import type { SatsMission } from '../../systems/content/satsAdventure';
export default function SatsSymmetryControl({mission,value,onChange}:{mission:SatsMission;value:string;onChange:(v:string)=>void}){
 if(mission.visual.type!=='symmetry')return null;
 const original=new Set(mission.visual.cells.map(([x,y])=>`${x},${y}`)),selected=new Set(value.split(';').filter(Boolean));
 const toggle=(cell:string)=>{const next=new Set(selected);if(next.has(cell))next.delete(cell);else next.add(cell);onChange([...next].sort().join(';'));};
 return <div className="sats-symmetry" role="group" aria-label="Complete the symmetrical pattern">{Array.from({length:18},(_,i)=>{const x=i%6,y=Math.floor(i/6),key=`${x},${y}`;return x<3?<span key={key} className={`sats-symmetry-cell${original.has(key)?' is-filled':''}`} aria-label={`Given square column ${x+1}, row ${y+1}${original.has(key)?', coloured':''}`} />:<button type="button" key={key} className={`sats-symmetry-cell${selected.has(key)?' is-filled':''}`} aria-pressed={selected.has(key)} aria-label={`Column ${x+1}, row ${y+1}`} onClick={()=>toggle(key)} />;})}</div>;
}
