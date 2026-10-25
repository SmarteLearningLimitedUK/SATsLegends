import rangeArtwork from '../assets/game-visions/instruments/diner-range-v1.png';
import panArtwork from '../assets/game-visions/instruments/diner-pan-v1.png';

/** Always-running kitchen activity; portion selection adds a fresh pan toss. */
export default function DinerCookingStation({sequence,food,cold,serving}:{sequence:number;food?:string;cold:boolean;serving:boolean}) {
 return <div className="rush-prep-bench" data-cooking-station aria-hidden="true">
  <img className="rush-range-art" src={rangeArtwork} alt="" draggable={false}/>
  <div className="rush-burner-flame" />
  <div className="rush-cooking-pan" key={sequence} data-pan-action={food&&!cold?'toss':'simmer'}>
   <img className="rush-pan-art" src={panArtwork} alt="" draggable={false}/>
   {food && !cold && <img className="rush-pan-food" data-cooking-ingredient src={food} alt="" draggable={false}/>}
  </div>
  {food && cold && <div className="rush-pass-shelf" key={`plate-${sequence}`}><img data-cooking-ingredient src={food} alt="" draggable={false}/></div>}
  <div className="rush-soup-bubbles"><i/><i/><i/><i/></div>
  {['pan','pot'].map(vessel=><div key={vessel} className={`rush-steam rush-steam--${vessel}`} data-diner-steam={vessel}>
   <svg viewBox="0 0 100 120"><path d="M25 115C5 90 53 78 28 51C5 26 44 15 35 0"/><path d="M52 120C80 90 27 81 55 53C80 27 51 14 63 0"/><path d="M80 110C58 87 98 65 79 41C63 20 86 14 83 0"/></svg>
  </div>)}
  <span className="rush-stove-status">{serving?'Order up!':food?cold?'Plating your order':'Cooking your selections':'Pans hot · ready to cook'}</span>
 </div>;
}
