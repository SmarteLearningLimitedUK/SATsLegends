import React from 'react';
import {ORIGINAL_HEROES,originalHeroId} from '../../../src/assets/characters/originalHeroes';
const windows={barratt:[170,0,800,800],bran:[180,0,844,844],mochi:[190,20,800,800],vex:[160,0,840,840]} as const;
/** A legitimate portrait viewport crops the selected hero's original independent artwork. */
export default function HeroPortrait({identity,alt}:{identity:unknown;alt:string}){
 const id=originalHeroId(identity);
 return <svg viewBox={windows[id].join(' ')} role="img" aria-label={alt} data-hero-portrait={id}>
  <image href={ORIGINAL_HEROES[id]} width="1024" height="1536"/>
 </svg>;
}
