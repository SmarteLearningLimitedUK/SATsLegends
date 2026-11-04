import React from 'react';
import {asset} from './assets';

/** Two authored work poses share a registered boot baseline. Both are decoded before a strike. */
export default function MiningActor({identity,hit,stamp}:{identity:string;hit:boolean;stamp:string}) {
 const id=['barratt','bran','mochi','vex'].includes(identity)?identity:'barratt';
 return <span key={hit?stamp:'ready'} className="mining-actor" data-mining-actor={id} data-mining-pose={hit?'strike':'ready'} aria-hidden="true">
  <img className="mining-ready-pose" src={asset('heroes',`hero_${id}_mining_ready_v4`)} alt="" draggable={false}/>
  <img className="mining-contact-pose" src={asset('heroes',`hero_${id}_mining_contact_v4`)} alt="" draggable={false}/>
 </span>;
}
