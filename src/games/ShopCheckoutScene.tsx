import {useId, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import VisionCharacter from '../components/game-ui/VisionCharacter';
import {originalHeroId} from '../assets/characters/originalHeroes';
import shopArtwork from '../assets/game-visions/environments/change_counter-v2.png';

/** The shared backdrop and counter use the same camera, so the clerk stands behind the worktop. */
export default function ShopCheckoutScene({avatarId}:{avatarId:string}) {
 const marker=useRef<HTMLSpanElement>(null);
 const [host,setHost]=useState<HTMLElement|null>(null);
 const clipId=useId().replace(/:/g,'');
 useLayoutEffect(()=>{setHost(marker.current?.closest<HTMLElement>('.app-viewport')??null);},[]);
 return <>
  <span ref={marker} hidden />
  {host&&createPortal(<div className="shop-checkout-world" data-shop-checkout-world aria-hidden="true">
   <div className="shop-checkout-sign">GENERAL<br />STORE</div>
   <div className="shop-checkout-clerk" data-shop-clerk><VisionCharacter identity={originalHeroId(avatarId)} decorative /></div>
   <svg className="shop-checkout-counter" viewBox="0 0 1672 941" preserveAspectRatio="xMidYMid slice">
    <defs><clipPath id={clipId}><rect x="0" y="520" width="1672" height="421" /></clipPath></defs>
    <image href={shopArtwork} width="1672" height="941" clipPath={`url(#${clipId})`} />
   </svg>
  </div>,host)}
 </>;
}
