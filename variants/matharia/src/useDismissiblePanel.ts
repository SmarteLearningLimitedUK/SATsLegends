import {useEffect,type RefObject} from 'react';
/** Escape must also work after a touch in Safari, which may move focus to body. */
export function useDismissiblePanel(open:boolean,setOpen:(open:boolean)=>void,trigger:RefObject<HTMLElement|null>,panel:RefObject<HTMLElement|null>){
 useEffect(()=>{if(!open)return;panel.current?.querySelector<HTMLButtonElement>('button')?.focus();const key=(e:KeyboardEvent)=>{if(e.key!=='Escape')return;e.stopPropagation();setOpen(false);trigger.current?.focus()};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key)},[open,setOpen,trigger,panel]);
}
