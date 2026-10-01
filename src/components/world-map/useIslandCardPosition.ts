import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';

/** Anchor to the terrain, reserving the visible map and shared bottom HUD. */
export function useIslandCardPosition(
  islandId: number | null, pinnedId: number | null,
  mapRef: RefObject<HTMLDivElement | null>, cardRef: RefObject<HTMLDivElement | null>,
  buttons: RefObject<Map<number, HTMLButtonElement>>,
) {
  const [position, setPosition] = useState<{ style:CSSProperties; side:string }>({ style:{visibility:'hidden'}, side:'below' });
  useLayoutEffect(() => {
    const map=mapRef.current,card=cardRef.current,button=islandId===null?null:buttons.current.get(islandId);
    if(!map || !card || !button) return;
    let request:number|null=null;
    const measure=()=>{
      request=null;
      const m=map.getBoundingClientRect(),a=button.getBoundingClientRect();
      const region=map.closest('.app-screen-content')?.getBoundingClientRect();
      const dock=document.querySelector('[data-testid="shared-bottom-hud"]')?.getBoundingClientRect();
      const scale=m.width/map.clientWidth,margin=8,gap=10;
      const width=Math.min(220,m.width-margin*2),height=card.offsetHeight*scale;
      const topLimit=Math.max(region?.top??0,0)+margin;
      const bottomLimit=Math.min(region?.bottom??innerHeight,dock?dock.top-24:innerHeight)-margin;
      let side='below',x=(a.left+a.right-width)/2,y=a.bottom+gap;
      if(m.right-margin-a.right>=width+gap) {side='right';x=a.right+gap;y=(a.top+a.bottom-height)/2;}
      else if(a.left-m.left-margin>=width+gap) {side='left';x=a.left-width-gap;y=(a.top+a.bottom-height)/2;}
      else if(y+height>bottomLimit) {side='above';y=a.top-height-gap;}
      x=Math.max(m.left+margin,Math.min(x,m.right-width-margin));
      y=Math.max(topLimit,Math.min(y,bottomLimit-height));
      const style:CSSProperties={left:(x-m.left)/scale,top:(y-m.top)/scale,width:width/scale,
        maxHeight:Math.max(44,bottomLimit-topLimit)/scale,
        visibility:a.bottom<topLimit||a.top>bottomLimit?'hidden':'visible'};
      setPosition(old=>old.side===side && Object.keys(style).every(key=>old.style[key as keyof CSSProperties]===style[key as keyof CSSProperties])?old:{style,side});
    };
    const schedule=()=>{if(request===null) request=requestAnimationFrame(measure);};
    measure();
    const observer=new ResizeObserver(schedule);observer.observe(map);observer.observe(card);
    window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,{capture:true,passive:true});
    return ()=>{observer.disconnect();window.removeEventListener('resize',schedule);window.removeEventListener('scroll',schedule,true);if(request!==null)cancelAnimationFrame(request);};
  },[islandId,pinnedId,mapRef,cardRef,buttons]);
  return position;
}
