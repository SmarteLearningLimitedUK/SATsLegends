import React,{useId} from 'react';
import RaceWheelRig from './RaceWheelRig';

export default function RaceKartSprite({src,alt=''}:{src:string;alt?:string}){
  const filter=`kart-alpha-${useId().replace(/:/g,'')}`;
  return <>
    <svg width="0" height="0" aria-hidden="true" style={{position:'absolute'}}><defs><filter id={filter} colorInterpolationFilters="sRGB"><feComponentTransfer><feFuncA type="table" tableValues="0 0 1 1"/></feComponentTransfer></filter></defs></svg>
    <img src={src} alt={alt} draggable={false} style={{filter:`url(#${filter}) drop-shadow(0 3px 2px #08253455)`}}/>
    <RaceWheelRig src={src}/>
  </>;
}
