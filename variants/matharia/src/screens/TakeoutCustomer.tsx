import React,{useEffect,useState} from 'react';
import {useReducedMotion} from 'motion/react';
import VisionCharacter from '../../../../src/components/game-ui/VisionCharacter';
import {usePausedTimers} from '../usePausedTimers';

/** Mounted once per source ticket. A served customer keeps its identity while
 * departing; the next ticket mounts the next customer after source feedback. */
export default function TakeoutCustomer({serial,cast,leaving,paused,elapsed}:{serial:number;cast:readonly string[];leaving:boolean;paused:boolean;elapsed:number}){
 const [customer]=useState(()=>({serial,identity:cast[serial%cast.length]}));
 const reduced=useReducedMotion(),clock=usePausedTimers(paused);
 const [entering,setEntering]=useState(true);
 useEffect(()=>clock.schedule(()=>setEntering(false),600),[clock]);
 const phase=leaving?'leaving':entering&&!reduced?'arriving':'ordering',wait=Math.max(0,elapsed-customer.serial*20);
 return <div className="takeout-customer" data-customer-id={customer.serial} data-customer-phase={phase} data-queue-position="0" data-impatience={wait>=40?'urgent':wait>=20?'restless':'calm'}>
  <div className="takeout-customer-arrival"><div className="takeout-customer-departure" data-leaving={leaving}>
   <VisionCharacter steady identity={customer.identity} walking={!reduced&&phase!=='ordering'} alt="Monster ordering at the counter"/>
  </div></div>
 </div>;
}
