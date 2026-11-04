import React,{memo} from 'react';
import {asset} from '../assets';

/** One transparent sprite, articulated as wings/body; scenery remains a clean plate. */
export default memo(function ZombieAtmosphere(){
 const bat=asset('props','graveyard_bat_v2');
 return <div className="zombies-atmosphere" aria-hidden="true">
  {[0,1,2].map(i=><span className="graveyard-bat-flight" key={i}>
   <span className="graveyard-bat-art">
    <img className="graveyard-bat-wing graveyard-bat-wing--left" src={bat} alt="" draggable={false}/>
    <img className="graveyard-bat-wing graveyard-bat-wing--right" src={bat} alt="" draggable={false}/>
    <img className="graveyard-bat-body" src={bat} alt="" draggable={false}/>
   </span>
  </span>)}
 </div>;
});
