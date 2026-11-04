import {useEffect,useRef} from 'react';
import {useReducedMotion} from 'motion/react';
import {playMaterialContact} from '../../../src/audio/gameAudio';
import type {SoundMaterial} from '../../../src/audio/gameSoundProfiles';
import {usePausedTimers} from './usePausedTimers';

/** Contact follows a real state transition; the source controller still owns the answer. */
export function useSceneContact(stamp:string|number,active:boolean,material:SoundMaterial,delay:number,paused:boolean) {
 const reduced=useReducedMotion();
 const clock=usePausedTimers(paused),last=useRef<string|undefined>(undefined);
 useEffect(()=>{
  const key=String(stamp);if(!active||last.current===key)return;
  last.current=key;
  return clock.schedule(()=>playMaterialContact(material),reduced?0:delay);
 },[stamp,active,material,delay,clock,reduced]);
}
