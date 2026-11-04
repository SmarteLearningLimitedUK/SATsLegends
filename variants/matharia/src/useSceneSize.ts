import {useLayoutEffect,useRef,useState} from 'react';
export function useSceneSize(){
 const ref=useRef<HTMLDivElement>(null),[size,setSize]=useState({w:0,h:0});
 useLayoutEffect(()=>{const e=ref.current!,update=()=>{const r=e.getBoundingClientRect();setSize(old=>Math.abs(old.w-r.width)+Math.abs(old.h-r.height)<.1?old:{w:r.width,h:r.height})};update();const observer=new ResizeObserver(update);observer.observe(e);return()=>observer.disconnect()},[]);
 return{ref,...size};
}
